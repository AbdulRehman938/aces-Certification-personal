"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Clock,
  Check,
  User,
  Calendar,
  Upload,
  MessageSquare,
  FileText,
  X,
  CheckCircle2,
  FolderOpen,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui";
import { AcesDynamicBadge } from "@/components/AcesDynamicBadge";
import { axiosInstance } from "@/lib/axios";
import { Loading } from "@/app/(dashboards)/admin/common/Loading";
import { SubmittedData } from "./submitted-data";
import { Skeleton } from "@/components/ui/skeleton";

export interface SubmissionCertificate {
  id: string | number; // Assessment ID
  title: string;
  details?: {
    subtitle?: string;
    badge?: string;
    steps?: Array<{
      label: string;
      sub?: string;
      status: "completed" | "active" | "pending";
    }>;
    currentStage?: {
      stage: string;
      leadAuditor: string;
      startDate: string;
    };
    actionRequired?: Array<{ title: string; desc: string }>;
    auditorRemarks?: {
      name: string;
      role: string;
      text: string;
      date: string;
      status: string;
    };
    reviewerRemarks?: {
      name: string;
      role: string;
      text: string;
      date: string;
      status: string;
    } | null;
  } | null;
}

interface SubmissionDetailsProps {
  onBack: () => void;
  certificate: SubmissionCertificate;
}

export function SubmissionDetails({
  onBack,
  certificate,
}: SubmissionDetailsProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [selectedActionIndex, setSelectedActionIndex] = useState<number | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<"DETAILS" | "SUBMITTED_DATA">("DETAILS");

  // Modal form state
  const [responseText, setResponseText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  // Track submitted action indices
  const [submittedIndices, setSubmittedIndices] = useState<Set<number>>(
    new Set(),
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(
          `/assessments/${certificate.id}/review-overview`,
        );
        const assessment = res.data?.data || res.data;
        setData(assessment);
      } catch (err) {
        console.error("Failed to fetch submission details", err);
      } finally {
        setLoading(false);
      }
    };

    if (certificate.id) {
      fetchDetails();
    } else {
      setLoading(false);
    }
  }, [certificate.id]);

  if (loading) {
    return (
      <div className="space-y-6 font-sans pb-20 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-20 rounded-lg" />
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>

        <div className="flex items-center gap-4 pt-2">
          <div className="space-y-3 flex-1">
            <Skeleton className="h-8 w-1/3 rounded-lg" />
            <Skeleton className="h-4 w-1/2 rounded-lg" />
          </div>
          <Skeleton className="h-16 w-16 rounded-full shrink-0 ml-auto" />
        </div>

        <div className="bg-white rounded-3xl border border-zinc-100 p-8 space-y-10">
          <div className="space-y-4">
            <Skeleton className="h-4 w-32 rounded-lg" />
            <div className="flex justify-between h-full items-center gap-4">
              {[1, 2, 3].map((i: number) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-3 flex-1"
                >
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-3 w-16 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-4 w-32 rounded-lg opacity-50" />
            <div className="flex justify-between h-full items-center gap-4">
              {[1, 2, 3, 4, 5].map((i: number) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-3 flex-1"
                >
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-3 w-12 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-zinc-100 p-10 space-y-6">
          <Skeleton className="h-5 w-32 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[1, 2, 3].map((i: number) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-12 rounded-lg" />
                  <Skeleton className="h-4 w-24 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#F6F6F6]/60 rounded-3xl border border-zinc-100 p-8 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-3 w-48 rounded-lg" />
          </div>
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[1, 2].map((i: number) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-zinc-100 p-10 space-y-6"
            >
              <Skeleton className="h-5 w-32 rounded-lg" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-12 rounded-lg" />
                  <Skeleton className="h-4 w-24 rounded-lg" />
                </div>
              </div>
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const status = data?.status?.toLowerCase() || "pending";

  const getProgressState = () => {
    const s = `${status} ${data?.auditor?.notes?.status || ""}`
      .toLowerCase()
      .replace(/_/g, " ");

    const hasAuditorInput = !!(
      data?.auditorRemarks ||
      data?.auditor?.notes?.audit_summary ||
      (data?.score !== undefined && data?.score !== null)
    );
    const isActuallyCompleted =
      s.includes("passed") ||
      s.includes("completed") ||
      s.includes("certified") ||
      s.includes("active");

    // Disclosure is always completed in this view
    let disclosureLevel = 3;

    // Assurance Mapping (8 steps)
    let assuranceLevel = 0;

    if (s.includes("passed") || s.includes("disclosure completed")) {
      assuranceLevel = 0; // Just started assurance
    } else if (s.includes("audit requested")) {
      assuranceLevel = 0;
    }

    if (s.includes("reviewer assigned")) assuranceLevel = 1;
    if (s.includes("reviewing") || s.includes("management review"))
      assuranceLevel = 2;
    if (s.includes("auditor assigned")) assuranceLevel = 3;
    if (
      s.includes("visit") ||
      s.includes("audit performing") ||
      s.includes("performing audit")
    )
      assuranceLevel = 4;
    if (s.includes("audit done") || hasAuditorInput) assuranceLevel = 5;
    if (
      s.includes("review done") ||
      (isActuallyCompleted && !s.includes("certified"))
    )
      assuranceLevel = 6;
    if (
      isActuallyCompleted ||
      s.includes("published") ||
      s.includes("certified")
    )
      assuranceLevel = 8;

    return { disclosureLevel, assuranceLevel };
  };

  const { disclosureLevel, assuranceLevel } = getProgressState();

  const getSubStepStatus = (stepIndex: number, currentLevel: number) => {
    if (currentLevel > stepIndex) return "completed";
    if (currentLevel === stepIndex) return "active";
    return "pending";
  };

  const disclosureSteps = [
    {
      label: "Self-Disclosure In Progress",
      status: getSubStepStatus(0, disclosureLevel),
    },
    {
      label: "Self-Disclosure In Review",
      status: getSubStepStatus(1, disclosureLevel),
    },
    {
      label: "Self-Disclosure Completed",
      status: getSubStepStatus(2, disclosureLevel),
    },
  ];

  const assuranceSteps = [
    {
      label: "Start",
      status: getSubStepStatus(0, assuranceLevel),
    },
    {
      label: "Reviewer Assigned",
      status: getSubStepStatus(1, assuranceLevel),
    },
    {
      label: "Under Review",
      status: getSubStepStatus(2, assuranceLevel),
    },
    {
      label: "Auditor Assigned",
      status: getSubStepStatus(3, assuranceLevel),
    },
    {
      label: "Site Visit",
      status: getSubStepStatus(4, assuranceLevel),
    },
    {
      label: "Audit Done",
      status: getSubStepStatus(5, assuranceLevel),
    },
    {
      label: "Review Done",
      status: getSubStepStatus(6, assuranceLevel),
    },
    {
      label: "Certified",
      status: getSubStepStatus(7, assuranceLevel),
    },
  ];

  const getStepCircleColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-zinc-900 border-zinc-900 text-white";
      case "active":
        return "bg-white border-zinc-500 text-zinc-900";
      default:
        return "bg-white border-zinc-300 text-zinc-600";
    }
  };

  const getStepTextColor = (status: string) => {
    switch (status) {
      case "completed":
      case "active":
        return "text-zinc-900";
      default:
        return "text-zinc-600";
    }
  };

  const auditorName =
    data?.auditor?.name ||
    data?.auditor_name ||
    data?.assignedAuditor?.name ||
    (data?.assignedAuditor?.firstName
      ? `${data.assignedAuditor.firstName} ${data.assignedAuditor.lastName || ""}`
      : null);

  const currentStage = {
    stage:
      data?.auditor?.notes?.status || data?.status
        ? (data?.auditor?.notes?.status || data.status)
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l: string) => l.toUpperCase())
        : null,
    leadAuditor: auditorName,
    startDate: data?.submitted_at
      ? formatDate(data.submitted_at)
      : data?.created_at
        ? formatDate(data.created_at)
        : null,
  };

  const actionRequired: any[] = (
    data?.actions_required ||
    data?.clarification_requests ||
    data?.action_items ||
    []
  ).map((action: any) => ({
    ...action,
    title: action.question_text || action.title || "Action Item",
    description: action.message || action.description || action.desc,
  }));

  // Required documents — check multiple possible API field names
  const requiredDocuments: any[] =
    data?.documentRequests ||
    data?.document_requests ||
    data?.requiredDocuments ||
    data?.required_documents ||
    [];

  // Dynamic status badge label
  const statusBadgeLabel = data?.status
    ? data.status
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l: string) => l.toUpperCase())
    : null;

  // Use fetched title (handles reload case where certificate.title may be empty)
  const displayTitle =
    data?.assessment_name ||
    data?.certificate_name ||
    certificate.title ||
    "Certificate Details";

  const auditorRemarks =
    data?.auditor?.notes?.audit_summary ||
    data?.auditor?.notes?.audit_description ||
    data?.auditor_notes ||
    data?.auditorRemarks
      ? {
          name: data?.auditor?.name || auditorName,
          role: "Lead Auditor",
          text:
            data?.auditor?.notes?.audit_description ||
            data?.auditor?.notes?.audit_summary ||
            data.auditor_notes ||
            data.auditorRemarks,
          date: formatDate(data.updated_at || data.updatedAt),
          status: data?.auditor?.notes?.status || data.status,
          score: data?.auditor?.notes?.score,
        }
      : null;

  const reviewerRemarks =
    data?.reviewer?.notes?.review_summary ||
    data?.reviewer?.notes?.review_description
      ? {
          name: data.reviewer.name,
          role: "Management Reviewer",
          text:
            data.reviewer.notes.review_description ||
            data.reviewer.notes.review_summary,
          date: formatDate(data.updated_at || data.updatedAt),
          status: data.reviewer.notes.review_status,
          score: data.reviewer.notes.review_score,
        }
      : null;

  const badgeScore = data?.auditor?.notes?.score || 0;
  let badgeLevel = "SILVER";
  if (badgeScore >= 95) badgeLevel = "EMERALD";
  else if (badgeScore >= 85) badgeLevel = "GOLD";
  else if (badgeScore >= 70) badgeLevel = "SILVER";
  else if (badgeScore >= 1) badgeLevel = "BRONZE";

  const badgeName =
    data?.status === "completed" ? "ACES CERTIFIED" : "ACES VERIFIED";
  const badgeDate = formatDate(data?.updated_at || data?.created_at || "");
  const badgeSerial = data?.id?.toString() || "000000";

  const handleActionClick = (action: any, index: number) => {
    setSelectedAction(action);
    setSelectedActionIndex(index);
    setResponseText("");
    setUploadedFile(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAction(null);
    setSelectedActionIndex(null);
    setResponseText("");
    setUploadedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    // reset so same file can be re-selected after removal
    e.target.value = "";
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

  const canSubmit = uploadedFile !== null || responseText.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (responseText.trim()) formData.append("response", responseText.trim());
      if (uploadedFile) formData.append("document", uploadedFile);
      if (selectedAction?.id)
        formData.append("clarificationId", selectedAction.id);

      await axiosInstance.post(
        `/assessments/${certificate.id}/clarification-response`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
    } catch (err) {
      // silently continue — still mark as submitted locally
      console.error("Failed to submit clarification response", err);
    } finally {
      setIsSubmitting(false);
      if (selectedActionIndex !== null) {
        setSubmittedIndices((prev) => new Set(prev).add(selectedActionIndex));
      }
      handleCloseModal();
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3500);
    }
  };

  if (view === "SUBMITTED_DATA") {
    return (
      <SubmittedData
        onBack={() => setView("DETAILS")}
        assessmentId={certificate.id}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans">
      {/* Success Toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 bg-zinc-900 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            Response submitted successfully
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-8 pb-4 flex items-start justify-between gap-2 shrink-0 border-b border-zinc-50">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-dull-gray">
                    Respond to Action Item
                  </h2>
                  <p className="text-gray text-xs font-semibold">
                    Action Required: {selectedAction?.action_name}
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="shrink-0 w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-zinc-500" />
                </button>
              </div>

              {/* Modal Content (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-6 scrollbar-hide">
                <div className="bg-[#F8F9FA] rounded-2xl px-5 py-4 border border-[#F0F0F0]">
                  <p className="text-[#737373] text-[14px] leading-relaxed font-medium">
                    {selectedAction?.description ||
                      "The auditor requires supporting documentation for this action item. Please upload the relevant document and/or provide a written explanation."}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[#A3A3A3] text-xs font-bold uppercase tracking-wider ml-1">
                    Your Response{" "}
                    <span className="lowercase font-medium">(optional)</span>
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Type your explanation here..."
                    className="w-full h-32 bg-white border border-[#E5E5E5] rounded-2xl px-5 py-4 text-[14px] focus:outline-none focus:ring-2 focus:ring-zinc-100 resize-none font-medium transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[#A3A3A3] text-xs font-bold uppercase tracking-wider ml-1">
                    Upload Document{" "}
                    <span className="lowercase font-medium">(optional)</span>
                  </label>

                  {uploadedFile ? (
                    <div className="border border-[#E5E5E5] rounded-2xl p-4 flex items-center gap-4 bg-[#FAFAFA]">
                      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-dull-gray truncate">
                          {uploadedFile.name}
                        </p>
                        <p className="text-[12px] text-[#A3A3A3] font-bold">
                          {(uploadedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        onClick={handleRemoveFile}
                        className="shrink-0 w-8 h-8 rounded-full bg-zinc-200 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#E5E5E5] rounded-2xl py-6 px-4 flex flex-col items-center justify-center gap-2 hover:bg-[#FAFAFA] hover:border-[#D4D4D4] transition-all cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5 text-[#A3A3A3]" />
                      </div>
                      <div className="text-center">
                        <p className="text-[#737373] text-sm font-bold">
                          Click to upload
                        </p>
                        <p className="text-[#A3A3A3] text-[12px] font-bold mt-0.5">
                          PDF, DOC, DOCX — max 10MB
                        </p>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {/* Modal Footer (Sticky) */}
              <div className="p-8 py-6 border-t border-zinc-50 flex justify-end gap-3 shrink-0 bg-white">
                <button
                  onClick={handleCloseModal}
                  className="px-6 py-2.5 border border-[#E5E5E5] rounded-xl text-dull-gray font-bold text-[13px] hover:bg-zinc-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className="px-8 py-2.5 bg-dull-gray rounded-xl text-white font-bold text-[13px] hover:bg-black transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                >
                  {isSubmitting ? "Sending..." : "Send Response"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto py-10 pt-0 px-6 space-y-6">
        {/* Navigation Header */}
        <div className="flex justify-between items-center mb-7">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#A3A3A3] hover:text-dull-gray transition-colors font-bold text-base group"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>
          <button
            onClick={() => setView("SUBMITTED_DATA")}
            className="px-5 py-2.5 bg-dull-gray text-white rounded-xl font-bold text-[13px] hover:bg-black transition-all shadow-sm active:scale-[0.98]"
          >
            View Submitted Data
          </button>
        </div>

        {/* Global Wrapper Box */}
        <div className="bg-white border border-[#E5E5E5] rounded-[40px] shadow-[0_4px_30px_rgba(0,0,0,0.03)] p-10 space-y-12">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <h1 className="text-2xl font-bold text-dull-gray tracking-tight leading-tight">
                  {displayTitle}
                </h1>
                {statusBadgeLabel && (
                  <div className="shrink-0 px-4 py-[5px] bg-[#F5F5F5] border border-[#E5E5E5] rounded-full">
                    <span className="text-[10px] font-bold text-[#737373] uppercase tracking-[0.05em]">
                      {statusBadgeLabel}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[#737373] text-sm font-medium max-w-2xl">
                Choose from hotel and property certifications designed to align
                with global ESG standards.
              </p>
            </div>
          </div>

          {/* Progress Tracker Section */}
          <div className="space-y-12 pb-4">
            {/* Row 1: Self-Disclosure */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <div className="h-4 w-1 bg-dull-gray rounded-full" />
                <h3 className="text-[12px] font-bold text-dull-gray uppercase tracking-wider">
                  Self-Disclosure
                </h3>
              </div>
              <div className="relative overflow-hidden">
                <div className="relative flex justify-between items-start scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] overflow-x-auto min-w-full">
                  <div className="absolute top-[14px] left-[5%] right-[5%] h-px bg-[#E5E5E5]" />
                  {disclosureSteps.map((step: any, i: number) => (
                    <div
                      key={i}
                      className="relative z-10 flex flex-col items-center text-center flex-1 min-w-[110px]"
                    >
                      {i < disclosureSteps.length - 1 &&
                        step.status === "completed" && (
                          <div className="absolute top-[14px] left-[50%] right-[-50%] h-[1.5px] bg-dull-gray z-10" />
                        )}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-20 ${
                          step.status === "completed"
                            ? "bg-dull-gray border-dull-gray text-white"
                            : step.status === "active"
                              ? "bg-white border-dull-gray text-dull-gray shadow-sm"
                              : "bg-white border-[#E5E5E5] text-[#A3A3A3]"
                        }`}
                      >
                        {step.status === "completed" ? (
                          <Check className="w-3 h-3 stroke-[3.5]" />
                        ) : (
                          <span className="text-[10px] font-bold">{i + 1}</span>
                        )}
                      </div>
                      <div className="mt-4 px-2">
                        <h4
                          className={`text-[9px] font-bold uppercase tracking-tight leading-tight transition-colors ${
                            step.status === "completed" ||
                            step.status === "active"
                              ? "text-dull-gray"
                              : "text-[#A3A3A3]"
                          }`}
                        >
                          {step.label}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: Self-Assured Progress */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <div className="h-4 w-1 bg-dull-gray rounded-full opacity-40" />
                <h3 className="text-[12px] font-bold text-[#A3A3A3] uppercase tracking-wider">
                  Self-Assured
                </h3>
              </div>
              <div className="relative overflow-hidden">
                <div className="relative flex justify-between items-start scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] overflow-x-auto min-w-full">
                  <div className="absolute top-[14px] left-[5%] right-[5%] h-px bg-[#E5E5E5]" />
                  {assuranceSteps.map((step: any, i: number) => (
                    <div
                      key={i}
                      className="relative z-10 flex flex-col items-center text-center flex-1 min-w-[95px]"
                    >
                      {i < assuranceSteps.length - 1 &&
                        step.status === "completed" && (
                          <div className="absolute top-[14px] left-[50%] right-[-50%] h-[1.5px] bg-dull-gray z-10" />
                        )}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-20 ${
                          step.status === "completed"
                            ? "bg-dull-gray border-dull-gray text-white"
                            : step.status === "active"
                              ? "bg-white border-dull-gray text-dull-gray shadow-sm"
                              : "bg-white border-[#E5E5E5] text-[#A3A3A3]"
                        }`}
                      >
                        {step.status === "completed" ? (
                          <Check className="w-3 h-3 stroke-[3.5]" />
                        ) : (
                          <span className="text-[10px] font-bold">
                            {disclosureSteps.length + i + 1}
                          </span>
                        )}
                      </div>
                      <div className="mt-4 px-2">
                        <h4
                          className={`text-[9px] font-bold uppercase tracking-tight leading-tight transition-colors ${
                            step.status === "completed" ||
                            step.status === "active"
                              ? "text-dull-gray"
                              : "text-[#A3A3A3]"
                          }`}
                        >
                          {step.label}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Details Card Grid */}
          <div className="space-y-6">
            {/* Current Stage Card */}
            <div className="bg-white border border-[#F0F0F0] rounded-[32px] p-8 shadow-[0_4_12px_rgba(0,0,0,0.015)]">
              <h3 className="text-lg font-bold text-dull-gray mb-6">
                Current Stage
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Stage Info */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#FAFAFA] flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-dull-gray" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-[#A3A3A3] font-bold uppercase tracking-wider">
                      Stage
                    </p>
                    <h5 className="text-[15px] font-bold text-dull-gray whitespace-nowrap">
                      {currentStage.stage || "Assessment Submitted"}
                    </h5>
                  </div>
                </div>

                {/* Lead Auditor Info */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#FAFBFB] border border-[#F0F0F0] flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-[12px] font-bold text-[#737373]">
                      {currentStage.leadAuditor
                        ? currentStage.leadAuditor
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()
                        : "SM"}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-[#A3A3A3] font-bold uppercase tracking-wider">
                      Lead Auditor
                    </p>
                    <h5 className="text-[15px] font-bold text-dull-gray whitespace-nowrap">
                      {currentStage.leadAuditor || "Sarah Mitchell"}
                    </h5>
                  </div>
                </div>

                {/* Start Date Info */}
                <div className="flex items-center gap-4 md:justify-start">
                  <div className="w-10 h-10 rounded-full bg-[#FAFAFA] flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-dull-gray" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-[#A3A3A3] font-bold uppercase tracking-wider">
                      Start Date
                    </p>
                    <h5 className="text-[15px] font-bold text-dull-gray whitespace-nowrap">
                      {currentStage.startDate || "Jan 15, 2024"}
                    </h5>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Required Box */}
            <div className="bg-[#F8F9FA] border border-[#F0F0F0] rounded-[32px] p-8 space-y-6">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-dull-gray">
                  Action Required
                </h3>
                <p className="text-[#8A8A8A] text-[13px] font-medium">
                  The following items require your attention
                </p>
              </div>

              <div className="space-y-3">
                {actionRequired.length > 0 ? (
                  actionRequired.map((action: any, i: number) => {
                    const isSubmitted = submittedIndices.has(i);
                    return (
                      <div
                        key={i}
                        onClick={() =>
                          !isSubmitted && handleActionClick(action, i)
                        }
                        className="bg-white rounded-2xl border border-[#F0F0F0] p-5 flex gap-4 items-center shadow-sm hover:border-[#D4D4D4] hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-full bg-[#EF4444] flex items-center justify-center shrink-0 text-white shadow-sm">
                          <span className="font-black text-base italic">!</span>
                        </div>
                        <div className="grow space-y-0.5">
                          <h4 className="text-[15px] font-bold text-dull-gray">
                            {action.title}
                          </h4>
                          <p className="text-[12px] text-[#737373] font-medium leading-normal line-clamp-1">
                            {action.description}
                          </p>
                        </div>
                        <MessageSquare className="w-5 h-5 text-[#D4D4D4] group-hover:text-dull-gray transition-colors ml-2" />
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center space-y-2 opacity-50 grayscale">
                    <MessageSquare className="w-8 h-8 text-zinc-300" />
                    <p className="text-sm font-bold text-zinc-400">
                      No action items pending
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Remarks Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Auditor Card */}
              <div className="bg-white border border-[#F0F0F0] rounded-[32px] p-8 space-y-6 shadow-sm">
                <h3 className="text-lg font-bold text-dull-gray">
                  Auditor Remarks
                </h3>

                {auditorRemarks ? (
                  <div className="border border-[#F0F0F0] rounded-[24px] p-6 space-y-5 shadow-sm bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#F5F5F5] border border-[#E5E5E5] flex items-center justify-center text-[12px] font-bold text-[#737373] shrink-0">
                          {auditorRemarks.name
                            ? auditorRemarks.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                            : "SM"}
                        </div>
                        <div className="space-y-0">
                          <p className="text-[10px] text-[#A3A3A3] font-bold uppercase tracking-wider">
                            Lead Auditor
                          </p>
                          <h5 className="text-[14px] font-bold text-dull-gray">
                            {auditorRemarks.name}
                          </h5>
                        </div>
                      </div>
                      <div className="px-3.5 py-1 bg-[#F5F5F5] rounded-full text-[9px] font-bold text-[#737373] uppercase tracking-widest border border-[#E5E5E5]">
                        {auditorRemarks.status?.replace(/_/g, " ") ||
                          "Needs Clarification"}
                      </div>
                    </div>
                    <p className="text-[13px] text-[#737373] font-medium leading-[1.6]">
                      {auditorRemarks.text}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-[10px] text-[#D4D4D4] font-bold uppercase tracking-wider">
                        {auditorRemarks.date}
                      </p>
                      {auditorRemarks.score !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold text-[#A3A3A3] uppercase">
                            Score:
                          </span>
                          <span className="text-[13px] font-black text-dull-gray italic">
                            {auditorRemarks.score}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-10 min-h-[180px]">
                    <div className="w-[60px] h-[60px] rounded-full bg-[#FAFAFA] flex items-center justify-center shadow-inner">
                      <Clock className="w-7 h-7 text-[#D4D4D4]" />
                    </div>
                    <p className="text-[#A3A3A3] font-bold text-lg tracking-tight">
                      No remarks yet
                    </p>
                  </div>
                )}
              </div>

              {/* Reviewer Card (Empty State Match Image) */}
              <div className="bg-white border border-[#F0F0F0] rounded-[32px] p-8 flex flex-col items-center shadow-sm min-h-[280px]">
                <h3 className="text-lg font-bold text-dull-gray w-full text-left mb-auto">
                  Management Reviewer Remarks
                </h3>

                {reviewerRemarks ? (
                  <div className="w-full border border-[#F0F0F0] rounded-[24px] p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#F5F5F5] border border-[#E5E5E5] flex items-center justify-center text-[12px] font-bold text-[#737373] shrink-0">
                          {reviewerRemarks.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </div>
                        <div className="space-y-0">
                          <p className="text-[10px] text-[#A3A3A3] font-bold uppercase tracking-wider">
                            Reviewer
                          </p>
                          <h5 className="text-[14px] font-bold text-dull-gray">
                            {reviewerRemarks.name}
                          </h5>
                        </div>
                      </div>
                      <div className="px-3.5 py-1 bg-[#F5F5F5] rounded-full text-[9px] font-bold text-[#737373] uppercase tracking-widest border border-[#E5E5E5]">
                        {reviewerRemarks.status || "Completed"}
                      </div>
                    </div>
                    <p className="text-[13px] text-[#737373] font-medium leading-[1.6]">
                      {reviewerRemarks.text}
                    </p>
                    <p className="text-[10px] text-[#D4D4D4] font-bold uppercase tracking-wider">
                      {reviewerRemarks.date}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 py-10">
                    <div className="w-[64px] h-[64px] rounded-full bg-[#F5F5F5] flex items-center justify-center relative shadow-inner">
                      <User className="w-7 h-7 text-[#D4D4D4]" />
                      <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full border border-[#E5E5E5] flex items-center justify-center shadow-sm">
                        <Check className="w-3 h-3 text-dull-gray stroke-[3]" />
                      </div>
                    </div>
                    <p className="text-[#A3A3A3] font-bold text-lg tracking-tight">
                      No remarks yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
