"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { CertificateDetails } from "./details";
import { axiosInstance } from "@/lib/axios";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LoadingScreen } from "../../common/loading-screen";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import { Lock } from "lucide-react";

interface ApiCertificate {
  id: string;
  certificate_id: string;
  name: string;
  description: string;
  disclosure_price: string;
  assured_price: string;
  industry_names: string[] | null;
}

const FilterDropdown = ({
  label,
  options,
  selected,
  onSelect,
  align = "left",
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (val: string) => void;
  align?: "left" | "right";
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`form-dropdown-trigger ${isOpen ? "ring-2 ring-secondary/10" : ""}`}
      >
        <span className="whitespace-nowrap">{selected || label}</span>
        <ChevronDown
          className={`shrink-0 w-4 h-4 text-gray/40 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className={`absolute top-full z-20 mt-2 max-h-56 overflow-y-auto rounded-xl border border-light-gray-2 bg-zinc-50 shadow-[0_10px_30px_rgba(0,0,0,0.12)] ${align === "right" ? "right-0" : "left-0"} min-w-45`}
            onMouseEnter={() => {
              document.body.style.overflow = "hidden";
            }}
            onMouseLeave={() => {
              document.body.style.overflow = "unset";
            }}
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onSelect(opt);
                  setIsOpen(false);
                }}
                className={`form-dropdown-item ${
                  selected === opt
                    ? "form-dropdown-item-active"
                    : "form-dropdown-item-inactive"
                }`}
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function CertificatePage() {
  const [certificates, setCertificates] = useState<ApiCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [hotelFilter, setHotelFilter] = useState("Hotels");
  const [propertyFilter, setPropertyFilter] = useState("Property");
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";

  const [profileData, setProfileData] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("organization_profile");
      try {
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const {
    isEmployee: isEmployeeRole,
    hasAccess,
    hasWrite,
  } = useEmployeePermissions(profileData);
  const isEmployee = pathname.startsWith("/employee");
  const base = isEmployee ? "/employee" : "/applicant";
  const canAccess = !isEmployeeRole || hasAccess("certificates");
  const canInitiate = !isEmployeeRole || hasWrite("certificates");

  useEffect(() => {
    const loadProfile = () => {
      const stored = localStorage.getItem("organization_profile");
      if (stored) {
        try {
          setProfileData(JSON.parse(stored));
        } catch (e) {}
      }
    };
    window.addEventListener("storage", loadProfile);
    window.addEventListener("profile-updated", loadProfile);
    return () => {
      window.removeEventListener("storage", loadProfile);
      window.removeEventListener("profile-updated", loadProfile);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchCertificates = async () => {
      try {
        setError(null);
        setIsLoading(true);
        setLoadingProgress(10);

        const isRecommended = searchParams.get("filter") === "recommended";
        const endpoint = isRecommended
          ? "/recommended-certificates"
          : "/certificates";

        if (isMounted) setLoadingProgress(30);

        const response = await axiosInstance.get(endpoint, {
          params: isRecommended ? { page: 1, limit: 100 } : {},
        });

        if (isMounted) setLoadingProgress(70);

        const rawData = response?.data;
        let items: ApiCertificate[] = [];

        if (Array.isArray(rawData)) {
          items = rawData;
        } else if (Array.isArray(rawData?.data)) {
          items = rawData.data;
        } else if (Array.isArray(rawData?.data?.data)) {
          items = rawData.data.data;
        } else if (Array.isArray(rawData?.certificates)) {
          items = rawData.certificates;
        }

        if (isMounted) {
          setCertificates(items);
          setCurrentPage(1);
          setLoadingProgress(100);
          setTimeout(() => setIsLoading(false), 500);
        }
      } catch (err) {
        if (isMounted) {
          setError("Unable to load certificates. Please try again.");
          setIsLoading(false);
        }
      }
    };

    fetchCertificates();

    return () => {
      isMounted = false;
    };
  }, []);

  const [selectedCertificate, setSelectedCertificate] = useState<{
    id: string;
    certificateCode: string;
  } | null>(null);
  const cardsPerPage = 8;
  const allIndustries = useMemo(() => {
    const set = new Set<string>();
    certificates.forEach((cert) => {
      cert.industry_names?.forEach((name) => {
        if (name && name.trim()) {
          set.add(name);
        }
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [certificates]);

  const filteredCertificates = useMemo(() => {
    let filtered = certificates;

    const activeFilters = [
      categoryFilter !== "All" ? categoryFilter : null,
      hotelFilter !== "All" && hotelFilter !== "Hotels" ? hotelFilter : null,
      propertyFilter !== "All" && propertyFilter !== "Property"
        ? propertyFilter
        : null,
    ].filter(Boolean) as string[];

    if (activeFilters.length > 0) {
      filtered = filtered.filter((cert) => {
        const industries = (cert.industry_names || []).map((name) =>
          name.toLowerCase(),
        );
        return activeFilters.some((filter) => {
          const f = filter.toLowerCase();
          return industries.some((name) => name.includes(f));
        });
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (cert) =>
          cert.name.toLowerCase().includes(q) ||
          cert.certificate_id.toLowerCase().includes(q) ||
          cert.description.toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [certificates, categoryFilter, hotelFilter, propertyFilter, searchQuery]);

  const totalPages = Math.ceil(filteredCertificates.length / cardsPerPage);

  const startIndex = (currentPage - 1) * cardsPerPage;
  const currentCertificates = filteredCertificates.slice(
    startIndex,
    startIndex + cardsPerPage,
  );

  const handleCategoryChange = (val: string) => {
    setCategoryFilter(val);
    setCurrentPage(1);
  };

  if (!canAccess) {
    return (
      <div className="p-6 lg:p-10 bg-dull-white/10 min-h-[80vh] flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-sm border border-zinc-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-secondary mb-2">
            Access Denied
          </h2>
          <p className="text-gray text-sm mb-6">
            You do not have permission to view this page. Please contact your
            administrator to request access.
          </p>
          <Button
            variant="secondary"
            className="w-full h-12 bg-secondary text-primary hover:bg-zinc-800 transition-colors rounded-xl"
            onClick={() => router.push(base)}
          >
            Go Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (selectedCertificate) {
    return (
      <div className="p-6 lg:p-10 bg-dull-white/10 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <CertificateDetails
            certificateId={selectedCertificate.id}
            certificateCode={selectedCertificate.certificateCode}
            onBack={() => setSelectedCertificate(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 lg:pt-6 bg-dull-white/10 min-h-full font-sans flex flex-col">
      <div className="max-w-7xl mx-auto w-full grow space-y-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-secondary tracking-tight">
                {searchParams.get("filter") === "recommended"
                  ? "Recommended certifications"
                  : "Available certifications"}
              </h1>
              {searchParams.get("filter") === "recommended" && (
                <button
                  onClick={() => router.push(`${base}/certificate`)}
                  className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-full text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  Show all <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-gray text-sm max-w-2xl mt-2">
              {searchParams.get("filter") === "recommended"
                ? "Certifications specifically selected for your organisation based on industry profile."
                : "Choose from hotel and property certifications designed to align with global ESG standards."}
            </p>
          </div>
          {certificates.length > 0 && (
            <div className="flex flex-wrap gap-4">
              <FilterDropdown
                label="All"
                options={["All", ...allIndustries]}
                selected={categoryFilter}
                onSelect={handleCategoryChange}
              />
              <FilterDropdown
                label="Hotels"
                options={["All", ...allIndustries]}
                selected={hotelFilter}
                onSelect={(val) => {
                  setHotelFilter(val);
                  setCurrentPage(1);
                }}
              />
              <FilterDropdown
                label="Property"
                options={["All", ...allIndustries]}
                selected={propertyFilter}
                onSelect={(val) => {
                  setPropertyFilter(val);
                  setCurrentPage(1);
                }}
                align="right"
              />
            </div>
          )}
        </header>

        {/* Certificate Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative min-h-[200px] items-start">
          {isLoading ? (
            <div className="col-span-full flex items-center justify-center py-20 min-h-[200px]">
              <LoadingScreen
                isLoading={true}
                progress={loadingProgress}
                size="lg"
              />
            </div>
          ) : error ? (
            <div className="col-span-full py-24 text-center">
              <p className="text-red text-lg font-medium mb-2">{error}</p>
              <p className="text-gray text-sm">
                If the issue persists, please contact your administrator.
              </p>
            </div>
          ) : currentCertificates.length > 0 ? (
            currentCertificates.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i % 4) * 0.05 }}
                className="bg-white rounded-2xl border border-zinc-200 p-6 py-3 shadow-sm flex flex-col"
              >
                <div className="relative mb-3">
                  <div className="flex-1 min-w-0 pr-[240px]">
                    <h3
                      className="text-lg font-bold truncate text-gray-900 leading-tight"
                      title={item.name}
                    >
                      {item.name}
                    </h3>
                  </div>

                  <div className="absolute top-0 right-0 flex flex-wrap gap-2 justify-end max-w-[230px] max-h-[60px] overflow-hidden content-start">
                    {(item.industry_names && item.industry_names.length > 0
                      ? item.industry_names
                      : ["All industries"]
                    ).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-xs font-medium whitespace-nowrap"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Certificate Code */}
                <p className="text-sm text-gray-400 font-medium mb-4">
                  {item.certificate_id}
                </p>

                {/* Icon */}
                <div className="mb-4">
                  <img
                    src="/assets/imgs/icons/GoldRank.svg"
                    alt="Gold Rank"
                    className="w-12 h-12"
                  />
                </div>

                {/* Description */}
                <p className="text-gray-500 text-sm leading-relaxed mb-3 line-clamp-3">
                  {item.description}
                </p>

                <div className="mt-auto">
                  <div className="h-px bg-[#9995] w-full mb-3" />

                  {/* Pricing Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Self-disclosure: USD {item.disclosure_price}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 leading-tight">
                        Per property, online checklist.
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Certification: USD {item.assured_price}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 leading-tight">
                        Per certification, range by size and complexity.
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-end w-full md:max-w-[30%] ml-auto mt-5 md:mt-0">
                    <Button
                      variant="secondary"
                      disabled={!canInitiate}
                      className="bg-[#1A1A1A] hover:bg-black text-white px-6 h-12 md:h-10 rounded-lg text-sm font-semibold transition-all w-full md:w-auto whitespace-nowrap shadow-md md:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() =>
                        setSelectedCertificate({
                          id: item.id,
                          certificateCode: item.certificate_id,
                        })
                      }
                      title={
                        !canInitiate
                          ? "You do not have permission to initiate this process."
                          : ""
                      }
                    >
                      Get Started
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-24 text-center flex flex-col items-center justify-center gap-3">
              <p className="text-gray text-lg font-semibold">
                No certificates are available yet.
              </p>
              <p className="text-gray text-sm max-w-md">
                As soon as certificates are published for your organisation,
                they will appear here with full details on scope, pricing and
                required documentation.
              </p>
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-auto pt-10 pb-6 border-t border-dull-white/30 bg-white/50 backdrop-blur-sm sticky bottom-0 -mx-6 px-6 lg:-mx-10 lg:px-10">
          <div className="flex items-center justify-center gap-2 max-w-7xl mx-auto">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-gray hover:text-secondary disabled:opacity-30 transition-all mr-2 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 " /> Back
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const page = idx + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg cursor-pointer flex items-center justify-center text-sm font-semibold transition-all ${currentPage === page ? "bg-secondary text-white shadow-lg" : "text-gray hover:bg-dull-white/20"}`}
                >
                  {page}
                </button>
              );
            })}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="flex cursor-pointer items-center gap-1 px-4 py-2 text-sm font-semibold text-gray hover:text-secondary disabled:opacity-30 transition-all ml-2"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
