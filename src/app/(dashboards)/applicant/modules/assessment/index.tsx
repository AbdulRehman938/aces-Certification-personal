"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  CheckCircle2,
  Circle,
  ArrowLeft,
  Save,
  SkipForward,
  ArrowRight,
  Loader2,
  AlertCircle,
  X,
  FileText,
  Upload,
  Sparkles,
  HelpCircle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useState, useEffect, useMemo, useRef } from "react";
import { axiosInstance } from "@/lib/axios";
import { LoadingScreen } from "../../common/loading-screen";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  is_compulsory: boolean;
  rank: number;
  main_section_name: string;
  section_name: string;
  sub_section_name: string;
  main_section_description?: string;
  answer_id: string | null;
  response_type: string | null;
  response_value: any;
  ai_description?: string;
}

interface AssessmentData {
  id: string;
  organization_id: string;
  branch_id: string;
  certificate_id: string;
  payment_id: string;
  assessment_type: string;
  badge_id: string;
  score: number;
  is_submitted: boolean;
  status: string;
  certificate_name: string;
  organization_name: string;
  branch_name: string;
  total_questions: number;
  answered_questions: number;
}

interface SectionGroup {
  name: string;
  sections: {
    name: string;
    questions: Question[];
    is_completed: boolean;
  }[];
}

interface AiReviewResponse {
  id: string;
  assessment_query_id: string;
  ai_review_id: string;
  response: string;
  is_flagged: boolean;
  flag_reason: string;
  confidence_score: number;
  created_at: string;
  question_text: string;
  question_type: string;
  response_type: string;
  response_value: string;
}

interface AiReviewData {
  id: string;
  certificate_assessment_id: string;
  review_description: string;
  review_status: string;
  total_flags: number;
  started_at: string;
  completed_at: string;
  created_at: string;
  updated_at: string;
  responses: AiReviewResponse[];
}

export function AssessmentPage() {
  const router = useRouter();
  const pathname = usePathname();
  const isEmployee = pathname.startsWith("/employee");
  const base = isEmployee ? "/employee" : "/applicant";
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [expandedMainSections, setExpandedMainSections] = useState<string[]>(
    [],
  );

  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "error" | "success"
  >("idle");
  const [skippedQuestionIds, setSkippedQuestionIds] = useState<string[]>([]);
  const [draftedQuestionIds, setDraftedQuestionIds] = useState<string[]>([]);

  const [showAiModal, setShowAiModal] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [selectedAiValue, setSelectedAiValue] = useState<string | null>(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showQuitWarning, setShowQuitWarning] = useState(false);

  const [aiReviewResult, setAiReviewResult] = useState<AiReviewData | null>(
    null,
  );
  const [assessmentScoreResult, setAssessmentScoreResult] = useState<any>(null);
  const [showAiReviewModal, setShowAiReviewModal] = useState(false);
  const [isAiReviewLoading, setIsAiReviewLoading] = useState(false);

  const [isFileUploading, setIsFileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messageModal, setMessageModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "error" | "success" | "info";
    onConfirm?: () => void;
    buttonText?: string;
  }>({
    show: false,
    title: "",
    message: "",
    type: "info",
  });

  const showMessage = (
    title: string,
    message: string,
    type: "error" | "success" | "info" = "error",
    onConfirm?: () => void,
    buttonText?: string,
  ) => {
    setMessageModal({
      show: true,
      title,
      message,
      type,
      onConfirm,
      buttonText,
    });
  };

  const initAssessment = async () => {
    try {
      setIsLoading(true);
      setLoadingProgress(5);

      const pendingStr = localStorage.getItem("pending_assessment_ids");
      if (!pendingStr) {
        throw new Error(
          "No pending assessment session found. Please return to payments.",
        );
      }
      const pendingIds = JSON.parse(pendingStr);

      const assessmentId = pendingIds.assessment_id || pendingIds.payment_id;

      if (!assessmentId) {
        throw new Error(
          "Missing assessment reference. Please try again from the certificate page.",
        );
      }

      setLoadingProgress(15);

      try {
        const detailRes = await axiosInstance.get(
          `/assessments/${assessmentId}`,
        );

        if (detailRes.data?.success) {
          setAssessment(detailRes.data.data);
          setLoadingProgress(45);
        }
      } catch (detailErr) {
        console.warn(
          "⚠️ [Assessment] Could not load extra details, continuing with questions...",
          detailErr,
        );
        setLoadingProgress(45);
      }

      const questionsRes = await axiosInstance.get(
        `/assessments/${assessmentId}/questions`,
      );

      if (!questionsRes.data?.success) {
        throw new Error(
          questionsRes.data?.message || "Failed to fetch assessment questions.",
        );
      }

      setLoadingProgress(75);

      const rawQuestions = questionsRes.data.data || [];
      const fetchedQuestions = rawQuestions.map((q: any) => ({
        ...q,
        response_value:
          q.response_value || (q.question_type === "boolean" ? null : ""),
        answer_id: q.answer_id || null,
      }));

      if (fetchedQuestions.length === 0) {
        setLoadingProgress(100);
        setTimeout(() => {
          setIsLoading(false);
          showMessage(
            "No Questions Available",
            "There are no questions configured for this assessment yet. Redirecting back to dashboard...",
            "info",
            () => router.push(`${base}`),
            "Back to Dashboard",
          );
        }, 500);
        return;
      }

      setQuestions(fetchedQuestions);

      if (fetchedQuestions.length > 0) {
        setExpandedMainSections([fetchedQuestions[0].main_section_name]);
        setActiveQuestionIndex(0);
      }

      setLoadingProgress(100);
      setTimeout(() => setIsLoading(false), 800);
    } catch (err: any) {
      console.error("❌ Assessment Init Error:", err);
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to initialize assessment.",
      );
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAssessment();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue =
        "Are you sure you want to leave? Your progress may not be saved.";
      return "Are you sure you want to leave? Your progress may not be saved.";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      window.history.pushState(null, "", window.location.href);
      setShowQuitWarning(true);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    const isAnyModalOpen =
      showAiModal ||
      showSuccessModal ||
      showAiReviewModal ||
      showQuitWarning ||
      messageModal.show;

    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showAiModal, showSuccessModal, showAiReviewModal, showQuitWarning]);

  const activeQuestion = questions[activeQuestionIndex];

  const groupedQuestions = useMemo(() => {
    const groups: Record<string, Record<string, Question[]>> = {};
    questions.forEach((q) => {
      if (!groups[q.main_section_name]) groups[q.main_section_name] = {};
      if (!groups[q.main_section_name][q.section_name])
        groups[q.main_section_name][q.section_name] = [];
      groups[q.main_section_name][q.section_name].push(q);
    });

    return Object.entries(groups).map(
      ([mainName, subGroups]): SectionGroup => ({
        name: mainName,
        sections: Object.entries(subGroups).map(([secName, qs]) => ({
          name: secName,
          questions: qs,
          is_completed: qs.every(
            (q) => q.answer_id !== null || skippedQuestionIds.includes(q.id),
          ),
        })),
      }),
    );
  }, [questions, skippedQuestionIds]);

  const hierarchicalNumbers = useMemo(() => {
    if (!activeQuestion || groupedQuestions.length === 0)
      return { main: "", sub: "" };

    const mIdx = groupedQuestions.findIndex(
      (g) => g.name === activeQuestion.main_section_name,
    );
    if (mIdx === -1) return { main: "", sub: "" };

    const questionsInMain = questions.filter(
      (q) => q.main_section_name === activeQuestion.main_section_name,
    );
    const qIdxInMain = questionsInMain.findIndex(
      (q) => q.id === activeQuestion.id,
    );

    const mainNum = `EW 1.${mIdx + 1}`;
    const subNum = `EW 1.${mIdx + 1}.${qIdxInMain + 1}`;

    return { main: mainNum, sub: subNum };
  }, [activeQuestion, groupedQuestions, questions]);

  const completionPercentage = useMemo(() => {
    if (questions.length === 0) return 0;
    const finishedCount = questions.filter(
      (q) => q.answer_id !== null || skippedQuestionIds.includes(q.id),
    ).length;
    return Math.round((finishedCount / questions.length) * 100);
  }, [questions, skippedQuestionIds]);

  const canSaveAndNext = useMemo(() => {
    if (!activeQuestion) return false;

    const val = activeQuestion.response_value;
    const desc = activeQuestion.ai_description;

    const hasMainAnswer =
      activeQuestion.question_type === "boolean"
        ? val === "Yes" || val === "No"
        : activeQuestion.question_type === "text"
          ? !!val && val.trim() !== ""
          : !!val;

    const hasDescription =
      activeQuestion.question_type === "text" || (!!desc && desc.trim() !== "");

    return !!hasMainAnswer && !!hasDescription;
  }, [activeQuestion]);

  const handleResponseChange = (value: any) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[activeQuestionIndex] = {
        ...updated[activeQuestionIndex],
        response_value: value,
      };
      return updated;
    });
  };

  const handleDescriptionChange = (value: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[activeQuestionIndex] = {
        ...updated[activeQuestionIndex],
        ai_description: value,
      };
      return updated;
    });
  };

  const moveToNext = (
    currentQuestions: Question[],
    currentDrafts: string[],
    currentSkips: string[],
  ) => {
    let nextIdx = -1;

    for (let i = activeQuestionIndex + 1; i < currentQuestions.length; i++) {
      if (
        !currentQuestions[i].answer_id &&
        !currentSkips.includes(currentQuestions[i].id)
      ) {
        nextIdx = i;
        break;
      }
    }

    if (nextIdx === -1 && currentDrafts.length > 0) {
      const nextDraftId = currentDrafts[0];
      nextIdx = currentQuestions.findIndex((q) => q.id === nextDraftId);
      setDraftedQuestionIds((prev) => prev.filter((id) => id !== nextDraftId));
    }

    if (nextIdx !== -1) {
      setActiveQuestionIndex(nextIdx);
      const nextQ = currentQuestions[nextIdx];
      setExpandedMainSections((prev) =>
        prev.includes(nextQ.main_section_name)
          ? prev
          : [...prev, nextQ.main_section_name],
      );
    } else {
      const isActuallyDone = currentQuestions.every(
        (q) => q.answer_id !== null || currentSkips.includes(q.id),
      );
      if (isActuallyDone) {
        setShowSuccessModal(true);
      } else {
        const firstUndone = currentQuestions.findIndex(
          (q) => q.answer_id === null && !currentSkips.includes(q.id),
        );
        if (firstUndone !== -1) {
          setActiveQuestionIndex(firstUndone);
        } else {
          setShowSuccessModal(true);
        }
      }
    }
  };

  const handleSaveNext = async () => {
    if (!activeQuestion || !assessment) return;

    if (!canSaveAndNext) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return;
    }

    setSaveStatus("saving");
    try {
      let updatedAnswerId = activeQuestion.answer_id;
      const valToSave =
        activeQuestion.question_type === "text"
          ? activeQuestion.ai_description || activeQuestion.response_value
          : activeQuestion.response_value;

      const apiResponseType =
        activeQuestion.question_type === "file"
          ? "pdf"
          : activeQuestion.question_type;

      if (
        activeQuestion.answer_id &&
        !activeQuestion.answer_id.startsWith("local_")
      ) {
        const patchUrl = `/assessments/${assessment.id}/answers/${activeQuestion.answer_id}`;
        console.log("🔄 Updating answer:", patchUrl);
        const res = await axiosInstance.patch(patchUrl, {
          response_type: apiResponseType,
          response_value: valToSave,
        });
        if (res.data?.success) {
          console.log("✅ Answer updated successfully");
        }
      } else {
        console.log("🆕 Creating new answer for question:", activeQuestion.id);
        const res = await axiosInstance.post(
          `/assessments/${assessment.id}/answers`,
          {
            answers: [
              {
                question_id: activeQuestion.id,
                response_type: apiResponseType,
                response_value: valToSave,
              },
            ],
          },
        );

        if (res.data?.success && res.data.data?.length > 0) {
          updatedAnswerId = res.data.data[0].id;
          console.log("✅ Answer created successfully, ID:", updatedAnswerId);
        }
      }

      const newQuestions = [...questions];
      newQuestions[activeQuestionIndex] = {
        ...newQuestions[activeQuestionIndex],
        answer_id: updatedAnswerId || "local_done_" + Date.now(),
      };

      setQuestions(newQuestions);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 1000);

      setTimeout(() => {
        moveToNext(newQuestions, draftedQuestionIds, skippedQuestionIds);
      }, 500);
    } catch (e: any) {
      console.error("❌ Failed to save answer:", e);
      setSaveStatus("error");
      showMessage(
        "Save Error",
        e?.response?.data?.message ||
          "Failed to save answer. Please try again.",
      );
    }
  };

  const [isExiting, setIsExiting] = useState(false);

  const handleSaveExit = async () => {
    if (!activeQuestion || !assessment || !canSaveAndNext) return;

    setIsExiting(true);
    setSaveStatus("saving");
    try {
      const valToSave =
        activeQuestion.question_type === "text"
          ? activeQuestion.ai_description || activeQuestion.response_value
          : activeQuestion.response_value;

      const apiResponseType =
        activeQuestion.question_type === "file"
          ? "pdf"
          : activeQuestion.question_type;

      if (
        activeQuestion.answer_id &&
        !activeQuestion.answer_id.startsWith("local_")
      ) {
        await axiosInstance.patch(
          `/assessments/${assessment.id}/answers/${activeQuestion.answer_id}`,
          {
            response_type: apiResponseType,
            response_value: valToSave,
          },
        );
      } else {
        await axiosInstance.post(`/assessments/${assessment.id}/answers`, {
          answers: [
            {
              question_id: activeQuestion.id,
              response_type: apiResponseType,
              response_value: valToSave,
            },
          ],
        });
      }

      setQuestions((prev) => {
        const updated = [...prev];
        updated[activeQuestionIndex] = {
          ...updated[activeQuestionIndex],
          answer_id: activeQuestion.answer_id || "local_" + Date.now(),
        };
        return updated;
      });

      setSaveStatus("success");
      setTimeout(() => {
        localStorage.removeItem("pending_assessment_ids");
        router.push(`${base}`);
      }, 1000);
    } catch (e: any) {
      console.error("❌ Save & Exit Error:", e);
      setSaveStatus("error");
      showMessage(
        "Save Error",
        e?.response?.data?.message ||
          "Failed to save and exit. Please try again.",
      );
      setIsExiting(false);
    }
  };

  const handleSkip = () => {
    const newSkips = [...skippedQuestionIds, activeQuestion.id];
    setSkippedQuestionIds(newSkips);
    moveToNext(questions, draftedQuestionIds, newSkips);
  };

  const handleSaveDraft = () => {
    if (!draftedQuestionIds.includes(activeQuestion.id)) {
      const newDrafts = [...draftedQuestionIds, activeQuestion.id];
      setDraftedQuestionIds(newDrafts);
      moveToNext(questions, newDrafts, skippedQuestionIds);
    } else {
      moveToNext(questions, draftedQuestionIds, skippedQuestionIds);
    }
  };

  const handleBack = () => {
    setActiveQuestionIndex((prev) => Math.max(0, prev - 1));
  };

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;

    // Validation
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    const maxSize = 10 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      showMessage(
        "Invalid File Type",
        "Only PDF, DOCX, and Excel files (max 10MB) are allowed.",
      );
      return;
    }

    if (file.size > maxSize) {
      showMessage("File Too Large", "Maximum size is 10MB.");
      return;
    }

    try {
      const isDuplicate = questions.some((q) => {
        if (!q.response_value || typeof q.response_value !== "string")
          return false;
        if (q.id === activeQuestion.id) return false;
        const existingName = q.response_value.split("/").pop();
        return existingName?.toLowerCase() === file.name.toLowerCase();
      });

      if (isDuplicate) {
        showMessage(
          "Duplicate Filename",
          `A file named "${file.name}" has already been uploaded for another question. Please rename the file or upload a different one.`,
          "error",
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setIsFileUploading(true);
      const formData = new FormData();
      formData.append("document", file);

      const response = await axiosInstance.post<{
        url: string;
      }>("/uploads/documents", formData);

      const url = response.data?.url;
      if (url) {
        handleResponseChange(url);
        console.log("✅ File uploaded successfully:", url);
      }
    } catch (error: any) {
      console.error("❌ Failed to upload document:", error);
      showMessage(
        "Upload Failed",
        error?.response?.data?.message ||
          "Failed to upload document. Please try again.",
      );
    } finally {
      setIsFileUploading(false);
    }
  };

  const handleDeleteFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleResponseChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const fetchAiSuggestions = async () => {
    const qId = activeQuestion?.id || (activeQuestion as any)?.question_id;
    if (!qId) {
      console.warn("AI Guidance: No active question ID found", activeQuestion);
      showMessage("AI Guidance Error", "No active question ID found");
      return;
    }

    console.log("AI Guidance: Fetching for question", qId);
    setIsAiLoading(true);
    setShowAiModal(true);
    try {
      const res = await axiosInstance.get(`/questions/${qId}/guidance`);
      console.log("AI Guidance: Received response", res.data);
      const suggestions = res.data?.data?.suggestions || [];
      setAiSuggestions(suggestions);
    } catch (err: any) {
      console.error(
        "AI Guidance Error:",
        err?.response?.data || err.message || err,
      );
      showMessage(
        "AI Guidance Error",
        err?.response?.data?.message || err.message,
      );
      setAiSuggestions([]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const filteredSuggestions = aiSuggestions;

  const applyAiSuggestion = () => {
    if (selectedAiValue) {
      handleDescriptionChange(selectedAiValue);
      if (activeQuestion.question_type === "text") {
        handleResponseChange(selectedAiValue);
      }
      setShowAiModal(false);
      setSelectedAiValue(null);
    }
  };

  const handleSubmitAll = async () => {
    if (!assessment) return;
    setShowSuccessModal(false);
    setIsLoading(true);
    setLoadingProgress(50);
    try {
      console.log("🚀 Submitting assessment to AI:");
      setLoadingProgress(70);
      await axiosInstance.post(`/assessments/${assessment.id}/submit`, {});
      setLoadingProgress(100);
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("just_submitted_assessment_id", assessment.id);
          localStorage.removeItem("pending_assessment_ids");
        }
        setIsLoading(false);
        showMessage(
          "Assessment Under Review",
          "Your assessment has been submitted successfully and is now being reviewed by our AI system. You will be notified once your results are published.",
          "info",
          () => router.push(`${base}`),
          "Back to Dashboard",
        );
      } catch (err) {
        console.error("Redirection Error:", err);
        router.push(`${base}`);
      }
    } catch (err: any) {
      console.error("Submit Error:", err);
      setIsLoading(false);
      showMessage(
        "Submission Error",
        err?.response?.data?.message ||
          "Error submitting assessment. Please try again.",
      );
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F9FAFB] p-6 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-4xl shadow-2xl shadow-zinc-200/50 p-8 text-center space-y-4 border border-gray-100"
        >
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-red-50/30">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">
              Something went wrong
            </h2>
            <p className="text-zinc-500 text-sm font-medium leading-relaxed">
              {error}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => {
                if (error.toLowerCase().includes("back to payments")) {
                  router.push(`${base}/profile/payments`);
                } else if (
                  error.toLowerCase().includes("certificate") ||
                  error.toLowerCase().includes("assessment session") ||
                  error.toLowerCase().includes("reference")
                ) {
                  router.push(`${base}/certificate`);
                } else {
                  window.location.reload();
                }
              }}
              className="h-12 bg-zinc-900 text-white hover:bg-black font-semibold rounded-xl shadow-xl shadow-zinc-900/10 text-sm"
            >
              {error.toLowerCase().includes("back to payments")
                ? "Go to Payments"
                : error.toLowerCase().includes("certificate") ||
                    error.toLowerCase().includes("assessment session") ||
                    error.toLowerCase().includes("reference")
                  ? "Back to Certificate"
                  : "Try Again"}
            </Button>

            <button
              onClick={() => router.push(`${base}`)}
              className="w-full h-12 text-zinc-400 hover:text-zinc-900 font-semibold text-sm transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-white fixed inset-0 z-50">
        <LoadingScreen
          isLoading={isLoading}
          progress={loadingProgress}
          size="lg"
        />
      </div>
    );
  }

  const showAiButton = activeQuestion?.question_type !== "boolean" || true;

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      <aside className="w-90 border-r border-[#F0F0F0] flex flex-col bg-white shrink-0 scrollbar-hide">
        <div className="p-10 pb-6 pt-5">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-13 h-13 bg-[#1A1A1A] rounded-[18px] flex items-center justify-center shrink-0">
              <span className="text-white font-semibold text-[26px] leading-none mb-0.5">
                C
              </span>
            </div>
            <div className="flex flex-col justify-center -space-y-0.5">
              <span className="text-[22px] font-extrabold text-[#1A1A1A] leading-none tracking-tight">
                ACES
              </span>
              <span className="text-[17px] font-normal text-[#525252] leading-tight">
                Certification
              </span>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex justify-between items-center text-[#A3A3A3] font-medium">
              <p className="text-[12px]">
                Section{" "}
                {groupedQuestions.findIndex(
                  (g) => g.name === activeQuestion?.main_section_name,
                ) + 1}{" "}
                of {groupedQuestions.length}
              </p>
              <p className="text-[12px]">{completionPercentage}%</p>
            </div>
            <div className="h-1.25 w-full bg-[#E5E5E5] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionPercentage}%` }}
                className="h-full bg-[#1A1A1A]"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-10 scrollbar-hide">
          <div className="space-y-2">
            {groupedQuestions.map((group, gIdx) => {
              const isOpen = expandedMainSections.includes(group.name);
              const isCompleted = group.sections.every((s) => s.is_completed);

              return (
                <div
                  key={gIdx}
                  className={`rounded-xl border transition-all duration-200 ${
                    isOpen
                      ? "border-[#F0F0F0] bg-primary/50 shadow-sm"
                      : "border-transparent bg-transparent"
                  }`}
                >
                  <button
                    onClick={() =>
                      setExpandedMainSections((prev) =>
                        prev.includes(group.name)
                          ? prev.filter((n) => n !== group.name)
                          : [...prev, group.name],
                      )
                    }
                    className="w-full px-4 py-3 cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#737373] transition-transform duration-300 ${isOpen ? "" : "-rotate-90"}`}
                      />
                      <span
                        className={`text-[13px] font-bold text-left transition-colors ${isOpen ? "text-[#1A1A1A]" : "text-[#525252] group-hover:text-[#1A1A1A]"}`}
                      >
                        {group.name}
                      </span>
                    </div>
                    {isCompleted ? (
                      <div className="w-4.5 h-4.5 bg-zinc-900 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white stroke-3" />
                      </div>
                    ) : (
                      <div className="w-4.5 h-4.5 bg-[#E5E5E5] rounded-full" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 space-y-0.5">
                          {group.sections.map((section, sIdx) => {
                            const isActive =
                              activeQuestion?.section_name === section.name;
                            const isSectionDone = section.is_completed;

                            return (
                              <button
                                key={sIdx}
                                onClick={() => {
                                  const idx = questions.findIndex(
                                    (q) => q.section_name === section.name,
                                  );
                                  if (idx !== -1) setActiveQuestionIndex(idx);
                                }}
                                className="w-full flex items-center gap-3 py-1.5 px-3 cursor-pointer rounded-lg transition-all group/item hover:bg-white"
                              >
                                <div
                                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                    isActive
                                      ? "border-[#1A1A1A]"
                                      : "border-[#D4D4D4] group-hover/item:border-[#A3A3A3]"
                                  }`}
                                >
                                  {isActive && (
                                    <div className="w-2.5 h-2.5 bg-[#1A1A1A] rounded-full" />
                                  )}
                                </div>
                                <span
                                  className={`text-[12px] font-medium text-left transition-colors truncate ${
                                    isActive
                                      ? "text-[#1A1A1A] font-bold"
                                      : "text-[#666666] group-hover/item:text-[#1A1A1A]"
                                  }`}
                                >
                                  {section.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-[#F9FAFB] relative overflow-hidden">
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-10">
            <div className="bg-[#2626261A] rounded-lg p-4 border border-[#EAECF0] space-y-2">
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
                {hierarchicalNumbers.main} - {activeQuestion?.main_section_name}
              </h2>
              <p className="text-sm font-medium text-[#667085]">
                {activeQuestion?.main_section_description ||
                  (activeQuestion?.main_section_name ===
                  "Non-Discrimination commitment"
                    ? "Tell us about your organisation and its basic structure"
                    : "Review and provide answers for this section.")}
              </p>
            </div>

            <div className="bg-white border border-[#EAECF0] rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-125">
              <div className="p-4 flex-1 space-y-5">
                <div className="space-y-4 mb-4">
                  <div className="pb-6 border-b border-[#E6E6E6] flex items-center justify-between">
                    <h3 className="text-lg font-bold text-zinc-900">
                      {hierarchicalNumbers.sub} -{" "}
                      {activeQuestion?.sub_section_name ||
                        activeQuestion?.section_name}
                    </h3>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-[#F2F4F7] rounded-full flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-[#667085]">
                        Q:{activeQuestionIndex + 1}
                      </span>
                    </div>
                    <h4 className="text-[17px] font-bold text-zinc-900 leading-snug pt-2">
                      {activeQuestion?.question_text}
                      {activeQuestion?.is_compulsory && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </h4>
                  </div>
                </div>

                <div className="space-y-10 pl-14 relative">
                  {activeQuestion?.question_type === "boolean" && (
                    <div className="grid grid-cols-1 gap-6 max-w-3xl">
                      {["Yes", "No"].map((opt) => {
                        const isSelected =
                          activeQuestion.response_value === opt;
                        const helpText =
                          opt === "Yes"
                            ? "If you select Yes, Document is required"
                            : "If you select No, May affect certification score";

                        return (
                          <div key={opt} className="space-y-2">
                            <button
                              onClick={() => handleResponseChange(opt)}
                              className={`w-full flex items-center gap-4 p-5 rounded-xl border transition-all text-left ${
                                isSelected
                                  ? "border-zinc-900 bg-white ring-1 ring-zinc-900"
                                  : "border-[#EAECF0] bg-[#F9FAFB] hover:border-[#D0D5DD]"
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? "border-zinc-900"
                                    : "border-[#D0D5DD] bg-white"
                                }`}
                              >
                                {isSelected && (
                                  <div className="w-2.5 h-2.5 bg-zinc-900 rounded-full" />
                                )}
                              </div>
                              <span className="text-[17px] font-bold text-zinc-900">
                                {opt}
                              </span>
                            </button>
                            <p className="text-[13px] font-medium text-[#667085] pl-1">
                              {helpText}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(activeQuestion?.question_type === "file" ||
                    activeQuestion?.question_type === "pdf") && (
                    <div
                      onClick={() =>
                        !isFileUploading && fileInputRef.current?.click()
                      }
                      className="border-2 border-dashed border-[#D0D5DD] rounded-2xl p-12 flex flex-col items-center text-center space-y-4 hover:bg-[#F9FAFB] transition-all cursor-pointer group"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".pdf,.docx,.doc,.xls,.xlsx"
                        onChange={(e) =>
                          handleFileUpload(e.target.files?.[0] || null)
                        }
                      />
                      <div className="w-12 h-12 flex items-center justify-center">
                        {isFileUploading ? (
                          <Loader2 className="w-8 h-8 text-[#98A2B3] animate-spin" />
                        ) : (
                          <Upload className="w-8 h-8 text-[#98A2B3]" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[17px] font-medium text-[#475467]">
                          {activeQuestion.response_value
                            ? "File Selected"
                            : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-xs font-normal text-[#98A2B3]">
                          PDF, DOC, DOCX, XLS, XLSX (max 10MB)
                        </p>
                      </div>
                      {activeQuestion.response_value && (
                        <div className="mt-4 flex items-center justify-between gap-3 p-3 bg-white border border-[#EAECF0] rounded-xl shadow-sm w-full max-w-md mx-auto group/file">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-5 h-5 text-[#98A2B3] shrink-0" />
                            <span className="text-sm font-medium text-[#344054] truncate">
                              {activeQuestion.response_value.split("/").pop()}
                            </span>
                          </div>
                          <button
                            onClick={handleDeleteFile}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="w-full max-w-3xl mb-0">
                    <textarea
                      className="w-full min-h-40 p-6 bg-[#F9FAFB] border border-[#EAECF0] rounded-xl resize-none text-[15px] font-medium text-zinc-900 placeholder:text-[#98A2B3] focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all"
                      placeholder="Enter your answer"
                      value={
                        activeQuestion?.ai_description ||
                        (activeQuestion?.question_type === "text"
                          ? activeQuestion.response_value
                          : "") ||
                        ""
                      }
                      onChange={(e) => {
                        handleDescriptionChange(e.target.value);
                        if (activeQuestion.question_type === "text")
                          handleResponseChange(e.target.value);
                      }}
                    />
                    {showAiButton && (
                      <div className="mt-3 flex flex-wrap items-start justify-end gap-2">
                        <AnimatePresence>
                          {saveStatus === "error" && (
                            <motion.div
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 6 }}
                              className="w-full rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] px-3 py-2 sm:mr-auto sm:w-auto"
                            >
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-red-600">
                                    Save
                                  </span>
                                  <span className="text-xs font-medium text-red-500">
                                    Unable to save your answer. Please try
                                    again.
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <button
                          onClick={fetchAiSuggestions}
                          className="ml-auto p-2.5 bg-white hover:bg-zinc-50 rounded-lg shadow-sm transition-colors group"
                          title="AI Suggestions"
                        >
                          <Sparkles className="w-7 h-7 text-zinc-900 group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-white border-t border-[#EAECF0] flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex w-full md:w-auto">
                  <button
                    onClick={handleBack}
                    className={`px-12 h-14 bg-white border border-[#D0D5DD] rounded-2xl font-bold text-zinc-900 hover:bg-zinc-50 transition-all text-[15px] whitespace-nowrap shadow-sm ${
                      activeQuestionIndex === 0
                        ? "invisible pointer-events-none"
                        : "visible"
                    }`}
                  >
                    Back
                  </button>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                  <Button
                    onClick={handleSkip}
                    className="w-full md:w-auto px-10 h-14 bg-[#F2F4F7] hover:bg-[#EAECF0] text-[#344054] rounded-2xl border-none whitespace-nowrap font-bold text-[15px]"
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={handleSaveExit}
                    disabled={saveStatus === "saving" || !canSaveAndNext}
                    className="w-full md:w-auto px-10 h-14 bg-white border border-[#D0D5DD] rounded-2xl font-bold text-zinc-900 hover:bg-zinc-50 transition-all text-[15px] whitespace-nowrap shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExiting && saveStatus === "saving" ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Save & Exit"
                    )}
                  </Button>
                  <Button
                    onClick={handleSaveNext}
                    disabled={saveStatus === "saving" || !canSaveAndNext}
                    className={`w-full md:w-auto px-10 h-14 rounded-2xl shadow-[0px_4px_12px_rgba(0,0,0,0.1)] min-w-48 whitespace-nowrap font-bold text-[16px] flex items-center justify-center gap-2 transition-all ${
                      !canSaveAndNext
                        ? "bg-zinc-300 cursor-not-allowed text-zinc-500 shadow-none hover:bg-zinc-300"
                        : "bg-[#1A1A1A] hover:bg-black text-white"
                    }`}
                  >
                    {!isExiting && saveStatus === "saving" ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : saveStatus === "success" ? (
                      <>
                        <Check className="w-5 h-5" />
                        <span>Saved</span>
                      </>
                    ) : (
                      "Save & Next"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white rounded-4xl w-full max-w-2xl h-125 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 pb-0 text-center space-y-3 bg-primary/50 shrink-0">
                <h2 className="text-2xl font-semibold text-zinc-900 tracking-tight">
                  AI Suggestions
                </h2>
                <p className="text-gray-400 font-medium text-base">
                  Here are AI suggestion answers for you
                </p>
              </div>
              <div className="px-8 py-2 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                {isAiLoading ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 text-zinc-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="font-semibold tracking-widest text-[10px]">
                      Synthesizing intelligence...
                    </p>
                  </div>
                ) : filteredSuggestions.length > 0 ? (
                  <div className="py-2 grid grid-cols-1 gap-3">
                    {filteredSuggestions.map((suggestion, idx) => {
                      const isSelected = selectedAiValue === suggestion;
                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedAiValue(suggestion)}
                          className={`form-dropdown-item h-auto py-4 group cursor-ponter ${
                            isSelected
                              ? "form-dropdown-item-active"
                              : "form-dropdown-item-inactive"
                          }`}
                        >
                          <p
                            className={`text-sm leading-relaxed ${
                              isSelected ? "text-secondary" : "text-secondary"
                            }`}
                          >
                            "{suggestion}"
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-gray-300 font-semibold text-sm">
                    No specific AI data found for this context.
                  </div>
                )}
              </div>
              <div className="p-8 flex gap-4 mx-auto w-full max-w-md">
                <Button
                  onClick={() => setShowAiModal(false)}
                  className="flex-1 h-12 w-full max-w-50 bg-white border-2 border-secondary text-secondary rounded-xl hover:bg-gray-100"
                >
                  Close
                </Button>
                <Button
                  onClick={applyAiSuggestion}
                  disabled={!selectedAiValue}
                  className="flex-1 h-12 w-full max-w-50 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-black shadow-xl text-sm"
                >
                  Done
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAiReviewModal && aiReviewResult && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="bg-white rounded-[56px] w-full max-w-4xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-8 pb-6 text-center border-b border-gray-100 bg-primary/50">
                <div className="space-y-4">
                  {assessmentScoreResult && (
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative">
                        <span className="text-6xl font-semibold text-zinc-900 tracking-tighter">
                          {assessmentScoreResult.score}
                          <span className="text-2xl ml-0.5 opacity-40">%</span>
                        </span>
                      </div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em] mt-1">
                        Overall Assessment Score
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 justify-center items-center">
                    <div className="px-3 py-1 bg-[#1A1A1A] text-white rounded-md font-semibold text-[9px] tracking-widest uppercase">
                      Status:{" "}
                      {assessmentScoreResult?.score
                        ? "Completed"
                        : aiReviewResult.review_status?.replace("_", " ")}
                    </div>
                    <div
                      className={`px-3 py-1 rounded-md font-semibold text-[9px] tracking-widest uppercase ${aiReviewResult.total_flags > 0 ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}
                    >
                      Flags: {aiReviewResult.total_flags}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <div className="bg-zinc-50 border border-gray-100 rounded-2xl p-6 space-y-1.5">
                  <p className="text-[9px] font-semibold text-gray-400 tracking-widest uppercase">
                    Summary Review
                  </p>
                  <p className="text-lg font-bold text-zinc-800 leading-snug">
                    "{aiReviewResult.review_description}"
                  </p>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[9px] font-semibold text-gray-400 tracking-widest px-1 uppercase">
                    Detailed Response Analysis
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {aiReviewResult.responses.map((resp) => (
                      <div
                        key={resp.id}
                        className={`p-5 border border-gray-100 rounded-2xl transition-all ${resp.is_flagged ? "bg-red-50/10" : "bg-white"}`}
                      >
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-semibold text-gray-400 tracking-widest uppercase">
                              {resp.question_type} • Confidence{" "}
                              {resp.confidence_score}%
                            </p>
                            <h4 className="font-bold text-zinc-900 leading-tight text-sm">
                              {resp.question_text}
                            </h4>
                          </div>
                          {resp.is_flagged ? (
                            <div className="p-1.5 bg-red-100 rounded-lg text-red-600">
                              <AlertCircle className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <div className="p-3 bg-primary/50 border border-gray-100 rounded-xl">
                            <p className="text-[8px] font-semibold text-gray-400 tracking-widest mb-1 uppercase">
                              Your Answer
                            </p>
                            <p className="text-[12px] font-medium text-zinc-800 line-clamp-2">
                              {resp.response_value || "N/A"}
                            </p>
                          </div>
                          <div
                            className={`p-3 border rounded-xl ${resp.is_flagged ? "border-red-100 bg-red-50/30" : "border-gray-100 bg-primary/30"}`}
                          >
                            <p className="text-[8px] font-semibold text-gray-400 tracking-widest mb-1 uppercase">
                              AI Feedback
                            </p>
                            <p className="text-[12px] font-medium text-zinc-700 leading-snug">
                              {resp.response}
                            </p>
                            {resp.is_flagged && (
                              <p className="text-[8px] font-semibold text-red-500 mt-1.5 uppercase">
                                Reason: {resp.flag_reason}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-100 flex gap-3 bg-primary/50">
                <Button
                  onClick={() => router.push(`${base}`)}
                  className="flex-1 h-12 bg-white border border-gray-200 text-zinc-800 font-semibold rounded-xl hover:bg-gray-50 transition-all text-xs"
                >
                  Back to Dashboard
                </Button>
                <Button
                  onClick={() => router.push(`${base}/certificate`)}
                  className="flex-1 h-12 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-black shadow-xl shadow-zinc-900/20 text-xs"
                >
                  Get Another Certificate
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-lg">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-4xl w-full max-w-lg shadow-2xl p-8 text-center space-y-6 relative overflow-hidden"
            >
              <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-zinc-50/30">
                <div className="text-4xl animate-bounce">🎊</div>
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">
                  Assessment Ready
                </h2>
                <p className="text-gray-400 font-medium text-xs leading-relaxed max-w-70 mx-auto">
                  Excellent work! Your responses are ready. Finalize your
                  certification by submitting for review.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { l: "Status", v: assessmentScoreResult?.status || "Done" },
                  {
                    l: "Score",
                    v: assessmentScoreResult?.score
                      ? `${assessmentScoreResult.score}%`
                      : "Pending",
                  },
                  {
                    l: "Badge",
                    v: assessmentScoreResult?.badge_name || "Locked",
                  },
                ].map((x) => (
                  <div
                    key={x.l}
                    className="bg-gray-50 border border-gray-100 rounded-2xl p-3"
                  >
                    <p className="text-[9px] font-semibold text-gray-400  tracking-widest">
                      {x.l}
                    </p>
                    <p className="text-sm font-semibold text-zinc-900">{x.v}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <Button
                  onClick={handleSubmitAll}
                  className="w-full h-12 bg-zinc-900 hover:bg-black text-white font-semibold rounded-xl shadow-xl shadow-zinc-900/40 text-sm whitespace-nowrap"
                >
                  Submit Assessment
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => setShowSuccessModal(false)}
                    className="h-12 bg-white border border-gray-200 text-zinc-900 font-semibold rounded-xl hover:bg-gray-50 text-sm whitespace-nowrap"
                  >
                    Review Answers
                  </Button>
                  <Button
                    onClick={() => setShowQuitWarning(true)}
                    className="h-12 bg-white border border-gray-200 text-zinc-400 font-semibold rounded-xl hover:text-primary text-sm whitespace-nowrap"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quit Warning */}
      <AnimatePresence>
        {showQuitWarning && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl w-full max-w-sm p-8 text-center space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-semibold text-zinc-900">
                  Are you sure?
                </h3>
                <p className="text-gray-400 font-medium text-sm">
                  Unsubmitted answers will be lost. You can resume later from
                  where you left off if questions were saved.
                </p>
              </div>
              <div className="flex flex-col gap-2.5">
                <Button
                  onClick={() => {
                    localStorage.removeItem("pending_assessment_ids");
                    router.push(base);
                  }}
                  className="h-12 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl shadow-lg text-sm whitespace-nowrap"
                >
                  Yes, Quit Now
                </Button>
                <Button
                  onClick={() => setShowQuitWarning(false)}
                  className="h-12 bg-white border border-gray-200 text-zinc-900 hover:text-primary font-semibold rounded-xl text-sm whitespace-nowrap"
                >
                  No, Keep Working
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Message Modal */}
      <AnimatePresence>
        {messageModal.show && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
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
                    : messageModal.type === "success"
                      ? "bg-blue-50 text-blue-500"
                      : "bg-blue-50 text-blue-500"
                }`}
              >
                {messageModal.type === "error" ? (
                  <AlertCircle className="w-8 h-8" />
                ) : messageModal.type === "success" ? (
                  <Check className="w-8 h-8" />
                ) : (
                  <HelpCircle className="w-8 h-8" />
                )}
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-semibold text-zinc-900">
                  {messageModal.title}
                </h3>
                <p className="text-gray-400 font-medium text-sm">
                  {messageModal.message}
                </p>
              </div>
              <Button
                onClick={() => {
                  if (messageModal.onConfirm) {
                    messageModal.onConfirm();
                  }
                  setMessageModal((prev) => ({ ...prev, show: false }));
                }}
                className={`w-full h-12 font-semibold rounded-xl text-sm ${
                  messageModal.type === "error"
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : messageModal.type === "success"
                      ? "bg-zinc-900 hover:bg-black text-white"
                      : "bg-zinc-900 hover:bg-black text-white"
                }`}
              >
                {messageModal.buttonText || "Got it"}
              </Button>
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
    </div>
  );
}

