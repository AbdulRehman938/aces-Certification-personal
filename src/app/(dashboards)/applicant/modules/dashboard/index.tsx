"use client";

import { Button } from "@/components/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import { axiosInstance } from "@/lib/axios";
import { persistOrganizationId } from "@/lib/auth-utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Trophy,
  Clock,
  CheckCircle2,
  Search,
} from "lucide-react";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from "recharts";
import { CertificateDetails } from "../certificate/details";
import {
  SubmissionDetails,
  SubmissionCertificate,
} from "../certificate/submission-details";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import { Tooltip } from "@/components/ui/tooltip";
import { AcesDynamicBadge } from "@/components/AcesDynamicBadge";
import { downloadBadgePdf } from "@/lib/downloadBadgePdf";

export enum AssessmentStatusEnum {
  IN_PROGRESS = "in_progress",
  SUBMITTED = "submitted",
  AI_REVIEWING = "ai_reviewing",
  COMPLETED = "completed",
  EXPIRED = "expired",
  FAILED = "failed",
}

const ASSESSMENT_STATUS_DESCRIPTIONS: Record<string, string> = {
  [AssessmentStatusEnum.IN_PROGRESS]:
    "Access your assessment and complete the required sections to begin your ESG journey.",
  [AssessmentStatusEnum.SUBMITTED]:
    "Your assessment has been submitted and is currently in the queue for review. Check back soon for updates.",
  [AssessmentStatusEnum.AI_REVIEWING]:
    "Your assessment has been submitted and is currently being reviewed by our AI system. Check back soon for your score.",
  [AssessmentStatusEnum.COMPLETED]:
    "Congratulations! Your assessment is complete. You can now track your progress and manage your documentation.",
  [AssessmentStatusEnum.EXPIRED]:
    "This certification has expired. Please renew it to maintain your status and access all benefits.",
  [AssessmentStatusEnum.FAILED]:
    "Your assessment did not meet the required score. Please check the results for flags or contact your administrator.",
};

interface DashboardCertificate extends SubmissionCertificate {
  id: string | number;
  category: string;
  status: string;
  type?: string;
  subDescription?: string;
  description?: string;
  longDescription?: string;
  progress?: number;
  total?: number;
  tags?: string[];
  currentLevel?: string;
  statusBadge?: string;
  badge?: string;
  pricingRows?: Array<{ label: string; sub: string }>;
  isSubmitted?: boolean;
  certificateId?: string;
  paymentId?: string;
  assessmentType?: string;
  branchId?: string | null;
  isPending?: boolean;
  badges?: any[];
  validity?: string;
  questionsCount?: number;
  certificateProductId?: string;
  apiStatus?: string;
}

interface Recommendation {
  id: string | number;
  title: string;
  code: string;
  category: string;
  tags: string[];
  description: string;
  matchingIndustriesCount: number;
  showAssuredBadge: boolean;
  pricing: Array<{ label: string; sub: string }>;
  name: string;
  disclosure_price: string;
  assured_price: string;
  badges?: any[];
  validity?: string;
  questionsCount?: number;
}

const overviewCertificates: DashboardCertificate[] = [];

const CircularProgress = ({
  progress = 0,
  total = 100,
  label,
}: {
  progress?: number;
  total?: number;
  label?: string;
}) => {
  const percentage = total > 0 ? (progress / total) * 100 : 0;
  const data = [
    {
      name: "progress",
      value: percentage,
      fill: "#1A1A1A",
    },
  ];

  return (
    <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="85%"
          outerRadius="100%"
          barSize={10}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background={{ fill: "#E5E5E5" }}
            dataKey="value"
            cornerRadius={0}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0  flex flex-col items-center justify-center">
        <span className="text-[14px] font-semibold text-[#1A1A1A] tracking-tight">
          {label ? label : `${progress}/${total}`}
        </span>
      </div>
    </div>
  );
};

export function DashboardPage() {
  const router = useRouter();
  const isEmployee = false;
  const base = "/applicant";
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const notificationActionParam = searchParams.get("notification_action");
  const notificationAssessmentIdParam = searchParams.get("assessment_id");
  const notificationCertificateIdParam = searchParams.get("certificate_id");
  const notificationTabParam = searchParams.get("tab");
  const sidParam = searchParams.get("sid");
  const [selectedCert, setSelectedCert] = useState<{
    id: number | string;
    title: string;
    category: string;
  } | null>(null);
  const [selectedSubmission, setSelectedSubmission] =
    useState<DashboardCertificate | null>(null);
  const [activeTab, setActiveTab] = useState("In Progress");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2;
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [tabSearchQueries, setTabSearchQueries] = useState<
    Record<string, string>
  >({
    "In Progress": "",
    Active: "",
    Failed: "",
    Expired: "",
  });
  const [isLoading, setIsLoading] = useState(true);

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

  const { isEmployee: isEmployeeRole, hasAccess } =
    useEmployeePermissions(profileData);
  const canAccessCertificates = !isEmployeeRole || hasAccess("certificates");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [totalRecommendations, setTotalRecommendations] = useState(0);
  const [certificates, setCertificates] = useState<DashboardCertificate[]>([]);
  const [messageModal, setMessageModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "error" | "success" | "info";
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    show: false,
    title: "",
    message: "",
    type: "info",
  });

  const [pollingId, setPollingId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isDownloadingId, setIsDownloadingId] = useState<
    string | number | null
  >(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [resultsData, setResultsData] = useState<any>(null);
  const [selectedCertForResults, setSelectedCertForResults] =
    useState<DashboardCertificate | null>(null);
  const [flaggedQuestions, setFlaggedQuestions] = useState<any[]>([]);
  const [isFlagsLoading, setIsFlagsLoading] = useState(false);
  const resultsStatus = String(resultsData?.status || "").toLowerCase();
  const isResultsBlocked = resultsStatus.includes("blocked");
  const isResultsRejected = resultsStatus.includes("rejected");
  const isResultsFailed =
    resultsStatus === "failed" ||
    isResultsBlocked ||
    isResultsRejected ||
    (resultsData?.score !== null && resultsData?.score < 70);
  const isNoFlagsRestartState =
    resultsData?.score === null &&
    flaggedQuestions.length === 0 &&
    !isFlagsLoading;
  const isResultsPending =
    (resultsStatus === "ai_reviewing" ||
      resultsStatus === "pending" ||
      resultsStatus.includes("review")) &&
    !isNoFlagsRestartState;
  const canShowNumericScore =
    !isResultsPending && !(isResultsBlocked || isResultsRejected);

  const showMessage = (
    title: string,
    message: string,
    type: "error" | "success" | "info" = "info",
    onConfirm?: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string,
  ) => {
    setMessageModal({
      show: true,
      title,
      message,
      type,
      onConfirm,
      onCancel,
      confirmText,
      cancelText,
    });
  };

  const handleDownloadBadge = async (cert: DashboardCertificate) => {
    const certId = cert.id;
    try {
      setIsDownloadingId(certId);

      // Determine badge level from score if we can fetch it
      let score: number | null = null;
      try {
        const scoreRes = await axiosInstance.get(
          `/assessments/${certId}/score`,
          {
            headers: { "Assessment-UUID": String(certId) },
          },
        );
        score = scoreRes.data?.data?.score ?? null;
      } catch {
        // Score not available — use null
      }

      const badgeLabel: "RATED" | "VERIFIED" | "CERTIFIED" =
        score !== null && score >= 90
          ? "CERTIFIED"
          : score !== null && score >= 80
            ? "VERIFIED"
            : "RATED";

      const level: "BRONZE" | "SILVER" | "GOLD" =
        badgeLabel === "CERTIFIED"
          ? "GOLD"
          : badgeLabel === "VERIFIED"
            ? "SILVER"
            : "BRONZE";

      // Fetch org name from local storage or profile API
      const profile = localStorage.getItem("profile");
      let orgName = "Organization";
      try {
        const parsed = JSON.parse(profile || "{}");
        orgName = parsed?.name || parsed?.organization_name || "Organization";
      } catch {
        /* noop */
      }

      // Fetch detailed review data for rich PDF
      let reviewData: any = null;
      try {
        const reviewRes = await axiosInstance.get(
          `/assessments/${certId}/review-overview`,
        );
        reviewData = reviewRes.data?.data || reviewRes.data;
      } catch {
        // fallback gracefully
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
        reviewData?.auditor_name ||
        (reviewData?.assignedAuditor?.firstName
          ? `${reviewData.assignedAuditor.firstName} ${reviewData.assignedAuditor.lastName || ""}`.trim()
          : undefined);

      const reviewerName =
        reviewData?.reviewer?.name || reviewData?.reviewer_name;

      await downloadBadgePdf({
        organizationName: orgName,
        certificateName: cert.title || "Assessment",
        badgeLabel,
        level,
        score,
        serialNumber: String(certId),
        assessmentType: cert.type || "Self-Disclosure",
        issuedDate: fmtDate(reviewData?.updated_at || reviewData?.created_at),
        auditorName,
        auditorEmail: reviewData?.auditor?.email,
        auditorRole: "Lead ESG Auditor",
        reviewerName,
        reviewerEmail: reviewData?.reviewer?.email,
        reviewerRole: "Senior ESG Reviewer",
        auditPeriodStart: fmtDate(
          reviewData?.audit_start_date || reviewData?.submitted_at,
        ),
        auditPeriodEnd: fmtDate(
          reviewData?.audit_end_date || reviewData?.updated_at,
        ),
        validUntil: fmtDate(reviewData?.valid_until || reviewData?.expiry_date),
        auditStandard: reviewData?.audit_standard || reviewData?.standard_code,
        auditSummary:
          reviewData?.auditor?.notes?.audit_summary ||
          reviewData?.auditor?.notes?.audit_description,
        assuranceFirmName:
          reviewData?.auditor?.firm_name || reviewData?.assurance_firm,
        assuranceFirmWebsite: reviewData?.auditor?.firm_website,
      });
    } catch (error) {
      console.error("Badge PDF generation failed", error);
    } finally {
      setIsDownloadingId(null);
    }
  };

  const initDashboard = async (silent = false) => {
    if (typeof window === "undefined") return;

    if (!silent) {
      setIsLoading(true);
      setLoadingProgress(10);
    }

    try {
      try {
        if (isEmployee) {
          const empResponse = await axiosInstance.get("/employee/my-profile");
          const data = empResponse?.data?.data || empResponse?.data;
          if (data) {
            const processed = {
              ...data,
              name: `${data.first_name} ${data.last_name}`.trim(),
              _type: "employee",
            };
            localStorage.setItem(
              "organization_profile",
              JSON.stringify(processed),
            );
            const orgId = data?.organization_id || data?.user_id || data?.id;
            if (orgId && orgId !== "undefined" && orgId !== "null") {
              persistOrganizationId(orgId);
            }
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new Event("profile-updated"));
          }
        } else {
          try {
            const response = await axiosInstance.get("/organization/profile");
            const data = response?.data?.data || response?.data;
            if (data) {
              const processed = { ...data, _type: "organization" };
              localStorage.setItem("profile_type", "organization");
              localStorage.setItem(
                "organization_profile",
                JSON.stringify(processed),
              );
              const orgId = data?.organization_id || data?.user_id || data?.id;
              if (orgId && orgId !== "undefined" && orgId !== "null") {
                persistOrganizationId(orgId);
              }
              window.dispatchEvent(new Event("storage"));
              window.dispatchEvent(new Event("profile-updated"));
            }
          } catch (orgErr: any) {
            if (orgErr.status === 404 || orgErr.response?.status === 404) {
              const empResponse = await axiosInstance.get(
                "/employee/my-profile",
              );
              const data = empResponse?.data?.data || empResponse?.data;
              if (data) {
                const processed = {
                  ...data,
                  name: `${data.first_name} ${data.last_name}`.trim(),
                  _type: "employee",
                };
                localStorage.setItem("profile_type", "employee");
                localStorage.setItem(
                  "organization_profile",
                  JSON.stringify(processed),
                );
                const orgId =
                  data?.organization_id || data?.user_id || data?.id;
                if (orgId && orgId !== "undefined" && orgId !== "null") {
                  persistOrganizationId(orgId);
                }
                setProfileData(processed);
                window.dispatchEvent(new Event("storage"));
                window.dispatchEvent(new Event("profile-updated"));
              }
            } else {
              throw orgErr;
            }
          }
        }
      } catch (profileErr) {
        console.error("Failed to fetch profile in dashboard", profileErr);
      }
      setLoadingProgress(40);

      try {
        const response = await axiosInstance.get("/recommended-certificates", {
          params: { page: 1, limit: 6 },
        });
        const apiData = response.data?.data?.data || response.data?.data || [];
        const totalCount = response.data?.data?.total || apiData.length;
        setTotalRecommendations(totalCount);
        const mapped = apiData.map((item: any) => ({
          id: item.id,
          title: item.name,
          code: item.certificate_id,
          category:
            item.industry_names && item.industry_names.length > 0
              ? item.industry_names[0]
              : "General",
          tags: item.badges?.map((b: any) => b.name) || [],
          description: item.description || "No description available.",
          matchingIndustriesCount: Number(item.matching_industries_count) || 0,
          showAssuredBadge: true,
          pricing: [
            {
              label: `Self-disclosure: USD ${item.disclosure_price}`,
              sub: "Per property, online checklist.",
            },
            {
              label: `Assured: USD ${item.assured_price}`,
              sub: "Per certification, range by size and complexity.",
            },
          ],
          name: item.name,
          disclosure_price: item.disclosure_price,
          assured_price: item.assured_price,
          badges: item.badges || [],
          validity:
            item.validity_years > 0
              ? `${item.validity_years} Year${item.validity_years > 1 ? "s" : ""}`
              : item.validity_months > 0
                ? `${item.validity_months} Months`
                : "N/A",
          questionsCount: item.questions_count,
        }));
        setRecommendations(mapped);
        setLoadingProgress(70);
      } catch (error) {
        console.error("Failed to fetch recommendations", error);
        setLoadingProgress(70);
      }

      let allCerts: DashboardCertificate[] = [];
      try {
        const assessmentsRes = await axiosInstance.get("/assessments", {
          params: { page: 1, limit: 100 },
        });
        const apiData =
          assessmentsRes.data?.data?.data || assessmentsRes.data?.data || [];

        allCerts = apiData.map((item: any) => {
          const rawStatus = String(item.status || "").toLowerCase();
          let displayStatus = "In Progress";

          const rawScore = item.score;
          const scoreNum =
            rawScore !== undefined && rawScore !== null && rawScore !== ""
              ? parseFloat(rawScore)
              : null;

          if (
            rawStatus === AssessmentStatusEnum.EXPIRED ||
            rawStatus === "rejected"
          ) {
            displayStatus = "Expired";
          } else if (
            rawStatus === "failed" ||
            rawStatus === "submitted" ||
            (scoreNum !== null && !isNaN(scoreNum) && scoreNum < 70)
          ) {
            displayStatus = "Failed";
          } else if (
            rawStatus === "active" ||
            rawStatus === AssessmentStatusEnum.COMPLETED ||
            rawStatus === "passed" ||
            rawStatus === "published" ||
            rawStatus === "certified"
          ) {
            displayStatus = "Active";
          } else {
            displayStatus = "In Progress";
          }

          const isAIReviewing =
            (rawStatus === AssessmentStatusEnum.AI_REVIEWING ||
              rawStatus === AssessmentStatusEnum.SUBMITTED ||
              rawStatus === "awaiting_review" ||
              item.is_submitted) &&
            displayStatus === "In Progress";

          const total = parseInt(item.total_questions) || 0;
          const progress = parseInt(item.answered_questions) || 0;

          // Static description based on status
          const getStaticDescription = (status: string, dStatus: string) => {
            if (dStatus === "Failed")
              return ASSESSMENT_STATUS_DESCRIPTIONS[
                AssessmentStatusEnum.FAILED
              ];
            if (dStatus === "Expired")
              return ASSESSMENT_STATUS_DESCRIPTIONS[
                AssessmentStatusEnum.EXPIRED
              ];

            if (ASSESSMENT_STATUS_DESCRIPTIONS[status]) {
              return ASSESSMENT_STATUS_DESCRIPTIONS[status];
            }
            // Handle synonyms or variations
            if (
              status === "active" ||
              status === "published" ||
              status === "certified" ||
              status === "passed"
            ) {
              return ASSESSMENT_STATUS_DESCRIPTIONS[
                AssessmentStatusEnum.COMPLETED
              ];
            }
            if (status === "pending" || status === "awaiting_review") {
              return ASSESSMENT_STATUS_DESCRIPTIONS[
                AssessmentStatusEnum.SUBMITTED
              ];
            }
            if (status === "rejected" || status === "failed") {
              return ASSESSMENT_STATUS_DESCRIPTIONS[
                AssessmentStatusEnum.EXPIRED
              ];
            }
            return null;
          };

          const staticDescription =
            getStaticDescription(rawStatus, displayStatus) ||
            item.certificate_description ||
            item.description ||
            "Access your assessment and complete the required sections.";

          return {
            id: item.id,
            title: item.certificate_name || item.name || "Assessment",
            category: "General",
            status: displayStatus,
            apiStatus: rawStatus,
            type:
              item.assessment_type === "self_disclosure"
                ? "Self-disclosure"
                : "Assured",
            description: staticDescription,
            progress: isAIReviewing ? 100 : progress,
            total: isAIReviewing ? 100 : total || 10,
            isPending: isAIReviewing,
            isSubmitted:
              item.is_submitted ||
              rawStatus === AssessmentStatusEnum.AI_REVIEWING ||
              rawStatus === AssessmentStatusEnum.COMPLETED ||
              rawStatus === "passed",
            certificateId: item.certificate_id,
            paymentId: item.payment_id,
            assessmentType: item.assessment_type,
            branchId: item.branch_id,
            subDescription: item.certificate_id,
            badges: item.badges || [],
            validity:
              item.validity_years > 0
                ? `${item.validity_years} Year${item.validity_years > 1 ? "s" : ""}`
                : item.validity_months > 0
                  ? `${item.validity_months} Months`
                  : "N/A",
            questionsCount: item.questions_count,
            certificateProductId: item.certificate_product_id,
          };
        });
      } catch (error) {
        console.error("Failed to fetch assessments", error);
      }

      setCertificates(allCerts);

      if (sidParam && !silent) {
        const match = allCerts.find((c) => String(c.id) === sidParam);
        if (match) {
          if (match.status === "In Progress") {
            handleContinueSubmission(match);
          } else {
            const params = new URLSearchParams(window.location.search);
            params.delete("sid");
            router.replace(
              `${base}${params.toString() ? "?" + params.toString() : ""}`,
            );
          }
        }
      }

      setLoadingProgress(100);
      if (!silent) setTimeout(() => setIsLoading(false), 500);
    } catch (e) {
      console.error("Dashboard Init Error", e);
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    initDashboard();
  }, []);

  const [isCheckingId, setIsCheckingId] = useState<string | number | null>(
    null,
  );

  const handleCheckResults = async (
    certOrId: DashboardCertificate | string | number,
  ) => {
    const cert =
      typeof certOrId === "object"
        ? certOrId
        : certificates.find((c) => String(c.id) === String(certOrId));

    if (!cert) return;

    setSelectedCertForResults(cert);
    setIsCheckingId(cert.id);
    try {
      const response = await axiosInstance.get(`/assessments/${cert.id}/score`);

      const data = response.data?.data || response.data;

      if (data && typeof data === "object") {
        setResultsData(data);
        setFlaggedQuestions([]); // Clear previous

        // If score is null or less than 70%, fetch flagged questions with UUID header
        const score = data.score;
        const needsFlags =
          score === null || (typeof score === "number" && score < 70);

        if (needsFlags) {
          setIsFlagsLoading(true);
          try {
            const flagsRes = await axiosInstance.get(
              `/assessments/${cert.id}/flagged-questions`,
              {
                headers: {
                  "Assessment-UUID": String(cert.id),
                },
              },
            );
            if (flagsRes.data?.success) {
              setFlaggedQuestions(flagsRes.data.data || []);
            }
          } catch (flagErr) {
            console.error("Failed to fetch flags", flagErr);
          } finally {
            setIsFlagsLoading(false);
          }
        }

        setShowResultsModal(true);
        if (
          data.score !== undefined ||
          ["completed", "passed", "failed"].includes(data.status)
        ) {
          initDashboard(true);
        }
      } else {
        showMessage(
          "Review In Progress",
          "Your assessment is still being reviewed by our AI system. Please check back later.",
          "info",
        );
      }
    } catch (error) {
      console.error("Check Results Error", error);
      showMessage(
        "Check Failed",
        "Unable to retrieve results at this time. Please try again.",
        "error",
      );
    } finally {
      setIsCheckingId(null);
    }
  };

  const handleRestartAssessment = async () => {
    if (!selectedCertForResults) return;

    try {
      setIsCheckingId(selectedCertForResults.id);

      // We call POST /assessments to start a fresh one with the SAME payment
      const response = await axiosInstance.post("/assessments", {
        certificate_id: selectedCertForResults.certificateId,
        payment_id: selectedCertForResults.paymentId,
        assessment_type: selectedCertForResults.assessmentType || "assured",
        branch_id: selectedCertForResults.branchId || null,
      });

      if (response.data?.success) {
        const newAssessment = response.data.data;
        localStorage.setItem(
          "pending_assessment_ids",
          JSON.stringify({
            assessment_id: newAssessment.id,
            certificate_id: selectedCertForResults.certificateId,
            payment_id: selectedCertForResults.paymentId,
            assessment_type: selectedCertForResults.assessmentType,
          }),
        );
        router.push(`${base}/assessment`);
      }
    } catch (error: any) {
      console.error("Restart Assessment Error", error);
      showMessage(
        "Restart Failed",
        error.response?.data?.message ||
          "Unable to restart the assessment. Please try again.",
        "error",
      );
    } finally {
      setIsCheckingId(null);
    }
  };

  const lastNotificationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const hasAnyNotificationParam =
      !!notificationActionParam ||
      !!notificationAssessmentIdParam ||
      !!notificationCertificateIdParam ||
      !!notificationTabParam;

    if (!hasAnyNotificationParam) return;
    if (isLoading) return;

    const notificationKey = [
      notificationActionParam || "",
      notificationAssessmentIdParam || "",
      notificationCertificateIdParam || "",
      notificationTabParam || "",
    ].join("|");

    if (lastNotificationKeyRef.current === notificationKey) return;
    lastNotificationKeyRef.current = notificationKey;

    const allowedTabs = new Set(["In Progress", "Active", "Expired"]);
    const nextTab = allowedTabs.has(String(notificationTabParam || ""))
      ? (String(notificationTabParam) as "In Progress" | "Active" | "Expired")
      : null;

    if (nextTab) {
      setActiveTab(nextTab);
      setCurrentPage(1);
    }

    const clearNotificationParams = () => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("notification_action");
      params.delete("assessment_id");
      params.delete("certificate_id");
      params.delete("tab");
      const qs = params.toString();
      router.replace(qs ? `${base}?${qs}` : `${base}`);
    };

    const assessmentId = String(notificationAssessmentIdParam || "").trim();
    const certificateId = String(notificationCertificateIdParam || "").trim();

    if (assessmentId && notificationActionParam === "dashboard_results") {
      void handleCheckResults(assessmentId);
      clearNotificationParams();
      return;
    }

    if (assessmentId && notificationActionParam === "dashboard_submission") {
      const match = certificates.find((c) => String(c.id) === assessmentId);
      if (match) {
        if (match.status === "In Progress") {
          handleContinueSubmission(match);
        } else {
          setSelectedSubmission(match);
        }
      } else {
        showMessage(
          "Certificate Not Found",
          "We could not open the certificate referenced by this notification. Please refresh your dashboard and try again.",
          "error",
        );
      }
      clearNotificationParams();
      return;
    }

    if (
      certificateId &&
      (notificationActionParam === "dashboard_certificate_results" ||
        notificationActionParam === "dashboard_certificate_submission")
    ) {
      const match = certificates.find(
        (c) =>
          String(c.certificateId || "") === certificateId ||
          String(c.subDescription || "") === certificateId,
      );

      if (!match) {
        showMessage(
          "Certificate Not Found",
          "We could not open the certificate referenced by this notification. Please refresh your dashboard and try again.",
          "error",
        );
        clearNotificationParams();
        return;
      }

      if (notificationActionParam === "dashboard_certificate_results") {
        void handleCheckResults(match.id);
      } else {
        if (match.status === "In Progress") {
          handleContinueSubmission(match);
        } else {
          setSelectedSubmission(match);
        }
      }

      clearNotificationParams();
      return;
    }

    clearNotificationParams();
  }, [
    notificationActionParam,
    notificationAssessmentIdParam,
    notificationCertificateIdParam,
    notificationTabParam,
    isLoading,
    certificates,
    handleCheckResults,
    showMessage,
    router,
    searchParams,
  ]);

  useEffect(() => {
    if (showResultsModal || messageModal.show) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showResultsModal, messageModal.show]);

  const filteredCertificates = useMemo(() => {
    let filtered = certificates.filter((cert) => cert.status === activeTab);
    const tabSearch = tabSearchQueries[activeTab] || "";

    if (tabSearch) {
      const q = tabSearch.toLowerCase();
      filtered = filtered.filter(
        (cert) =>
          cert.title.toLowerCase().includes(q) ||
          cert.type?.toLowerCase().includes(q) ||
          cert.description?.toLowerCase().includes(q) ||
          cert.longDescription?.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [activeTab, tabSearchQueries, certificates]);

  const filteredRecommendations = useMemo(() => {
    if (!searchQuery) return recommendations;
    const q = searchQuery.toLowerCase();
    return recommendations.filter(
      (item) =>
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [searchQuery, recommendations]);

  const totalPages = Math.ceil(filteredCertificates.length / itemsPerPage);
  const currentItems = filteredCertificates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleContinueSubmission = (cert: DashboardCertificate) => {
    localStorage.setItem(
      "pending_assessment_ids",
      JSON.stringify({
        assessment_id: cert.id,
        certificate_id: cert.certificateId,
        payment_id: cert.paymentId,
        assessment_type: cert.assessmentType,
      }),
    );

    if (cert.status === "In Progress") {
      router.push(`${base}/assessment`);
    } else {
      setSelectedSubmission(cert);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const dashboardStats = useMemo(() => {
    const inProgress = certificates.filter(
      (c) => c.status === "In Progress",
    ).length;
    const active = certificates.filter((c) => c.status === "Active").length;
    const expired = certificates.filter((c) => c.status === "Expired").length;

    return [
      {
        label: "In Progress Certificates",
        value: String(inProgress),
        footer: `${inProgress} in progress certificate${inProgress !== 1 ? "s" : ""}`,
      },
      {
        label: "Active Certificates",
        value: String(active),
        footer: "Currently active",
      },
      {
        label: "Expired Certificates",
        value: String(expired),
        footer: "No longer valid",
      },
    ];
  }, [certificates]);

  if (selectedCert) {
    return (
      <div className="p-6 lg:p-10 bg-dull-white/10">
        <div className="max-w-7xl mx-auto">
          <CertificateDetails
            certificateId={String(selectedCert.id)}
            certificateCode={selectedCert.title}
            onBack={() => setSelectedCert(null)}
          />
        </div>
      </div>
    );
  }

  if (selectedSubmission) {
    // Sync the assessment ID into the URL so reload restores this view
    const currentSid = searchParams.get("sid");
    if (currentSid !== String(selectedSubmission.id)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sid", String(selectedSubmission.id));
      router.replace(`${base}?${params.toString()}`);
    }

    const handleBackFromSubmission = () => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("sid");
      const qs = params.toString();
      router.replace(qs ? `${base}?${qs}` : base);
      setSelectedSubmission(null);
    };

    return (
      <div className="p-6 lg:p-10 lg:pt-5 bg-dull-white/10 overflow-visible">
        <div className="max-w-7xl mx-auto overflow-visible">
          <SubmissionDetails
            certificate={selectedSubmission}
            onBack={handleBackFromSubmission}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 lg:p-10 lg:pt-3 bg-light-gray">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 ">
            <div className="space-y-1">
              <h1 className="text-[22px] md:text-[24px] font-semibold text-secondary leading-tight">
                Dashboard
              </h1>
              <p className="text-sm md:text-[15px] font-normal text-gray leading-relaxed max-w-full">
                Welcome back! Track your certification progress and manage
                documents.
              </p>
            </div>
            <Tooltip
              content="Access denied. You do not have permission to view certificates."
              disabled={canAccessCertificates}
            >
              <Button
                variant="secondary"
                disabled={!canAccessCertificates}
                className="w-full text-sm md:w-auto px-6 h-10 bg-secondary text-primary hover:bg-zinc-800 transition-colors rounded-xl md:rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => router.push(`${base}/certificate`)}
              >
                Explore Certificates
              </Button>
            </Tooltip>
          </header>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 my-6">
            {dashboardStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-zinc-50 p-5 md:p-4 rounded-2xl md:rounded-xl border border-dull-white/50 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[14px] md:text-[16px] lg:text-[18px] font-semibold text-secondary leading-tight">
                    {stat.label}
                  </span>
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-zinc-50 rounded-lg flex items-center justify-center">
                    <img
                      src="/assets/imgs/icons/cardCertificate.svg"
                      alt="icon"
                      className="w-5 h-5 md:w-6 md:h-6 object-contain"
                    />
                  </div>
                </div>
                <div className="text-2xl md:text-[26px] font-bold text-secondary mt-3">
                  {stat.value}
                </div>
                <div className="text-[13px] md:text-[15px] font-normal text-gray mt-1">
                  {stat.footer}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Certification Overview Section */}
          <section className="space-y-6 md:space-y-8">
            {!isLoading && certificates.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-4xl border border-zinc-100 shadow-sm"
              >
                <div className="mb-0">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center relative mr-4">
                    <img
                      src="/assets/imgs/icons/empty.svg"
                      alt="No certifications"
                      className="w-12 h-12 object-contain"
                    />
                  </div>
                </div>
                <h3 className="text-[20px] font-bold text-[#1A1A1A] mb-2 leading-tight">
                  No Certifications in Progress
                </h3>
                <p className="text-[#737373be] text-[14px] text-center max-w-100 mb-5 leading-relaxed font-medium">
                  You haven&apos;t started any certifications yet. Explore
                  available certifications to begin your ESG journey.
                </p>
                <Tooltip
                  content="Access denied. You do not have permission to view certificates."
                  disabled={canAccessCertificates}
                >
                  <Button
                    onClick={() => router.push(`${base}/certificate`)}
                    disabled={!canAccessCertificates}
                    className="bg-[#232323] hover:bg-black text-white px-10 h-12 rounded-xl text-[14px] font-semibold transition-all shadow-md active:scale-95 w-fit disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Find a Certification
                  </Button>
                </Tooltip>
              </motion.div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-xl md:text-2xl font-semibold text-secondary">
                      Certification Overview
                    </h2>
                    <p className="text-gray text-xs md:text-sm">
                      The full list of certifications under your management.
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`${base}/certificate`)}
                    className="flex items-center gap-1 text-sm md:text-base font-semibold text-secondary hover:translate-x-1 transition-all cursor-pointer w-fit"
                  >
                    View all{" "}
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-1" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Tabs & Search */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex bg-zinc-50 rounded-2xl p-1.5 border border-dull-white/40 shadow-sm overflow-x-auto w-fit no-scrollbar">
                      <div className="flex min-w-max gap-1">
                        {["In Progress", "Active", "Failed", "Expired"]
                          .filter((tab) => {
                            if (tab === "Failed") {
                              return certificates.some(
                                (c) => c.status === "Failed",
                              );
                            }
                            return true;
                          })
                          .map((tab) => (
                            <button
                              key={tab}
                              onClick={() => {
                                setActiveTab(tab);
                                setCurrentPage(1);
                              }}
                              className={`px-6 md:px-8 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                activeTab === tab
                                  ? "bg-secondary text-primary shadow-lg"
                                  : "text-gray hover:text-secondary"
                              }`}
                            >
                              {tab}
                            </button>
                          ))}
                      </div>
                    </div>

                    {certificates.filter((c) => c.status === activeTab).length >
                      2 && (
                      <div className="relative w-full md:w-72">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray/60" />
                        <input
                          type="text"
                          placeholder={`Search ${activeTab}...`}
                          className="w-full h-11 pl-10 pr-4 bg-zinc-50 border border-dull-white/40 rounded-xl text-[13px] font-medium text-secondary focus:outline-none focus:border-secondary/30 focus:ring-4 focus:ring-secondary/5 transition-all outline-none"
                          value={tabSearchQueries[activeTab] || ""}
                          onChange={(e) => {
                            setTabSearchQueries((prev) => ({
                              ...prev,
                              [activeTab]: e.target.value,
                            }));
                            setCurrentPage(1);
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-6 relative min-h-64 pb-2">
                    {isLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="bg-zinc-50 rounded-2xl border border-zinc-100 p-6 flex items-center justify-between"
                          >
                            <div className="space-y-3 flex-1">
                              <Skeleton className="h-4 w-1/2" />
                              <Skeleton className="h-3 w-1/3" />
                            </div>
                            <Skeleton className="h-20 w-20 rounded-full" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <AnimatePresence mode="wait">
                        {currentItems.length > 0 ? (
                          currentItems.map((cert, i) => (
                            <motion.div
                              key={cert.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ delay: i * 0.1 }}
                              className={`bg-zinc-50 rounded-3xl md:rounded-4xl border border-dull-white/40 shadow-sm p-5 md:p-5 min-h-56 cursor-pointer hover:border-[#1A1A1A] transition-all`}
                              onClick={() => {
                                if (
                                  cert.status === "Active" ||
                                  cert.status === "Failed" ||
                                  (cert as any).isPending
                                ) {
                                  handleCheckResults(cert);
                                } else if (cert.status === "In Progress") {
                                  handleContinueSubmission(cert);
                                }
                              }}
                            >
                              {cert.status === "Active" ? (
                                <div className="flex flex-col gap-2 overflow-visible">
                                  <div className="relative mb-2">
                                    <div className="flex-1 min-w-0 pr-45">
                                      <div className="flex items-center gap-2">
                                        <h3
                                          className="text-base md:text-[18px] font-bold text-[#1A1A1A] truncate"
                                          title={cert.title}
                                        >
                                          {cert.title}
                                        </h3>
                                        <div className="flex gap-2 shrink-0">
                                          <span className="px-2.5 py-0.5 bg-[#D1FADF] text-[#039855] rounded-full text-[10px] font-semibold">
                                            Active
                                          </span>
                                          <span className="px-2.5 py-0.5 bg-[#F5F5F5] text-[#737373] rounded-full text-[10px] font-semibold border border-[#E5E5E5]">
                                            {cert.type}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="absolute top-0 right-0 flex justify-end max-w-42.5 max-h-10 overflow-hidden">
                                      <span className="px-2.5 py-1 bg-[#F5F5F5] text-[#737373] rounded-full text-[10px] font-semibold border border-[#E5E5E5] shrink-0">
                                        {cert.category}
                                      </span>
                                    </div>
                                  </div>

                                  <p className="text-[13px] text-[#A3A3A3] font-medium">
                                    You&apos;ve completed your{" "}
                                    {cert.type === "Self-disclosure"
                                      ? "self-disclosure"
                                      : "Certification"}
                                  </p>

                                  <div className="relative">
                                    <div className="space-y-4 mt-3">
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <div className="px-3 md:px-8 py-2 bg-[#1A1A1A] text-white rounded-md text-xs md:text-[13px] font-medium">
                                          {cert.type === "Self-disclosure"
                                            ? "Self-disclosure Badge"
                                            : `${cert.currentLevel || "Emerald"} Badge`}
                                        </div>
                                        {cert.type === "Self-disclosure" &&
                                          cert.progress != null &&
                                          cert.total != null && (
                                            <span className="text-xs md:text-[13px] font-medium text-[#1A1A1A]">
                                              {cert.progress}/{cert.total}{" "}
                                              (Eligible for Certification)
                                            </span>
                                          )}
                                      </div>

                                      {cert.badges &&
                                        cert.badges.length > 0 && (
                                          <div className="flex gap-2 flex-wrap">
                                            {cert.badges.map((badge: any) => (
                                              <span
                                                key={badge.id || badge.name}
                                                className="px-3 py-1 bg-[#F5F5F5] text-[#737373] rounded-full text-[11px] font-semibold"
                                              >
                                                {badge.name}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                    </div>

                                    <div className="absolute -top-4 md:top-0 right-0 scale-75 md:scale-100 origin-right">
                                      <CircularProgress
                                        progress={cert.progress}
                                        total={cert.total}
                                        label={
                                          cert.type === "Self-disclosure"
                                            ? `${cert.progress}/${cert.total}`
                                            : `${Math.round(((cert.progress || 0) / (cert.total || 1)) * 100)}%`
                                        }
                                      />
                                    </div>
                                  </div>

                                  <p className="text-[#737373] text-xs md:text-[13px] leading-[1.6] w-full md:max-w-[60%]">
                                    {cert.description}
                                  </p>

                                  <div className="mt-6">
                                    <div className="flex flex-row justify-between items-end gap-4">
                                      <div className="flex  gap-3">
                                        <Button
                                          variant="secondary"
                                          className="h-10 cursor-pointer rounded-md whitespace-nowrap px-2 w-48 bg-white border border-[#E5E5E5] text-[#1A1A1A] text-[13px] font-semibold hover:bg-gray-50 shadow-none disabled:opacity-50"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadBadge(cert);
                                          }}
                                          disabled={isDownloadingId === cert.id}
                                        >
                                          {isDownloadingId === cert.id
                                            ? "Downloading..."
                                            : "Download Badge"}
                                        </Button>

                                        {cert.type === "Self-disclosure" ? (
                                          <Button
                                            variant="primary"
                                            className="h-10 cursor-pointer rounded-md whitespace-nowrap px-2 w-48 bg-[#1A1A1A] text-white text-[13px] font-semibold hover:bg-black "
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedSubmission(cert);
                                            }}
                                          >
                                            Get Certified
                                          </Button>
                                        ) : (
                                          <>
                                            <Button
                                              variant="secondary"
                                              className="h-10 cursor-pointer whitespace-nowrap px-2 w-48 bg-[#EAEAEA] text-[#1A1A1A] text-[13px] font-semibold hover:bg-[#d4d4d4] shadow-none disabled:opacity-50"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownloadBadge(cert);
                                              }}
                                              disabled={
                                                isDownloadingId === cert.id
                                              }
                                            >
                                              {isDownloadingId === cert.id
                                                ? "Downloading..."
                                                : "Download Certificate"}
                                            </Button>
                                            <Button
                                              variant="primary"
                                              className="h-10 cursor-pointer whitespace-nowrap px-2 w-60 bg-[#1A1A1A] text-white text-[13px] font-semibold hover:bg-black "
                                            >
                                              View Published Certificate
                                            </Button>
                                          </>
                                        )}
                                      </div>

                                      {(cert as any).completed_at && (
                                        <div className="text-right">
                                          <p className="text-[12px] font-semibold text-[#1A1A1A]">
                                            Active Since
                                          </p>
                                          <p className="text-[12px] text-[#A3A3A3]">
                                            {new Date(
                                              (cert as any).completed_at,
                                            ).toLocaleDateString("en-US", {
                                              month: "short",
                                              day: "numeric",
                                              year: "numeric",
                                            })}
                                            {cert.validity &&
                                            cert.validity !== "N/A"
                                              ? ` · ${cert.validity}`
                                              : ""}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : cert.status === "In Progress" ? (
                                <div className="flex flex-col overflow-visible">
                                  <div className="relative mb-1">
                                    <div className="flex-1 min-w-0 pr-4 mt-0.5">
                                      <div className="space-y-1">
                                        <h3
                                          className="text-[17px] font-bold text-[#1A1A1A] leading-tight truncate"
                                          title={cert.title}
                                        >
                                          {cert.title}
                                        </h3>
                                        <p className="text-[12px] font-medium text-[#A3A3A3] truncate">
                                          {cert.certificateProductId ||
                                            (cert.subDescription?.startsWith(
                                              "Best",
                                            )
                                              ? "HOS-WKP-HR"
                                              : cert.subDescription)}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="absolute top-0 right-0 flex justify-end max-w-42.5 max-h-10 overflow-hidden">
                                      <span className="shrink-0 px-3 py-1 rounded-full bg-[#F5F5F5] text-[#737373] text-[10px] font-semibold border border-[#E5E5E5]">
                                        {cert.category}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="relative mt-1 mb-2">
                                    <div className="md:pr-32 space-y-3">
                                      <p className="text-base w-full max-w-140 leading-5 text-gray py-3 font-normal">
                                        {cert.description}
                                        {cert.longDescription && (
                                          <span className="hidden lg:inline">
                                            {" "}
                                            {cert.longDescription}
                                          </span>
                                        )}
                                      </p>
                                    </div>

                                    <div className="md:absolute top-0 right-0 flex justify-center md:block py-4 md:py-0">
                                      <CircularProgress
                                        progress={
                                          (cert as any).isPending
                                            ? 100
                                            : cert.progress
                                        }
                                        total={cert.total}
                                        label={
                                          (cert as any).isPending
                                            ? "100%"
                                            : undefined
                                        }
                                      />
                                    </div>
                                  </div>

                                  <div className="pt-3 border-t border-[#F5F5F5]">
                                    {(cert as any).isPending ? (
                                      <div className="flex gap-3">
                                        <Button
                                          variant="secondary"
                                          disabled={isCheckingId === cert.id}
                                          className="bg-[#1A1A1A] w-full md:max-w-[18%] text-white h-12 px-6 rounded-lg text-[13px] font-semibold hover:bg-black transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCheckResults(cert);
                                          }}
                                        >
                                          {isCheckingId === cert.id
                                            ? "Checking..."
                                            : "Check Results"}
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        variant="secondary"
                                        className="bg-[#1A1A1A] w-full md:max-w-[18%] text-white h-12 px-6 rounded-lg text-[13px] font-semibold hover:bg-black transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleContinueSubmission(cert);
                                        }}
                                      >
                                        Continue Submission
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-4 overflow-visible">
                                  <div className="relative mb-1">
                                    <div className="flex-1 min-w-0 pr-4 mt-0.5">
                                      <div className="flex items-center gap-2">
                                        <h3
                                          className="text-[17px] font-bold text-[#1A1A1A] truncate shrink grow"
                                          title={cert.title}
                                        >
                                          {cert.title}
                                        </h3>
                                        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                                          {cert.status === "Expired" ? (
                                            <span className="px-2.5 py-0.5 bg-[#F8F9FA] text-[#737373] rounded-full text-[10px] font-semibold border border-[#E5E5E5]">
                                              Expired
                                            </span>
                                          ) : (
                                            <span className="px-2.5 py-0.5 bg-[#FEE2E2] text-[#DC2626] rounded-full text-[10px] font-semibold border border-[#FECACA]">
                                              Failed
                                            </span>
                                          )}
                                          <span className="px-2.5 py-0.5 bg-[#F5F5F5] text-[#737373] rounded-full text-[10px] font-semibold border border-[#E5E5E5]">
                                            {cert.type}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {cert.status !== "Failed" && (
                                      <div className="absolute top-0 right-0 flex justify-end max-w-42.5 max-h-10 overflow-hidden"></div>
                                    )}
                                  </div>

                                  {cert.description && (
                                    <p className="text-[13px] text-[#A3A3A3] font-medium">
                                      {cert.description}
                                    </p>
                                  )}

                                  {cert.badges && cert.badges.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                      {cert.badges.map(
                                        (badge: any, idx: number) => (
                                          <div
                                            key={idx}
                                            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8E8E8] text-[#525252] text-[12px] font-medium"
                                          >
                                            <img
                                              src="/assets/imgs/icons/GoldRank.svg"
                                              alt="Gold Rank"
                                              className="w-8 h-8 shrink-0"
                                            />
                                            <span>{badge.name}</span>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  )}

                                  <div className="h-px w-full bg-[#99999958]" />

                                  <div className="flex w-full md:max-w-[40%] gap-3 mt-4">
                                    {cert.status === "Failed" ? (
                                      <>
                                        <Button
                                          variant="secondary"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCheckResults(cert);
                                          }}
                                          className="h-10 w-full shadow-none rounded-lg cursor-pointer whitespace-nowrap bg-white border border-[#E5E5E5] text-[#1A1A1A] text-[13px] font-semibold hover:bg-gray-50 "
                                        >
                                          View Score
                                        </Button>
                                        <Button
                                          variant="primary"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(
                                              `${base}/support-center`,
                                            );
                                          }}
                                          className="h-10 w-full shadow-none rounded-lg cursor-pointer whitespace-nowrap bg-[#1A1A1A] text-white text-[13px] font-semibold hover:bg-black "
                                        >
                                          Contact Admin
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button
                                          variant="secondary"
                                          className="h-10 shadow-none rounded-md cursor-pointer whitespace-nowrap px-6 bg-white border border-[#999] text-[#1A1A1A] text-[13px] font-semibold hover:bg-gray-50 "
                                        >
                                          Renew Certificate
                                        </Button>
                                        <Button
                                          variant="primary"
                                          className="h-10 shadow-none rounded-md cursor-pointer whitespace-nowrap px-6 bg-[#1A1A1A] text-white text-[13px] font-semibold hover:bg-black "
                                        >
                                          View Published Certificate (Expired)
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          ))
                        ) : (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-20 text-center space-y-4 bg-white/50 rounded-4xl border border-dashed border-zinc-200"
                          >
                            <p className="text-gray font-medium">
                              No certificates found in this category.
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-8 pb-4">
                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        className={`px-4 h-10 rounded-lg border text-sm font-medium flex items-center gap-1 transition-colors ${
                          currentPage === 1
                            ? "bg-[#F5F5F5] text-[#A3A3A3] border-transparent cursor-not-allowed"
                            : "bg-white text-[#1A1A1A] border-[#E5E5E5] hover:bg-gray-50"
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Back</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {(() => {
                          const pages = [];
                          if (totalPages <= 7) {
                            for (let i = 1; i <= totalPages; i++) pages.push(i);
                          } else {
                            if (currentPage <= 4) {
                              pages.push(1, 2, 3, 4, 5, "...", totalPages);
                            } else if (currentPage >= totalPages - 3) {
                              pages.push(
                                1,
                                "...",
                                totalPages - 4,
                                totalPages - 3,
                                totalPages - 2,
                                totalPages - 1,
                                totalPages,
                              );
                            } else {
                              pages.push(
                                1,
                                "...",
                                currentPage - 1,
                                currentPage,
                                currentPage + 1,
                                "...",
                                totalPages,
                              );
                            }
                          }

                          return pages.map((page, idx) =>
                            typeof page === "number" ? (
                              <button
                                key={idx}
                                onClick={() => setCurrentPage(page)}
                                className={`w-10 h-10 rounded-lg text-sm font-semibold border transition-all ${
                                  currentPage === page
                                    ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                                    : "bg-white text-[#1A1A1A] border-[#E5E5E5] hover:bg-gray-50"
                                }`}
                              >
                                {page}
                              </button>
                            ) : (
                              <span
                                key={idx}
                                className="w-10 h-10 flex items-center justify-center text-gray-400 font-medium"
                              >
                                ...
                              </span>
                            ),
                          );
                        })()}
                      </div>

                      <button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages),
                          )
                        }
                        disabled={currentPage === totalPages}
                        className={`px-4 h-10 rounded-lg border text-sm font-medium flex items-center gap-1 transition-colors ${
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
                </div>
              </>
            )}
          </section>

          <section className="space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-semibold text-secondary">
                  Recommended certifications
                </h2>
                <p className="text-gray text-sm md:text-base font-medium">
                  Choose from these recommended certifications based on your
                  industries&apos;
                </p>
              </div>
              {totalRecommendations > 6 && (
                <button
                  onClick={() =>
                    router.push(`${base}/certificate?filter=recommended`)
                  }
                  className="flex items-center gap-1 text-sm md:text-base font-semibold text-secondary hover:translate-x-1 transition-all cursor-pointer w-fit"
                >
                  View all{" "}
                  <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-1" />
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="bg-zinc-50 rounded-2xl border border-zinc-100 p-5 space-y-4"
                  >
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                    <Skeleton className="h-16 w-full" />
                    <div className="flex justify-end">
                      <Skeleton className="h-8 w-24 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredRecommendations.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white rounded-[20px] border border-zinc-200 p-4 md:p-5 md:pb-0 shadow-sm flex flex-col hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-lg font-semibold text-[#1A1A1A] leading-tight pr-4">
                            {item.title}
                          </h3>
                          <span className="shrink-0 px-3 py-1 bg-[#EAEAEA] text-[#1A1A1A] rounded-full text-[11px] font-semibold">
                            {item.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-[12px] text-[#A3A3A3] font-medium">
                            {item.code}
                          </p>
                          <div className="w-1 h-1 bg-[#D4D4D4] rounded-full" />
                          <p className="text-[11px] text-[#737373] font-semibold">
                            {item.validity} Validity
                          </p>
                          <div className="w-1 h-1 bg-[#D4D4D4] rounded-full" />
                          <p className="text-[11px] text-[#737373] font-semibold">
                            {item.questionsCount} Questions
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {item.badges && item.badges.length > 0 ? (
                            item.badges.map((badge: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-[#F5F5F5] bg-[#FAFAFA]/50"
                              >
                                <img
                                  src="/assets/imgs/icons/GoldRank.svg"
                                  alt="Gold Rank"
                                  className="w-4 h-4 shrink-0"
                                />
                                <span className="text-[10px] font-bold text-[#525252] uppercase tracking-wider">
                                  {badge.name}
                                </span>
                              </div>
                            ))
                          ) : (
                            <img
                              src="/assets/imgs/icons/GoldRank.svg"
                              alt="Gold Rank"
                              className="w-7 h-7 shrink-0"
                            />
                          )}
                        </div>

                        <p className="text-[#737373] text-[12px] leading-[1.6] mb-3 max-w-120 line-clamp-3 overflow-hidden">
                          {item.description}
                        </p>
                      </div>

                      <div className="mt-auto">
                        <div className="h-px bg-[#999999bc] w-full mb-4" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-5 h-auto md:h-18.75">
                          {item.pricing.map((price, idx) => (
                            <div key={idx}>
                              <p className="text-[14px] font-semibold text-[#1A1A1A] mb-1">
                                {price.label}
                              </p>
                              <p className="text-[12px] text-[#A3A3A3] leading-tight">
                                {price.sub}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-end gap-6 mb-4 mt-2">
                          <div className="space-y-1 pb-1 sm:h-10.5 flex flex-col justify-end">
                            {item.showAssuredBadge && (
                              <>
                                <p className="text-[12px] font-medium text-[#A3A3A3]">
                                  Matches{" "}
                                  <strong className="text-[#525252] font-semibold">
                                    {item.matchingIndustriesCount} industries
                                  </strong>
                                </p>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFF8E1] text-yellow rounded-full text-[12px] font-semibold w-fit">
                                  <AlertCircle className="w-3.5 h-3.5 fill-yellow text-white" />
                                  <span>Assured Recommended</span>
                                </div>
                              </>
                            )}
                          </div>

                          <Button
                            variant="primary"
                            className="w-full sm:w-auto bg-[#1A1A1A] hover:bg-black text-white px-10 h-10 rounded-lg text-[13px] font-semibold transition-all shadow-lg shadow-black/5"
                            onClick={() => {
                              setSelectedCert({
                                id: item.id,
                                title: item.title,
                                category: item.category,
                              });
                            }}
                          >
                            Get Started
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Message Modal */}
      <AnimatePresence>
        {messageModal.show && (
          <div className="fixed inset-0 z-500 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl w-full max-w-sm p-8 text-center shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                    messageModal.type === "error"
                      ? "bg-red-50 text-red-500"
                      : messageModal.type === "success"
                        ? "bg-blue-50 text-blue-500"
                        : "bg-blue-50 text-blue-500"
                  }`}
                >
                  {messageModal.type === "error" ? (
                    <AlertCircle className="w-8 h-8" />
                  ) : messageModal.type === "success" ? (
                    <div className="text-2xl">🎉</div>
                  ) : (
                    <AlertCircle className="w-8 h-8" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-black text-zinc-900 leading-tight">
                    {messageModal.title}
                  </h3>
                  <p className="text-gray-400 font-medium text-sm leading-relaxed">
                    {messageModal.message}
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => {
                      if (messageModal.onConfirm) messageModal.onConfirm();
                      setMessageModal((prev) => ({ ...prev, show: false }));
                    }}
                    className={`w-full h-12 font-black rounded-xl text-sm ${
                      messageModal.type === "error"
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : messageModal.type === "success"
                          ? "bg-blue-500 hover:bg-blue-600 text-white"
                          : "bg-zinc-900 hover:bg-black text-white"
                    }`}
                  >
                    {messageModal.confirmText || "Got it"}
                  </Button>
                  {messageModal.onCancel && (
                    <button
                      onClick={() => {
                        messageModal.onCancel?.();
                        setMessageModal((prev) => ({ ...prev, show: false }));
                      }}
                      className="w-full h-10 text-zinc-400 hover:text-zinc-600 font-bold text-sm transition-colors"
                    >
                      {messageModal.cancelText || "Cancel"}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResultsModal && resultsData && (
          <div className="fixed inset-0 z-500 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="flex-1 overflow-y-auto scrollbar-hide p-10 text-center space-y-8">
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 mb-2 text-zinc-400 font-bold text-[10px] tracking-[0.2em] uppercase">
                    <span className="w-8 h-[1px] bg-zinc-200" />
                    Assessment Results
                    <span className="w-8 h-[1px] bg-zinc-200" />
                  </div>
                  <h2 className="text-3xl font-black text-zinc-900 tracking-tight">
                    {resultsData.status === "failed" ||
                    (resultsData.score !== null && resultsData.score < 70)
                      ? "Assessment Failed"
                      : flaggedQuestions.length > 0
                        ? "Improvement Required"
                        : isNoFlagsRestartState
                          ? "Action Required"
                          : isResultsPending
                            ? "Under AI Review"
                            : resultsData.score === null
                              ? "Finalizing Results"
                              : "Congratulations!"}
                  </h2>
                  <p className="text-gray-400 font-medium text-sm max-w-sm mx-auto leading-relaxed">
                    {resultsData.status === "failed" ||
                    (resultsData.score !== null && resultsData.score < 70)
                      ? `Your score of ${resultsData.score ?? 0}% is below the minimum criteria for certification.`
                      : flaggedQuestions.length > 0
                        ? `Our AI system has flagged ${flaggedQuestions.length} response${flaggedQuestions.length === 1 ? "" : "s"} that require your attention for improvement.`
                        : isNoFlagsRestartState
                          ? "We were unable to generate a score for this assessment. Please contact support for assistance."
                          : isResultsPending
                            ? "Your responses are currently being analyzed by our AI system. Please check back shortly for your final score."
                            : resultsData.score === null
                              ? "We are currently finalizing your assessment results. Please stay tuned."
                              : "You have successfully completed the assessment and earned your ACES badge."}
                  </p>
                </div>

                {/* Score and Details Stats Grid */}
                <div className="grid grid-cols-3 gap-4 py-6 border-y border-zinc-100">
                  <div className="text-center">
                    <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                      Final Score
                    </p>
                    <p className="text-xl font-black text-zinc-900">
                      {resultsData.score !== null
                        ? `${resultsData.score}%`
                        : "N/A"}
                    </p>
                  </div>
                  <div className="text-center border-x border-zinc-100">
                    <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                      Submitted on
                    </p>
                    <p className="text-base font-bold text-zinc-900">
                      {new Date().toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                      Ref ID
                    </p>
                    <p className="text-sm font-bold text-zinc-900 truncate px-2">
                      #{resultsData.id?.slice(-6).toUpperCase() || "ACES"}
                    </p>
                  </div>
                </div>

                {resultsData.score !== null &&
                resultsData.score >= 70 &&
                !isResultsPending ? (
                  <div className="flex justify-center p-4">
                    <AcesDynamicBadge
                      size={200}
                      name={
                        resultsData.score >= 90
                          ? "ACES Certified"
                          : resultsData.score >= 80
                            ? "ACES Verified"
                            : "ACES Rated"
                      }
                      level={
                        resultsData.score >= 90
                          ? "GOLD"
                          : resultsData.score >= 80
                            ? "SILVER"
                            : "BRONZE"
                      }
                      title={resultsData.certificate_name || "Assessment"}
                      serial={
                        resultsData.badge_id || `SN-${resultsData.id || "0000"}`
                      }
                      date={new Date().toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 border border-zinc-100 rounded-3xl p-6 text-center shadow-sm">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                        Final Score
                      </p>
                      <p className="text-4xl font-black text-zinc-900">
                        {isResultsPending ? "--" : (resultsData.score ?? 0)}
                        {!isResultsPending && (
                          <span className="text-lg opacity-30 ml-0.5">%</span>
                        )}
                      </p>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-100 rounded-3xl p-6 text-center shadow-sm">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                        Badge Earned
                      </p>
                      <p className="text-lg font-black text-zinc-900 leading-tight">
                        {isResultsPending
                          ? "Under Review"
                          : resultsData.score === null || resultsData.score < 70
                            ? "None"
                            : resultsData.badge_name ||
                              (resultsData.score >= 90
                                ? "Certified"
                                : resultsData.score >= 80
                                  ? "Verified"
                                  : "Rated")}
                      </p>
                      <div
                        className={`mt-2 text-xs font-bold px-3 py-1 rounded-full inline-block ${
                          resultsData.status === "failed" ||
                          (resultsData.score !== null &&
                            resultsData.score < 70) ||
                          (resultsData.score === null &&
                            flaggedQuestions.length === 0 &&
                            !isResultsPending)
                            ? "text-red-600 bg-red-50"
                            : isResultsPending
                              ? "text-gray-600 bg-blue-50"
                              : "text-gray-600 bg-blue-50"
                        }`}
                      >
                        {resultsData.status === "failed" ||
                        (resultsData.score !== null &&
                          resultsData.score < 70) ||
                        (resultsData.score === null &&
                          flaggedQuestions.length === 0 &&
                          !isResultsPending)
                          ? "Retry Required"
                          : isResultsPending
                            ? "Processing"
                            : "Active"}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4 pt-4">
                  {flaggedQuestions.length > 0 ? (
                    <div className="text-left space-y-2 max-h-40 overflow-y-auto mb-4 border border-red-100 p-4 rounded-3xl bg-red-50/50">
                      <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest px-1">
                        Flags to Address:
                      </p>
                      {flaggedQuestions.map((fq: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0" />
                          <p className="text-xs text-red-900 line-clamp-2">
                            {fq.question_text}:{" "}
                            <span className="font-semibold">
                              {fq.flag_reason}
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    resultsData.score === null &&
                    !isResultsPending && (
                      <div className="p-6 border border-dashed border-zinc-200 rounded-3xl bg-zinc-50/50 mb-4">
                        <p className="text-sm text-zinc-400 font-medium italic">
                          No flagged questions found.
                        </p>
                      </div>
                    )
                  )}

                  {(resultsData.status === "failed" ||
                    (resultsData.score !== null && resultsData.score < 70) ||
                    (resultsData.score === null &&
                      flaggedQuestions.length === 0 &&
                      !isResultsPending)) && (
                    <Button
                      onClick={() => router.push(`${base}/support-center`)}
                      className="w-full h-14 bg-zinc-900 hover:bg-black text-white font-black rounded-2xl shadow-2xl shadow-zinc-900/20 text-base"
                    >
                      Contact Admin
                    </Button>
                  )}

                  {flaggedQuestions.length > 0 && (
                    <Button
                      onClick={() => {
                        if (selectedCertForResults) {
                          handleContinueSubmission(selectedCertForResults);
                        } else {
                          const targetCert = certificates.find(
                            (c) => String(c.id) === String(resultsData.id),
                          );
                          if (targetCert) {
                            handleContinueSubmission(targetCert);
                          } else {
                            // Fallback if not found in current list
                            localStorage.setItem(
                              "pending_assessment_ids",
                              JSON.stringify({ assessment_id: resultsData.id }),
                            );
                            router.push(`${base}/assessment`);
                          }
                        }
                      }}
                      className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-2xl shadow-red-900/20 text-base"
                    >
                      Fix Flagged Questions
                    </Button>
                  )}

                  <Button
                    onClick={() => setShowResultsModal(false)}
                    className={`w-full h-14 bg-zinc-900 hover:bg-black text-white font-black rounded-2xl shadow-2xl shadow-zinc-900/20 text-base ${flaggedQuestions.length > 0 ? "h-11 text-sm bg-white border border-gray-200 !text-zinc-400 !shadow-none hover:!bg-gray-50" : ""}`}
                  >
                    Close
                  </Button>
                  {resultsData.status !== "ai_reviewing" &&
                    resultsData.status !== "pending" &&
                    resultsData.completed_at && (
                      <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-[0.2em]">
                        Result issued on{" "}
                        {new Date(resultsData.completed_at).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                      </p>
                    )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&display=swap");
        .font-sans {
          font-family: "Archivo", sans-serif;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
      `}</style>
    </>
  );
}
