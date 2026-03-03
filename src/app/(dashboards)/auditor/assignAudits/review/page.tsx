"use client";

import { Suspense, useEffect, useState, useRef, type ChangeEvent } from "react";
import Button from "@/app/(dashboards)/admin/common/button";
import { Loading } from "@/app/(dashboards)/admin/common/Loading";
import { DUMMY_MAIN_SECTIONS } from "@/lib/dummyMainSections";
import { useSearchParams } from "next/navigation";
import { axiosInstance } from "@/lib/axios";
import axios from "axios";

const getFileNameFromUrl = (value: string): string => {
  const fallback = "Attached document";

  try {
    const parsedUrl = new URL(value);
    const fromPath = parsedUrl.pathname.split("/").filter(Boolean).pop();
    return fromPath ? decodeURIComponent(fromPath) : fallback;
  } catch {
    const fromPath = value
      .split("?")[0]
      .split("#")[0]
      .split("/")
      .filter(Boolean)
      .pop();
    return fromPath ? decodeURIComponent(fromPath) : fallback;
  }
};

const normalizeAttachments = (value: any): Array<{ name: string; url: string }> => {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];

  return list
    .map((item: any, index: number) => {
      if (!item) return null;

      if (typeof item === "string") {
        const fileUrl = item.trim();
        if (!fileUrl) return null;
        return { name: getFileNameFromUrl(fileUrl), url: fileUrl };
      }

      if (typeof item === "object") {
        const fileUrl =
          item.url || item.fileUrl || item.path || item.link || item.downloadUrl;

        if (typeof fileUrl !== "string" || !fileUrl.trim()) return null;

        const fileName =
          item.name ||
          item.fileName ||
          item.originalName ||
          item.title ||
          `Document ${index + 1}`;

        return { name: String(fileName), url: fileUrl.trim() };
      }

      return null;
    })
    .filter(Boolean) as Array<{ name: string; url: string }>;
};

const extractQuestionAttachments = (question: any): Array<{ name: string; url: string }> => {
  const knownAttachmentSources = [
    question?.attachments,
    question?.files,
    question?.documents,
    question?.file,
    question?.uploadedFiles,
    question?.answerFiles,
  ];

  for (const source of knownAttachmentSources) {
    const mapped = normalizeAttachments(source);
    if (mapped.length > 0) return mapped;
  }

  const answer = question?.applicantAnswer;

  if (typeof answer === "string") {
    const trimmed = answer.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      const parsedMapped = normalizeAttachments(parsed);
      if (parsedMapped.length > 0) return parsedMapped;
    } catch {
      // applicantAnswer is not JSON, continue with URL check
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return normalizeAttachments(trimmed);
    }
  }

  if (Array.isArray(answer) || (answer && typeof answer === "object")) {
    return normalizeAttachments(answer);
  }

  return [];
};

const isFileQuestionType = (
  questionType?: string | null,
  responseType?: string | null,
): boolean => {
  const types = [questionType, responseType]
    .map((value) => String(value || "").toLowerCase().trim())
    .filter(Boolean);

  return types.some(
    (type) =>
      type === "file" ||
      type === "file_upload" ||
      type === "upload" ||
      type === "document",
  );
};

type NoteSaveFeedback = {
  isSaving: boolean;
  message: string;
  type: "success" | "error" | null;
};

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_SUMMARY_DOC_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
]);

const toDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read selected document"));
    reader.readAsDataURL(file);
  });

function AssignAuditsReviewContent() {
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get("id");
  const [isLoading, setIsLoading] = useState(Boolean(assessmentId));
  const [showLoader, setShowLoader] = useState(Boolean(assessmentId));
  const [loadingProgress, setLoadingProgress] = useState(0);
  const loaderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loaderFinishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [activeButton, setActiveButton] = useState<"assessment" | "submit">(
    "assessment",
  );
  const [mainSectionsData, setMainSectionsData] = useState(DUMMY_MAIN_SECTIONS);
  const [expandedMain, setExpandedMain] = useState<{ [key: string]: boolean }>(
    () =>
      Object.fromEntries(
        DUMMY_MAIN_SECTIONS.map((ms: any) => [ms.id, ms.isExpanded || false]),
      ),
  );
  const [activeSubsection, setActiveSubsection] = useState<string | null>(
    DUMMY_MAIN_SECTIONS[0]?.sections?.[0]?.name || null,
  );
  const [, setSelectedQuestionIndex] = useState<number>(0);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [finalDecision, setFinalDecision] = useState<
    "approved" | "conditional" | "rejected" | null
  >(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [organizationName, setOrganizationName] = useState("Acme Corporation");
  const [certificateName, setCertificateName] = useState("ISO 27001:2022");
  const [assessmentStatus, setAssessmentStatus] = useState("Assigned");
  const [auditDateLabel, setAuditDateLabel] = useState("N/A");
  const [auditSummary, setAuditSummary] = useState("");
  const [auditDescription, setAuditDescription] = useState("");
  const [auditSummaryDoc, setAuditSummaryDoc] = useState("");
  const [auditSummaryDocName, setAuditSummaryDocName] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [submitReportError, setSubmitReportError] = useState("");
  const [submitReportSuccess, setSubmitReportSuccess] = useState("");
  const [auditorNotesByQuestion, setAuditorNotesByQuestion] = useState<
    Record<string, string>
  >({});
  const [hasSavedAuditorNotes, setHasSavedAuditorNotes] = useState<
    Record<string, boolean>
  >({});
  const [noteSaveFeedbackByQuestion, setNoteSaveFeedbackByQuestion] = useState<
    Record<string, NoteSaveFeedback>
  >({});
  const auditSummaryDocInputRef = useRef<HTMLInputElement | null>(null);

  const formatStatusLabel = (value?: string | null): string => {
    const raw = (value || "").trim();
    if (!raw) return "N/A";
    return raw
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatDateLabel = (value?: string | null): string => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  useEffect(() => {
    if (!assessmentId) {
      setIsLoading(false);
      setShowLoader(false);
      setLoadingProgress(0);
      console.warn("Assessment id is missing in query params");
      return;
    }

    let isCancelled = false;

    const fetchAssessmentById = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get(
          `/audits/assessment/${assessmentId}`,
        );
        if (isCancelled) return;
        console.log("audits assessment by id response:", response.data);

        const payload = response.data?.data;
        if (!payload || typeof payload !== "object") return;

        setOrganizationName(payload.organizationName || "N/A");
        setCertificateName(payload.certificateName || "N/A");
        setAssessmentStatus(formatStatusLabel(payload.status));

        const auditDateFromApi =
          payload.auditRecord?.auditDate ||
          payload.auditRecord?.date ||
          payload.auditRecord?.scheduledAt ||
          null;
        setAuditDateLabel(formatDateLabel(auditDateFromApi));

        const mainSections = Array.isArray(payload.sections)
          ? payload.sections
          : [];

        const mappedMainSections = mainSections
          .map((mainSection: any, mainIndex: number) => {
            const sectionItems = Array.isArray(mainSection.sections)
              ? mainSection.sections
              : [];

            const mappedSections = sectionItems.flatMap(
              (section: any, sectionIndex: number) => {
                const subSections = Array.isArray(section.subSections)
                  ? section.subSections
                  : [];

                const sourceSubSections =
                  subSections.length > 0
                    ? subSections
                    : [
                        {
                          subSectionId: section.sectionId,
                          subSectionName: section.sectionName,
                          questions: section.questions || [],
                        },
                      ];

                return sourceSubSections.map((subSection: any, subIndex: number) => {
                  const questions = Array.isArray(subSection.questions)
                    ? subSection.questions
                    : [];

                  return {
                    id:
                      subSection.subSectionId ||
                      section.sectionId ||
                      `section-${mainIndex + 1}-${sectionIndex + 1}-${subIndex + 1}`,
                    name:
                      subSection.subSectionName ||
                      section.sectionName ||
                      `Section ${sectionIndex + 1}`,
                    questions: questions.map((question: any, questionIndex: number) => ({
                      id:
                        question.questionId ||
                        `question-${mainIndex + 1}-${sectionIndex + 1}-${subIndex + 1}-${questionIndex + 1}`,
                      text: question.questionText || `Question ${questionIndex + 1}`,
                      applicantAnswer:
                        typeof question.applicantAnswer === "string"
                          ? question.applicantAnswer
                          : question.applicantAnswer == null
                            ? "N/A"
                            : JSON.stringify(question.applicantAnswer),
                      aiSummary:
                        question.aiReview?.summary || "No AI analysis available",
                      reviewerNotes:
                        question.reviewerNotes || "No reviewer notes available",
                      auditorNotes: question.auditorNotes || "",
                      isFlagged: Boolean(question.aiReview?.isFlagged),
                      questionType: String(question.questionType || "").toLowerCase(),
                      responseType: String(question.responseType || "").toLowerCase(),
                      attachments: extractQuestionAttachments(question),
                    })),
                  };
                });
              },
            );

            return {
              id: mainSection.mainSectionId || `main-${mainIndex + 1}`,
              name: mainSection.mainSectionName || `Main Section ${mainIndex + 1}`,
              isExpanded: mainIndex === 0,
              sections: mappedSections,
            };
          })
          .filter((section: any) => section.sections.length > 0);

        const nextAuditorNotesByQuestion: Record<string, string> = {};
        const nextHasSavedAuditorNotes: Record<string, boolean> = {};

        mappedMainSections.forEach((mainSection: any) => {
          (mainSection.sections || []).forEach((section: any) => {
            (section.questions || []).forEach((question: any) => {
              const questionId = String(question.id || "");
              if (!questionId) return;

              const noteValue =
                typeof question.auditorNotes === "string"
                  ? question.auditorNotes
                  : "";

              nextAuditorNotesByQuestion[questionId] = noteValue;
              nextHasSavedAuditorNotes[questionId] = Boolean(noteValue.trim());
            });
          });
        });

        setAuditorNotesByQuestion(nextAuditorNotesByQuestion);
        setHasSavedAuditorNotes(nextHasSavedAuditorNotes);
        setNoteSaveFeedbackByQuestion({});

        if (mappedMainSections.length > 0) {
          setMainSectionsData(mappedMainSections);
          setExpandedMain(
            Object.fromEntries(
              mappedMainSections.map((ms: any, index: number) => [
                ms.id,
                index === 0,
              ]),
            ),
          );
          setActiveSubsection(mappedMainSections[0]?.sections?.[0]?.name || null);
          setSelectedQuestionIndex(0);
          setShowAllQuestions(false);
        }
      } catch (error) {
        if (isCancelled) return;
        console.error("Failed to fetch audits assessment by id:", error);
        if (axios.isAxiosError(error)) {
          console.error("API message:", error.response?.data?.message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchAssessmentById();

    return () => {
      isCancelled = true;
    };
  }, [assessmentId]);

  const handleAuditorNotesChange = (questionId: string, value: string) => {
    setAuditorNotesByQuestion((prev) => ({
      ...prev,
      [questionId]: value,
    }));

    setNoteSaveFeedbackByQuestion((prev) => {
      const existing = prev[questionId];
      if (!existing?.message) return prev;

      return {
        ...prev,
        [questionId]: {
          ...existing,
          message: "",
          type: null,
        },
      };
    });
  };

  const handleAuditorNotesSave = async (questionId: string) => {
    if (!assessmentId) return;

    const noteValue = (auditorNotesByQuestion[questionId] || "").trim();

    if (!noteValue) {
      setNoteSaveFeedbackByQuestion((prev) => ({
        ...prev,
        [questionId]: {
          isSaving: false,
          message: "Please add notes before saving.",
          type: "error",
        },
      }));
      return;
    }

    setNoteSaveFeedbackByQuestion((prev) => ({
      ...prev,
      [questionId]: {
        isSaving: true,
        message: "",
        type: null,
      },
    }));

    try {
      await axiosInstance.patch(
        `/audits/assessment/${encodeURIComponent(assessmentId)}/questions/${encodeURIComponent(questionId)}/auditor-notes`,
        {
          auditorNotes: noteValue,
        },
      );

      setAuditorNotesByQuestion((prev) => ({
        ...prev,
        [questionId]: noteValue,
      }));
      setHasSavedAuditorNotes((prev) => ({
        ...prev,
        [questionId]: true,
      }));
      setMainSectionsData((prev) =>
        prev.map((mainSection: any) => ({
          ...mainSection,
          sections: (mainSection.sections || []).map((section: any) => ({
            ...section,
            questions: (section.questions || []).map((question: any) =>
              String(question.id) === questionId
                ? { ...question, auditorNotes: noteValue }
                : question,
            ),
          })),
        })),
      );
      setNoteSaveFeedbackByQuestion((prev) => ({
        ...prev,
        [questionId]: {
          isSaving: false,
          message: "Notes saved successfully.",
          type: "success",
        },
      }));
    } catch (error) {
      let message = "Failed to save notes";
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }

      setNoteSaveFeedbackByQuestion((prev) => ({
        ...prev,
        [questionId]: {
          isSaving: false,
          message,
          type: "error",
        },
      }));
    }
  };

  const handleAuditSummaryDocSelect = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setSubmitReportError("");
    setSubmitReportSuccess("");

    const extension =
      selectedFile.name.split(".").pop()?.toLowerCase().trim() || "";
    if (!ALLOWED_SUMMARY_DOC_EXTENSIONS.has(extension)) {
      setAuditSummaryDoc("");
      setAuditSummaryDocName("");
      setSubmitReportError(
        "Invalid file type. Please upload PDF, DOC, DOCX, XLS, or XLSX.",
      );
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_UPLOAD_SIZE_BYTES) {
      setAuditSummaryDoc("");
      setAuditSummaryDocName("");
      setSubmitReportError("File size must be 10MB or less.");
      event.target.value = "";
      return;
    }

    try {
      const encodedDocument = await toDataUrl(selectedFile);
      setAuditSummaryDoc(encodedDocument);
      setAuditSummaryDocName(selectedFile.name);
    } catch {
      setAuditSummaryDoc("");
      setAuditSummaryDocName("");
      setSubmitReportError("Unable to process selected document.");
      event.target.value = "";
    }
  };

  const handleSubmitAuditReport = async () => {
    if (!assessmentId) {
      setSubmitReportError("Assessment id is missing.");
      return;
    }

    const trimmedSummary = auditSummary.trim();
    const trimmedDescription = auditDescription.trim();

    if (!trimmedSummary) {
      setSubmitReportError("Audit summary is required.");
      setSubmitReportSuccess("");
      return;
    }

    if (!trimmedDescription) {
      setSubmitReportError("Audit findings are required.");
      setSubmitReportSuccess("");
      return;
    }

    if (!finalDecision) {
      setSubmitReportError("Please select a final decision.");
      setSubmitReportSuccess("");
      return;
    }

    setIsSubmittingReport(true);
    setSubmitReportError("");
    setSubmitReportSuccess("");

    try {
      const payload: {
        auditSummary: string;
        auditDescription: string;
        status: "approved" | "conditional" | "rejected";
        auditSummaryDoc?: string;
      } = {
        auditSummary: trimmedSummary,
        auditDescription: trimmedDescription,
        status: finalDecision,
      };

      if (auditSummaryDoc) {
        payload.auditSummaryDoc = auditSummaryDoc;
      }

      await axiosInstance.put(
        `/audits/assessment/${encodeURIComponent(assessmentId)}`,
        payload,
      );

      setSubmitReportSuccess("Audit report submitted successfully.");
      setAssessmentStatus(formatStatusLabel(finalDecision));
    } catch (error) {
      let message = "Failed to submit audit report";
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      setSubmitReportError(message);
    } finally {
      setIsSubmittingReport(false);
    }
  };

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

  if (showLoader) {
    return (
      <div className="p-3 md:p-6 bg-light-gray min-h-screen flex items-center justify-center">
        <Loading isLoading size="sm" progress={loadingProgress} className="p-4" />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 bg-light-gray min-h-screen">
      <div className="mb-4 md:mb-6">
        <div className="flex flex-row items-center gap-3 mb-1 md:mb-2">
          <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary leading-[21.6px] align-middle">
            Assigned Audits
          </h1>
          <div className="px-3 py-1.5 bg-[#e9e9e9] rounded-full">
            <span className="text-sm font-medium text-secondary">Reviewer</span>
          </div>
        </div>
        <p className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px] align-middle">
          View and manage all audits assigned to you
        </p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm p-4 md:p-4 mb-4">
        <div className="flex items-center gap-4">
          <div
            className="w-7 h-7 md:w-8 md:h-8 border rounded-lg flex items-center justify-center shrink-0"
            style={{ borderColor: "#E6E6E6" }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_566_2113)">
                <path
                  d="M0 1.25C0 0.558594 0.558594 0 1.25 0H18.75C19.4414 0 20 0.558594 20 1.25C20 1.94141 19.4414 2.5 18.75 2.5V17.5C19.4414 17.5 20 18.0586 20 18.75C20 19.4414 19.4414 20 18.75 20H11.875V18.125C11.875 17.0898 11.0352 16.25 10 16.25C8.96484 16.25 8.125 17.0898 8.125 18.125V20H1.25C0.558594 20 0 19.4414 0 18.75C0 18.0586 0.558594 17.5 1.25 17.5V2.5C0.558594 2.5 0 1.94141 0 1.25ZM3.75 4.375V5.625C3.75 5.96875 4.03125 6.25 4.375 6.25H5.625C5.96875 6.25 6.25 5.96875 6.25 5.625V4.375C6.25 4.03125 5.96875 3.75 5.625 3.75H4.375C4.03125 3.75 3.75 4.03125 3.75 4.375ZM9.375 3.75C9.03125 3.75 8.75 4.03125 8.75 4.375V5.625C8.75 5.96875 9.03125 6.25 9.375 6.25H10.625C10.9688 6.25 11.25 5.96875 11.25 5.625V4.375C11.25 4.03125 10.9688 3.75 10.625 3.75H9.375ZM13.75 4.375V5.625C13.75 5.96875 14.0312 6.25 14.375 6.25H15.625C15.9688 6.25 16.25 5.96875 16.25 5.625V4.375C16.25 4.03125 15.9688 3.75 15.625 3.75H14.375C14.0312 3.75 13.75 4.03125 13.75 4.375ZM4.375 7.5C4.03125 7.5 3.75 7.78125 3.75 8.125V9.375C3.75 9.71875 4.03125 10 4.375 10H5.625C5.96875 10 6.25 9.71875 6.25 9.375V8.125C6.25 7.78125 5.96875 7.5 5.625 7.5H4.375ZM8.75 8.125V9.375C8.75 9.71875 9.03125 10 9.375 10H10.625C10.9688 10 11.25 9.71875 11.25 9.375V8.125C11.25 7.78125 10.9688 7.5 10.625 7.5H9.375C9.03125 7.5 8.75 7.78125 8.75 8.125ZM14.375 7.5C14.0312 7.5 13.75 7.78125 13.75 8.125V9.375C13.75 9.71875 14.0312 10 14.375 10H15.625C15.9688 10 16.25 9.71875 16.25 9.375V8.125C16.25 7.78125 15.9688 7.5 15.625 7.5H14.375ZM12.8125 15C13.332 15 13.7617 14.5742 13.6328 14.0703C13.2188 12.4492 11.75 11.25 10 11.25C8.25 11.25 6.77734 12.4492 6.36719 14.0703C6.23828 14.5703 6.67188 15 7.1875 15H12.8125Z"
                  fill="black"
                />
              </g>
              <defs>
                <clipPath id="clip0_566_2113">
                  <rect width="20" height="20" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] md:text-[17px] font-medium text-secondary mb-2">
              {organizationName}
            </h2>
            <div className="flex flex-row items-center gap-4">
              <div className="flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M10.0002 6.66699V1.66699H5.00016C4.55814 1.66699 4.13421 1.84259 3.82165 2.15515C3.50909 2.46771 3.3335 2.89163 3.3335 3.33366V16.667C3.3335 17.109 3.50909 17.5329 3.82165 17.8455C4.13421 18.1581 4.55814 18.3337 5.00016 18.3337H15.0002C15.4422 18.3337 15.8661 18.1581 16.1787 17.8455C16.4912 17.5329 16.6668 17.109 16.6668 16.667V8.33366H11.6668C11.2248 8.33366 10.8009 8.15806 10.4883 7.8455C10.1758 7.53294 10.0002 7.10902 10.0002 6.66699ZM6.87516 9.58366H13.1252C13.2909 9.58366 13.4499 9.64951 13.5671 9.76672C13.6843 9.88393 13.7502 10.0429 13.7502 10.2087C13.7502 10.3744 13.6843 10.5334 13.5671 10.6506C13.4499 10.7678 13.2909 10.8337 13.1252 10.8337H6.87516C6.7094 10.8337 6.55043 10.7678 6.43322 10.6506C6.31601 10.5334 6.25016 10.3744 6.25016 10.2087C6.25016 10.0429 6.31601 9.88393 6.43322 9.76672C6.55043 9.64951 6.7094 9.58366 6.87516 9.58366ZM6.87516 11.8753H13.1252C13.2909 11.8753 13.4499 11.9412 13.5671 12.0584C13.6843 12.1756 13.7502 12.3346 13.7502 12.5003C13.7502 12.6661 13.6843 12.8251 13.5671 12.9423C13.4499 13.0595 13.2909 13.1253 13.1252 13.1253H6.87516C6.7094 13.1253 6.55043 13.0595 6.43322 12.9423C6.31601 12.8251 6.25016 12.6661 6.25016 12.5003C6.25016 12.3346 6.31601 12.1756 6.43322 12.0584C6.55043 11.9412 6.7094 11.8753 6.87516 11.8753ZM6.87516 14.167H13.1252C13.2909 14.167 13.4499 14.2328 13.5671 14.35C13.6843 14.4673 13.7502 14.6262 13.7502 14.792C13.7502 14.9578 13.6843 15.1167 13.5671 15.2339C13.4499 15.3511 13.2909 15.417 13.1252 15.417H6.87516C6.7094 15.417 6.55043 15.3511 6.43322 15.2339C6.31601 15.1167 6.25016 14.9578 6.25016 14.792C6.25016 14.6262 6.31601 14.4673 6.43322 14.35C6.55043 14.2328 6.7094 14.167 6.87516 14.167ZM11.2502 6.66699V2.08366L16.2502 7.08366H11.6668C11.5563 7.08366 11.4503 7.03976 11.3722 6.96162C11.2941 6.88348 11.2502 6.7775 11.2502 6.66699Z"
                    fill="#999999"
                  />
                </svg>
                <span className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px]">
                  {certificateName}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1.66675 7.50033C1.66675 5.92866 1.66675 5.14366 2.15508 4.65533C2.64341 4.16699 3.42841 4.16699 5.00008 4.16699H15.0001C16.5717 4.16699 17.3567 4.16699 17.8451 4.65533C18.3334 5.14366 18.3334 5.92866 18.3334 7.50033C18.3334 7.89283 18.3334 8.08949 18.2117 8.21199C18.0892 8.33366 17.8917 8.33366 17.5001 8.33366H2.50008C2.10758 8.33366 1.91091 8.33366 1.78841 8.21199C1.66675 8.08949 1.66675 7.89199 1.66675 7.50033ZM1.66675 15.0003C1.66675 16.572 1.66675 17.357 2.15508 17.8453C2.64341 18.3337 3.42841 18.3337 5.00008 18.3337H15.0001C16.5717 18.3337 17.3567 18.3337 17.8451 17.8453C18.3334 17.357 18.3334 16.572 18.3334 15.0003V10.8337C18.3334 10.4412 18.3334 10.2445 18.2117 10.122C18.0892 10.0003 17.8917 10.0003 17.5001 10.0003H2.50008C2.10758 10.0003 1.91091 10.0003 1.78841 10.122C1.66675 10.2445 1.66675 10.442 1.66675 10.8337V15.0003Z"
                    fill="#999999"
                  />
                  <path
                    d="M5.8335 2.5V5M14.1668 2.5V5"
                    stroke="#999999"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px]">
                  {auditDateLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <span className="inline-flex items-center justify-center px-4 py-1 rounded-md text-sm font-medium bg-green-50 text-green-600 border border-green-600">
              {assessmentStatus}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-2 md:p-3 inline-flex gap-1.5">
        <button
          onClick={() => {
            setActiveButton("assessment");

            console.log("Assessment Review clicked");
          }}
          className={`px-4 py-1.5 md:px-6 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
            activeButton === "assessment"
              ? "bg-black text-white shadow-lg"
              : "bg-white text-secondary hover:bg-primary"
          }`}
          style={
            activeButton === "assessment"
              ? {
                  boxShadow:
                    "0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)",
                }
              : undefined
          }
        >
          Assessment Review
        </button>
        <button
          onClick={() => {
            setActiveButton("submit");

            console.log("Submit Report clicked");
          }}
          className={`px-4 py-1.5 md:px-6 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
            activeButton === "submit"
              ? "bg-black text-white shadow-lg"
              : "bg-white text-secondary hover:bg-primary"
          }`}
          style={
            activeButton === "submit"
              ? {
                  boxShadow:
                    "0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)",
                }
              : undefined
          }
        >
          Submit Report
        </button>
      </div>

      {activeButton === "assessment" && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 xl:col-span-3">
            <div className="bg-white rounded-md border border-zinc-100 shadow-sm">
              <div className="px-4 py-4 border-b border-zinc-100">
                <h3 className="text-md font-medium text-secondary">
                  Assessment Sections
                </h3>
              </div>
              <div className="space-y-1 mt-2 px-3">
                {mainSectionsData.map((ms: any) => (
                  <div key={ms.id}>
                    <button
                      className="w-full text-left px-2 py-2 flex items-center gap-3"
                      onClick={() =>
                        setExpandedMain((p) => ({ ...p, [ms.id]: !p[ms.id] }))
                      }
                    >
                      <span className="shrink-0">
                        {expandedMain[ms.id] ? (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M6 15l6-6 6 6"
                              stroke="#262626"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M6 9l6 6 6-6"
                              stroke="#9CA3AF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span
                        className="font-medium text-sm"
                        style={{
                          color: expandedMain[ms.id] ? undefined : "#999999",
                        }}
                      >
                        {ms.name}
                      </span>
                    </button>
                    {expandedMain[ms.id] && (
                      <div className="px-3 pb-2 pt-0">
                        <ul className="space-y-[2px]">
                          {ms.sections.map((s: any) => (
                            <li
                              key={s.id}
                              className={`pl-6 py-1 text-sm ${activeSubsection === s.name ? "text-secondary font-medium" : ""} cursor-pointer`}
                              style={{
                                color:
                                  activeSubsection === s.name
                                    ? undefined
                                    : "#999999",
                              }}
                              onClick={() => {
                                setActiveSubsection(s.name);
                                setSelectedQuestionIndex(0);
                                setShowAllQuestions(false);
                              }}
                            >
                              {s.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-8 xl:col-span-9">
            <div className="bg-white rounded-md border border-zinc-100 p-4 shadow-sm">
              {activeSubsection &&
                (() => {
                  const selectedSection = mainSectionsData
                    .flatMap((ms: any) => ms.sections || [])
                    .find((s: any) => s.name === activeSubsection);
                  const allQuestions = Array.isArray(selectedSection?.questions)
                    ? selectedSection.questions
                    : [];
                  const fileQuestions = allQuestions.filter((question: any) =>
                    isFileQuestionType(question.questionType, question.responseType),
                  );
                  const hasFileQuestions = fileQuestions.length > 0;
                  const visibleQuestions =
                    showAllQuestions || !hasFileQuestions
                      ? allQuestions
                      : fileQuestions;
                  const hasHiddenQuestions =
                    hasFileQuestions && fileQuestions.length < allQuestions.length;
                  const questionsCount = visibleQuestions.length;

                  return (
                    <div>
                      <div>
                        <h3 className="text-sm font-medium text-secondary leading-[21.6px]">
                          {activeSubsection}
                        </h3>
                        <div className="mt-1 flex items-center justify-between gap-4 flex-wrap">
                          <p
                            className="text-sm font-normal"
                            style={{ color: "#999999" }}
                          >
                            {questionsCount} questions to review
                            {!showAllQuestions && hasHiddenQuestions
                              ? " (file questions only)"
                              : ""}
                          </p>
                          {!showAllQuestions && hasHiddenQuestions ? (
                            <button
                              type="button"
                              className="text-sm font-medium text-secondary underline"
                              onClick={() => setShowAllQuestions(true)}
                            >
                              See All
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {visibleQuestions.length ? (
                        visibleQuestions.map((q: any, idx: number) => {
                          const questionId = String(q.id);
                          const noteValue =
                            auditorNotesByQuestion[questionId] ??
                            q.auditorNotes ??
                            "";
                          const hasSavedNotes =
                            hasSavedAuditorNotes[questionId] ??
                            Boolean(String(q.auditorNotes || "").trim());
                          const noteSaveFeedback =
                            noteSaveFeedbackByQuestion[questionId];
                          const showAttachments = isFileQuestionType(
                            q.questionType,
                            q.responseType,
                          );

                          return (
                            <div
                              key={q.id}
                              className="mt-6 border border-zinc-100 rounded-md p-6"
                            >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-semibold">
                                  {idx + 1}
                                </div>
                                <h4 className="text-sm font-medium text-secondary leading-[21.6px]">
                                  {q.text}
                                </h4>
                              </div>
                              <span
                                className="inline-flex items-center px-6 py-0.5 rounded-md text-sm font-medium"
                                style={{
                                  color: "#FAAB00",
                                  backgroundColor: "#FEF7E5",
                                  border: "1px solid #FAAB00",
                                }}
                              >
                                {q.isFlagged ? "AI Flagged" : "AI Reviewed"}
                              </span>
                            </div>

                            <div className="space-y-4 pl-12 pr-4">
                              <div>
                                <h5 className="text-sm font-medium text-gray leading-[21.6px] mb-2">
                                  Applicant Response
                                </h5>
                                <div
                                  className="min-h-[80px] p-4 rounded-md text-sm text-gray-700"
                                  style={{ border: "1px solid #E6E6E6" }}
                                >
                                  {q.applicantAnswer || "N/A"}
                                </div>
                              </div>

                              {showAttachments && (
                                <div>
                                  <h5 className="text-sm font-medium text-gray mb-2">
                                    Attached Documents
                                  </h5>
                                  {Array.isArray(q.attachments) &&
                                  q.attachments.length > 0 ? (
                                    <div className="flex gap-3 flex-wrap">
                                      {q.attachments.map(
                                        (file: any, fileIndex: number) => (
                                          <a
                                            key={`${q.id}-file-${fileIndex}`}
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm text-secondary underline"
                                            style={{ background: "#F6F6F6" }}
                                          >
                                            {file.name || `Document ${fileIndex + 1}`}
                                          </a>
                                        ),
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500">
                                      No attached documents
                                    </p>
                                  )}
                                </div>
                              )}

                              <div>
                                <h5 className="text-sm font-medium text-gray mb-2">
                                  AI Analysis
                                </h5>
                                <div
                                  className="p-4 rounded-md text-sm text-gray-700 border"
                                  style={{ borderColor: "#E6E6E6" }}
                                >
                                  {q.aiSummary || "No AI analysis available"}
                                </div>
                              </div>

                              <div>
                                <h5 className="text-sm font-medium text-gray mb-2">
                                  Auditor Notes
                                </h5>
                                <textarea
                                  className="w-full min-h-30 p-3 rounded-md text-sm border focus:outline-none focus:border-black"
                                  style={{ borderColor: "#E6E6E6" }}
                                  placeholder="Add your notes here....."
                                  value={noteValue}
                                  onChange={(event) =>
                                    handleAuditorNotesChange(
                                      questionId,
                                      event.target.value,
                                    )
                                  }
                                ></textarea>
                              </div>

                              <div className="mt-6 flex items-center gap-4">
                                <Button
                                  variant="custom"
                                  className="border border-black rounded-lg px-6 py-2 font-semibold"
                                  onClick={() => setShowSubmitModal(true)}
                                >
                                  Request Clarification
                                </Button>
                                <Button
                                  variant="custom"
                                  className="border border-black rounded-lg px-6 py-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() => {
                                    void handleAuditorNotesSave(questionId);
                                  }}
                                  disabled={
                                    !assessmentId ||
                                    Boolean(noteSaveFeedback?.isSaving) ||
                                    !noteValue.trim()
                                  }
                                >
                                  {noteSaveFeedback?.isSaving
                                    ? "Saving..."
                                    : hasSavedNotes
                                      ? "Update Notes"
                                      : "Add Notes"}
                                </Button>
                              </div>
                              {noteSaveFeedback?.message ? (
                                <p
                                  className={`text-sm ${
                                    noteSaveFeedback.type === "error"
                                      ? "text-red-600"
                                      : "text-green-600"
                                  }`}
                                >
                                  {noteSaveFeedback.message}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          );
                        })
                      ) : (
                        <div className="mt-6 border border-zinc-100 rounded-md p-6">
                          <div className="text-sm text-gray-500">
                            {showAllQuestions || !hasHiddenQuestions
                              ? "No questions available for this section."
                              : "No file questions found in this section. Click See All to view all questions."}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
            </div>
          </div>
          {showSubmitModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setShowSubmitModal(false)}
              />
              <div className="relative bg-white rounded-lg w-[90%] max-w-xl p-6 shadow-lg">
                <button
                  className="absolute top-4 right-4"
                  onClick={() => setShowSubmitModal(false)}
                >
                  <img
                    src="/assets/imgs/admin/commons/cross.svg"
                    alt="close"
                    className="w-5 h-5"
                  />
                </button>

                <h3 className="text-lg font-medium text-secondary mb-3">
                  Request Clarification
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Describe what additional information or documents you need
                  from the applicant.
                </p>

                <textarea
                  className="w-full min-h-30 p-3 rounded-md text-sm border"
                  style={{ borderColor: "#E6E6E6" }}
                  placeholder="Kindly provide additional documentation for....."
                />

                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setShowSubmitModal(false)}
                  >
                    Close
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      console.log("Request sent");
                      setShowSubmitModal(false);
                    }}
                  >
                    Send Request
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeButton === "submit" && (
        <div className="mt-6">
          <div className="bg-white rounded-xl border border-zinc-100 p-4">
            <h3 className="text-base md:text-lg font-medium text-secondary">
              Audit Report Submission
            </h3>

            <div className="mt-5 space-y-6">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Audit Summary *
                </label>
                <textarea
                  className="w-full min-h-30 p-4 rounded-md text-sm border focus:outline-none"
                  style={{ borderColor: "#E6E6E6" }}
                  placeholder="Provide a high-level summary of the audits findings....."
                  value={auditSummary}
                  onChange={(event) => {
                    setAuditSummary(event.target.value);
                    if (submitReportError) setSubmitReportError("");
                    if (submitReportSuccess) setSubmitReportSuccess("");
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Audit Findings *
                </label>
                <textarea
                  className="w-full min-h-30 p-4 rounded-md text-sm border focus:outline-none"
                  style={{ borderColor: "#E6E6E6" }}
                  placeholder="Document your detailed findings, observations and recommendations....."
                  value={auditDescription}
                  onChange={(event) => {
                    setAuditDescription(event.target.value);
                    if (submitReportError) setSubmitReportError("");
                    if (submitReportSuccess) setSubmitReportSuccess("");
                  }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-100 p-4">
            <h3 className="text-base md:text-lg font-medium text-secondary">
              Final Decision *
            </h3>

            <div className="mt-4 space-y-4">
              <div
                role="button"
                onClick={() => setFinalDecision("approved")}
                className={`flex items-start gap-4 p-4 rounded-md border ${finalDecision === "approved" ? "border-black" : "border-zinc-200"} cursor-pointer`}
              >
                <div className="shrink-0">
                  {finalDecision === "approved" ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="20" height="20" rx="10" fill="#D9D9D9" />
                      <circle cx="10" cy="10" r="6" fill="#262626" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="20" height="20" rx="10" fill="#D9D9D9" />
                      <circle cx="10" cy="10" r="6" fill="#999999" />
                    </svg>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="shrink-0">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"
                          fill="#00B448"
                        />
                      </svg>
                    </div>
                    <div className="text-sm md:text-base font-semibold">
                      Approved
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Organization meets all certification requirements
                  </p>
                </div>
              </div>

              <div
                role="button"
                onClick={() => setFinalDecision("conditional")}
                className={`flex items-start gap-4 p-4 rounded-md border ${finalDecision === "conditional" ? "border-black" : "border-zinc-200"} cursor-pointer`}
              >
                <div className="shrink-0">
                  {finalDecision === "conditional" ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="20" height="20" rx="10" fill="#D9D9D9" />
                      <circle cx="10" cy="10" r="6" fill="#262626" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="20" height="20" rx="10" fill="#D9D9D9" />
                      <circle cx="10" cy="10" r="6" fill="#999999" />
                    </svg>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="shrink-0">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2ZM12 15C11.7348 15 11.4804 15.1054 11.2929 15.2929C11.1054 15.4804 11 15.7348 11 16C11 16.2652 11.1054 16.5196 11.2929 16.7071C11.4804 16.8946 11.7348 17 12 17C12.2652 17 12.5196 16.8946 12.7071 16.7071C12.8946 16.5196 13 16.2652 13 16C13 15.7348 12.8946 15.4804 12.7071 15.2929C12.5196 15.1054 12.2652 15 12 15ZM12 6C11.7551 6.00003 11.5187 6.08996 11.3356 6.25272C11.1526 6.41547 11.0357 6.63975 11.007 6.883L11 7V13C11.0003 13.2549 11.0979 13.5 11.2728 13.6854C11.4478 13.8707 11.687 13.9822 11.9414 13.9972C12.1958 14.0121 12.4464 13.9293 12.6418 13.7657C12.8373 13.6021 12.9629 13.3701 12.993 13.117L13 13V7C13 6.73478 12.8946 6.48043 12.7071 6.29289C12.5196 6.10536 12.2652 6 12 6Z"
                          fill="#FAAB00"
                        />
                      </svg>
                    </div>
                    <div className="text-sm md:text-base font-semibold">
                      Conditionally Approved
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Minor issues to be addressed within specified timeframe
                  </p>
                </div>
              </div>

              <div
                role="button"
                onClick={() => setFinalDecision("rejected")}
                className={`flex items-start gap-4 p-4 rounded-md border ${finalDecision === "rejected" ? "border-black" : "border-zinc-200"} cursor-pointer`}
              >
                <div className="shrink-0">
                  {finalDecision === "rejected" ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="20" height="20" rx="10" fill="#D9D9D9" />
                      <circle cx="10" cy="10" r="6" fill="#262626" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="20" height="20" rx="10" fill="#D9D9D9" />
                      <circle cx="10" cy="10" r="6" fill="#999999" />
                    </svg>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="shrink-0">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M5.46983 5.47007C5.61045 5.32962 5.80108 5.25073 5.99983 5.25073C6.19858 5.25073 6.3892 5.32962 6.52983 5.47007L18.5298 17.4701C18.6035 17.5387 18.6626 17.6215 18.7036 17.7135C18.7446 17.8055 18.7666 17.9048 18.7684 18.0056C18.7702 18.1063 18.7517 18.2063 18.714 18.2997C18.6762 18.3931 18.6201 18.4779 18.5489 18.5491C18.4776 18.6203 18.3928 18.6765 18.2994 18.7142C18.206 18.7519 18.106 18.7704 18.0053 18.7687C17.9046 18.7669 17.8053 18.7448 17.7133 18.7039C17.6213 18.6629 17.5385 18.6038 17.4698 18.5301L5.46983 6.53007C5.32938 6.38945 5.25049 6.19882 5.25049 6.00007C5.25049 5.80132 5.32938 5.6107 5.46983 5.47007Z"
                          fill="#FF0909"
                        />
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M18.5298 5.47007C18.6703 5.6107 18.7492 5.80132 18.7492 6.00007C18.7492 6.19882 18.6703 6.38945 18.5298 6.53007L6.52985 18.5301C6.38767 18.6626 6.19963 18.7347 6.00532 18.7312C5.81102 18.7278 5.62564 18.6491 5.48822 18.5117C5.35081 18.3743 5.2721 18.1889 5.26867 17.9946C5.26524 17.8003 5.33737 17.6122 5.46985 17.4701L17.4698 5.47007C17.6105 5.32962 17.8011 5.25073 17.9998 5.25073C18.1986 5.25073 18.3892 5.32962 18.5298 5.47007Z"
                          fill="#FF0909"
                        />
                      </svg>
                    </div>
                    <div className="text-sm md:text-base font-semibold">
                      Rejected
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Organization does not meet certification requirements
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5">
              <label className="block text-sm font-medium text-secondary mb-2">
                Audit Summary Document
              </label>
              <div
                className="w-full rounded-lg border-2 border-dashed border-zinc-300 p-8 min-h-30 flex flex-col items-center justify-center text-center text-gray-400"
                style={{ background: "transparent" }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mb-2"
                >
                  <path
                    d="M5.3335 22.6666V25.3333C5.3335 26.0405 5.61445 26.7188 6.11454 27.2189C6.61464 27.719 7.29292 27.9999 8.00016 27.9999H24.0002C24.7074 27.9999 25.3857 27.719 25.8858 27.2189C26.3859 26.7188 26.6668 26.0405 26.6668 25.3333V22.6666M9.3335 11.9999L16.0002 5.33325M16.0002 5.33325L22.6668 11.9999M16.0002 5.33325V21.3333"
                    stroke="#999999"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="text-sm font-medium">
                  Click to upload or drag and drop
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  PDF, DOC, DOCX, XLS, XLSX (max 10MB)
                </div>
                <input
                  ref={auditSummaryDocInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleAuditSummaryDocSelect}
                />
                <button
                  type="button"
                  className="mt-4 px-4 py-2 text-sm border border-zinc-300 rounded-md text-secondary hover:bg-zinc-50"
                  onClick={() => auditSummaryDocInputRef.current?.click()}
                >
                  Select Document
                </button>
                {auditSummaryDocName ? (
                  <p className="mt-2 text-xs text-secondary">
                    Selected: {auditSummaryDocName}
                  </p>
                ) : null}
              </div>
            </div>

            <Button
              variant="primary"
              className="mt-6"
              onClick={() => {
                void handleSubmitAuditReport();
              }}
              disabled={isSubmittingReport}
            >
              {isSubmittingReport ? "Submitting..." : "Submit Audit Report"}
            </Button>
            {submitReportError ? (
              <p className="mt-3 text-sm text-red-600">{submitReportError}</p>
            ) : null}
            {submitReportSuccess ? (
              <p className="mt-3 text-sm text-green-600">{submitReportSuccess}</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssignAuditsReview() {
  return (
    <Suspense
      fallback={
        <div className="p-3 md:p-6 bg-light-gray min-h-screen flex items-center justify-center">
          <div className="text-secondary">Loading...</div>
        </div>
      }
    >
      <AssignAuditsReviewContent />
    </Suspense>
  );
}
