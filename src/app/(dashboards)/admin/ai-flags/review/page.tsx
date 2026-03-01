"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { axiosInstance } from "@/lib/axios";
import Button from "../../common/button";
import { Loading } from "../../common/Loading";
import { useUser } from "@/contexts/UserContext";

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
}

type AiFlaggedResponse = {
  id: string;
  ai_review_id?: string | null;
  assessment_query_id?: string | null;
  response?: string | null;
  is_flagged?: boolean | null;
  summary?: string | null;
  flag_reason?: string | null;
  ai_suggestion?: string | null;
  risk_level?: string | null;
  category?: string | null;
  confidence_score?: string | null;
  question_text?: string | null;
  question_type?: string | null;
  response_type?: string | null;
  response_value?: string | null;
  applicant_answer?: string | null;
  created_at?: string | null;
};

type AiFlagReview = {
  id?: string;
  flag_status?: string | null;
  review_description?: string | null;
  review_status?: string | null;
  total_flags?: number | null;
  score?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
};

type AiFlagDetailData = {
  organizationName?: string | null;
  certificateName?: string | null;
  assessmentType?: string | null;
  review?: AiFlagReview | null;
  flaggedResponses?: AiFlaggedResponse[] | null;
};

type AiFlagDetailApiResponse = {
  success?: boolean;
  message?: string;
  statusCode?: number;
  timestamp?: string;
  data?: AiFlagDetailData;
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const toTitleCase = (value?: string | null): string => {
  const raw = String(value || "").trim();
  if (!raw) return "N/A";
  return raw
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getRiskBadgeStyle = (riskLevel?: string | null) => {
  const risk = String(riskLevel || "").toLowerCase();
  if (risk === "high") {
    return {
      backgroundColor: "#FFE6E6",
      color: "#DC2626",
      borderColor: "#DC2626",
    };
  }
  if (risk === "medium") {
    return {
      backgroundColor: "#FEF3C7",
      color: "#F59E0B",
      borderColor: "#F59E0B",
    };
  }
  if (risk === "low") {
    return {
      backgroundColor: "#ECFDF3",
      color: "#16A34A",
      borderColor: "#16A34A",
    };
  }

  return {
    backgroundColor: "#F3F4F6",
    color: "#6B7280",
    borderColor: "#D1D5DB",
  };
};

function MetricCard({ icon, title, value }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl p-3 md:p-6 shadow-sm">
      <div className="flex items-center gap-2 md:gap-4">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-md flex items-center justify-center shrink-0 border border-zinc-200">
          {icon}
        </div>

        <div className="flex-1">
          <h3
            className="text-gray mb-1 font-light md:text-[16px] text-[13px]"
            style={{
              color: "#060707",
            }}
          >
            {title}
          </h3>
          <p className="text-secondary font-medium md:text-[19px] text-[15px]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function ReviewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flagId = searchParams.get("id");
  const { profile } = useUser();
  const isSubadmin = profile?.role === "subadmin";
  const permissions = Array.isArray(profile?.permissions)
    ? (profile.permissions as Array<
        string | { resource?: string; action?: string[] }
      >)
    : [];
  const hasActionPermission = (
    resources: string[],
    action: "read" | "write" | "edit" | "delete",
  ) => {
    if (!isSubadmin) return true;
    if (!permissions.length) return false;
    return permissions.some((permission) => {
      if (typeof permission === "string") {
        return action === "read" && resources.includes(permission);
      }
      const actions = Array.isArray(permission.action) ? permission.action : [];
      return (
        resources.includes(permission.resource ?? "") && actions.includes(action)
      );
    });
  };
  const canTakeFlagAction =
    hasActionPermission(["aiFlags"], "write") ||
    hasActionPermission(["aiFlags"], "edit");

  const [detail, setDetail] = useState<AiFlagDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [showLoader, setShowLoader] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const loaderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loaderFinishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    if (!flagId) {
      console.warn("AI flag id is missing in query params");
      return;
    }

    let isCancelled = false;

    const fetchAiFlagDetail = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const response = await axiosInstance.get<AiFlagDetailApiResponse>(
          `/ai-flags/${encodeURIComponent(flagId)}`,
        );
        if (isCancelled) return;
        console.log("AI Flag detail response:", response.data);
        setDetail(response.data?.data ?? null);
      } catch (error) {
        if (isCancelled) return;
        console.error("Failed to fetch AI flag detail:", error);
        setLoadError("Failed to load AI flag details");
        setDetail(null);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchAiFlagDetail();

    return () => {
      isCancelled = true;
    };
  }, [flagId]);

  useEffect(() => {
    if (loaderIntervalRef.current) {
      clearInterval(loaderIntervalRef.current);
      loaderIntervalRef.current = null;
    }
    if (loaderFinishTimeoutRef.current) {
      clearTimeout(loaderFinishTimeoutRef.current);
      loaderFinishTimeoutRef.current = null;
    }

    if (isLoading) {
      setShowLoader(true);
      setLoadingProgress(0);
      loaderIntervalRef.current = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 95) return prev;
          const step = Math.max(1, Math.round((95 - prev) / 8));
          return Math.min(prev + step, 95);
        });
      }, 120);
      return;
    }

    if (showLoader) {
      setLoadingProgress(100);
      loaderFinishTimeoutRef.current = setTimeout(() => {
        setShowLoader(false);
        setLoadingProgress(0);
      }, 300);
    }
  }, [isLoading, showLoader]);

  const flaggedResponses = useMemo(
    () =>
      Array.isArray(detail?.flaggedResponses) ? detail.flaggedResponses : [],
    [detail?.flaggedResponses],
  );
  const review = detail?.review ?? null;

  const categoriesCount = useMemo(() => {
    const categories = new Set(
      flaggedResponses
        .map((item) => String(item.category || "").trim())
        .filter(Boolean),
    );
    return categories.size;
  }, [flaggedResponses]);

  const highestRiskLevel = useMemo(() => {
    const rank: Record<string, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };
    let best: string | null = null;

    flaggedResponses.forEach((item) => {
      const risk = String(item.risk_level || "").toLowerCase().trim();
      if (!risk) return;
      if (!best || (rank[risk] || 0) > (rank[best] || 0)) {
        best = risk;
      }
    });

    return best;
  }, [flaggedResponses]);

  const averageConfidence = useMemo(() => {
    const values = flaggedResponses
      .map((item) => Number.parseFloat(String(item.confidence_score || "")))
      .filter((value) => Number.isFinite(value));

    if (!values.length) return null;
    const total = values.reduce((sum, value) => sum + value, 0);
    return (total / values.length).toFixed(0);
  }, [flaggedResponses]);

  const headerType =
    detail?.assessmentType ||
    (review?.review_status ? toTitleCase(review.review_status) : "N/A");

  const headerFlaggedAt = formatDateTime(
    review?.created_at || flaggedResponses[0]?.created_at || null,
  );

  const analysisSummary =
    review?.review_description ||
    flaggedResponses[0]?.summary ||
    "No summary available";

  const totalFlags =
    typeof review?.total_flags === "number"
      ? review.total_flags
      : flaggedResponses.length;

  if (showLoader) {
    return (
      <div className="p-3 md:p-6 bg-light-gray min-h-screen flex items-center justify-center">
        <Loading isLoading size="sm" progress={loadingProgress} className="p-4" />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 bg-light-gray min-h-screen">
      <div className="flex items-center mb-4 md:mb-6 text-sm">
        <button
          onClick={() => router.push("/admin/ai-flags")}
          className="text-gray hover:text-secondary"
        >
          AI Flags
        </button>
        <span className="flex items-center">
          <svg
            width="23"
            height="23"
            viewBox="0 0 23 23"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="inline mx-1"
          >
            <path
              d="M9.58333 16.5868L14.6702 11.4999L9.58333 6.41309L8.90483 7.09159L13.3132 11.4999L8.90483 15.9083L9.58333 16.5868Z"
              fill="#999999"
            />
          </svg>
        </span>
        <span className="text-secondary">Review</span>
      </div>

      {loadError ? (
        <div className="mb-4 p-3 bg-red/10 border border-red/20 rounded-lg">
          <p className="text-sm font-semibold text-red">{loadError}</p>
        </div>
      ) : null}

      <div className="flex flex-row items-start justify-between mb-4 md:mb-6 gap-3">
        <div className="flex-1">
          <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary mb-1 md:mb-2 leading-[21.6px] align-middle">
            {detail?.organizationName || "N/A"}
          </h1>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <span className="text-[11px] md:text-[13px] font-normal text-gray leading-[18px] align-middle">
              {detail?.certificateName || "N/A"}
            </span>
            <span className="text-[11px] md:text-[13px] font-normal text-gray leading-[18px] align-middle">
              {toTitleCase(headerType)}
            </span>
            <span className="text-[11px] md:text-[13px] font-normal text-gray leading-[18px] align-middle">
              {headerFlaggedAt}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 md:p-4 shadow-sm mb-4 md:mb-6">
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <h4 className="text-[16px] md:text-[18px] font-semibold text-secondary mr-4">
            Quick Actions
          </h4>
          <Button
            className={`shrink-0 px-4 py-2 md:px-8 md:py-2 ${
              !canTakeFlagAction ? "opacity-60 cursor-not-allowed" : ""
            }`}
            disabled={!canTakeFlagAction}
          >
            Improve All & Resolve
          </Button>
          <Button
            variant="secondary"
            className={`px-4 py-1 md:px-6 md:py-2 ${
              !canTakeFlagAction ? "opacity-60 cursor-not-allowed" : ""
            }`}
            disabled={!canTakeFlagAction}
          >
            Escalated All Assessment
          </Button>
        </div>
      </div>

      <div className="mb-4 md:mb-6">
        <div className="mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-secondary mb-1">
            AI Analysis Summary
          </h2>
          <span className="text-[11px] md:text-[13px] font-normal text-gray leading-[18px] align-middle">
            {isLoading ? "Loading..." : analysisSummary}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3.33333 2.5H16.6667C17.125 2.5 17.5 2.875 17.5 3.33333V18.3333C17.5 18.625 17.2792 18.8458 16.9875 18.8458C16.6958 18.8458 16.475 18.625 16.475 18.3333V16.6667H3.525V18.3333C3.525 18.625 3.30417 18.8458 3.0125 18.8458C2.72083 18.8458 2.5 18.625 2.5 18.3333V3.33333C2.5 2.875 2.875 2.5 3.33333 2.5ZM15.8333 14.1667V4.16667H4.16667V14.1667H15.8333Z"
                  fill="#262626"
                />
              </svg>
            }
            title="Flags"
            value={String(totalFlags)}
          />
          <MetricCard
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.66667 3.33333L10 6.66667L13.3333 3.33333H6.66667Z"
                  fill="#262626"
                />
                <rect x="6.66667" y="8.33333" width="6.66667" height="6.66667" fill="#262626" />
                <circle cx="10" cy="15" r="2.5" fill="#262626" />
              </svg>
            }
            title="Categories"
            value={String(categoriesCount)}
          />
          <MetricCard
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 1.66667L2.5 17.5H17.5L10 1.66667ZM10 8.33333V13.3333M10 15H10.0083"
                  stroke="#262626"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            title="Risk Level"
            value={toTitleCase(highestRiskLevel)}
          />
          <MetricCard
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 2.5C5.83333 2.5 2.5 5.83333 2.5 10C2.5 14.1667 5.83333 17.5 10 17.5C14.1667 17.5 17.5 14.1667 17.5 10C17.5 5.83333 14.1667 2.5 10 2.5ZM10 15.8333C6.775 15.8333 4.16667 13.225 4.16667 10C4.16667 6.775 6.775 4.16667 10 4.16667C13.225 4.16667 15.8333 6.775 15.8333 10C15.8333 13.225 13.225 15.8333 10 15.8333Z"
                  fill="#262626"
                />
                <path
                  d="M10 5.83333V10L12.5 12.5"
                  stroke="#262626"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            title="Confidence"
            value={averageConfidence ? `${averageConfidence}%` : "N/A"}
          />
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-lg md:text-xl font-semibold text-secondary mb-1">
          Flagged Responses
        </h2>
      </div>

      {isLoading && !flaggedResponses.length ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-sm text-gray">
          Loading flagged responses...
        </div>
      ) : flaggedResponses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-sm text-gray">
          No flagged responses found.
        </div>
      ) : (
        flaggedResponses.map((item, index) => {
          const applicantAnswer =
            item.applicant_answer || item.response_value || "N/A";
          const isUrlAnswer = /^https?:\/\//i.test(applicantAnswer);
          const riskStyle = getRiskBadgeStyle(item.risk_level);

          return (
            <div key={item.id || `${index}`} className="bg-white rounded-xl shadow-sm mb-4">
              <div className="flex items-start gap-3 p-4 md:p-6 border-b border-zinc-200">
                <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-secondary">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm md:text-base font-medium text-secondary">
                    {item.question_text || "Question not available"}
                  </p>
                </div>
                <span
                  className="px-6 py-1 rounded-md text-xs font-medium border"
                  style={riskStyle}
                >
                  {toTitleCase(item.risk_level)}
                </span>
              </div>

              <div className="p-4 md:p-6">
                <span className="text-[11px] md:text-[13px] font-normal text-gray leading-[18px] align-middle mb-2 block">
                  Applicant&apos;s Answer
                </span>
                <div
                  className="px-4 py-3 border border-zinc-200 rounded-md"
                  style={{ backgroundColor: "#e9e9e9" }}
                >
                  {isUrlAnswer ? (
                    <a
                      href={applicantAnswer}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] md:text-[13px] underline text-secondary"
                    >
                      View uploaded document
                    </a>
                  ) : (
                    <p className="text-[11px] md:text-[13px] font-normal text-secondary leading-[18px] align-middle">
                      {applicantAnswer}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 md:p-6">
                <span className="text-[11px] md:text-[13px] font-normal text-gray leading-[18px] align-middle mb-2 block">
                  AI Flag Reason
                </span>
                <div
                  className="px-4 py-3 rounded-md border"
                  style={{ backgroundColor: "#FFE6E6", borderColor: "#DC2626" }}
                >
                  <p
                    className="text-[11px] md:text-[13px] font-normal text-secondary leading-[18px] align-middle"
                    style={{ color: "#DC2626" }}
                  >
                    {item.flag_reason || item.response || "No flag reason available"}
                  </p>
                </div>
              </div>

              <div className="p-4 md:p-6">
                <span className="text-[11px] md:text-[13px] font-normal text-gray leading-[18px] align-middle mb-2 block">
                  AI Suggestion
                </span>
                <div
                  className="px-4 py-3 rounded-md border"
                  style={{ backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }}
                >
                  <p
                    className="text-[11px] md:text-[13px] font-normal text-secondary leading-[18px] align-middle"
                    style={{ color: "#F59E0B" }}
                  >
                    {item.ai_suggestion || item.summary || "No AI suggestion available"}
                  </p>
                </div>
              </div>
            </div>
          );
        })
      )}

      <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mt-4">
        <div className="flex flex-wrap gap-3">
          <Button
            className={`shrink-0 ${!canTakeFlagAction ? "opacity-60 cursor-not-allowed" : ""}`}
            disabled={!canTakeFlagAction}
          >
            Approve Assessment
          </Button>
          <Button
            variant="secondary"
            className={`px-4 py-2 md:px-6 md:py-3 ${!canTakeFlagAction ? "opacity-60 cursor-not-allowed" : ""}`}
            disabled={!canTakeFlagAction}
          >
            Request Clarification
          </Button>
          <Button
            variant="custom"
            className={`px-4 py-2 md:px-6 md:py-3 text-secondary border border-black ${
              !canTakeFlagAction ? "opacity-60 cursor-not-allowed" : ""
            }`}
            style={{ backgroundColor: "#e9e9e9" }}
            disabled={!canTakeFlagAction}
          >
            Escalate to Audit
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="p-3 md:p-6 bg-light-gray min-h-screen flex items-center justify-center">
          <div className="text-secondary">Loading...</div>
        </div>
      }
    >
      <ReviewPageContent />
    </Suspense>
  );
}
