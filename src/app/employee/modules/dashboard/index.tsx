"use client";

import { Button } from "@/components/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import { axiosInstance } from "@/lib/axios";
import { persistOrganizationId } from "@/lib/auth-utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, AlertCircle } from "lucide-react";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from "recharts";
import { CertificateDetails } from "@/app/(dashboards)/applicant/modules/certificate/details";

import {
  SubmissionDetails,
  SubmissionCertificate,
} from "@/app/(dashboards)/applicant/modules/certificate/submission-details";
import { LoadingScreen } from "@/app/(dashboards)/applicant/common/loading-screen";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import { Tooltip } from "@/components/ui/tooltip";

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
  isPending?: boolean;
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
}

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

export function EmployeeDashboardPage() {
  const router = useRouter();
  const base = "/employee";
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const notificationActionParam = searchParams.get("notification_action");
  const notificationAssessmentIdParam = searchParams.get("assessment_id");
  const notificationCertificateIdParam = searchParams.get("certificate_id");
  const notificationTabParam = searchParams.get("tab");
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

  const { hasAccess } = useEmployeePermissions(profileData);
  const canAccessCertificates = hasAccess("certificates");
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

  const [showResultsModal, setShowResultsModal] = useState(false);
  const [resultsData, setResultsData] = useState<any>(null);
  const [isCheckingId, setIsCheckingId] = useState<string | number | null>(
    null,
  );

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

  const initDashboard = async (silent = false) => {
    if (typeof window === "undefined") return;

    if (!silent) {
      setIsLoading(true);
      setLoadingProgress(10);
    }

    try {
      try {
        const empResponse = await axiosInstance.get("/employee/my-profile");
        const data = empResponse?.data?.data || empResponse?.data;
        if (data) {
          const processed = {
            ...data,
            name: `${data.first_name} ${data.last_name}`.trim(),
            _type: "employee",
          };

          // Robust check: if new data lacks permissions but old data has them, preserve them
          if (!processed.permissions && profileData?.permissions) {
            processed.permissions = profileData.permissions;
          }

          localStorage.setItem(
            "organization_profile",
            JSON.stringify(processed),
          );
          const orgId = data?.organization_id || data?.user_id || data?.id;
          if (orgId && orgId !== "undefined" && orgId !== "null") {
            persistOrganizationId(orgId);
          }
          setProfileData(processed);
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new Event("profile-updated"));
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
        }));
        setRecommendations(mapped);
        setLoadingProgress(70);
      } catch (error) {
        console.error("Failed to fetch recommendations", error);
        setLoadingProgress(70);
      }

      let allCerts: DashboardCertificate[] = [];
      try {
        const branchRes = await axiosInstance.get("/branches/list");
        const branches = branchRes.data?.data || branchRes.data || [];
        const branch = branches.find((b: any) => b.is_main) || branches[0];

        if (branch) {
          const myCertsRes = await axiosInstance.get("/my-certificates", {
            params: { branchid: branch.id },
          });
          const apiData =
            myCertsRes.data?.data?.data ||
            myCertsRes.data?.data ||
            myCertsRes.data ||
            [];

          allCerts = apiData.map((item: any) => {
            const rawStatus = String(item.status || "").toLowerCase();
            let displayStatus = "Active";
            if (rawStatus === "expired") displayStatus = "Expired";
            if (
              rawStatus === "pending" ||
              rawStatus === "in_progress" ||
              rawStatus === "ai_reviewing"
            )
              displayStatus = "In Progress";

            const isAIReviewing = rawStatus === "ai_reviewing";
            const total = parseInt(item.total_questions) || 0;
            const progress = parseInt(item.answered_questions) || 0;

            return {
              id: item.id,
              title: item.name || item.certificate?.name || "Certificate",
              category:
                (item.industry_names && item.industry_names[0]) ||
                (item.certificate?.industry_names &&
                  item.certificate.industry_names[0]) ||
                "General",
              status: displayStatus,
              type:
                item.assessment_type === "self_disclosure"
                  ? "Self-disclosure"
                  : "Assured",
              description: isAIReviewing
                ? "Your assessment is currently under AI review."
                : item.description ||
                  item.certificate?.description ||
                  "Complete your assessment and get certified.",
              progress: isAIReviewing ? 100 : progress,
              total: isAIReviewing ? 100 : total || 10,
              isPending: isAIReviewing,
              isSubmitted: item.is_submitted || rawStatus === "ai_reviewing",
              certificateId: item.certificate_id || item.certificate?.id,
              paymentId: item.payment_id,
              assessmentType: item.assessment_type,
              subDescription:
                item.certificate_id || item.certificate?.certificate_id,
              disclosure_price:
                item.disclosure_price || item.certificate?.disclosure_price,
              assured_price:
                item.assured_price || item.certificate?.assured_price,
            };
          });
        }
      } catch (error) {
        console.error("Failed to fetch my certificates", error);
      }

      try {
        const response = await axiosInstance.get("/assessments/pending");
        const apiData = response.data?.data?.data || [];
        const pendingMapped: DashboardCertificate[] = apiData.map(
          (item: any) => {
            const isAIReviewing = item.status === "ai_reviewing";
            const total = parseInt(item.total_questions) || 0;
            const progress = parseInt(item.answered_questions) || 0;

            return {
              id: item.id,
              title: item.certificate_name || "Assessment",
              category: "General",
              status: "In Progress",
              type:
                item.assessment_type === "self_disclosure"
                  ? "Self-disclosure"
                  : "Assured",
              description: isAIReviewing
                ? "Your assessment is currently under AI review."
                : "Complete your assessment and get certified.",
              progress: isAIReviewing ? 100 : progress,
              total: isAIReviewing ? 100 : total || 10,
              isPending: isAIReviewing,
              isSubmitted: item.is_submitted,
              certificateId: item.certificate_id,
              paymentId: item.payment_id,
              assessmentType: item.assessment_type,
              subDescription: item.certificate_id,
            };
          },
        );

        if (pendingMapped.length > 0) {
          const existingIds = new Set(allCerts.map((c) => String(c.id)));
          const newOnly = pendingMapped.filter(
            (m) => !existingIds.has(String(m.id)),
          );
          allCerts = [...allCerts, ...newOnly];
        }
      } catch (error) {
        console.error("Failed to fetch pending assessments", error);
      }

      setCertificates(allCerts);
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

  const handleCheckResults = async (certificateId: string | number) => {
    setIsCheckingId(certificateId);
    try {
      const response = await axiosInstance.get(
        `/assessments/${certificateId}/score`,
      );

      const data = response.data?.data || response.data;

      if (data && typeof data === "object") {
        setResultsData(data);
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
        setSelectedSubmission(match);
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
        setSelectedSubmission(match);
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
    if (
      showResultsModal ||
      messageModal.show ||
      !!selectedCert ||
      !!selectedSubmission
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showResultsModal, messageModal.show, selectedCert, selectedSubmission]);

  const filteredCertificates = useMemo(() => {
    let filtered = certificates.filter((cert) => cert.status === activeTab);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (cert) =>
          cert.title.toLowerCase().includes(q) ||
          cert.type?.toLowerCase().includes(q) ||
          cert.description?.toLowerCase().includes(q) ||
          cert.longDescription?.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [activeTab, searchQuery, certificates]);

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
    if (!cert.isSubmitted) {
      localStorage.setItem(
        "pending_assessment_ids",
        JSON.stringify({
          assessment_id: cert.id,
          certificate_id: cert.certificateId,
          payment_id: cert.paymentId,
          assessment_type: cert.assessmentType,
        }),
      );
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
    return (
      <div className="p-6 lg:p-10 bg-dull-white/10">
        <div className="max-w-7xl mx-auto">
          <SubmissionDetails
            certificate={selectedSubmission}
            onBack={() => setSelectedSubmission(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 lg:p-10 lg:pt-3 bg-light-gray">
        <div className="max-w-7xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-[22px] md:text-[24px] font-semibold text-secondary leading-tight">
                Employee Dashboard
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
                  <Tooltip
                    content="Access denied. You do not have permission to view certificates."
                    disabled={canAccessCertificates}
                  >
                    <button
                      onClick={() =>
                        canAccessCertificates &&
                        router.push(`${base}/certificate`)
                      }
                      className={`flex items-center gap-1 text-sm md:text-base font-semibold text-secondary hover:translate-x-1 transition-all w-fit ${!canAccessCertificates ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      View all{" "}
                      <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-1" />
                    </button>
                  </Tooltip>
                </div>

                <div className="space-y-6">
                  <div className="flex bg-zinc-50 rounded-2xl p-1.5 border border-dull-white/40 shadow-sm overflow-x-auto w-full max-w-[33%] no-scrollbar">
                    <div className="flex min-w-max gap-1">
                      {["In Progress", "Active", "Expired"].map((tab) => (
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

                  <div className="space-y-6 relative min-h-[16rem] pb-2">
                    {isLoading ? (
                      <div className="flex h-[26rem] items-center justify-center">
                        <LoadingScreen
                          isLoading={true}
                          progress={loadingProgress}
                          size="lg"
                        />
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
                              className="bg-zinc-50 rounded-3xl md:rounded-4xl border border-dull-white/40 shadow-sm p-5 md:p-5 min-h-[14rem]"
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
                                        <div className="px-8 md:px-16 py-2 bg-[#1A1A1A] text-white rounded-full text-xs md:text-[13px] font-medium">
                                          {cert.type === "Self-disclosure"
                                            ? "Self-disclosure Badge"
                                            : `${cert.currentLevel || "Emerald"} Badge`}
                                        </div>
                                        {cert.type === "Self-disclosure" && (
                                          <span className="text-xs md:text-[13px] font-medium text-[#1A1A1A]">
                                            72/100 (Eligible for Certification)
                                          </span>
                                        )}
                                      </div>

                                      {cert.type === "Self-disclosure" && (
                                        <div className="flex gap-2">
                                          {[
                                            "Bronze",
                                            "Silver",
                                            "Gold",
                                            "Emerald",
                                          ].map((tag) => (
                                            <span
                                              key={tag}
                                              className="px-3 py-1 bg-[#F5F5F5] text-[#737373] rounded-full text-[11px] font-semibold"
                                            >
                                              {tag}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    <div className="absolute -top-4 md:top-0 right-0 scale-75 md:scale-100 origin-right">
                                      <CircularProgress
                                        progress={
                                          cert.type === "Self-disclosure"
                                            ? 20
                                            : 60
                                        }
                                        total={
                                          cert.type === "Self-disclosure"
                                            ? 20
                                            : 100
                                        }
                                        label={
                                          cert.type === "Self-disclosure"
                                            ? "20/20"
                                            : "60%"
                                        }
                                      />
                                    </div>
                                  </div>

                                  <p className="text-[#737373] text-xs md:text-[13px] leading-[1.6] w-full md:max-w-[60%]">
                                    Evaluates day-to-day hotel operations across
                                    energy, water, waste and purchasing to
                                    minimise environmental impact without
                                    compromising guest comfort
                                  </p>

                                  <div className="mt-6">
                                    <div className="h-px bg-[#999] w-full mb-6" />
                                    <div className="flex flex-row justify-between items-end gap-4">
                                      <div className="flex  gap-3">
                                        <Button
                                          variant="secondary"
                                          className="h-10 cursor-pointer rounded-md whitespace-nowrap px-2 w-48 bg-white border border-[#E5E5E5] text-[#1A1A1A] text-[13px] font-semibold hover:bg-gray-50  shadow-none"
                                        >
                                          Download Badge
                                        </Button>

                                        {cert.type === "Self-disclosure" ? (
                                          <Tooltip
                                            content="Access denied. You do not have permission to get certified."
                                            disabled={canAccessCertificates}
                                          >
                                            <Button
                                              variant="primary"
                                              disabled={!canAccessCertificates}
                                              className="h-10 rounded-md whitespace-nowrap px-2 w-48 bg-[#1A1A1A] text-white text-[13px] font-semibold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                              Get Certified
                                            </Button>
                                          </Tooltip>
                                        ) : (
                                          <>
                                            <Button
                                              variant="secondary"
                                              className="h-10 cursor-pointer whitespace-nowrap px-2 w-48 bg-[#EAEAEA] text-[#1A1A1A] text-[13px] font-semibold hover:bg-[#d4d4d4]  shadow-none"
                                            >
                                              Download Certificate
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

                                      <div className="text-right">
                                        <p className="text-[12px] font-semibold text-[#1A1A1A]">
                                          Active Period
                                        </p>
                                        <p className="text-[12px] text-[#A3A3A3]">
                                          15 Jan 2026 - 14 Jan 2028 (2 years)
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : cert.status === "In Progress" ? (
                                <div className="flex flex-col overflow-visible">
                                  <div className="relative mb-1">
                                    <div className="flex-1 min-w-0 pr-45">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                          <h3
                                            className="text-[18px] font-bold text-[#1A1A1A] leading-tight truncate"
                                            title={cert.title}
                                          >
                                            {cert.title}
                                          </h3>
                                          <span className="px-2.5 py-0.5 rounded-full bg-[#F5F5F5] text-secondary text-[10px] font-semibold border border-[#E5E5E5] shrink-0">
                                            {cert.type}
                                          </span>
                                        </div>
                                        <p className="text-[12px] font-medium text-[#A3A3A3] truncate">
                                          {cert.subDescription}
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
                                        {cert.isPending
                                          ? "Your assessment has been submitted and is currently being reviewed by our AI system. Check back soon for your score."
                                          : cert.description}
                                        <span className="hidden lg:inline">
                                          {" "}
                                          {cert.longDescription}
                                        </span>
                                      </p>
                                    </div>

                                    <div className="md:absolute top-0 right-0 flex justify-center md:block py-4 md:py-0">
                                      <CircularProgress
                                        progress={
                                          cert.isPending ? 100 : cert.progress
                                        }
                                        total={cert.total}
                                        label={
                                          cert.isPending ? "100%" : undefined
                                        }
                                      />
                                    </div>
                                  </div>

                                  <div className="pt-3 border-t border-[#F5F5F5]">
                                    {cert.isPending ? (
                                      <div className="flex gap-3">
                                        <Tooltip
                                          content="Access denied. You do not have permission to check results."
                                          disabled={canAccessCertificates}
                                        >
                                          <Button
                                            variant="secondary"
                                            disabled={
                                              !canAccessCertificates ||
                                              isCheckingId === cert.id
                                            }
                                            className="bg-[#1A1A1A] w-full md:max-w-fit text-white h-12 px-6 rounded-lg text-[13px] font-semibold hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={() =>
                                              handleCheckResults(cert.id)
                                            }
                                          >
                                            {isCheckingId === cert.id
                                              ? "Checking..."
                                              : "Check Results"}
                                          </Button>
                                        </Tooltip>
                                      </div>
                                    ) : (
                                      <Tooltip
                                        content="Access denied. You do not have permission to perform this action."
                                        disabled={canAccessCertificates}
                                      >
                                        <Button
                                          variant="secondary"
                                          disabled={!canAccessCertificates}
                                          className="bg-[#1A1A1A] w-full md:max-w-fit text-white h-12 px-6 rounded-lg text-[13px] font-semibold hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          onClick={() =>
                                            handleContinueSubmission(cert)
                                          }
                                        >
                                          Continue Submission
                                        </Button>
                                      </Tooltip>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-4 overflow-visible">
                                  <div className="relative mb-1">
                                    <div className="flex-1 min-w-0 pr-45">
                                      <div className="flex items-center gap-2">
                                        <h3
                                          className="text-[18px] font-bold text-[#1A1A1A] truncate"
                                          title={cert.title}
                                        >
                                          {cert.title}
                                        </h3>
                                        <div className="flex gap-2 shrink-0">
                                          <span className="px-2.5 py-0.5 bg-[#FEE2E2] text-[#DC2626] rounded-full text-[10px] font-semibold">
                                            Expired
                                          </span>
                                          <span className="px-2.5 py-0.5 bg-[#F5F5F5] text-[#737373] rounded-full text-[10px] font-semibold border border-[#E5E5E5]">
                                            Self-assured
                                          </span>
                                          <span className="px-2.5 py-0.5 bg-[#1A1A1A] text-white rounded-full text-[10px] font-semibold">
                                            Assured
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="absolute top-0 right-0 flex justify-end max-w-42.5 max-h-10 overflow-hidden">
                                      <span className="px-2.5 py-0.5 bg-[#F5F5F5] text-[#737373] rounded-full text-[10px] font-semibold border border-[#E5E5E5] shrink-0">
                                        {cert.category}
                                      </span>
                                    </div>
                                  </div>

                                  <p className="text-[13px] text-[#A3A3A3] font-medium">
                                    Best for: hotels seeking a broad operational
                                    sustainability baseline.
                                  </p>

                                  <div className="inline-flex">
                                    <div className="px-16 py-2 bg-[#E8E8E8] text-[#525252] rounded-full text-[13px] font-medium">
                                      Green Operations Badge
                                    </div>
                                  </div>

                                  <p className="text-[#737373] text-xs md:text-[13px] leading-[1.6] max-w-full md:max-w-[80%]">
                                    Evaluates day-to-day hotel operations across
                                    energy, water, waste and purchasing to
                                    minimise environmental impact without
                                    compromising guest comfort.
                                  </p>

                                  <div className="h-px w-full bg-[#99999958]" />

                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-4">
                                    <div>
                                      <p className="text-[14px] font-semibold text-[#1A1A1A] mb-1">
                                        Self-assessment: USD 500
                                      </p>
                                      <p className="text-[12px] text-[#A3A3A3]">
                                        Per property, online checklist.
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[14px] font-semibold text-[#1A1A1A] mb-1">
                                        Renew: USD 3,500-6,000
                                      </p>
                                      <p className="text-[12px] text-[#A3A3A3]">
                                        This is the price of renew certificate.
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[14px] font-semibold text-[#1A1A1A] mb-1">
                                        Assured: USD 3,500-6,000
                                      </p>
                                      <p className="text-[12px] text-[#A3A3A3]">
                                        Per certification, range by size and
                                        complexity.
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex w-full max-w-[50%] gap-3 mt-6">
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
                <Tooltip
                  content="Access denied. You do not have permission to view certificates."
                  disabled={canAccessCertificates}
                >
                  <button
                    onClick={() =>
                      canAccessCertificates &&
                      router.push(`${base}/certificate?filter=recommended`)
                    }
                    className={`flex items-center gap-1 text-sm md:text-base font-semibold text-secondary hover:translate-x-1 transition-all w-fit ${!canAccessCertificates ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    View all{" "}
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-1" />
                  </button>
                </Tooltip>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center p-20">
                <LoadingScreen
                  isLoading={true}
                  progress={loadingProgress}
                  size="lg"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredRecommendations.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white rounded-[20px] border border-zinc-200 p-4 md:p-5 shadow-sm flex flex-col hover:shadow-md transition-shadow"
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
                        <p className="text-[12px] text-[#A3A3A3] font-medium mb-3">
                          {item.code}
                        </p>
                        <div className="mb-2">
                          <img
                            src="/assets/imgs/icons/GoldRank.svg"
                            alt="Gold Rank"
                            className="w-7 h-7 object-contain"
                          />
                        </div>

                        <p className="text-[#737373] text-[12px] leading-[1.6] mb-3 max-w-120 line-clamp-3 overflow-hidden">
                          {item.description}
                        </p>
                      </div>

                      <div className="mt-auto">
                        <div className="h-px bg-[#999999bc] w-full mb-4" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-5 h-auto">
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

                          <Tooltip
                            content="Access denied. You do not have permission to get started with certificates."
                            disabled={canAccessCertificates}
                          >
                            <Button
                              variant="primary"
                              disabled={!canAccessCertificates}
                              className="w-full sm:w-auto bg-[#1A1A1A] hover:bg-black text-white px-10 h-10 rounded-lg text-[13px] font-semibold transition-all shadow-lg shadow-black/5 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          </Tooltip>
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

      <AnimatePresence>
        {messageModal.show && (
          <div className="fixed inset-0 z-500 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl w-full max-w-sm p-8 text-center space-y-6 shadow-2xl"
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                  messageModal.type === "error"
                    ? "bg-red-50 text-red-500"
                    : "bg-blue-50 text-blue-500"
                }`}
              >
                {messageModal.type === "error" ? (
                  <AlertCircle className="w-8 h-8" />
                ) : (
                  <div className="text-2xl">🎉</div>
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
              <Button
                onClick={() => {
                  if (messageModal.onConfirm) messageModal.onConfirm();
                  setMessageModal((prev) => ({ ...prev, show: false }));
                }}
                className={`w-full h-12 font-black rounded-xl text-sm ${
                  messageModal.type === "error"
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-zinc-900 hover:bg-black text-white"
                }`}
              >
                {messageModal.confirmText || "Got it"}
              </Button>
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
              className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl relative overflow-hidden"
            >
              <div className="p-10 text-center space-y-8">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto bg-blue-50 ring-8 ring-blue-50/30">
                  <div className="text-5xl">🏆</div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-black text-zinc-900 tracking-tight">
                    Congratulations!
                  </h2>
                  <p className="text-gray-400 font-medium text-base">
                    You have successfully completed the assessment.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-50 border border-zinc-100 rounded-3xl p-6 text-center shadow-sm">
                    <p className="text-[10px] font-bold text-zinc-400">
                      Final Score
                    </p>
                    <p className="text-4xl font-black text-zinc-900">
                      {resultsData.score ?? 0}%
                    </p>
                  </div>
                  <div className="bg-zinc-50 border border-zinc-100 rounded-3xl p-6 text-center shadow-sm">
                    <p className="text-[10px] font-bold text-zinc-400">
                      Status
                    </p>
                    <p className="text-lg font-black text-zinc-900 capitalize">
                      {resultsData.status}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowResultsModal(false)}
                  className="w-full h-14 bg-zinc-900 hover:bg-black text-white font-black rounded-2xl"
                >
                  Close
                </Button>
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
      `}</style>
    </>
  );
}
