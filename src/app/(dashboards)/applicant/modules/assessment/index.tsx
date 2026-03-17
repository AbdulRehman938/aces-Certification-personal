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
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useState, useEffect, useMemo, useRef } from "react";
import { axiosInstance } from "@/lib/axios";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { RxCross2 } from "react-icons/rx";
import {
  saveAnswers,
  getAnswers,
  clearAnswers,
} from "@/lib/assessment-db";

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
  hint?: string;
  certificate_question_number?: number;
  conditions?: Record<string, {
    rank?: number;
    redirect_type?: string;
    target_id?: string;
    target_name?: string;
    [key: string]: any;
  }>;
  options?: string[];
  boolean_conditions?: Array<{
    response_value: string;
    parent_type: string;
    parent_id?: string;
    parent_name?: string;
    question_id?: string;
    section_id?: string;
    sub_section_id?: string;
    main_section_rank?: number;
    certificate_question_number?: number;
    target_id?: string;
    redirect_type?: string;
    target_name?: string;
    section_rank?: number;
    sub_section_rank?: number;
    [key: string]: any;
  }>;
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
  const [flaggedQuestions, setFlaggedQuestions] = useState<any[]>([]);
  const [showFlagsModal, setShowFlagsModal] = useState(false);

  const [isFileUploading, setIsFileUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [urlToOriginalName, setUrlToOriginalName] = useState<
    Record<string, string>
  >({});

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

  useEffect(() => {
    if (assessment && questions.length > 0) {
      saveAnswers(assessment.id, questions);
    }
  }, [questions, assessment]);

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
          "[Assessment] Could not load extra details, continuing with questions...",
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
      const fetchedQuestions = rawQuestions.map((q: any) => {
        let defaultVal: any = "";
        if (q.question_type === "boolean") defaultVal = null;
        else if (q.question_type === "checkbox") defaultVal = [];
        
        let responseValue = (q.response_value !== null && q.response_value !== undefined) 
          ? q.response_value 
          : defaultVal;

        if (q.question_type === "checkbox" && typeof responseValue === "string" && responseValue.startsWith("[")) {
          try {
            responseValue = JSON.parse(responseValue);
          } catch (e) {
            responseValue = [];
          }
        }

        return {
          ...q,
          response_value: responseValue,
          answer_id: q.answer_id || null,
        };
      });

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

      // Load saved answers from IndexedDB and merge
      const savedData = await getAnswers(assessmentId);
      const mergedQuestions = fetchedQuestions.map((fq: any) => {
        const savedQ = savedData?.answers?.find((sq: any) => sq.id === fq.id);
        if (savedQ) {
          return {
            ...fq,
            response_value: savedQ.response_value,
            ai_description: savedQ.ai_description,
            answer_id: savedQ.answer_id || fq.answer_id,
          };
        }
        return fq;
      });

      setQuestions(mergedQuestions);

      if (mergedQuestions.length > 0) {
        // Try to find where the user left off
        const firstUndone = mergedQuestions.findIndex((q: { answer_id: any; }) => !q.answer_id);
        const startIndex = firstUndone !== -1 ? firstUndone : 0;
        
        setActiveQuestionIndex(startIndex);
        setExpandedMainSections([mergedQuestions[startIndex].main_section_name]);
      }

      const storedNames = localStorage.getItem(`file_names_${assessmentId}`);
      if (storedNames) {
        try {
          setUrlToOriginalName(JSON.parse(storedNames));
        } catch (e) {
          console.error("Failed to parse stored file names", e);
        }
      }

      setLoadingProgress(100);

      try {
        const flagsRes = await axiosInstance.get(
          `/assessments/${assessmentId}/flagged-questions`,
        );
        if (flagsRes.data?.success) {
          setFlaggedQuestions(flagsRes.data.data || []);
          if ((flagsRes.data.data || []).length > 0) {
            setShowFlagsModal(true);
          }
        }
      } catch (flagErr) {
        console.warn("Could not fetch flagged questions", flagErr);
      }

      setTimeout(() => setIsLoading(false), 800);
    } catch (err: any) {
      console.error("Assessment Init Error:", err);
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
    const type = activeQuestion.question_type;

    if (type === "boolean") {
      const v = String(val).toLowerCase();
      return v === "yes" || v === "no";
    }
    
    if (type === "text") {
      return !!val && typeof val === "string" && val.trim() !== "";
    }

    if (type === "checkbox") {
      return Array.isArray(val) ? val.length > 0 : !!val;
    }

    if (type === "rating" || type === "number" || type === "multiple_choice") {
      return val !== null && val !== undefined && val !== "";
    }

    return !!val;
  }, [activeQuestion]);

  const handleResponseChange = (value: any) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const currentQ = updated[activeQuestionIndex];
      
      let newValue = value;
      if (currentQ.question_type === "checkbox") {
        const currentArr = Array.isArray(currentQ.response_value) ? currentQ.response_value : [];
        if (currentArr.includes(value)) {
          newValue = currentArr.filter((v: any) => v !== value);
        } else {
          newValue = [...currentArr, value];
        }
      }

      updated[activeQuestionIndex] = {
        ...currentQ,
        response_value: newValue,
      };
      return updated;
    });

    const valStr = String(value).toLowerCase();

    // 1. Check for immediate Jump-style 'end' condition in local state
    const currentQConditions = activeQuestion?.conditions || {};
    const matchedEnd = Object.entries(currentQConditions).find(
      ([key, cond]) => key.toLowerCase() === valStr && cond?.redirect_type?.toLowerCase() === "end"
    );

    if (matchedEnd) {
      console.log("[Assessment] Local 'end' condition matched for:", valStr);
      setShowSuccessModal(true);
      return;
    }

    // 2. Handle legacy boolean_conditions
    if (activeQuestion?.question_type === "boolean" && activeQuestion.boolean_conditions) {
      const condition = activeQuestion.boolean_conditions.find(
        (c) => c.response_value.toLowerCase() === valStr
      );
      if (condition) {
        if (condition.redirect_type?.toLowerCase() === "end") {
          setShowSuccessModal(true);
        } else {
          handleJump(condition);
        }
        return;
      }
    }

    // 3. For boolean questions, proactively ask the Jump API if there's an immediate redirect (dynamic check)
    if (activeQuestion?.question_type === "boolean" && !activeQuestion.boolean_conditions && !activeQuestion.conditions) {
       handleJump({ question_id: activeQuestion.id, response_value: value });
    }
  };

  const handleJump = async (params: Record<string, any>) => {
    if (!assessment?.certificate_id || !questions.length) return false;

    // If the condition explicitly says to end, open the submit modal
    if (params.redirect_type === "end") {
      setShowSuccessModal(true);
      return true;
    }

    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== "response_value") {
          queryParams.append(key, value.toString());
        }
      });

      const jumpUrl = `/certificates/${assessment.certificate_id}/jump?${queryParams.toString()}`;
      console.log("[Assessment] Performing jump request:", jumpUrl);
      
      const res = await axiosInstance.get(jumpUrl);

      if (res.data?.success) {
        const jumpData = res.data.data;

        // Check if the landing question/state leads to an immediate end
        if (params.response_value && jumpData.question?.conditions) {
          const selectedOption = String(params.response_value).toLowerCase();
          const condition = jumpData.question.conditions[selectedOption];
          if (condition?.redirect_type === "end") {
            setShowSuccessModal(true);
            return true;
          }
        }

        let targetQuestionId = null;

        if (jumpData.target_type === "question" && jumpData.question) {
          targetQuestionId = jumpData.question.id;
        } else if (jumpData.target_type === "section" && (jumpData.section?.questions?.length > 0 || jumpData.questions?.length > 0)) {
          const sectionQuestions = jumpData.section?.questions || jumpData.questions;
          targetQuestionId = sectionQuestions[0].id;
        } else if (jumpData.target_type === "sub_section" && (jumpData.sub_section?.questions?.length > 0 || jumpData.questions?.length > 0)) {
          const subSectionQuestions = jumpData.sub_section?.questions || jumpData.questions;
          targetQuestionId = subSectionQuestions[0].id;
        } else if (jumpData.target_type === "main_section") {
           if (jumpData.main_section?.sections?.length > 0) {
              const firstSec = jumpData.main_section.sections[0];
              if (firstSec.sub_sections?.length > 0) {
                 targetQuestionId = firstSec.sub_sections[0].questions?.[0]?.id;
              } else if (firstSec.questions?.length > 0) {
                 targetQuestionId = firstSec.questions[0].id;
              }
           }
        }

        if (targetQuestionId) {
          const index = questions.findIndex((q) => q.id === targetQuestionId);
          if (index !== -1) {
            setActiveQuestionIndex(index);
            const targetQ = questions[index];
            setExpandedMainSections((prev) =>
              prev.includes(targetQ.main_section_name)
                ? prev
                : [...prev, targetQ.main_section_name],
            );
            return true;
          }
        }
      }
    } catch (err) {
      console.error("[Assessment] Jump API failed:", err);
    }
    return false;
  };

  const moveToNext = async (
    currentQuestions: Question[],
    currentDrafts: string[],
    currentSkips: string[],
  ) => {
    const currentQ = currentQuestions[activeQuestionIndex];
    if (!currentQ || !assessment) return;

    const valStr = String(currentQ.response_value || "").toLowerCase();

    try {
      // Always consult the Jump API for current question metadata to get latest conditions/navigation
      console.log("[Assessment] Consulting Jump API for next destination from question:", currentQ.id);
      const currentJumpRes = await axiosInstance.get(
        `/certificates/${assessment.certificate_id}/jump?question_id=${currentQ.id}`
      );

      if (currentJumpRes.data?.success) {
        const jumpData = currentJumpRes.data.data;
        const qData = jumpData.question;
        const nav = jumpData.navigation;

        console.log("[Assessment] Jump API Response Data:", jumpData);

        // Robust check for 'end' redirect in jump response conditions
        const qConditions = qData?.conditions || {};
        const matchedCondition = Object.entries(qConditions).find(
          ([key]) => key.toLowerCase() === valStr
        )?.[1] as any;

        if (matchedCondition?.redirect_type?.toLowerCase() === "end") {
          console.log("[Assessment] Jump API confirmed 'end' redirect for value:", valStr);
          setShowSuccessModal(true);
          return;
        }

        // Check if current Jump API navigation suggests a specific next question
        if (nav?.next) {
          console.log("[Assessment] Jump API suggested next question number:", nav.next);
          const jumped = await handleJump({ certificate_question_number: nav.next });
          if (jumped) return;
        }
      }
    } catch (err) {
      console.error("[Assessment] Jump-based navigation error:", err);
    }

    // Fallback to local logic if Jump API doesn't resolve a path
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

  const handleSaveNext = async () => {
    if (!activeQuestion || !assessment) return;

    if (!canSaveAndNext) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return;
    }

    setSaveStatus("saving");
    try {
      // Create a local completion marker
      const updatedAnswerId = activeQuestion.answer_id || "local_done_" + Date.now();
      
      const newQuestions = [...questions];
      newQuestions[activeQuestionIndex] = {
        ...newQuestions[activeQuestionIndex],
        answer_id: updatedAnswerId,
      };

      setQuestions(newQuestions);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 1000);

      setTimeout(async () => {
        await moveToNext(newQuestions, draftedQuestionIds, skippedQuestionIds);
      }, 500);
    } catch (e: any) {
      console.error("Failed to update status locally:", e);
      setSaveStatus("error");
    }
  };

  const [isExiting, setIsExiting] = useState(false);

  const handleSaveExit = async () => {
    if (!activeQuestion || !assessment || !canSaveAndNext) return;

    setIsExiting(true);
    setSaveStatus("saving");
    try {
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
      console.error("Save & Exit error:", e);
      setSaveStatus("error");
      setIsExiting(false);
    }
  };

  const handleSkip = async () => {
    if (activeQuestion?.is_compulsory) {
      showMessage(
        "Required Question",
        "This question is compulsory and cannot be skipped. Please provide a response.",
        "error",
      );
      return;
    }
    const newSkips = [...skippedQuestionIds, activeQuestion.id];
    setSkippedQuestionIds(newSkips);
    await moveToNext(questions, draftedQuestionIds, newSkips);
  };

  const handleSaveDraft = async () => {
    if (!draftedQuestionIds.includes(activeQuestion.id)) {
      const newDrafts = [...draftedQuestionIds, activeQuestion.id];
      setDraftedQuestionIds(newDrafts);
      await moveToNext(questions, newDrafts, skippedQuestionIds);
    } else {
      await moveToNext(questions, draftedQuestionIds, skippedQuestionIds);
    }
  };

  const handleBack = () => {
    setActiveQuestionIndex((prev) => Math.max(0, prev - 1));
  };

  const handleFileUpload = async (files: FileList | File | null) => {
    if (!files) return;

    const fileList = files instanceof FileList ? Array.from(files) : [files];
    if (fileList.length === 0) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    const maxSize = 10 * 1024 * 1024;

    const invalidFile = fileList.find(
      (file) => !allowedTypes.includes(file.type),
    );
    if (invalidFile) {
      showMessage(
        "Invalid File Type",
        `File "${invalidFile.name}" has an invalid type. Only PDF, DOCX, and Excel files (max 10MB) are allowed.`,
      );
      return;
    }

    const largeFile = fileList.find((file) => file.size > maxSize);
    if (largeFile) {
      showMessage("File Too Large", `File "${largeFile.name}" exceeds 10MB.`);
      return;
    }

    try {
      setIsFileUploading(true);
      const newUrls: string[] = [];

      for (const file of fileList) {
        const isDuplicate = Object.values(urlToOriginalName).some(
          (name) => name.toLowerCase() === file.name.toLowerCase(),
        );

        if (isDuplicate) {
          showMessage(
            "Duplicate Filename",
            `A file named "${file.name}" has already been uploaded. Please rename the file or upload a different one.`,
            "error",
          );
          continue;
        }

        const formData = new FormData();
        formData.append("document", file);

        const response = await axiosInstance.post<{
          url: string;
        }>("/uploads/documents", formData);

        const url = response.data?.url;
        if (url) {
          newUrls.push(url);
          console.log("File uploaded successfully:", url);

          const updatedMapping = { ...urlToOriginalName, [url]: file.name };
          setUrlToOriginalName(updatedMapping);
          if (assessment) {
            localStorage.setItem(
              `file_names_${assessment.id}`,
              JSON.stringify(updatedMapping),
            );
          }
        }
      }

      if (newUrls.length > 0) {
        const currentVal = activeQuestion?.response_value || "";
        const updatedVal = currentVal
          ? `${currentVal},${newUrls.join(",")}`
          : newUrls.join(",");
        handleResponseChange(updatedVal);
      }
    } catch (error: any) {
      console.error("Failed to upload document:", error);
      showMessage(
        "Upload Failed",
        error?.response?.data?.message ||
          "Failed to upload document. Please try again.",
      );
    } finally {
      setIsFileUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = (urlToDelete: string) => {
    const currentVal = activeQuestion?.response_value || "";
    const updatedVal = currentVal
      .split(",")
      .filter((url: string) => url !== urlToDelete)
      .join(",");
    handleResponseChange(updatedVal);

    const updatedMapping = { ...urlToOriginalName };
    delete updatedMapping[urlToDelete];
    setUrlToOriginalName(updatedMapping);
    if (assessment) {
      localStorage.setItem(
        `file_names_${assessment.id}`,
        JSON.stringify(updatedMapping),
      );
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
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
    if (selectedAiValue && activeQuestion?.question_type === "text") {
      handleResponseChange(selectedAiValue);
      handleDescriptionChange(selectedAiValue);
      setShowAiModal(false);
      setSelectedAiValue(null);
    }
  };

  const handleSubmitAll = async () => {
    if (!assessment) return;
    setShowSuccessModal(false);
    setIsLoading(true);
    setLoadingProgress(30);
    try {
      // 1. Collect all answers from local state
      const answersPayload = questions
        .filter((q) => {
          const val = q.response_value;
          return val !== null && val !== "" && (Array.isArray(val) ? val.length > 0 : true);
        })
        .map((q) => {
          const type = q.question_type === "file" ? "pdf" : q.question_type;
          
          if (type === "pdf") {
            const files = typeof q.response_value === "string" 
              ? q.response_value.split(",").filter(Boolean)
              : Array.isArray(q.response_value) ? q.response_value : [];
            
            return {
              question_id: q.id,
              response_type: "pdf",
              response_files: files,
              response_value: files[0] || "" // Optional primary URL
            };
          }

          let val = q.response_value;
          if (type === "boolean" && typeof val === "string") {
            val = val.toLowerCase() === "yes" ? "yes" : "no";
          } else if (type === "checkbox") {
            val = JSON.stringify(Array.isArray(val) ? val : [val]);
          } else if (["number", "rating", "multiple_choice"].includes(type)) {
            val = String(val);
          }

          return {
            question_id: q.id,
            response_type: type,
            response_value: val
          };
        });

      console.log("Bulk saving answers:", answersPayload);
      setLoadingProgress(50);
      
      // 2. Bulk save answers
      if (answersPayload.length > 0) {
        await axiosInstance.post(`/assessments/${assessment.id}/answers`, {
          answers: answersPayload
        });
      }

      console.log("Submitting assessment to AI:");
      setLoadingProgress(80);
      
      // 3. Final submission
      await axiosInstance.post(`/assessments/${assessment.id}/submit`);
      
      // 4. Clear local cache
      await clearAnswers(assessment.id);

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
      console.error("Submission Process Error:", err);
      setIsLoading(false);
      showMessage(
        "Submission Error",
        err?.response?.data?.message ||
          "Error during submission. Please try again.",
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
      <div className="flex h-screen bg-white font-sans overflow-hidden">
        <aside className="w-90 border-r border-[#F0F0F0] flex flex-col bg-white shrink-0">
          <div className="p-6 border-b border-[#F0F0F0] space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="flex-1 p-6 space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <div className="pl-4 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col bg-white overflow-y-auto">
          <div className="max-w-4xl mx-auto w-full p-8 lg:p-12 space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>

            <div className="space-y-4 pt-8">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>

            <div className="flex justify-between pt-12">
              <Skeleton className="h-12 w-32 rounded-xl" />
              <div className="flex gap-4">
                <Skeleton className="h-12 w-32 rounded-xl" />
                <Skeleton className="h-12 w-48 rounded-xl" />
              </div>
            </div>
          </div>
        </main>
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
                                    isSectionDone || isActive
                                      ? "border-[#1A1A1A] bg-zinc-900"
                                      : "border-[#D4D4D4] group-hover/item:border-[#A3A3A3]"
                                  } ${isSectionDone && !isActive ? "bg-zinc-900" : ""}`}
                                >
                                  {isSectionDone ? (
                                    <Check className="w-2.5 h-2.5 text-white stroke-3" />
                                  ) : isActive ? (
                                    <div className="w-2 h-2 bg-white rounded-full" />
                                  ) : null}
                                </div>
                                <span
                                  className={`text-[12px] font-medium text-left transition-colors truncate ${
                                    isActive
                                      ? "text-[#1A1A1A] font-bold"
                                      : isSectionDone
                                        ? "text-[#1A1A1A]"
                                        : "text-[#666666] group-hover/item:text-[#1A1A1A]"
                                  }`}
                                >
                                  {section.name}
                                </span>
                                {section.questions.some((sq) =>
                                  flaggedQuestions.some(
                                    (fq) => fq.id === sq.id,
                                  ),
                                ) && (
                                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                                )}
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
                    <button
                      onClick={fetchAiSuggestions}
                      className="p-2.5 bg-white hover:bg-zinc-50 rounded-lg shadow-sm border border-gray-100 transition-all group"
                      title="Get AI Guidance"
                    >
                      <Sparkles className="w-5 h-5 text-zinc-900 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>

                  {flaggedQuestions.some(
                    (fq) => fq.id === activeQuestion?.id,
                  ) &&
                    (() => {
                      const flag = flaggedQuestions.find(
                        (fq) => fq.id === activeQuestion?.id,
                      );
                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-4 bg-red-50 border border-red-100 rounded-xl mb-4 space-y-2 shadow-sm"
                        >
                          <div className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="w-4 h-4" />
                            <p className="text-[11px] font-bold uppercase tracking-wider">
                              Attention Required
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-red-800">
                              Flag Reason: {flag?.flag_reason}
                            </p>
                            {flag?.ai_suggestion && (
                              <p className="text-xs font-medium text-red-700 leading-relaxed italic">
                                AI Suggestion: "{flag.ai_suggestion}"
                              </p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })()}

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-[#F2F4F7] rounded-full flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-[#667085]">
                        Q:{activeQuestionIndex + 1}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 w-full pt-2">
                      <h4 className="text-[17px] font-bold text-zinc-900 leading-snug">
                        {activeQuestion?.question_text}
                        {activeQuestion?.is_compulsory && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </h4>
                      {activeQuestion?.hint && (
                        <p className="text-sm font-medium text-[#667085]">
                          Hint: {activeQuestion.hint}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-10 pl-14 relative">
                  {(activeQuestion?.question_type === "boolean" || 
                    activeQuestion?.question_type === "multiple_choice") && (
                    <div className="relative max-w-3xl">
                      <div className="grid grid-cols-1 gap-6">
                        {(activeQuestion?.question_type === "boolean" 
                          ? ["Yes", "No"] 
                          : (activeQuestion?.options || [])
                        ).map((opt) => {
                          const isSelected = activeQuestion?.response_value === opt;
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
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeQuestion?.question_type === "checkbox" && (
                    <div className="relative max-w-3xl">
                      <div className="grid grid-cols-1 gap-6">
                        {(activeQuestion?.options || []).map((opt: string) => {
                          const isSelected = Array.isArray(activeQuestion?.response_value) 
                            ? activeQuestion?.response_value.includes(opt)
                            : activeQuestion?.response_value === opt;
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
                                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                    isSelected
                                      ? "border-zinc-900 bg-zinc-900"
                                      : "border-[#D0D5DD] bg-white"
                                  }`}
                                >
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5 text-white" />
                                  )}
                                </div>
                                <span className="text-[17px] font-bold text-zinc-900">
                                  {opt}
                                </span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeQuestion?.question_type === "rating" && (
                    <div className="flex items-center gap-4">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() => handleResponseChange(String(num))}
                          className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-lg font-bold transition-all ${
                            String(activeQuestion.response_value) === String(num)
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-gray-200 hover:border-zinc-400"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeQuestion?.question_type === "number" && (
                    <div className="max-w-xs">
                      <input
                        type="number"
                        className="w-full p-4 bg-[#F9FAFB] border border-[#EAECF0] rounded-xl text-lg font-bold focus:ring-1 focus:ring-zinc-900 outline-none"
                        value={activeQuestion.response_value || ""}
                        onChange={(e) => handleResponseChange(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  )}

                  {(activeQuestion?.question_type === "file" ||
                    activeQuestion?.question_type === "pdf") && (
                    <div className="relative group max-w-3xl">
                      <div
                        onClick={() =>
                          !isFileUploading && fileInputRef.current?.click()
                        }
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center text-center space-y-4 transition-all cursor-pointer group ${
                          isDragging
                            ? "border-zinc-900 bg-zinc-50 scale-[1.01] shadow-md"
                            : "border-[#D0D5DD] hover:bg-[#F9FAFB]"
                        }`}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept=".pdf,.docx,.doc,.xls,.xlsx"
                          multiple
                          onChange={(e) => handleFileUpload(e.target.files)}
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
                              ? `${activeQuestion.response_value.split(",").length} File(s) Selected`
                              : "Click to upload or drag and drop"}
                          </p>
                          <p className="text-xs font-normal text-[#98A2B3]">
                            PDF, DOC, DOCX, XLS, XLSX (max 10MB)
                          </p>
                        </div>
                      </div>

                      {activeQuestion.response_value && (
                        <div className="mt-6 space-y-3 w-full max-w-3xl">
                          {activeQuestion.response_value
                            .split(",")
                            .map((fileUrl: string, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between gap-3 p-4 bg-white border border-[#EAECF0] rounded-xl shadow-sm group/file hover:border-zinc-300 transition-colors"
                              >
                                <div className="flex items-center gap-3 truncate">
                                  <FileText className="w-5 h-5 text-[#98A2B3] shrink-0" />
                                  <div className="flex flex-col truncate">
                                    <span className="text-sm font-semibold text-[#344054] truncate">
                                      {urlToOriginalName[fileUrl] ||
                                        fileUrl.split("/").pop()}
                                    </span>
                                    <span className="text-[10px] font-medium text-[#98A2B3]">
                                      Uploaded Document • {idx + 1}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFile(fileUrl);
                                  }}
                                  className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                  title="Remove file"
                                >
                                  <X className="w-4.5 h-4.5" />
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeQuestion?.question_type === "text" && (
                    <div className="w-full max-w-3xl mb-0 relative group">
                      <textarea
                        className="w-full min-h-40 p-6 bg-[#F9FAFB] border border-[#EAECF0] rounded-xl resize-none text-[15px] font-medium text-zinc-900 placeholder:text-[#98A2B3] focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all"
                        placeholder="Enter your answer"
                        value={activeQuestion?.response_value || ""}
                        onChange={(e) => {
                          handleResponseChange(e.target.value);
                          handleDescriptionChange(e.target.value);
                        }}
                      />
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
                      </div>
                    </div>
                  )}
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
                    disabled={activeQuestion?.is_compulsory}
                    className={`w-full md:w-auto px-10 h-14 rounded-2xl border-none whitespace-nowrap font-bold text-[15px] transition-all ${
                      activeQuestion?.is_compulsory
                        ? "bg-zinc-100 text-zinc-300 cursor-not-allowed opacity-50"
                        : "bg-[#F2F4F7] hover:bg-[#EAECF0] text-[#344054]"
                    }`}
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
              className="bg-white rounded-4xl w-full max-w-2xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 pb-4 text-center space-y-2 bg-white shrink-0 border-b border-zinc-50 relative">
                <h2 className="text-2xl font-semibold text-zinc-900 tracking-tight">
                  AI Suggestions
                </h2>
                <p className="text-gray-400 font-medium text-sm">
                  Here are AI suggestion answers for you
                </p>
                <button
                  onClick={() => setShowAiModal(false)}
                  className="absolute right-6 top-6 p-2 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <RxCross2 className="w-5 h-5 text-gray" />
                </button>
              </div>
              <div className="px-8 py-4 space-y-4 flex-1 overflow-y-auto scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                      const isTextType =
                        activeQuestion?.question_type === "text";
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (isTextType) setSelectedAiValue(suggestion);
                          }}
                          className={`form-dropdown-item h-auto py-4 group ${
                            isTextType ? "cursor-pointer" : "cursor-default"
                          } ${
                            isSelected
                              ? "form-dropdown-item-active"
                              : "form-dropdown-item-inactive"
                          }`}
                        >
                          <p className="text-sm leading-relaxed text-secondary">
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
              <div className="p-8 py-6 flex gap-4 mx-auto w-full max-w-md justify-center shrink-0 border-t border-zinc-50 bg-white">
                <Button
                  onClick={() => setShowAiModal(false)}
                  className={`${activeQuestion?.question_type === "text" ? "flex-1" : "w-full"} h-12 bg-white border-2 border-secondary text-secondary rounded-xl hover:bg-zinc-50 cursor-pointer`}
                >
                  Close
                </Button>
                {activeQuestion?.question_type === "text" && (
                  <Button
                    onClick={applyAiSuggestion}
                    disabled={!selectedAiValue}
                    className="flex-1 h-12 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-black shadow-xl text-sm cursor-pointer"
                  >
                    Done
                  </Button>
                )}
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
              className="bg-white rounded-[40px] w-full max-w-4xl shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-8 pb-6 text-center border-b border-gray-100 bg-white shrink-0">
                <div className="space-y-4">
                  {assessmentScoreResult && (
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative">
                        <span className="text-5xl font-semibold text-zinc-900 tracking-tighter">
                          {assessmentScoreResult.score}
                          <span className="text-xl ml-0.5 opacity-40">%</span>
                        </span>
                      </div>
                      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-[0.2em] mt-1">
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
                <button
                  onClick={() => setShowAiReviewModal(false)}
                  className="absolute right-8 top-8 p-2 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <RxCross2 className="w-6 h-6 text-gray" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {assessmentScoreResult?.score !== undefined &&
                  assessmentScoreResult.score < 50 && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-6 space-y-2">
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm font-bold uppercase tracking-wider">
                          Assessment Failed
                        </p>
                      </div>
                      <p className="text-sm font-medium text-red-800 leading-relaxed">
                        Your score of {assessmentScoreResult.score}% is below
                        the minimum passing criteria for this certificate. You
                        must restart the assessment to retry and improve your
                        score.
                      </p>
                    </div>
                  )}

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
              <div className="p-6 border-t border-gray-100 flex gap-3 bg-white shrink-0">
                <Button
                  onClick={() => router.push(`${base}`)}
                  className="flex-1 h-12 bg-white border border-gray-200 text-zinc-800 font-semibold rounded-xl hover:bg-gray-50 transition-all text-xs cursor-pointer"
                >
                  Back to Dashboard
                </Button>
                <Button
                  onClick={() => router.push(`${base}/certificate`)}
                  className={`flex-1 h-12 font-semibold rounded-xl text-xs transition-all cursor-pointer ${
                    assessmentScoreResult?.score !== undefined &&
                    assessmentScoreResult.score < 50
                      ? "bg-red-600 hover:bg-red-700 text-white shadow-red-900/20 shadow-xl"
                      : "bg-zinc-900 hover:bg-black text-white shadow-zinc-900/20 shadow-xl"
                  }`}
                >
                  {assessmentScoreResult?.score !== undefined &&
                  assessmentScoreResult.score < 50
                    ? "Restart Assessment"
                    : "Get Another Certificate"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Flagged Questions Modal */}
      <AnimatePresence>
        {showFlagsModal && flaggedQuestions.length > 0 && (
          <div className="fixed inset-0 z-[251] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-4xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-8 pb-4 text-center space-y-3 bg-red-50/50 shrink-0 border-b border-red-100">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 mb-2">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
                  Improvement Required
                </h2>
                <p className="text-gray-500 font-medium text-xs max-w-sm mx-auto">
                  Our AI team has flagged {flaggedQuestions.length} response
                  {flaggedQuestions.length > 1 ? "s" : ""} that need improvement
                  before your certification can be finalized.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {flaggedQuestions.map((fq, idx) => (
                  <div
                    key={fq.id}
                    className="p-4 bg-white border border-gray-100 rounded-2xl hover:border-red-200 transition-colors cursor-pointer group"
                    onClick={() => {
                      const qIdx = questions.findIndex((q) => q.id === fq.id);
                      if (qIdx !== -1) {
                        setActiveQuestionIndex(qIdx);
                        const q = questions[qIdx];
                        setExpandedMainSections((prev) =>
                          prev.includes(q.main_section_name)
                            ? prev
                            : [...prev, q.main_section_name],
                        );
                        setShowFlagsModal(false);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                          Question {idx + 1}
                        </p>
                        <h4 className="text-sm font-bold text-zinc-800 leading-snug group-hover:text-red-700 transition-colors">
                          {fq.question_text}
                        </h4>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-red-500 transition-colors shrink-0 mt-1" />
                    </div>
                    <div className="bg-red-50/50 rounded-xl p-3 border border-red-50">
                      <p className="text-[11px] font-semibold text-red-800 italic">
                        "{fq.flag_reason}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-gray-100 bg-white shrink-0">
                <Button
                  onClick={() => setShowFlagsModal(false)}
                  className="w-full h-12 bg-zinc-900 hover:bg-black text-white font-bold rounded-xl shadow-xl shadow-zinc-900/10 text-sm"
                >
                  Start Improving
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
              className="bg-white rounded-4xl w-full max-w-lg shadow-2xl relative overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="w-full flex-1 overflow-y-auto scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="p-8 text-center space-y-6">
                  <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-zinc-50/30">
                    <PartyPopper className="w-8 h-8 text-yellow-500 animate-bounce" />
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
                      {
                        l: "Status",
                        v: assessmentScoreResult?.status || "Done",
                      },
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
                        <p className="text-sm font-semibold text-zinc-900">
                          {x.v}
                        </p>
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
              className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="w-full flex-1 overflow-y-auto scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="p-8 text-center space-y-6">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-semibold text-zinc-900">
                      Are you sure?
                    </h3>
                    <p className="text-gray-400 font-medium text-sm">
                      Unsubmitted answers will be lost. You can resume later
                      from where you left off if questions were saved.
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
                </div>
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
              className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="w-full flex-1 overflow-y-auto scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="p-8 text-center space-y-6">
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
    </div>
  );
}
