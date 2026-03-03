"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { axiosInstance } from "@/lib/axios";
import Button from "../../common/button";
import { useUser } from "@/contexts/UserContext";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
}

type ReviewerOption = {
  id: string;
  name: string;
  profile_picture_url?: string;
  tags: string[];
};

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
  assessmentId?: string | null;
  assessment_id?: string | null;
  certificateAssessmentId?: string | null;
  certificate_assessment_id?: string | null;
  flag_status?: string | null;
  review_description?: string | null;
  review_status?: string | null;
  total_flags?: number | null;
  score?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
};

type AiFlagDetailData = {
  assessmentId?: string | null;
  assessment_id?: string | null;
  certificateAssessmentId?: string | null;
  certificate_assessment_id?: string | null;
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

const getInitials = (name: string): string => {
  if (!name || name.trim() === "") return "";
  const nameParts = name.trim().split(/\s+/);
  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }
  return (
    nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
  ).toUpperCase();
};

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string" &&
    (error as { message: string }).message.trim()
  ) {
    return (error as { message: string }).message;
  }

  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof (error.response.data as { message: unknown }).message === "string"
  ) {
    return (error.response.data as { message: string }).message;
  }

  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    typeof error.response.data === "string" &&
    error.response.data.trim()
  ) {
    return error.response.data;
  }

  return fallback;
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
  const REVIEWER_PAGE_SIZE = 10;

  const [detail, setDetail] = useState<AiFlagDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [showLoader, setShowLoader] = useState(false);
  const [, setLoadingProgress] = useState(0);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const [isAssignReviewerModalOpen, setIsAssignReviewerModalOpen] =
    useState(false);
  const [selectedReviewer, setSelectedReviewer] = useState<string | null>(null);
  const [reviewerOptions, setReviewerOptions] = useState<ReviewerOption[]>([]);
  const [reviewerVisibleCount, setReviewerVisibleCount] = useState(10);
  const [isLoadingReviewers, setIsLoadingReviewers] = useState(false);
  const [reviewersError, setReviewersError] = useState<string | null>(null);
  const [isAssigningReviewer, setIsAssigningReviewer] = useState(false);
  const [assignReviewerError, setAssignReviewerError] = useState<string | null>(
    null,
  );
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
  }, [flagId, detailRefreshKey]);

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

  const resolveAssessmentId = (): string | null => {
    const reviewCertificateAssessmentId =
      review?.certificate_assessment_id || review?.certificateAssessmentId;

    if (
      typeof reviewCertificateAssessmentId === "string" &&
      reviewCertificateAssessmentId.trim().length > 0
    ) {
      return reviewCertificateAssessmentId.trim();
    }

    return null;
  };

  const canAssignReviewer = canTakeFlagAction && Boolean(resolveAssessmentId());

  useEffect(() => {
    if (!isAssignReviewerModalOpen || !canTakeFlagAction) return;

    let isCancelled = false;

    const fetchReviewers = async () => {
      setIsLoadingReviewers(true);
      setReviewersError(null);
      try {
        const response = await axiosInstance.get("/reviewers/list");
        if (isCancelled) return;

        const payload = response.data?.data;
        const apiData = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

        const mappedData: ReviewerOption[] = apiData.map((reviewer: any) => ({
          id: reviewer.id,
          name: reviewer.name,
          profile_picture_url:
            reviewer.profile_picture || reviewer.profile_picture_url || "",
          tags: reviewer.tags || [],
        }));

        setReviewerOptions(mappedData);
        setReviewerVisibleCount(REVIEWER_PAGE_SIZE);
      } catch (error) {
        if (!isCancelled) {
          setReviewersError(getApiErrorMessage(error, "Failed to load reviewers"));
          setReviewerOptions([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingReviewers(false);
        }
      }
    };

    void fetchReviewers();

    return () => {
      isCancelled = true;
    };
  }, [canTakeFlagAction, isAssignReviewerModalOpen]);

  const handleReviewerScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const isNearBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight < 80;
    if (!isNearBottom) return;
    if (isLoadingReviewers) return;
    setReviewerVisibleCount((prev) =>
      Math.min(prev + REVIEWER_PAGE_SIZE, reviewerOptions.length),
    );
  };

  const closeAssignReviewerModal = () => {
    if (isAssigningReviewer) return;
    setIsAssignReviewerModalOpen(false);
    setSelectedReviewer(null);
    setAssignReviewerError(null);
  };

  const handleAssignReviewer = async () => {
    if (!canTakeFlagAction) return;
    const assessmentId = resolveAssessmentId();
    if (!assessmentId || !selectedReviewer) return;

    setIsAssigningReviewer(true);
    setAssignReviewerError(null);

    try {
      await axiosInstance.post("/reviewers/assign-assessment", {
        assessmentId,
        reviewerId: selectedReviewer,
      });

      setIsAssignReviewerModalOpen(false);
      setSelectedReviewer(null);
      setAssignReviewerError(null);
      setDetailRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to assign reviewer:", error);
      const apiMessage = getApiErrorMessage(error, "Failed to assign reviewer");
      if (
        typeof apiMessage === "string" &&
        apiMessage.toLowerCase().includes("already assigned to a reviewer")
      ) {
        setAssignReviewerError(
          "This assessment is already assigned to a reviewer.",
        );
      } else {
        setAssignReviewerError(apiMessage);
      }
    } finally {
      setIsAssigningReviewer(false);
    }
  };

  if (showLoader) {
    return (
      <div className="p-3 md:p-6 bg-light-gray min-h-screen">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="space-y-3">
            <Skeleton width="24%" height={16} borderRadius={6} />
            <Skeleton width="38%" height={28} borderRadius={8} />
            <Skeleton width="54%" height={14} borderRadius={6} />
          </div>
          <div className="bg-white rounded-xl p-4 md:p-4 shadow-sm">
            <Skeleton width="26%" height={18} borderRadius={6} />
            <div className="mt-4 flex flex-wrap gap-3">
              <Skeleton width={130} height={38} borderRadius={8} />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`ai-flags-review-metric-skeleton-${idx}`}
                className="bg-white rounded-xl p-4 shadow-sm border border-zinc-100"
              >
                <Skeleton width={34} height={34} borderRadius={8} />
                <Skeleton width="55%" height={14} className="mt-3" />
                <Skeleton width="40%" height={22} className="mt-2" />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={`ai-flags-response-skeleton-${idx}`}
                className="bg-white rounded-xl shadow-sm p-6 space-y-3"
              >
                <Skeleton width="70%" height={18} />
                <Skeleton width="100%" height={14} />
                <Skeleton width="90%" height={14} />
              </div>
            ))}
          </div>
        </div>
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
              !canAssignReviewer ? "opacity-60 cursor-not-allowed" : ""
            }`}
            disabled={!canAssignReviewer}
            onClick={() => {
              setAssignReviewerError(null);
              setSelectedReviewer(null);
              setIsAssignReviewerModalOpen(true);
            }}
          >
            Assign to Reviewer
          </Button>
        </div>
      </div>

      <div className="mb-4 md:mb-6">
        <div className="mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-secondary mb-1">
            AI Analysis Summary
          </h2>
          <div className="text-[11px] md:text-[13px] font-normal text-gray leading-[18px] align-middle">
            {isLoading ? (
              <Skeleton width="55%" height={14} borderRadius={6} />
            ) : (
              analysisSummary
            )}
          </div>
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
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={`ai-flags-loading-response-${idx}`}
              className="bg-white rounded-xl shadow-sm p-6 space-y-3"
            >
              <Skeleton width="68%" height={18} borderRadius={6} />
              <Skeleton width="100%" height={14} borderRadius={6} />
              <Skeleton width="92%" height={14} borderRadius={6} />
              <Skeleton width="86%" height={14} borderRadius={6} />
            </div>
          ))}
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

      {isAssignReviewerModalOpen && canTakeFlagAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeAssignReviewerModal}
          ></div>

          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-xl mx-4 p-4 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-secondary mb-2">
                  Assign Management Reviewer
                </h3>
                <p className="text-xs md:text-sm" style={{ color: "#999999" }}>
                  Select a reviewer to review the assessment for{" "}
                  {detail?.organizationName || "this organization"}
                </p>
              </div>
              <button
                onClick={closeAssignReviewerModal}
                className="ml-4 p-1 hover:bg-zinc-100 rounded transition-colors"
                disabled={isAssigningReviewer}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M5.47007 5.46983C5.6107 5.32938 5.80132 5.25049 6.00007 5.25049C6.19882 5.25049 6.38945 5.32938 6.53007 5.46983L18.5301 17.4698C18.6038 17.5385 18.6629 17.6213 18.7039 17.7133C18.7448 17.8053 18.7669 17.9046 18.7687 18.0053C18.7704 18.106 18.7519 18.206 18.7142 18.2994C18.6765 18.3928 18.6203 18.4776 18.5491 18.5489C18.4779 18.6201 18.3931 18.6762 18.2997 18.714C18.2063 18.7517 18.1063 18.7702 18.0056 18.7684C17.9048 18.7666 17.8055 18.7446 17.7135 18.7036C17.6215 18.6626 17.5387 18.6035 17.4701 18.5298L5.47007 6.52983C5.32962 6.3892 5.25073 6.19858 5.25073 5.99983C5.25073 5.80108 5.32962 5.61045 5.47007 5.46983Z"
                    fill="#262626"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M18.5301 5.46983C18.6705 5.61045 18.7494 5.80108 18.7494 5.99983C18.7494 6.19858 18.6705 6.3892 18.5301 6.52983L6.53009 18.5298C6.38792 18.6623 6.19987 18.7344 6.00557 18.731C5.81127 18.7276 5.62588 18.6489 5.48847 18.5114C5.35106 18.374 5.27234 18.1887 5.26892 17.9944C5.26549 17.8 5.33761 17.612 5.47009 17.4698L17.4701 5.46983C17.6107 5.32938 17.8013 5.25049 18.0001 5.25049C18.1988 5.25049 18.3895 5.32938 18.5301 5.46983Z"
                    fill="#262626"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-6 mt-6">
              <div
                style={{ background: "#F6F6F6" }}
                className="px-4 py-3 rounded-lg"
              >
                <label className="block text-sm font-normal text-gray-500 mb-1">
                  Certification
                </label>
                <div>
                  <p className="text-base font-semibold text-secondary">
                    {detail?.certificateName || "N/A"}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-500 mb-3">
                  Select Reviewer
                </label>
                <div
                  className="space-y-3 max-h-[400px] overflow-y-auto"
                  onScroll={handleReviewerScroll}
                >
                  {isLoadingReviewers && (
                    <div className="space-y-2 px-1">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <div
                          key={`reviewer-option-skeleton-${idx}`}
                          className="p-3 border border-zinc-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Skeleton circle width={40} height={40} />
                            <div className="flex-1 space-y-2">
                              <Skeleton width="45%" height={14} />
                              <Skeleton width="70%" height={12} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {reviewersError && (
                    <div className="text-xs text-red-500 px-2">{reviewersError}</div>
                  )}

                  {reviewerOptions
                    .slice(0, reviewerVisibleCount)
                    .map((reviewer) => {
                      const isSelected = selectedReviewer === reviewer.id;
                      const hasProfilePicture =
                        reviewer.profile_picture_url &&
                        reviewer.profile_picture_url.trim() !== "";

                      return (
                        <button
                          key={reviewer.id}
                          onClick={() => setSelectedReviewer(reviewer.id)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            isSelected
                              ? "border-dull-gray bg-primary"
                              : "border-zinc-200 hover:border-zinc-300 hover:bg-primary"
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center shrink-0 overflow-hidden">
                              {hasProfilePicture ? (
                                <img
                                  src={reviewer.profile_picture_url}
                                  alt={reviewer.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-base font-semibold text-zinc-600">
                                  {getInitials(reviewer.name)}
                                </span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-base font-semibold text-secondary mb-2">
                                {reviewer.name}
                              </h4>

                              <div className="flex flex-wrap gap-1.5">
                                {reviewer.tags.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 rounded-md text-[9px] md:text-xs font-normal text-secondary"
                                    style={{ backgroundColor: "#e9e9e9" }}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {isSelected && (
                              <div className="shrink-0">
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 20 20"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM8 15L3 10L4.41 8.59L8 12.17L15.59 4.58L17 6L8 15Z"
                                    fill="#8E8E8E"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {assignReviewerError && (
              <div className="mt-4 text-xs text-red-500">{assignReviewerError}</div>
            )}

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={closeAssignReviewerModal}
                className="px-4 py-1.5 md:px-8 md:py-2 bg-white border border-black rounded-lg text-sm md:text-base font-medium text-secondary hover:bg-zinc-50 transition-colors w-[160px]"
                disabled={isAssigningReviewer}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleAssignReviewer()}
                disabled={
                  !selectedReviewer || isAssigningReviewer || !canTakeFlagAction
                }
                className="px-4 py-1.5 md:px-8 md:py-2 bg-dull-gray text-primary rounded-lg hover:bg-dull-gray/90 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  fontFamily: "Public Sans",
                  fontWeight: 600,
                  fontStyle: "normal",
                  fontSize: "16px",
                  lineHeight: "24px",
                  letterSpacing: "0%",
                  verticalAlign: "middle",
                  boxShadow:
                    "0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)",
                }}
              >
                {isAssigningReviewer ? "Assigning..." : "Assign Reviewer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="p-3 md:p-6 bg-light-gray min-h-screen">
          <div className="max-w-6xl mx-auto space-y-6">
            <Skeleton width="24%" height={16} borderRadius={6} />
            <Skeleton width="36%" height={28} borderRadius={8} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={`ai-flags-review-fallback-metric-${idx}`}
                  className="bg-white rounded-xl p-4 shadow-sm border border-zinc-100"
                >
                  <Skeleton width={34} height={34} borderRadius={8} />
                  <Skeleton width="55%" height={14} className="mt-3" />
                  <Skeleton width="40%" height={22} className="mt-2" />
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={`ai-flags-review-fallback-row-${idx}`}
                  className="bg-white rounded-xl shadow-sm p-6 space-y-3"
                >
                  <Skeleton width="68%" height={18} borderRadius={6} />
                  <Skeleton width="100%" height={14} borderRadius={6} />
                  <Skeleton width="92%" height={14} borderRadius={6} />
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <ReviewPageContent />
    </Suspense>
  );
}
