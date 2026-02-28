"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import React from "react";
import Button from "../../common/button";
import { Loading } from "../../common/Loading";
import axios from "axios";
import { axiosInstance } from "@/lib/axios";
import { getApiErrorMessage } from "@/lib/api-error";

type AssessmentDetails = {
  assessmentId: string;
  organizationId: string;
  organizationName: string;
  branchId: string | null;
  branchName: string | null;
  assuranceId: string | null;
  certificateId: string;
  certificateName: string;
  certificateProductId: string;
  paymentId: string;
  assessmentType: string;
  badgeId: string | null;
  badgeName: string | null;
  badgeColor: string | null;
  score: number | null;
  isSubmitted: boolean;
  status: string;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  aiReview: AiReview | null;
  assignedReviewer: NamedAssignee | string | null;
  assignedAuditor: NamedAssignee | string | null;
  auditorInvited?: boolean;
  isCertificateBlocked?: boolean;
  certificateBlockReason?: string | null;
};

type AiReview = {
  completedAt?: string | null;
  flagStatus?: string | null;
  id?: string;
  reviewDescription?: string | null;
  reviewStatus?: string | null;
  score?: number | null;
  startedAt?: string | null;
  totalFlags?: number | null;
};

type NamedAssignee = {
  name?: string;
  firstName?: string;
  lastName?: string;
  profile_picture_url?: string;
};

type AssessmentDetailsApiResponse = {
  success: boolean;
  message?: string;
  data?: AssessmentDetails;
  statusCode?: number;
  timestamp?: string;
};

type AssessmentQuestion = {
  answer_id?: string;
  hint?: string;
  id: string;
  is_compulsory?: boolean;
  main_section_name?: string;
  question_text?: string;
  question_type?: string;
  rank?: number;
  response_type?: string;
  response_value?: string;
  section_name?: string;
  sub_section_name?: string;
};

type AssessmentQuestionsApiResponse = {
  success: boolean;
  message?: string;
  data?: AssessmentQuestion[];
  statusCode?: number;
  timestamp?: string;
};

type AiReviewFlag = {
  id?: string;
  answer_id?: string;
  answerId?: string;
  assessment_answer_id?: string;
  assessment_query_id?: string;
  question_id?: string;
  flag_reason?: string | null;
  reason?: string | null;
};

type AiReviewFlagsApiResponse = {
  success: boolean;
  message?: string;
  data?: AiReviewFlag[] | { flags?: AiReviewFlag[] };
  statusCode?: number;
  timestamp?: string;
};

type AssessmentQuestionItem = {
  id: string | number;
  question: string;
  answer: string;
  attachmentLabel?: string | null;
  attachmentUrl?: string | null;
  isFileQuestion?: boolean;
  aiFlagged: boolean;
  aiFlagReason?: string | null;
  order?: number;
};

type AuditorOption = {
  id: string;
  name: string;
  profile_picture_url?: string;
  certificates: string[];
  location: string;
  status: "available" | "busy" | string;
};

type ReviewerOption = {
  id: string;
  name: string;
  profile_picture_url?: string;
  tags: string[];
};

function AssessmentDetailsContent() {
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get("id");

  const [assessmentDetails, setAssessmentDetails] =
    useState<AssessmentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(assessmentId));
  const [showLoader, setShowLoader] = useState(Boolean(assessmentId));
  const [loadingProgress, setLoadingProgress] = useState(0);
  const loaderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loaderFinishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [assessmentQuestions, setAssessmentQuestions] = useState<
    AssessmentQuestion[]
  >([]);
  const [assessmentRefreshKey, setAssessmentRefreshKey] = useState(0);
  const [aiFlaggedAnswerIds, setAiFlaggedAnswerIds] = useState<Set<string>>(
    new Set(),
  );
  const [aiFlagReasonsById, setAiFlagReasonsById] = useState<
    Record<string, string>
  >({});
  const [auditorOptions, setAuditorOptions] = useState<AuditorOption[]>([]);
  const [auditorVisibleCount, setAuditorVisibleCount] = useState(10);
  const [isLoadingAuditors, setIsLoadingAuditors] = useState(false);
  const [auditorsError, setAuditorsError] = useState<string | null>(null);

  useEffect(() => {
    if (!assessmentId) {
      setIsLoading(false);
      setShowLoader(false);
      setLoadingProgress(0);
      return;
    }

    let isCancelled = false;

    const fetchAssessmentDetails = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get<AssessmentDetailsApiResponse>(
          `/admin/assessments/${assessmentId}`,
        );

        if (isCancelled) return;
        const details = response.data?.data ?? null;
        console.log("assessment details by id:", {
          assessmentId,
          data: details,
        });
        setAssessmentDetails(details);
      } catch {
        if (!isCancelled) setAssessmentDetails(null);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchAssessmentDetails();

    return () => {
      isCancelled = true;
    };
  }, [assessmentId, assessmentRefreshKey]);

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

  useEffect(() => {
    if (assessmentDetails) {
    }
  }, [assessmentDetails]);

  useEffect(() => {
    const id = assessmentDetails?.assessmentId ?? assessmentId;
    if (!id) return;

    let isCancelled = false;

    const fetchAssessmentQuestions = async () => {
      try {
        const response =
          await axiosInstance.get<AssessmentQuestionsApiResponse>(
            `/assessments/${id}/questions`,
          );
        if (isCancelled) return;
        const questions = response.data?.data ?? [];
        setAssessmentQuestions(questions);
      } catch {
        if (!isCancelled) {
          setAssessmentQuestions([]);
        }
      }
    };

    fetchAssessmentQuestions();

    return () => {
      isCancelled = true;
    };
  }, [assessmentDetails?.assessmentId, assessmentId]);

  useEffect(() => {
    const id = assessmentDetails?.assessmentId ?? assessmentId;
    if (!id) {
      setAiFlaggedAnswerIds(new Set());
      return;
    }

    let isCancelled = false;

    const fetchAiReviewFlags = async () => {
      try {
        const response = await axiosInstance.get<AiReviewFlagsApiResponse>(
          `/ai-reviews/${id}/flags`,
        );
        if (isCancelled) return;

        const payload = response.data?.data;
        const flags = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.flags)
            ? payload.flags
            : [];

        const flaggedIds = new Set<string>();
        const reasonMap: Record<string, string> = {};
        flags.forEach((flag) => {
          const rawId =
            flag.answer_id ??
            flag.answerId ??
            flag.assessment_answer_id ??
            flag.assessment_query_id ??
            flag.question_id ??
            flag.id;
          if (rawId) {
            const key = String(rawId);
            flaggedIds.add(key);
            const reason = flag.flag_reason ?? flag.reason ?? "";
            if (reason) {
              reasonMap[key] = reason;
            }
          }
        });

        setAiFlaggedAnswerIds(flaggedIds);
        setAiFlagReasonsById(reasonMap);
      } catch {
        if (!isCancelled) {
          setAiFlaggedAnswerIds(new Set());
          setAiFlagReasonsById({});
        }
      }
    };

    fetchAiReviewFlags();

    return () => {
      isCancelled = true;
    };
  }, [assessmentDetails?.assessmentId, assessmentId]);

  const formatLabel = (value?: string | null): string => {
    if (!value) return "";
    const formatted = value
      .toString()
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
    if (formatted.toLowerCase() === "self disclosure") {
      return "Self-Disclosure";
    }
    return formatted;
  };

  const formatDate = (
    value?: string | null,
    options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  ): string => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", options).format(date);
  };

  const getDisplayName = (
    assignee: NamedAssignee | string | null | undefined,
  ): string => {
    if (!assignee) return "";
    if (typeof assignee === "string") return assignee;
    if (assignee.name && assignee.name.trim() !== "") return assignee.name;
    const firstName = assignee.firstName ?? "";
    const lastName = assignee.lastName ?? "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName;
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

  const fallbackAssessmentData = {
    organisation: "Grand Hyatt Singapore",
    certification: "Green Building Certification",
    status: "AI Passed",
    aiReason: "No AI response available.",
    industry: "Hotel",
    submitted: "Dec 20, 2024",
  };

  const aiReview = (assessmentDetails?.aiReview ?? null) as AiReview | null;
  const aiTotalFlags =
    typeof aiReview?.totalFlags === "number" ? aiReview.totalFlags : null;
  const isAiFailed = aiReview?.reviewStatus === "failed";
  const isAiFlagged =
    isAiFailed ||
    aiReview?.flagStatus === "open" ||
    (aiTotalFlags !== null ? aiTotalFlags > 0 : false);
  const aiStatusLabel = isAiFailed
    ? "AI Failed"
    : isAiFlagged
      ? "AI Flagged"
      : "AI Passed";
  const assessmentTypeRaw = assessmentDetails?.assessmentType ?? "";
  const isSelfAssessment = assessmentTypeRaw.toLowerCase().includes("self");
  const statusKey = (assessmentDetails?.status ?? "")
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "_");

  const submittedLabel =
    formatDate(assessmentDetails?.submittedAt) ||
    fallbackAssessmentData.submitted;
  const hasAssignedAuditor = !!getDisplayName(
    assessmentDetails?.assignedAuditor,
  );
  const isAuditorInvitePending = Boolean(assessmentDetails?.auditorInvited);
  const hasAssignedReviewer = !!getDisplayName(
    assessmentDetails?.assignedReviewer,
  );
  const isCertificateBlocked = Boolean(assessmentDetails?.isCertificateBlocked);
  const certificateBlockReason =
    assessmentDetails?.certificateBlockReason?.trim() || "";
  const hasAuditAssurance = !!assessmentDetails?.assuranceId;
  const hasAuditorReviewResponse =
    hasAuditAssurance ||
    statusKey.includes("audit_completed") ||
    statusKey.includes("auditor_completed") ||
    statusKey.includes("audit_review_completed") ||
    statusKey.includes("auditor_review_completed");
  const isAuditFailed =
    statusKey.includes("audit_failed") ||
    statusKey.includes("auditor_failed") ||
    statusKey.includes("audit_flagged") ||
    statusKey.includes("auditor_flagged") ||
    statusKey.includes("audit_rejected") ||
    statusKey.includes("auditor_rejected");
  const hasReviewerReviewResponse =
    statusKey.includes("reviewer_completed") ||
    statusKey.includes("management_review_completed") ||
    statusKey.includes("review_response_completed");
  const isReviewerFailed =
    statusKey.includes("reviewer_failed") ||
    statusKey.includes("review_failed") ||
    statusKey.includes("reviewer_flagged") ||
    statusKey.includes("review_flagged") ||
    statusKey.includes("reviewer_rejected") ||
    statusKey.includes("review_rejected");

  const assignedAuditorName =
    getDisplayName(assessmentDetails?.assignedAuditor) || "Not assigned";
  const assignedReviewerName =
    getDisplayName(assessmentDetails?.assignedReviewer) || "Not assigned";

  const assessmentData = {
    organisation:
      assessmentDetails?.organizationName ??
      fallbackAssessmentData.organisation,
    certification:
      assessmentDetails?.certificateName ??
      fallbackAssessmentData.certification,
    aiFlagged: isAiFlagged,
    aiStatusLabel,
    aiReason: aiReview?.reviewDescription ?? fallbackAssessmentData.aiReason,
    industry: assessmentDetails?.branchName ?? fallbackAssessmentData.industry,
    submitted: submittedLabel,
  };

  const assignedProfiles: Array<{
    key: "auditor" | "reviewer";
    label: string;
    name: string;
    initials: string;
  }> = [
    hasAssignedAuditor
      ? {
          key: "auditor",
          label: "Assigned Auditor",
          name: assignedAuditorName,
          initials: getInitials(assignedAuditorName),
        }
      : null,
    hasAssignedReviewer
      ? {
          key: "reviewer",
          label: "Assigned Reviewer",
          name: assignedReviewerName,
          initials: getInitials(assignedReviewerName),
        }
      : null,
  ].filter(
    (
      profile,
    ): profile is {
      key: "auditor" | "reviewer";
      label: string;
      name: string;
      initials: string;
    } => profile !== null,
  );

  const tags: Array<{
    label: string;
    className: string;
    style?: React.CSSProperties;
  }> = [];

  if (isSelfAssessment) {
    tags.push({
      label: "Self-Assessment",
      className: "px-3 py-1 bg-green-50 border rounded-lg text-xs font-medium",
      style: { color: "#00B448", borderColor: "#00B448" },
    });
  } else {
    tags.push({
      label: "Audit / Assurance",
      className:
        "px-3 py-1 border border-black rounded-lg text-xs font-medium text-secondary",
      style: { backgroundColor: "#e2e3e6" },
    });
  }

  if (assessmentData.aiFlagged) {
    tags.push({
      label: aiStatusLabel,
      className: "px-3 py-1 border rounded-lg text-xs font-medium",
      style: {
        backgroundColor: "#ffe6e6",
        color: "#DC2626",
        borderColor: "#DC2626",
      },
    });
  } else {
    tags.push({
      label: "AI Passed",
      className: "px-3 py-1 bg-green-50 border rounded-lg text-xs font-medium",
      style: { color: "#00B448", borderColor: "#00B448" },
    });
  }

  if (hasAssignedAuditor || hasAuditorReviewResponse) {
    if (hasAssignedAuditor) {
      tags.push({
        label: "Auditor Assigned",
        className:
          "px-3 py-1 border border-black rounded-lg text-xs font-medium text-secondary",
        style: { backgroundColor: "#e2e3e6" },
      });
    }

    if (hasAuditorReviewResponse) {
      tags.push({
        label: "Audit Completed",
        className: "px-3 py-1 border rounded-lg text-xs font-medium",
        style: {
          backgroundColor: "#f0fdf4",
          color: "#00B448",
          borderColor: "#00B448",
        },
      });
      tags.push({
        label: isAuditFailed ? "Failed" : "Passed",
        className: `px-3 py-1 border rounded-lg text-xs ${isAuditFailed ? "font-semibold" : "font-medium"}`,
        style: isAuditFailed
          ? {
              backgroundColor: "#fef2f2",
              color: "#DC2626",
              borderColor: "#DC2626",
            }
          : {
              backgroundColor: "#f0fdf4",
              color: "#00B448",
              borderColor: "#00B448",
            },
      });
    } else if (hasAssignedAuditor) {
      tags.push({
        label: "Audit in Process",
        className: "px-3 py-1 border rounded-lg text-xs font-medium",
        style: {
          backgroundColor: "#f6f0e2",
          color: "#FAAB00",
          borderColor: "#FAAB00",
        },
      });
    }
  }

  if (hasAssignedReviewer || hasReviewerReviewResponse) {
    if (hasAssignedReviewer) {
      tags.push({
        label: "Reviewer Assigned",
        className:
          "px-3 py-1 border border-black rounded-lg text-xs font-medium text-secondary",
        style: { backgroundColor: "#e2e3e6" },
      });
    }

    if (hasReviewerReviewResponse) {
      tags.push({
        label: "Review Completed",
        className: "px-3 py-1 border rounded-lg text-xs font-medium",
        style: {
          backgroundColor: "#f0fdf4",
          color: "#00B448",
          borderColor: "#00B448",
        },
      });
      tags.push({
        label: isReviewerFailed ? "Failed" : "Passed",
        className: `px-3 py-1 border rounded-lg text-xs ${isReviewerFailed ? "font-semibold" : "font-medium"}`,
        style: isReviewerFailed
          ? {
              backgroundColor: "#fef2f2",
              color: "#DC2626",
              borderColor: "#DC2626",
            }
          : {
              backgroundColor: "#f0fdf4",
              color: "#00B448",
              borderColor: "#00B448",
            },
      });
    } else if (hasAssignedReviewer) {
      tags.push({
        label: "Review in Process",
        className: "px-3 py-1 border rounded-lg text-xs font-medium",
        style: {
          backgroundColor: "#f6f0e2",
          color: "#FAAB00",
          borderColor: "#FAAB00",
        },
      });
    }
  }

  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});

  const [isAssignAuditorModalOpen, setIsAssignAuditorModalOpen] =
    useState(false);
  const [selectedAuditor, setSelectedAuditor] = useState<string | null>(null);
  const [auditDate, setAuditDate] = useState<string>("");
  const [isAssigningAuditor, setIsAssigningAuditor] = useState(false);
  const [assignAuditorError, setAssignAuditorError] = useState<string | null>(
    null,
  );
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
  const [isBlockCertificationModalOpen, setIsBlockCertificationModalOpen] =
    useState(false);
  const [blockCertificationReason, setBlockCertificationReason] = useState("");
  const [isBlockingCertification, setIsBlockingCertification] = useState(false);
  const [blockCertificationError, setBlockCertificationError] = useState<
    string | null
  >(null);

  const AUDITOR_PAGE_SIZE = 10;

  const REVIEWER_PAGE_SIZE = 10;

  const questionsData = useMemo(() => {
    if (!assessmentQuestions.length) return [];

    const toKey = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const getAttachmentLabel = (url: string) => {
      const lastSegment = url.split("/").pop() || "Attachment";
      try {
        return decodeURIComponent(lastSegment);
      } catch {
        return lastSegment;
      }
    };

    const sectionsMap = new Map<
      string,
      {
        sectionId: string;
        sectionTitle: string;
        subsections: Map<
          string,
          {
            subsectionId: string;
            subsectionTitle: string;
            questions: AssessmentQuestionItem[];
          }
        >;
      }
    >();

    assessmentQuestions.forEach((item, index) => {
      const sectionTitle = item.main_section_name?.trim() || "Section";
      const subsectionTitle =
        item.sub_section_name?.trim() ||
        item.section_name?.trim() ||
        "Sub Section";
      const sectionId = toKey(sectionTitle) || "section";
      const subsectionId = `${sectionId}-${toKey(subsectionTitle) || "subsection"}`;

      if (!sectionsMap.has(sectionId)) {
        sectionsMap.set(sectionId, {
          sectionId,
          sectionTitle,
          subsections: new Map(),
        });
      }

      const sectionEntry = sectionsMap.get(sectionId)!;
      if (!sectionEntry.subsections.has(subsectionId)) {
        sectionEntry.subsections.set(subsectionId, {
          subsectionId,
          subsectionTitle,
          questions: [],
        });
      }

      const responseValue = item.response_value?.toString().trim() ?? "";
      const isFileQuestion =
        item.question_type === "file" ||
        item.response_type === "file" ||
        item.response_type === "pdf";
      const hasFileUrl = /^https?:\/\//i.test(responseValue);
      const attachmentUrl = isFileQuestion && hasFileUrl ? responseValue : null;
      const attachmentLabel = attachmentUrl
        ? getAttachmentLabel(attachmentUrl)
        : null;

      const answerId = item.answer_id ?? "";
      const questionId = item.id ?? "";
      const answerKey = answerId ? String(answerId) : "";
      const questionKey = questionId ? String(questionId) : "";
      const isFlagged =
        (answerKey !== "" && aiFlaggedAnswerIds.has(answerKey)) ||
        (questionKey !== "" && aiFlaggedAnswerIds.has(questionKey));
      const aiFlagReason =
        (answerKey && aiFlagReasonsById[answerKey]) ||
        (questionKey && aiFlagReasonsById[questionKey]) ||
        null;

      sectionEntry.subsections.get(subsectionId)!.questions.push({
        id: item.answer_id || item.id,
        question: item.question_text ?? "Untitled question",
        answer: attachmentUrl ? "File uploaded" : responseValue,
        attachmentLabel,
        attachmentUrl,
        isFileQuestion,
        aiFlagged: isFlagged,
        aiFlagReason,
        order: item.rank ?? index,
      });
    });

    return Array.from(sectionsMap.values()).map((section) => ({
      sectionId: section.sectionId,
      sectionTitle: section.sectionTitle,
      subsections: Array.from(section.subsections.values()).map(
        (subsection) => ({
          subsectionId: subsection.subsectionId,
          subsectionTitle: subsection.subsectionTitle,
          questions: subsection.questions.sort((a, b) => {
            const aOrder = a.order ?? 0;
            const bOrder = b.order ?? 0;
            return aOrder - bOrder;
          }),
        }),
      ),
    }));
  }, [assessmentQuestions, aiFlaggedAnswerIds, aiFlagReasonsById]);

  useEffect(() => {
    if (!questionsData.length) return;
    setExpandedSections((prev) => {
      const next = { ...prev };
      const validKeys = new Set<string>();
      questionsData.forEach((section) => {
        validKeys.add(section.sectionId);
        next[section.sectionId] = true;
        section.subsections.forEach((subsection) => {
          validKeys.add(subsection.subsectionId);
          next[subsection.subsectionId] = true;
        });
      });
      Object.keys(next).forEach((key) => {
        if (!validKeys.has(key)) {
          delete next[key];
        }
      });
      return next;
    });
  }, [questionsData]);

  useEffect(() => {
    if (!isAssignAuditorModalOpen) return;

    let isCancelled = false;

    const fetchAuditors = async () => {
      setIsLoadingAuditors(true);
      setAuditorsError(null);
      try {
        const response = await axiosInstance.get("/auditors/list");
        if (isCancelled) return;

        const payload = response.data?.data;
        const apiData = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

        const mappedData: AuditorOption[] = apiData.map((auditor: any) => {
          const locationParts = [
            auditor.city,
            auditor.state,
            auditor.country,
          ].filter(Boolean);
          const statusRaw =
            typeof auditor.status === "string"
              ? auditor.status.toLowerCase()
              : typeof auditor.accountStatus === "string"
                ? auditor.accountStatus.toLowerCase()
                : auditor.accountStatus === true
                  ? "available"
                  : "";
          return {
            id: auditor.id,
            name: auditor.name,
            profile_picture_url:
              auditor.profile_picture || auditor.profile_picture_url || "",
            certificates: auditor.assigned_certificates || [],
            location: locationParts.join(", ") || "N/A",
            status:
              statusRaw === "available" || statusRaw === "active"
                ? "available"
                : "busy",
          };
        });

        setAuditorOptions(mappedData);
        setAuditorVisibleCount(AUDITOR_PAGE_SIZE);
      } catch (err) {
        if (!isCancelled) {
          if (axios.isAxiosError(err)) {
            setAuditorsError(
              err.response?.data?.message || "Failed to load auditors",
            );
          } else {
            setAuditorsError("Failed to load auditors");
          }
          setAuditorOptions([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingAuditors(false);
        }
      }
    };

    fetchAuditors();

    return () => {
      isCancelled = true;
    };
  }, [isAssignAuditorModalOpen]);

  useEffect(() => {
    if (!isAssignReviewerModalOpen) return;

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
      } catch (err) {
        if (!isCancelled) {
          if (axios.isAxiosError(err)) {
            setReviewersError(
              err.response?.data?.message || "Failed to load reviewers",
            );
          } else {
            setReviewersError("Failed to load reviewers");
          }
          setReviewerOptions([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingReviewers(false);
        }
      }
    };

    fetchReviewers();

    return () => {
      isCancelled = true;
    };
  }, [isAssignReviewerModalOpen]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newState = {
        ...prev,
        [sectionId]: !prev[sectionId],
      };

      const section = questionsData.find((s) => s.sectionId === sectionId);
      if (section) {
        section.subsections.forEach((subsection) => {
          newState[subsection.subsectionId] = newState[sectionId];
        });
      }

      return newState;
    });
  };

  const handleAuditorScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const isNearBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight < 80;
    if (!isNearBottom) return;
    if (isLoadingAuditors) return;
    setAuditorVisibleCount((prev) =>
      Math.min(prev + AUDITOR_PAGE_SIZE, auditorOptions.length),
    );
  };

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

  const handleAssignAuditor = async () => {
    const id = assessmentDetails?.assessmentId ?? assessmentId;
    if (!id || !selectedAuditor) return;

    setIsAssigningAuditor(true);
    setAssignAuditorError(null);

    try {
      const payload: {
        assessmentId: string;
        auditorId: string;
        auditDate?: string;
      } = {
        assessmentId: id,
        auditorId: selectedAuditor,
      };

      if (auditDate) {
        payload.auditDate = new Date(auditDate).toISOString();
      }

      await axiosInstance.post("/auditors/assign-assessment", payload);

      setIsAssignAuditorModalOpen(false);
      setSelectedAuditor(null);
      setAuditDate("");
      setAssessmentRefreshKey((prev) => prev + 1);
    } catch (err) {
      setAssignAuditorError(
        getApiErrorMessage(err, "Failed to assign auditor"),
      );
    } finally {
      setIsAssigningAuditor(false);
    }
  };

  const handleAssignReviewer = async () => {
    const id = assessmentDetails?.assessmentId ?? assessmentId;
    if (!id || !selectedReviewer) return;

    setIsAssigningReviewer(true);
    setAssignReviewerError(null);

    try {
      const payload = {
        assessmentId: id,
        reviewerId: selectedReviewer,
      };

      await axiosInstance.post("/reviewers/assign-assessment", payload);

      setIsAssignReviewerModalOpen(false);
      setSelectedReviewer(null);
      setAssessmentRefreshKey((prev) => prev + 1);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setAssignReviewerError(
          err.response?.data?.message || "Failed to assign reviewer",
        );
      } else {
        setAssignReviewerError("Failed to assign reviewer");
      }
    } finally {
      setIsAssigningReviewer(false);
    }
  };

  const closeBlockCertificationModal = () => {
    setIsBlockCertificationModalOpen(false);
    setBlockCertificationReason("");
    setBlockCertificationError(null);
  };

  const handleBlockCertification = async () => {
    const id = assessmentDetails?.assessmentId ?? assessmentId;
    const reason = blockCertificationReason.trim();

    if (!id) return;

    if (!reason) {
      setBlockCertificationError("Reason is required");
      return;
    }

    setIsBlockingCertification(true);
    setBlockCertificationError(null);

    try {
      await axiosInstance.patch(`admin/assessments/${id}/certificate-block`, {
        isBlocked: true,
        reason,
      });
      closeBlockCertificationModal();
      setAssessmentRefreshKey((prev) => prev + 1);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setBlockCertificationError(
          err.response?.data?.message || "Failed to block certification",
        );
      } else {
        setBlockCertificationError("Failed to block certification");
      }
    } finally {
      setIsBlockingCertification(false);
    }
  };

  if (showLoader) {
    return (
      <div className="bg-light-gray p-3 md:p-6 min-h-screen flex items-center justify-center">
        <Loading isLoading progress={loadingProgress} />
      </div>
    );
  }

  return (
    <div className="bg-light-gray p-3 md:p-6 min-h-screen">
      <div className="mb-4">
        <h2
          className="text-secondary mb-1"
          style={{
            fontFamily: "Public Sans",
            fontWeight: 6,
            fontSize: "24px",
            lineHeight: "21.6px",
            letterSpacing: "0%",
            verticalAlign: "middle",
          }}
        >
          {assessmentData.organisation}
        </h2>
        <p
          style={{
            fontFamily: "Public Sans",
            fontWeight: 400,
            fontSize: "15px",
            lineHeight: "21.6px",
            letterSpacing: "0%",
            verticalAlign: "middle",
            color: "#999999",
          }}
        >
          {assessmentData.certification}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        {tags.map((tag, index) => (
          <div
            key={`${tag.label}-${index}`}
            className={tag.className}
            style={tag.style}
          >
            {tag.label}
          </div>
        ))}
      </div>

      {isSelfAssessment && (
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm mb-6">
          <h3 className="text-lg font-semibold text-secondary mb-1">
            AI Reason
          </h3>
          <p className="text-xs md:text-sm font-normal text-gray leading-relaxed">
            {assessmentData.aiReason}
          </p>
        </div>
      )}

      {hasAuditorReviewResponse && (
        <div className="mt-6">
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm mb-6">
            <h3 className="text-lg font-semibold text-secondary mb-1">
              Reviews from auditor
            </h3>
            <p className="text-xs md:text-sm font-normal text-gray leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 flex items-center justify-center shrink-0 border border-zinc-100 rounded-lg">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_541_1512)">
                <path
                  d="M0 1.25C0 0.558594 0.558594 0 1.25 0H18.75C19.4414 0 20 0.558594 20 1.25C20 1.94141 19.4414 2.5 18.75 2.5V17.5C19.4414 17.5 20 18.0586 20 18.75C20 19.4414 19.4414 20 18.75 20H11.875V18.125C11.875 17.0898 11.0352 16.25 10 16.25C8.96484 16.25 8.125 17.0898 8.125 18.125V20H1.25C0.558594 20 0 19.4414 0 18.75C0 18.0586 0.558594 17.5 1.25 17.5V2.5C0.558594 2.5 0 1.94141 0 1.25ZM3.75 4.375V5.625C3.75 5.96875 4.03125 6.25 4.375 6.25H5.625C5.96875 6.25 6.25 5.96875 6.25 5.625V4.375C6.25 4.03125 5.96875 3.75 5.625 3.75H4.375C4.03125 3.75 3.75 4.03125 3.75 4.375ZM9.375 3.75C9.03125 3.75 8.75 4.03125 8.75 4.375V5.625C8.75 5.96875 9.03125 6.25 9.375 6.25H10.625C10.9688 6.25 11.25 5.96875 11.25 5.625V4.375C11.25 4.03125 10.9688 3.75 10.625 3.75H9.375ZM13.75 4.375V5.625C13.75 5.96875 14.0312 6.25 14.375 6.25H15.625C15.9688 6.25 16.25 5.96875 16.25 5.625V4.375C16.25 4.03125 15.9688 3.75 15.625 3.75H14.375C14.0312 3.75 13.75 4.03125 13.75 4.375ZM4.375 7.5C4.03125 7.5 3.75 7.78125 3.75 8.125V9.375C3.75 9.71875 4.03125 10 4.375 10H5.625C5.96875 10 6.25 9.71875 6.25 9.375V8.125C6.25 7.78125 5.96875 7.5 5.625 7.5H4.375ZM8.75 8.125V9.375C8.75 9.71875 9.03125 10 9.375 10H10.625C10.9688 10 11.25 9.71875 11.25 9.375V8.125C11.25 7.78125 10.9688 7.5 10.625 7.5H9.375C9.03125 7.5 8.75 7.78125 8.75 8.125ZM14.375 7.5C14.0312 7.5 13.75 7.78125 13.75 8.125V9.375C13.75 9.71875 14.0312 10 14.375 10H15.625C15.9688 10 16.25 9.71875 16.25 9.375V8.125C16.25 7.78125 15.9688 7.5 15.625 7.5H14.375ZM12.8125 15C13.332 15 13.7617 14.5742 13.6328 14.0703C13.2188 12.4492 11.75 11.25 10 11.25C8.25 11.25 6.77734 12.4492 6.36719 14.0703C6.23828 14.5703 6.67188 15 7.1875 15H12.8125Z"
                  fill="black"
                />
              </g>
              <defs>
                <clipPath id="clip0_541_1512">
                  <rect width="20" height="20" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </div>

          <div className="flex-1">
            <p className="text-sm font-normal text-gray mb-1">Industry</p>
            <div className="flex items-center gap-6">
              <p className="text-base md:text-lg font-semibold text-secondary">
                {assessmentData.industry}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-normal text-gray">Submitted</p>
                <p className="text-sm md:text-base font-semibold text-secondary">
                  {assessmentData.submitted}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {assignedProfiles.length > 0 && (
        <div className="mt-6">
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              {assignedProfiles.map((profile) => (
                <div
                  key={profile.key}
                  className="flex items-center gap-4 border border-zinc-100 rounded-lg p-3 md:p-4"
                >
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-zinc-200 flex items-center justify-center shrink-0 overflow-hidden">
                    <div className="w-full h-full bg-linear-to-br from-zinc-300 to-zinc-400 flex items-center justify-center">
                      <span className="text-white font-semibold text-lg md:text-xl">
                        {profile.initials || "NA"}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <p className="text-xs md:text-sm font-normal text-gray-500 mb-1">
                      {profile.label}
                    </p>
                    <p className="text-base md:text-lg font-semibold text-secondary">
                      {profile.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-lg md:text-xl font-medium text-secondary mb-4">
          Questions & Responses
        </h2>

        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div>
            {questionsData.map((section) => (
              <div key={section.sectionId}>
                <button
                  onClick={() => toggleSection(section.sectionId)}
                  className="w-full flex items-center justify-between py-3 px-4 md:py-3 md:px-6 hover:bg-zinc-50 transition-colors border-0 border-b-0"
                >
                  <span className="text-sm md:text-base font-medium text-secondary">
                    {section.sectionTitle}
                  </span>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`transition-transform ${expandedSections[section.sectionId] ? "rotate-180" : ""}`}
                  >
                    <path
                      d="M16.5938 15.3071L12 10.8675L7.40625 15.3071L6 13.948L12 8.1493L18 13.948L16.5938 15.3071Z"
                      fill="#262626"
                    />
                  </svg>
                </button>

                {expandedSections[section.sectionId] && (
                  <div className="mx-4 md:mx-6 my-2 md:my-3 border border-zinc-200 rounded-lg">
                    {section.subsections.map((subsection) => (
                      <div key={subsection.subsectionId}>
                        <div className="px-4 md:px-6 pb-4 md:pb-6 pt-2 md:pt-3">
                          <div className="w-full flex items-center gap-3 p-3 md:p-4">
                            <span className="text-xs md:text-sm font-semibold text-secondary">
                              {subsection.subsectionTitle}
                            </span>
                            <div className="flex-1 border-t border-zinc-300"></div>
                          </div>

                          {expandedSections[section.sectionId] && (
                            <div className="mt-2 space-y-4">
                              {subsection.questions.map(
                                (question, questionIndex) => (
                                  <div
                                    key={question.id}
                                    className={`bg-white rounded-lg p-4 md:p-5 border ${
                                      question.aiFlagged
                                        ? "border-red-300"
                                        : "border-zinc-200"
                                    }`}
                                  >
                                    <div className="flex items-start gap-2 mb-3">
                                      <div className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
                                        <span className="text-[10px] font-semibold text-secondary">
                                          {questionIndex + 1}
                                        </span>
                                      </div>
                                      <p className="text-xs md:text-sm font-medium text-secondary flex-1">
                                        {question.question}
                                      </p>

                                      {question.aiFlagged && (
                                        <span
                                          className="px-2 py-1 rounded text-xs font-medium shrink-0"
                                          style={{
                                            backgroundColor: "#ffe6e6",
                                            color: "#DC2626",
                                          }}
                                        >
                                          AI Flagged
                                        </span>
                                      )}
                                    </div>

                                    <div className="ml-8 mb-1">
                                      <p
                                        className="text-xs md:text-sm font-normal"
                                        style={{ color: "#999999" }}
                                      >
                                        {question.answer}
                                      </p>
                                    </div>

                                    <div className="ml-7">
                                      {question.attachmentUrl ? (
                                        <a
                                          href={question.attachmentUrl}
                                          className="inline-flex items-center gap-2 px-3 py-2 border border-zinc-200 rounded-lg text-sm font-medium text-secondary hover:bg-zinc-50 transition-colors"
                                          style={{ backgroundColor: "#f6f6f6" }}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 20 20"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              clipRule="evenodd"
                                              d="M11.875 2.08333C11.875 2.02808 11.8531 1.97509 11.814 1.93602C11.7749 1.89695 11.7219 1.875 11.6667 1.875H5.83334C5.22555 1.875 4.64266 2.11644 4.21289 2.54621C3.78311 2.97598 3.54167 3.55888 3.54167 4.16667V15.8333C3.54167 16.4411 3.78311 17.024 4.21289 17.4538C4.64266 17.8836 5.22555 18.125 5.83334 18.125H14.1667C14.7745 18.125 15.3574 17.8836 15.7871 17.4538C16.2169 17.024 16.4583 16.4411 16.4583 15.8333V7.6225C16.4583 7.56725 16.4364 7.51426 16.3973 7.47519C16.3582 7.43612 16.3053 7.41417 16.25 7.41417H12.5C12.3342 7.41417 12.1753 7.34832 12.0581 7.23111C11.9409 7.1139 11.875 6.95493 11.875 6.78917V2.08333ZM12.5 10.2083C12.6658 10.2083 12.8247 10.2742 12.9419 10.3914C13.0592 10.5086 13.125 10.6676 13.125 10.8333C13.125 10.9991 13.0592 11.1581 12.9419 11.2753C12.8247 11.3925 12.6658 11.4583 12.5 11.4583H7.50001C7.33424 11.4583 7.17527 11.3925 7.05806 11.2753C6.94085 11.1581 6.87501 10.9991 6.87501 10.8333C6.87501 10.6676 6.94085 10.5086 7.05806 10.3914C7.17527 10.2742 7.33424 10.2083 7.50001 10.2083H12.5ZM12.5 13.5417C12.6658 13.5417 12.8247 13.6075 12.9419 13.7247C13.0592 13.8419 13.125 14.0009 13.125 14.1667C13.125 14.3324 13.0592 14.4914 12.9419 14.6086C12.8247 14.7258 12.6658 14.7917 12.5 14.7917H7.50001C7.33424 14.7917 7.17527 14.7258 7.05806 14.6086C6.94085 14.4914 6.87501 14.3324 6.87501 14.1667C6.87501 14.0009 6.94085 13.8419 7.05806 13.7247C7.17527 13.6075 7.33424 13.5417 7.50001 13.5417H12.5Z"
                                              fill="#262626"
                                            />
                                            <path
                                              d="M13.125 2.35322C13.125 2.19988 13.2858 2.10238 13.405 2.19822C13.5061 2.27988 13.5958 2.37488 13.6742 2.48322L16.185 5.98072C16.2417 6.06072 16.18 6.16405 16.0817 6.16405H13.3333C13.2781 6.16405 13.2251 6.1421 13.186 6.10303C13.1469 6.06396 13.125 6.01097 13.125 5.95572V2.35322Z"
                                              fill="black"
                                            />
                                          </svg>
                                          <span>
                                            {question.attachmentLabel}
                                          </span>
                                          <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 20 20"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <path
                                              d="M9.99967 12.9788C9.88856 12.9788 9.7844 12.9616 9.68717 12.9272C9.58995 12.8927 9.49967 12.8336 9.41634 12.7497L6.41634 9.74968C6.24967 9.58301 6.16967 9.38857 6.17634 9.16634C6.18301 8.94412 6.26301 8.74968 6.41634 8.58301C6.58301 8.41634 6.78106 8.32968 7.01051 8.32301C7.23995 8.31634 7.43773 8.39607 7.60384 8.56218L9.16634 10.1247V4.16634C9.16634 3.93023 9.24634 3.73246 9.40634 3.57301C9.56634 3.41357 9.76412 3.33357 9.99967 3.33301C10.2352 3.33246 10.4333 3.41246 10.5938 3.57301C10.7544 3.73357 10.8341 3.93134 10.833 4.16634V10.1247L12.3955 8.56218C12.5622 8.39551 12.7602 8.31551 12.9897 8.32218C13.2191 8.32884 13.4169 8.41579 13.583 8.58301C13.7358 8.74968 13.8158 8.94412 13.823 9.16634C13.8302 9.38857 13.7502 9.58301 13.583 9.74968L10.583 12.7497C10.4997 12.833 10.4094 12.8922 10.3122 12.9272C10.215 12.9622 10.1108 12.9794 9.99967 12.9788ZM4.99967 16.6663C4.54134 16.6663 4.14912 16.5033 3.82301 16.1772C3.4969 15.8511 3.33356 15.4586 3.33301 14.9997V13.333C3.33301 13.0969 3.41301 12.8991 3.57301 12.7397C3.73301 12.5802 3.93079 12.5002 4.16634 12.4997C4.4019 12.4991 4.59995 12.5791 4.76051 12.7397C4.92106 12.9002 5.00079 13.098 4.99967 13.333V14.9997H14.9997V13.333C14.9997 13.0969 15.0797 12.8991 15.2397 12.7397C15.3997 12.5802 15.5975 12.5002 15.833 12.4997C16.0686 12.4991 16.2666 12.5791 16.4272 12.7397C16.5877 12.9002 16.6675 13.098 16.6663 13.333V14.9997C16.6663 15.458 16.5033 15.8505 16.1772 16.1772C15.8511 16.5038 15.4586 16.6669 14.9997 16.6663H4.99967Z"
                                              fill="#262626"
                                            />
                                          </svg>
                                        </a>
                                      ) : question.aiFlagged &&
                                        question.isFileQuestion ? (
                                        <div
                                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
                                          style={{
                                            backgroundColor: "#ffe6e6",
                                            color: "#DC2626",
                                          }}
                                        >
                                          <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 20 20"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <path
                                              d="M10 1.66667C5.4 1.66667 1.66667 5.4 1.66667 10C1.66667 14.6 5.4 18.3333 10 18.3333C14.6 18.3333 18.3333 14.6 18.3333 10C18.3333 5.4 14.6 1.66667 10 1.66667ZM10.8333 14.1667H9.16667V12.5H10.8333V14.1667ZM10.8333 10.8333H9.16667V5.83333H10.8333V10.8333Z"
                                              fill="#DC2626"
                                            />
                                          </svg>
                                          <span>
                                            No supporting documentation provided
                                          </span>
                                        </div>
                                      ) : null}
                                    </div>

                                    {question.aiFlagged &&
                                    question.aiFlagReason ? (
                                      <div
                                        className="ml-8 mt-2 text-xs md:text-sm font-normal"
                                        style={{ color: "#DC2626" }}
                                      >
                                        {question.aiFlagReason}
                                      </div>
                                    ) : null}
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm">
          <h3 className="text-lg md:text-xl font-semibold text-secondary mb-4 md:mb-6">
            Admin Actions
          </h3>
          {!isCertificateBlocked && !hasAssignedAuditor && isAuditorInvitePending && (
            <p className="text-xs font-medium text-[#FAAB00] mb-4 md:mb-6">
              Request already sent for this assessment.
            </p>
          )}
          {isCertificateBlocked && (
            <div className="mb-4 md:mb-6 p-3 rounded-lg border border-red-200 bg-red-50">
              <p className="text-xs font-semibold text-red-600 mb-1">
                Certificate is already blocked
              </p>
              <p className="text-sm text-red-700">
                {certificateBlockReason || "No reason provided."}
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-3 md:gap-4">
            <Button
              onClick={
                isCertificateBlocked
                  ? undefined
                  : () => {
                      setBlockCertificationReason("");
                      setBlockCertificationError(null);
                      setIsBlockCertificationModalOpen(true);
                    }
              }
              disabled={isCertificateBlocked}
              variant="custom"
              className={`px-4 py-2 md:px-6 md:py-3 border rounded-xl ${
                isCertificateBlocked
                  ? "cursor-not-allowed opacity-70"
                  : "hover:bg-red-100"
              }`}
              style={{
                backgroundColor: "#ffe6e6",
                color: "#DC2626",
                borderColor: "#DC2626",
                fontFamily: "Public Sans",
                fontWeight: 600,
                fontStyle: "normal",
                fontSize: "16px",
                lineHeight: "24px",
                letterSpacing: "0%",
                verticalAlign: "middle",
              }}
            >
              {isCertificateBlocked ? "Already Blocked" : "Block Certification"}
            </Button>

            {!isCertificateBlocked && !hasAssignedReviewer && (
              <Button
                onClick={() => setIsAssignReviewerModalOpen(true)}
                variant="secondary"
                className="px-4 py-2 md:px-6 md:py-3 rounded-xl"
                style={{
                  fontFamily: "Public Sans",
                  fontWeight: 600,
                  fontStyle: "normal",
                  fontSize: "16px",
                  lineHeight: "24px",
                  letterSpacing: "0%",
                  verticalAlign: "middle",
                }}
              >
                Assign Management Reviewer
              </Button>
            )}

            {!isCertificateBlocked && !hasAssignedAuditor && (
              <div className="flex flex-col gap-1.5">
                <Button
                  onClick={
                    isAuditorInvitePending
                      ? undefined
                      : () => setIsAssignAuditorModalOpen(true)
                  }
                  disabled={isAuditorInvitePending}
                  className={`px-3 py-1.5 md:px-8 md:py-3 rounded-xl shrink-0 ${
                    isAuditorInvitePending
                      ? "cursor-not-allowed opacity-70"
                      : ""
                  }`}
                  style={{
                    fontFamily: "Public Sans",
                    fontWeight: 600,
                    fontStyle: "normal",
                    fontSize: "16px",
                    lineHeight: "24px",
                    letterSpacing: "0%",
                    verticalAlign: "middle",
                  }}
                >
                  Assign Auditor
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isBlockCertificationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeBlockCertificationModal}
          ></div>

          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-xl mx-4 p-4 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-secondary mb-2">
                  Block Certification
                </h3>
                <p className="text-xs md:text-sm" style={{ color: "#999999" }}>
                  Please provide a reason for blocking this certification.
                </p>
              </div>
              <button
                onClick={closeBlockCertificationModal}
                className="ml-4 p-1 hover:bg-zinc-100 rounded transition-colors"
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
              <div>
                <label className="block text-sm font-normal text-gray-500 mb-2">
                  Reason
                </label>
                <textarea
                  value={blockCertificationReason}
                  onChange={(e) => setBlockCertificationReason(e.target.value)}
                  className="w-full min-h-[120px] p-3 rounded-lg text-sm border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:border-transparent"
                  placeholder="Describe reason for blocking certification..."
                />
              </div>
            </div>

            {blockCertificationError && (
              <div className="mt-4 text-xs text-red-500">
                {blockCertificationError}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={closeBlockCertificationModal}
                disabled={isBlockingCertification}
                className="px-4 py-1.5 md:px-8 md:py-2 bg-white border border-black rounded-lg text-sm md:text-base font-medium text-secondary hover:bg-zinc-50 transition-colors w-[160px]"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockCertification}
                disabled={isBlockingCertification}
                className="px-4 py-1.5 md:px-8 md:py-2 bg-dull-gray text-primary rounded-lg hover:bg-dull-gray/90 transition-colors shrink-0"
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
                {isBlockingCertification
                  ? "Blocking..."
                  : "Block Certification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAssignAuditorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setIsAssignAuditorModalOpen(false);
              setSelectedAuditor(null);
              setAuditDate("");
            }}
          ></div>

          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-xl mx-4 p-4 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-secondary mb-2">
                  Assign Auditor
                </h3>
                <p className="text-xs md:text-sm" style={{ color: "#999999" }}>
                  Select an auditor to review the assessment for{" "}
                  {assessmentData.organisation}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAssignAuditorModalOpen(false);
                  setSelectedAuditor(null);
                  setAuditDate("");
                }}
                className="ml-4 p-1 hover:bg-zinc-100 rounded transition-colors"
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
                    {assessmentData.certification}
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="audit-date"
                  className="block text-sm font-normal text-gray-500 mb-2"
                >
                  Audit Date (Optional)
                </label>
                <input
                  id="audit-date"
                  type="date"
                  value={auditDate}
                  onChange={(e) => setAuditDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm font-normal text-secondary focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:border-transparent"
                  style={{
                    fontFamily: "Public Sans",
                    lineHeight: "19.2px",
                    letterSpacing: "0%",
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-500 mb-3">
                  Select Auditor
                </label>
                <div
                  className="space-y-3 max-h-[400px] overflow-y-auto"
                  onScroll={handleAuditorScroll}
                >
                  {auditorsError && (
                    <div className="text-xs text-red-500 px-2">
                      {auditorsError}
                    </div>
                  )}
                  {auditorOptions
                    .slice(0, auditorVisibleCount)
                    .map((auditor) => {
                      const isSelected = selectedAuditor === auditor.id;
                      const hasProfilePicture =
                        auditor.profile_picture_url &&
                        auditor.profile_picture_url.trim() !== "";

                      return (
                        <button
                          key={auditor.id}
                          onClick={() => setSelectedAuditor(auditor.id)}
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
                                  src={auditor.profile_picture_url}
                                  alt={auditor.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-base font-semibold text-zinc-600">
                                  {getInitials(auditor.name)}
                                </span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-base font-semibold text-secondary">
                                  {auditor.name}
                                </h4>

                                <span
                                  className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                                    auditor.status === "available"
                                      ? "bg-green-50 text-green-600 border border-green-300"
                                      : "bg-red-50 text-red-600 border border-red-300"
                                  }`}
                                >
                                  {auditor.status === "available"
                                    ? "Available"
                                    : "Busy"}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {auditor.certificates.map((cert, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 rounded-md text-[9px] md:text-xs font-normal text-secondary"
                                    style={{ backgroundColor: "#e9e9e9" }}
                                  >
                                    {cert}
                                  </span>
                                ))}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 14 14"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M7 0C4.24375 0 2 2.24375 2 5C2 8.5 7 14 7 14C7 14 12 8.5 12 5C12 2.24375 9.75625 0 7 0ZM7 6.75C6.03375 6.75 5.25 5.96625 5.25 5C5.25 4.03375 6.03375 3.25 7 3.25C7.96625 3.25 8.75 4.03375 8.75 5C8.75 5.96625 7.96625 6.75 7 6.75Z"
                                    fill="#999999"
                                  />
                                </svg>
                                <span className="text-xs text-gray-500">
                                  {auditor.location}
                                </span>
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

            {assignAuditorError && (
              <div className="mt-4 text-xs text-red-500">
                {assignAuditorError}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => {
                  setIsAssignAuditorModalOpen(false);
                  setSelectedAuditor(null);
                  setAuditDate("");
                }}
                className="px-4 py-1.5 md:px-8 md:py-2 bg-white border border-black rounded-lg text-sm md:text-base font-medium text-secondary hover:bg-zinc-50 transition-colors w-[160px]"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignAuditor}
                disabled={!selectedAuditor || isAssigningAuditor}
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
                {isAssigningAuditor ? "Assigning..." : "Assign Auditor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAssignReviewerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setIsAssignReviewerModalOpen(false);
              setSelectedReviewer(null);
            }}
          ></div>

          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-xl mx-4 p-4 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-secondary mb-2">
                  Assign Management Reviewer
                </h3>
                <p className="text-xs md:text-sm" style={{ color: "#999999" }}>
                  Select a reviewer to review the assessment for{" "}
                  {assessmentData.organisation}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAssignReviewerModalOpen(false);
                  setSelectedReviewer(null);
                }}
                className="ml-4 p-1 hover:bg-zinc-100 rounded transition-colors"
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
                    {assessmentData.certification}
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
                  {reviewersError && (
                    <div className="text-xs text-red-500 px-2">
                      {reviewersError}
                    </div>
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
              <div className="mt-4 text-xs text-red-500">
                {assignReviewerError}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => {
                  setIsAssignReviewerModalOpen(false);
                  setSelectedReviewer(null);
                }}
                className="px-4 py-1.5 md:px-8 md:py-2 bg-white border border-black rounded-lg text-sm md:text-base font-medium text-secondary hover:bg-zinc-50 transition-colors w-[160px]"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignReviewer}
                disabled={!selectedReviewer || isAssigningReviewer}
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

export default function AssessmentDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-light-gray p-3 md:p-6 min-h-screen flex items-center justify-center">
          <div className="text-secondary">Loading...</div>
        </div>
      }
    >
      <AssessmentDetailsContent />
    </Suspense>
  );
}
