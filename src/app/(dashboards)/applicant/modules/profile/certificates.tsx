"use client";

import { useEffect, useState } from "react";
import { axiosInstance } from "@/lib/axios";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { AcesDynamicBadge } from "@/components/AcesDynamicBadge";
import { downloadBadgePdf } from "@/lib/downloadBadgePdf";

const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "bg-zinc-50 rounded-2xl border border-zinc-100 shadow-sm p-4 lg:p-5 flex flex-col",
      className,
    )}
  >
    {children}
  </div>
);

function cn(...inputs: (string | null | undefined | boolean)[]) {
  return inputs.filter(Boolean).join(" ");
}

const Tag = ({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "active" | "expired";
}) => {
  const styles = {
    default: "bg-zinc-100 text-zinc-500",
    active: "bg-green-50 text-green-500",
    expired: "bg-red/5 text-red",
  };
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full text-[10px] font-semibold leading-none",
        styles[variant],
      )}
    >
      {children}
    </span>
  );
};

const PAGE_SIZE = 10;

export function ProfileCertificatesPage() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDownloadingId, setIsDownloadingId] = useState<
    string | number | null
  >(null);

  const handleDownloadCertificate = async (cert: any) => {
    try {
      setIsDownloadingId(cert.id);

      const levelRaw = (cert.badgeLevel || "").toUpperCase();
      const badgeLabel: "RATED" | "VERIFIED" | "CERTIFIED" =
        levelRaw.includes("CERTIFIED") || levelRaw === "GOLD"
          ? "CERTIFIED"
          : levelRaw.includes("VERIFIED") || levelRaw === "SILVER"
            ? "VERIFIED"
            : "RATED";
      const level: "BRONZE" | "SILVER" | "GOLD" =
        badgeLabel === "CERTIFIED"
          ? "GOLD"
          : badgeLabel === "VERIFIED"
            ? "SILVER"
            : "BRONZE";

      const profile = localStorage.getItem("profile");
      let orgName = "Organization";
      try {
        const parsed = JSON.parse(profile || "{}");
        orgName = parsed?.name || parsed?.organization_name || "Organization";
      } catch {
        /* noop */
      }

      // Fetch rich review data for the certificate PDF
      let reviewData: any = null;
      try {
        const reviewRes = await axiosInstance.get(
          `/assessments/${cert.id}/review-overview`,
        );
        reviewData = reviewRes.data?.data || reviewRes.data;
      } catch {
        /* fallback */
      }

      const fmtDate = (d?: string) =>
        d
          ? new Date(d).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : undefined;

      const auditorName =
        reviewData?.auditor?.name ||
        (reviewData?.assignedAuditor?.firstName
          ? `${reviewData.assignedAuditor.firstName} ${reviewData.assignedAuditor.lastName || ""}`.trim()
          : undefined);

      await downloadBadgePdf({
        organizationName: orgName,
        certificateName: cert.title || "Assessment",
        badgeLabel,
        level,
        score: null,
        serialNumber: cert.code || String(cert.id),
        assessmentType: "Self-Disclosure",
        issuedDate: fmtDate(cert.issuedAt || reviewData?.updated_at),
        auditorName,
        auditorEmail: reviewData?.auditor?.email,
        auditorRole: "Lead ESG Auditor",
        reviewerName: reviewData?.reviewer?.name,
        reviewerEmail: reviewData?.reviewer?.email,
        reviewerRole: "Senior ESG Reviewer",
        auditPeriodStart: fmtDate(
          reviewData?.audit_start_date || reviewData?.submitted_at,
        ),
        auditPeriodEnd: fmtDate(
          reviewData?.audit_end_date || reviewData?.updated_at,
        ),
        validUntil: fmtDate(cert.expiresAt || reviewData?.valid_until),
        auditStandard: reviewData?.audit_standard || reviewData?.standard_code,
        auditSummary:
          reviewData?.auditor?.notes?.audit_summary ||
          reviewData?.auditor?.notes?.audit_description,
        assuranceFirmName:
          reviewData?.auditor?.firm_name || reviewData?.assurance_firm,
        assuranceFirmWebsite: reviewData?.auditor?.firm_website,
      });
    } catch (error) {
      console.error("Certificate PDF generation failed", error);
    } finally {
      setIsDownloadingId(null);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    fetchMyCertificates(currentPage);
  }, [currentPage]);

  const fetchMyCertificates = async (page: number) => {
    try {
      setIsLoading(true);
      setLoadingProgress(20);

      const res = await axiosInstance.get("/organization/certificates/issued", {
        params: { limit: PAGE_SIZE, page },
      });

      setLoadingProgress(80);

      const raw = res.data?.data ?? res.data ?? {};
      const items: any[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : [];

      // Derive pagination from meta if present
      const meta = raw?.meta ?? raw?.pagination ?? null;
      if (meta) {
        const total =
          meta.total_pages ?? meta.totalPages ?? meta.last_page ?? null;
        const totalItems = meta.total ?? meta.totalItems ?? meta.count ?? null;
        if (total != null) {
          setTotalPages(total);
        } else if (totalItems != null) {
          setTotalPages(Math.ceil(totalItems / PAGE_SIZE));
        }
      }

      const mapped = items.map((item: any) => {
        const rawStatus = String(
          item.status ?? item.certificate_status ?? "",
        ).toLowerCase();
        const displayStatus = rawStatus === "expired" ? "Expired" : "Active";

        return {
          id: item.id ?? item.assessment_id,
          title:
            item.certificate_name ?? item.name ?? item.certificate?.name ?? "—",
          code:
            item.certificate_code ??
            item.certificate_id ??
            item.certificate?.code ??
            null,
          status: displayStatus,
          category:
            (item.industry_names && item.industry_names[0]) ||
            (item.certificate?.industry_names &&
              item.certificate.industry_names[0]) ||
            item.category ||
            null,
          description:
            item.description ?? item.certificate?.description ?? null,
          issuedAt:
            item.issued_at ?? item.completed_at ?? item.created_at ?? null,
          expiresAt: item.expires_at ?? item.expiry_date ?? null,
          badgeLevel: item.badge_level ?? item.badge_name ?? null,
        };
      });

      setCertificates(mapped);
      setLoadingProgress(100);
    } catch (error) {
      console.error("Failed to fetch issued certificates", error);
      setLoadingProgress(100);
    } finally {
      setTimeout(() => setIsLoading(false), 400);
    }
  };

  return (
    <div className="p-6 lg:p-8 bg-dull-white/10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-8 mb-0">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-secondary">
              My Certificates
            </h1>
            <p className="text-[#A3A3A3] text-[15px] max-w-4xl font-normal">
              View all certificates you have earned in one place. You can easily
              access, download, or share your verified certificates anytime.
            </p>
          </div>

          <h2 className="text-[18px] font-bold text-secondary pb-2">
            Certificate History
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-zinc-50 rounded-2xl border border-zinc-100 p-5 space-y-4"
              >
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
                <div className="flex gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {certificates.length > 0 ? (
                certificates.map((cert, i) => (
                  <Card key={cert.id ?? i} className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5 pr-2">
                        <h3 className="text-sm font-semibold text-[#1F1F1F]">
                          {cert.title}
                        </h3>
                        {cert.code && (
                          <p className="text-[11px] text-[#A3A3A3] font-normal leading-tight">
                            {cert.code}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {cert.category && (
                          <Tag variant="default">{cert.category}</Tag>
                        )}
                        <Tag
                          variant={
                            cert.status === "Expired" ? "expired" : "active"
                          }
                        >
                          {cert.status}
                        </Tag>
                      </div>
                    </div>

                    <div className="pt-0.5">
                      <AcesDynamicBadge
                        size={56}
                        level={cert.badgeLevel || "GOLD"}
                        serial={cert.code || `SN-${cert.id}`}
                        date={
                          cert.issuedAt
                            ? new Date(cert.issuedAt).toLocaleDateString(
                                "en-GB",
                              )
                            : "—"
                        }
                        name={
                          cert.status === "Expired" ? "EXPIRED" : "VERIFIED"
                        }
                        title={cert.name}
                        color={
                          cert.status === "Expired" ? "#EF4444" : undefined
                        }
                      />
                    </div>

                    {cert.description && (
                      <p className="text-[10px] text-[#A3A3A3] font-normal leading-relaxed line-clamp-3">
                        {cert.description}
                      </p>
                    )}

                    {(cert.issuedAt || cert.expiresAt) && (
                      <>
                        <div className="h-px bg-zinc-100" />
                        <div className="flex justify-between items-start gap-4">
                          {cert.issuedAt && (
                            <div className="space-y-0.5 flex-1">
                              <p className="text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wider">
                                Issued
                              </p>
                              <p className="text-[12px] font-semibold text-[#1F1F1F]">
                                {new Date(cert.issuedAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )}
                              </p>
                            </div>
                          )}
                          {cert.expiresAt && (
                            <div className="space-y-0.5 flex-1">
                              <p className="text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wider">
                                Expires
                              </p>
                              <p className="text-[12px] font-semibold text-[#1F1F1F]">
                                {new Date(cert.expiresAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <div className="pt-1 flex justify-end mt-auto">
                      <button
                        onClick={() => handleDownloadCertificate(cert)}
                        disabled={isDownloadingId === cert.id}
                        className="px-4 h-8 rounded-lg bg-[#242424] text-white font-semibold text-[10px] transition-all hover:bg-black flex items-center justify-center disabled:opacity-50"
                      >
                        {isDownloadingId === cert.id
                          ? "Downloading..."
                          : "Download Certificate"}
                      </button>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="col-span-full py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto text-zinc-300">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <p className="text-zinc-400 font-medium">
                    No issued certificates found.
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-4 h-9 rounded-lg border text-sm font-medium flex items-center gap-1 transition-colors ${
                    currentPage === 1
                      ? "bg-[#F5F5F5] text-[#A3A3A3] border-transparent cursor-not-allowed"
                      : "bg-white text-[#1A1A1A] border-[#E5E5E5] hover:bg-gray-50"
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-9 h-9 rounded-lg text-sm font-semibold border transition-all ${
                          currentPage === page
                            ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                            : "bg-white text-[#1A1A1A] border-[#E5E5E5] hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className={`px-4 h-9 rounded-lg border text-sm font-medium flex items-center gap-1 transition-colors ${
                    currentPage === totalPages
                      ? "bg-[#F5F5F5] text-[#A3A3A3] border-transparent cursor-not-allowed"
                      : "bg-white text-[#1A1A1A] border-[#E5E5E5] hover:bg-gray-50"
                  }`}
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
