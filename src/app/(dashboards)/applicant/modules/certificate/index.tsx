"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AcesDynamicBadge } from "@/components/AcesDynamicBadge";
import { ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui";
import { CertificateDetails } from "./details";
import { axiosInstance } from "@/lib/axios";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
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
  created_at?: string;
  validity_days?: number;
  validity_months?: number;
  validity_years?: number;
}

const calculateExpiryDate = (cert: ApiCertificate) => {
  const baseDate = cert.created_at ? new Date(cert.created_at) : new Date();
  const expiryDate = new Date(baseDate);

  if (cert.validity_years)
    expiryDate.setFullYear(expiryDate.getFullYear() + cert.validity_years);
  if (cert.validity_months)
    expiryDate.setMonth(expiryDate.getMonth() + cert.validity_months);
  if (cert.validity_days)
    expiryDate.setDate(expiryDate.getDate() + cert.validity_days);

  return expiryDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const isNewCertificate = (dateString?: string) => {
  if (!dateString) return false;
  const createdAt = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - createdAt.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  return diffInDays >= 0 && diffInDays <= 3;
};

const PriceRangeDropdown = ({
  globalMin,
  globalMax,
  minPrice,
  maxPrice,
  onApply,
  align = "left",
}: {
  globalMin: number;
  globalMax: number;
  minPrice: string;
  maxPrice: string;
  onApply: (min: string, max: string) => void;
  align?: "left" | "right";
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleReset = () => {
    setLocalMin("");
    setLocalMax("");
    onApply("", "");
    setIsOpen(false);
  };

  const hasFilter = minPrice !== "" || maxPrice !== "";

  // Slider Logic
  const minVal = parseFloat(localMin) || globalMin;
  const maxVal = parseFloat(localMax) || globalMax;

  const handleSliderChange = (newMin: number, newMax: number) => {
    setLocalMin(Math.max(globalMin, Math.min(globalMax, newMin)).toString());
    setLocalMax(Math.max(globalMin, Math.min(globalMax, newMax)).toString());
  };

  const range = globalMax - globalMin || 1;
  const minGap = range * 0.05;

  const minPercent = Math.min(
    100,
    Math.max(0, ((minVal - globalMin) / range) * 100),
  );
  const maxPercent = Math.min(
    100,
    Math.max(0, ((maxVal - globalMin) / range) * 100),
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, true);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen]);

  useEffect(() => {
    setLocalMin(minPrice);
    setLocalMax(maxPrice);
  }, [minPrice, maxPrice]);

  const validateAndApply = () => {
    let finalMin =
      localMin === ""
        ? ""
        : Math.max(
            globalMin,
            Math.min(globalMax, parseFloat(localMin) || globalMin),
          ).toString();
    let finalMax =
      localMax === ""
        ? ""
        : Math.max(
            globalMin,
            Math.min(globalMax, parseFloat(localMax) || globalMax),
          ).toString();

    const fMin = parseFloat(finalMin);
    const fMax = parseFloat(finalMax);

    if (!isNaN(fMin) && !isNaN(fMax) && fMin > fMax) {
      finalMin = finalMax;
    }

    onApply(finalMin, finalMax);
    setIsOpen(false);
  };

  return (
    <div className="relative w-fit" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className={`form-dropdown-trigger h-11 px-4 rounded-xl border border-light-gray-2 bg-zinc-50 flex items-center gap-2 ${isOpen ? "ring-2 ring-secondary/10" : ""} ${hasFilter ? "border-secondary/40 bg-secondary/5" : ""}`}
      >
        <span className="whitespace-nowrap text-sm font-medium">
          {hasFilter
            ? `Price: $${minPrice || globalMin}-$${maxPrice || globalMax}`
            : "Price"}
        </span>
        <ChevronDown
          className={`shrink-0 w-4 h-4 text-gray/40 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={contentRef}
            initial={{
              opacity: 0,
              scale: 0.95,
              y: -10,
            }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{
              opacity: 0,
              scale: 0.95,
              y: -10,
            }}
            className={`absolute z-20 w-72 rounded-2xl border border-light-gray-2 bg-zinc-50 shadow-[0_10px_30px_rgba(0,0,0,0.12)] p-5 space-y-5 top-full mt-2 overflow-y-auto max-h-[80vh] scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${align === "right" ? "right-0" : "left-0"}`}
          >
            <div className="space-y-1">
              <p className="text-xs font-bold text-secondary tracking-wider uppercase">
                Price Range
              </p>
              <p className="text-[11px] text-gray/60 font-medium">
                Current bounds:{" "}
                <span className="text-secondary font-semibold">
                  ${globalMin}
                </span>{" "}
                –{" "}
                <span className="text-secondary font-semibold">
                  ${globalMax}
                </span>
              </p>
            </div>

            {/* Range Slider */}
            <div className="px-2 pt-4 pb-2">
              <div className="relative h-1.5 w-full bg-light-gray-2 rounded-full">
                <div
                  className="absolute h-full bg-secondary rounded-full"
                  style={{
                    left: `${Math.min(minPercent, maxPercent)}%`,
                    right: `${100 - Math.max(minPercent, maxPercent)}%`,
                  }}
                />
                <input
                  type="range"
                  min={globalMin}
                  max={globalMax}
                  value={Math.max(globalMin, Math.min(globalMax, minVal))}
                  onChange={(e) => {
                    const val = Math.min(
                      Number(e.target.value),
                      maxVal - minGap,
                    );
                    handleSliderChange(val, maxVal);
                  }}
                  className="absolute w-full -top-1 h-3 pointer-events-none appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-secondary [&::-webkit-slider-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-secondary [&::-moz-range-thumb]:appearance-none z-30"
                />
                <input
                  type="range"
                  min={globalMin}
                  max={globalMax}
                  value={Math.max(globalMin, Math.min(globalMax, maxVal))}
                  onChange={(e) => {
                    const val = Math.max(
                      Number(e.target.value),
                      minVal + minGap,
                    );
                    handleSliderChange(minVal, val);
                  }}
                  className="absolute w-full -top-1 h-3 pointer-events-none appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-secondary [&::-webkit-slider-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-secondary [&::-moz-range-thumb]:appearance-none z-20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray uppercase tracking-tight">
                  Min Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray/40 text-xs">
                    $
                  </span>
                  <input
                    type="number"
                    value={localMin}
                    onChange={(e) => setLocalMin(e.target.value)}
                    className="w-full h-10 pl-6 pr-3 text-sm bg-white border border-light-gray-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/10 transition-all font-medium"
                    placeholder={globalMin.toString()}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray uppercase tracking-tight">
                  Max Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray/40 text-xs">
                    $
                  </span>
                  <input
                    type="number"
                    value={localMax}
                    onChange={(e) => setLocalMax(e.target.value)}
                    className="w-full h-10 pl-6 pr-3 text-sm bg-white border border-light-gray-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/10 transition-all font-medium"
                    placeholder={globalMax.toString()}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleReset}
                className="flex-1 h-10 text-[11px] font-bold text-gray hover:bg-light-gray rounded-xl transition-all border border-light-gray-2"
              >
                Reset
              </button>
              <button
                onClick={validateAndApply}
                className="flex-1 h-10 text-[11px] font-bold bg-secondary text-white rounded-xl transition-all shadow-md shadow-secondary/20 hover:bg-black active:scale-[0.98]"
              >
                Apply
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FilterDropdown = ({
  label,
  options,
  selected,
  onSelect,
  align = "left",
  showSearch = false,
  className = "w-72",
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (val: string) => void;
  align?: "left" | "right";
  showSearch?: boolean;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, true);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((opt) =>
      opt.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [options, searchTerm]);

  return (
    <div className="relative w-fit" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className={`form-dropdown-trigger w-auto h-11 px-4 rounded-xl border border-light-gray-2 bg-zinc-50 flex items-center gap-2 ${isOpen ? "ring-2 ring-secondary/10" : ""}`}
      >
        <span className="whitespace-nowrap text-sm font-medium">
          {selected || label}
        </span>
        <ChevronDown
          className={`shrink-0 w-4 h-4 text-gray/40 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={contentRef}
            initial={{
              opacity: 0,
              scale: 0.95,
              y: -10,
            }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{
              opacity: 0,
              scale: 0.95,
              y: -10,
            }}
            className={`absolute z-20 flex flex-col rounded-xl border border-light-gray-2 bg-zinc-50 shadow-[0_10px_30px_rgba(0,0,0,0.12)] overflow-hidden top-full mt-2 max-h-[80vh] ${align === "right" ? "right-0" : "left-0"} ${className}`}
          >
            {showSearch && (
              <div className="p-3 border-b border-light-gray-2 sticky top-0 bg-zinc-50 z-10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray/40" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 text-[11px] bg-white border border-light-gray-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-secondary/20 font-medium"
                  />
                </div>
              </div>
            )}
            <div className="overflow-y-auto max-h-80 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      onSelect(opt);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`form-dropdown-item py-2 px-4 text-left w-full h-auto ${
                      selected === opt
                        ? "form-dropdown-item-active"
                        : "form-dropdown-item-inactive"
                    }`}
                  >
                    <span className="text-xs truncate block">{opt}</span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-gray-400">
                  No results found
                </div>
              )}
            </div>
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
  const [industryFilter, setIndustryFilter] = useState("Industries");
  const [minPriceFilter, setMinPriceFilter] = useState("");
  const [maxPriceFilter, setMaxPriceFilter] = useState("");
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

  const allCertificateNames = useMemo(() => {
    const names = certificates.map((c) => c.name);
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [certificates]);

  const { globalMinPrice, globalMaxPrice } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    certificates.forEach((cert) => {
      const disc = parseFloat(cert.disclosure_price) || 0;
      const assu = parseFloat(cert.assured_price) || 0;
      const prices = [disc, assu].filter((p) => p > 0);
      if (prices.length > 0) {
        min = Math.min(min, ...prices);
        max = Math.max(max, ...prices);
      }
    });
    return {
      globalMinPrice: min === Infinity ? 0 : Math.floor(min),
      globalMaxPrice: max === -Infinity ? 0 : Math.ceil(max),
    };
  }, [certificates]);

  const filteredCertificates = useMemo(() => {
    let filtered = certificates;

    // Certificate Name filter (First filter - "All")
    if (categoryFilter !== "All") {
      filtered = filtered.filter(
        (cert) => cert.name.toLowerCase() === categoryFilter.toLowerCase(),
      );
    }

    // Industry filter (Second filter)
    if (industryFilter !== "Industries") {
      filtered = filtered.filter((cert) => {
        const industries = (cert.industry_names || []).map((name) =>
          name.toLowerCase(),
        );
        return industries.includes(industryFilter.toLowerCase());
      });
    }

    // Price range filters (Third filter)
    if (minPriceFilter) {
      const min = parseFloat(minPriceFilter);
      filtered = filtered.filter((cert) => {
        const p1 = parseFloat(cert.disclosure_price) || 0;
        const p2 = parseFloat(cert.assured_price) || 0;
        return p1 >= min || p2 >= min;
      });
    }
    if (maxPriceFilter) {
      const max = parseFloat(maxPriceFilter);
      filtered = filtered.filter((cert) => {
        const p1 = parseFloat(cert.disclosure_price) || 0;
        const p2 = parseFloat(cert.assured_price) || 0;
        return (p1 > 0 && p1 <= max) || (p2 > 0 && p2 <= max);
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
  }, [
    certificates,
    categoryFilter,
    industryFilter,
    minPriceFilter,
    maxPriceFilter,
    searchQuery,
  ]);

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
                options={["All", ...allCertificateNames]}
                selected={categoryFilter}
                showSearch={true}
                align="right"
                onSelect={(val) => {
                  setCategoryFilter(val);
                  setCurrentPage(1);
                }}
              />
              <FilterDropdown
                label="Industries"
                options={["Industries", ...allIndustries]}
                selected={industryFilter}
                className="w-56"
                align="right"
                onSelect={(val) => {
                  setIndustryFilter(val);
                  setCurrentPage(1);
                }}
              />
              <PriceRangeDropdown
                globalMin={globalMinPrice}
                globalMax={globalMaxPrice}
                minPrice={minPriceFilter}
                maxPrice={maxPriceFilter}
                align="right"
                onApply={(min, max) => {
                  setMinPriceFilter(min);
                  setMaxPriceFilter(max);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </header>

        {/* Certificate Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative min-h-[200px] items-start">
          {isLoading ? (
            <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-zinc-50 border border-zinc-100 rounded-4xl p-8 space-y-6"
                >
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                  <div className="flex gap-4">
                    <Skeleton className="h-10 w-32 rounded-xl" />
                    <Skeleton className="h-10 w-32 rounded-xl" />
                  </div>
                </div>
              ))}
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
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className="text-lg font-bold truncate text-gray-900 leading-tight"
                        title={item.name}
                      >
                        {item.name}
                      </h3>
                      {isNewCertificate(item.created_at) && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-secondary text-primary text-[10px] font-bold rounded-full animate-pulse shrink-0">
                          <span className="w-1 h-1 bg-primary rounded-full" />
                          NEW
                        </span>
                      )}
                    </div>
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
                    className="w-12 h-12 shrink-0"
                  />
                </div>

                {/* Description */}
                <p className="text-gray-500 text-sm leading-relaxed mb-3 line-clamp-3">
                  {item.description}
                </p>

                <div className="mt-auto">
                  <div className="h-px bg-[#9995] w-full mb-3" />

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
