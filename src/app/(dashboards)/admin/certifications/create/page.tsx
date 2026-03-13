"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { axiosInstance } from "@/lib/axios";
import Dropdown from "../../common/dropdown";
import Button from "../../common/button";
import AlertPop from "@/app/components/alertPop/AlertPop";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

type Question = {
  id: string;
  text: string;
  helpText: string;
  criteriaInformation?: string;
  type: string;
  rank?: number;
  hasConditionalLogic: boolean;
  conditionalRules?: {
    yesAction: string;
    noAction: string;
    yesExitLevel: string;
    noExitLevel: string;
    yesRank?: string;
    noRank?: string;
    yesParentId?: string;
    noParentId?: string;
    yesParentName?: string;
    noParentName?: string;
    yesParentType?: string;
    noParentType?: string;
  };
};

type SubSection = {
  id: string;
  name: string;
  rank?: number;
  questions: Question[];
  isExpanded: boolean;
};

type Section = {
  id: string;
  name: string;
  rank?: number;
  subSections: SubSection[];
  questions?: Question[];
  isExpanded: boolean;
};

type MainSection = {
  id: string;
  name: string;
  rank?: number;
  sections: Section[];
  isExpanded: boolean;
};

type EditingSectionTarget = {
  mainSectionId: string;
  sectionId: string;
};

type EditingSubSectionTarget = {
  mainSectionId: string;
  sectionId: string;
  subSectionId: string;
};

type Industry = {
  id: string;
  name: string;
  updated_at?: string;
};

interface IndustriesResponse {
  message: string;
  data: {
    data: Industry[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

type RedirectLevel = "main" | "section" | "subsection" | "question" | "end";

type RedirectOption = {
  value: string;
  label: string;
  description?: string;
  descriptionTone?: "default" | "danger";
  redirectType?: RedirectLevel;
  targetId?: string;
  targetName?: string;
  rank?: string;
  indentLevel?: number;
  parentValue?: string;
  hasChildren?: boolean;
  disabled?: boolean;
  groupLabel?: boolean;
};

function createRedirectOptionValue(level: RedirectLevel, id: string) {
  return `${level}:${id}`;
}

function getQuestionRedirectLabel(question: Question, fallbackIndex: number) {
  const text = (question.text || "").trim();
  return text || `Question ${fallbackIndex + 1}`;
}

function normalizeRedirectLevel(value?: string): RedirectLevel | "" {
  if (value === "main" || value === "main_section") return "main";
  if (value === "section") return "section";
  if (value === "subsection" || value === "sub_section") return "subsection";
  if (value === "question") return "question";
  if (value === "end") return "end";
  return "";
}

function findRedirectOptionByValue(
  options: RedirectOption[],
  value: string,
): RedirectOption | undefined {
  return options.find((option) => !option.groupLabel && option.value === value);
}

function resolveRedirectSelectionValue(
  options: RedirectOption[],
  redirectType?: string,
  rank?: string,
  parentId?: string,
): string {
  if (parentId) {
    const matchedOption = options.find(
      (option) => !option.groupLabel && option.targetId === parentId,
    );

    if (matchedOption) {
      return matchedOption.value;
    }
  }

  const normalizedLevel = normalizeRedirectLevel(redirectType);
  if (!normalizedLevel || rank === undefined || rank === null || rank === "") {
    return "";
  }

  return (
    options.find(
      (option) =>
        !option.groupLabel &&
        option.redirectType === normalizedLevel &&
        option.rank === String(rank),
    )?.value || ""
  );
}

function buildRedirectOptions(mainSections: MainSection[]): RedirectOption[] {
  const orderedOptions: RedirectOption[] = [];

  mainSections.forEach((mainSection, mainIndex) => {
    const mainRank = String(mainSection.rank ?? mainIndex + 1);
    const mainName =
      (mainSection.name || "").trim() || `Main Section ${mainRank}`;
    const mainValue = createRedirectOptionValue("main", mainSection.id);

    orderedOptions.push({
      value: mainValue,
      label: mainName,
      description: `Main section • rank ${mainRank}`,
      redirectType: "main",
      targetId: mainSection.id,
      targetName: mainName,
      rank: mainRank,
      indentLevel: 0,
      hasChildren: mainSection.sections.length > 0,
    });

    mainSection.sections.forEach((section, sectionIndex) => {
      const sectionRank = String(section.rank ?? sectionIndex + 1);
      const sectionName =
        (section.name || "").trim() || `Section ${sectionRank}`;
      const sectionValue = createRedirectOptionValue("section", section.id);
      const sectionHasChildren =
        (section.questions || []).length > 0 || section.subSections.length > 0;
      const sectionHasQuestions = (section.questions || []).length > 0;

      orderedOptions.push({
        value: sectionValue,
        label: sectionName,
        description: sectionHasQuestions
          ? `Section • rank ${sectionRank}`
          : "This section has no questions",
        descriptionTone: sectionHasQuestions ? "default" : "danger",
        redirectType: "section",
        targetId: section.id,
        targetName: sectionName,
        rank: sectionRank,
        indentLevel: 1,
        parentValue: mainValue,
        hasChildren: sectionHasChildren,
        disabled: !sectionHasQuestions,
      });

      (section.questions || []).forEach((question, questionIndex) => {
        const questionRank = String(question.rank ?? questionIndex + 1);

        orderedOptions.push({
          value: createRedirectOptionValue("question", question.id),
          label: getQuestionRedirectLabel(question, questionIndex),
          description: `Question • rank ${questionRank}`,
          redirectType: "question",
          targetId: question.id,
          targetName: getQuestionRedirectLabel(question, questionIndex),
          rank: questionRank,
          indentLevel: 2,
          parentValue: sectionValue,
          hasChildren: false,
        });
      });

      section.subSections.forEach((subSection, subSectionIndex) => {
        const subSectionRank = String(subSection.rank ?? subSectionIndex + 1);
        const subSectionName =
          (subSection.name || "").trim() || `Sub-section ${subSectionRank}`;
        const subSectionValue = createRedirectOptionValue(
          "subsection",
          subSection.id,
        );

        orderedOptions.push({
          value: subSectionValue,
          label: subSectionName,
          description:
            subSection.questions.length > 0
              ? `Sub-section • rank ${subSectionRank}`
              : "This sub-section has no questions",
          descriptionTone:
            subSection.questions.length > 0 ? "default" : "danger",
          redirectType: "subsection",
          targetId: subSection.id,
          targetName: subSectionName,
          rank: subSectionRank,
          indentLevel: 2,
          parentValue: sectionValue,
          hasChildren: subSection.questions.length > 0,
          disabled: subSection.questions.length === 0,
        });

        subSection.questions.forEach((question, questionIndex) => {
          const questionRank = String(question.rank ?? questionIndex + 1);

          orderedOptions.push({
            value: createRedirectOptionValue("question", question.id),
            label: getQuestionRedirectLabel(question, questionIndex),
            description: `Question • rank ${questionRank}`,
            redirectType: "question",
            targetId: question.id,
            targetName: getQuestionRedirectLabel(question, questionIndex),
            rank: questionRank,
            indentLevel: 3,
            parentValue: subSectionValue,
            hasChildren: false,
          });
        });
      });
    });
  });

  orderedOptions.push({
    value: createRedirectOptionValue("end", "end"),
    label: "End",
    description: "End assessment flow",
    redirectType: "end",
    rank: "0",
    indentLevel: 0,
    hasChildren: false,
  });

  return orderedOptions;
}

function buildConditionPayload(option?: RedirectOption, fallbackRank?: string) {
  if (!option?.redirectType) {
    return undefined;
  }

  if (option.redirectType === "end") {
    return {
      redirect_type: "end",
      rank: 0,
    };
  }

  return {
    redirect_type: option.redirectType,
    rank: parseInt(option.rank || fallbackRank || "0", 10) || 0,
    target_id: option.targetId,
    target_name: option.targetName || option.label,
  };
}

function buildLocalConditionalRuleState(
  yesOption?: RedirectOption,
  noOption?: RedirectOption,
  yesFallbackRank?: string,
  noFallbackRank?: string,
) {
  return {
    yesAction: yesOption?.redirectType || "",
    noAction: noOption?.redirectType || "",
    yesExitLevel: yesOption?.redirectType || "",
    noExitLevel: noOption?.redirectType || "",
    yesRank: yesOption?.rank || yesFallbackRank,
    noRank: noOption?.rank || noFallbackRank,
    yesParentId: yesOption?.targetId,
    noParentId: noOption?.targetId,
    yesParentName: yesOption?.targetName || yesOption?.label,
    noParentName: noOption?.targetName || noOption?.label,
    yesParentType: yesOption?.redirectType,
    noParentType: noOption?.redirectType,
  };
}

function FullPageSkeleton() {
  return (
    <div className="bg-light-gray p-3 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-3">
          <Skeleton width="28%" height={28} borderRadius={8} />
          <Skeleton width="45%" height={16} borderRadius={6} />
        </div>
        <div className="bg-white rounded-xl border border-zinc-100 p-6 space-y-5">
          <Skeleton width="30%" height={20} borderRadius={6} />
          <Skeleton width="100%" height={44} borderRadius={8} />
          <Skeleton width="100%" height={44} borderRadius={8} />
          <Skeleton width="100%" height={120} borderRadius={8} />
          <div className="flex justify-end gap-3">
            <Skeleton width={120} height={40} borderRadius={8} />
            <Skeleton width={140} height={40} borderRadius={8} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SavingOverlaySkeleton() {
  return (
    <div className="absolute inset-0 z-20 bg-light-gray/80 backdrop-blur-sm p-4 md:p-6">
      <div className="h-full max-w-5xl mx-auto space-y-6">
        <Skeleton width="22%" height={24} borderRadius={8} />
        <div className="bg-white/80 rounded-xl p-6 space-y-4">
          <Skeleton width="42%" height={18} borderRadius={6} />
          <Skeleton width="100%" height={44} borderRadius={8} />
          <Skeleton width="100%" height={44} borderRadius={8} />
          <Skeleton width="100%" height={110} borderRadius={8} />
        </div>
      </div>
    </div>
  );
}

function CreateCertificationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const certificateIdFromUrl = searchParams.get("id");
  const [step, setStep] = useState<"details" | "sections">("details");
  const [isLoadingCertificate, setIsLoadingCertificate] = useState(false);
  const [showAddMainSectionInput, setShowAddMainSectionInput] = useState(false);
  const [newMainSectionName, setNewMainSectionName] = useState("");
  const [editingMainSectionId, setEditingMainSectionId] = useState<
    string | null
  >(null);
  const [showAddSectionInput, setShowAddSectionInput] = useState<string | null>(
    null,
  );
  const [newSectionName, setNewSectionName] = useState("");
  const [editingSectionTarget, setEditingSectionTarget] =
    useState<EditingSectionTarget | null>(null);
  const [showAddSubSectionInput, setShowAddSubSectionInput] = useState<
    string | null
  >(null);
  const [newSubSectionName, setNewSubSectionName] = useState("");
  const [editingSubSectionTarget, setEditingSubSectionTarget] =
    useState<EditingSubSectionTarget | null>(null);
  const [mainSections, setMainSections] = useState<MainSection[]>([]);
  const redirectOptions = useMemo(
    () => buildRedirectOptions(mainSections),
    [mainSections],
  );
  const redirectDropdownPlaceholder = redirectOptions.some(
    (option) => !option.groupLabel,
  )
    ? "Choose redirect destination"
    : "Add sections, sub-sections, or questions first";
  const [selectedMainSection, setSelectedMainSection] = useState<string | null>(
    null,
  );
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSubSection, setSelectedSubSection] = useState<string | null>(
    null,
  );
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "Alert",
    subText: "",
    buttonTitle: "Okay",
  });
  const alertActionRef = useRef<(() => void) | null>(null);

  const showAlert = (
    subText: string,
    options?: { title?: string; buttonTitle?: string; onPress?: () => void },
  ) => {
    alertActionRef.current = options?.onPress ?? null;
    setAlertModal({
      isOpen: true,
      title: options?.title ?? "Alert",
      subText,
      buttonTitle: options?.buttonTitle ?? "Okay",
    });
  };

  const closeAlertModal = () => {
    alertActionRef.current = null;
    setAlertModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleAlertAction = () => {
    const action = alertActionRef.current;
    alertActionRef.current = null;
    setAlertModal((prev) => ({ ...prev, isOpen: false }));
    if (action) {
      action();
    }
  };

  const [certificationName, setCertificationName] = useState("");
  const [productId, setProductId] = useState("");
  const [industry, setIndustry] = useState<string[]>([]);
  const [selfDisclosurePrice, setSelfDisclosurePrice] = useState("");
  const [assuredPrice, setAssuredPrice] = useState("");
  const [validityDays, setValidityDays] = useState("");
  const [validityMonths, setValidityMonths] = useState("");
  const [validityYears, setValidityYears] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [shortDescription, setShortDescription] = useState("");
  const [compulsoryDocuments, setCompulsoryDocuments] = useState<string[]>([]);
  const [documentInput, setDocumentInput] = useState("");
  const [hasConditionalLogic, setHasConditionalLogic] = useState(false);
  const [questionType, setQuestionType] = useState("");
  const [yesExitLevel, setYesExitLevel] = useState("");
  const [noExitLevel, setNoExitLevel] = useState("");
  const [yesRank, setYesRank] = useState("");
  const [noRank, setNoRank] = useState("");

  const [questionText, setQuestionText] = useState("");
  const [helpText, setHelpText] = useState("");
  const [criteriaInformation, setCriteriaInformation] = useState("");

  const [acesRatedBronze, setAcesRatedBronze] = useState("");
  const [acesRatedSilver, setAcesRatedSilver] = useState("");
  const [acesRatedGold, setAcesRatedGold] = useState("");
  const [acesRatedEmerald, setAcesRatedEmerald] = useState("");

  const [acesVerifiedBronze, setAcesVerifiedBronze] = useState("");
  const [acesVerifiedSilver, setAcesVerifiedSilver] = useState("");
  const [acesVerifiedGold, setAcesVerifiedGold] = useState("");
  const [acesVerifiedEmerald, setAcesVerifiedEmerald] = useState("");

  const [acesCertifiedSilver, setAcesCertifiedSilver] = useState("");
  const [acesCertifiedGold, setAcesCertifiedGold] = useState("");
  const [acesCertifiedEmerald, setAcesCertifiedEmerald] = useState("");

  const [certificateId, setCertificateId] = useState<string | null>("");
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [isCreatingSubSection, setIsCreatingSubSection] = useState(false);
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isDeletingMainSection, setIsDeletingMainSection] = useState<
    string | null
  >(null);
  const [isDeletingSection, setIsDeletingSection] = useState<string | null>(
    null,
  );
  const [isDeletingSubSection, setIsDeletingSubSection] = useState<
    string | null
  >(null);
  const [isDeletingQuestion, setIsDeletingQuestion] = useState<string | null>(
    null,
  );
  const [isUpdatingStructure, setIsUpdatingStructure] = useState<string | null>(
    null,
  );
  const [databaseQuestionCount, setDatabaseQuestionCount] = useState<
    number | null
  >(null);
  const [isCheckingPublishEligibility, setIsCheckingPublishEligibility] =
    useState(false);

  const [errors, setErrors] = useState<{
    certificationName?: string;
    productId?: string;
    industry?: string;
    selfDisclosurePrice?: string;
    assuredPrice?: string;
    validityPeriod?: string;
    badges?: string;
    shortDescription?: string;
    acesRatedBronze?: string;
    acesRatedSilver?: string;
    acesRatedGold?: string;
    acesRatedEmerald?: string;
    acesVerifiedBronze?: string;
    acesVerifiedSilver?: string;
    acesVerifiedGold?: string;
    acesVerifiedEmerald?: string;
    acesCertifiedSilver?: string;
    acesCertifiedGold?: string;
    acesCertifiedEmerald?: string;
  }>({});

  const [industries, setIndustries] = useState<Industry[]>([]);
  const [industryOptions, setIndustryOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [isLoadingIndustries, setIsLoadingIndustries] = useState(false);
  const [industryPagination, setIndustryPagination] = useState({
    pageIndex: 1,
    pageSize: 20,
    totalPages: 1,
  });
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);
  const industryDropdownRef = useRef<HTMLDivElement>(null);
  const industryListRef = useRef<HTMLDivElement>(null);

  const countQuestionsFromCertificateData = useCallback(
    (certData: any): number => {
      const directCount = Number(certData?.questions_count);
      if (!Number.isNaN(directCount) && directCount >= 0) {
        return directCount;
      }

      let total = 0;
      const mainSectionsData = Array.isArray(certData?.main_sections)
        ? certData.main_sections
        : [];

      mainSectionsData.forEach((mainSection: any) => {
        const sections = Array.isArray(mainSection?.sections)
          ? mainSection.sections
          : [];
        sections.forEach((section: any) => {
          total += Array.isArray(section?.questions)
            ? section.questions.length
            : 0;
          const subSections = Array.isArray(section?.sub_sections)
            ? section.sub_sections
            : [];
          subSections.forEach((subSection: any) => {
            total += Array.isArray(subSection?.questions)
              ? subSection.questions.length
              : 0;
          });
        });
      });

      return total;
    },
    [],
  );

  const fetchDatabaseQuestionCount = useCallback(
    async (targetCertificateId?: string): Promise<number> => {
      const resolvedCertificateId =
        targetCertificateId || certificateIdFromUrl || certificateId || "";
      if (!resolvedCertificateId) {
        setDatabaseQuestionCount(0);
        return 0;
      }

      setIsCheckingPublishEligibility(true);
      try {
        const response = await axiosInstance.get(
          `/certificates/${resolvedCertificateId}?include=questions`,
        );
        const certData = response.data?.data;
        const count = countQuestionsFromCertificateData(certData);
        setDatabaseQuestionCount(count);
        return count;
      } catch (err) {
        setDatabaseQuestionCount(0);
        return 0;
      } finally {
        setIsCheckingPublishEligibility(false);
      }
    },
    [certificateIdFromUrl, certificateId, countQuestionsFromCertificateData],
  );

  useEffect(() => {
    if (questionType !== "boolean") {
      setHasConditionalLogic(false);
      setYesExitLevel("");
      setNoExitLevel("");
      setYesRank("");
      setNoRank("");
    }
  }, [questionType]);

  useEffect(() => {
    const yesOption = yesExitLevel
      ? findRedirectOptionByValue(redirectOptions, yesExitLevel)
      : undefined;
    const noOption = noExitLevel
      ? findRedirectOptionByValue(redirectOptions, noExitLevel)
      : undefined;

    if (yesExitLevel) {
      if (!yesOption) {
        setYesExitLevel("");
        setYesRank("");
      } else if (yesRank !== (yesOption.rank || "")) {
        setYesRank(yesOption.rank || "");
      }
    }

    if (noExitLevel) {
      if (!noOption) {
        setNoExitLevel("");
        setNoRank("");
      } else if (noRank !== (noOption.rank || "")) {
        setNoRank(noOption.rank || "");
      }
    }
  }, [redirectOptions, yesExitLevel, yesRank, noExitLevel, noRank]);

  useEffect(() => {
    setHasConditionalLogic(false);
    setQuestionType("");
    setYesExitLevel("");
    setNoExitLevel("");
    setYesRank("");
    setNoRank("");
    setQuestionText("");
    setHelpText("");
    setCriteriaInformation("");

    if (selectedQuestion && selectedMainSection && selectedSection) {
      const mainSection = mainSections.find(
        (ms) => ms.id === selectedMainSection,
      );
      const section = mainSection?.sections.find(
        (s) => s.id === selectedSection,
      );

      let question: Question | undefined;

      if (selectedSubSection) {
        const subSection = section?.subSections.find(
          (ss) => ss.id === selectedSubSection,
        );
        question = subSection?.questions.find((q) => q.id === selectedQuestion);
      } else {
        question = section?.questions?.find((q) => q.id === selectedQuestion);
      }

      if (question) {
        const resolvedYesRedirectValue = resolveRedirectSelectionValue(
          redirectOptions,
          question.conditionalRules?.yesExitLevel,
          question.conditionalRules?.yesRank,
          question.conditionalRules?.yesParentId,
        );
        const resolvedNoRedirectValue = resolveRedirectSelectionValue(
          redirectOptions,
          question.conditionalRules?.noExitLevel,
          question.conditionalRules?.noRank,
          question.conditionalRules?.noParentId,
        );

        setQuestionText(question.text || "");
        setHelpText(question.helpText || "");
        setCriteriaInformation(question.criteriaInformation || "");
        setQuestionType(question.type || "");
        setHasConditionalLogic(question.hasConditionalLogic || false);
        setYesExitLevel(resolvedYesRedirectValue);
        setNoExitLevel(resolvedNoRedirectValue);
        setYesRank(question.conditionalRules?.yesRank || "");
        setNoRank(question.conditionalRules?.noRank || "");
      }
    }
  }, [
    selectedQuestion,
    selectedMainSection,
    selectedSection,
    selectedSubSection,
    mainSections,
    redirectOptions,
  ]);

  useEffect(() => {
    if (!selectedMainSection) {
      setSelectedSection(null);
      setSelectedSubSection(null);
      setSelectedQuestion(null);
    }
  }, [selectedMainSection]);

  useEffect(() => {
    if (!selectedSection) {
      setSelectedSubSection(null);
      setSelectedQuestion(null);
    }
  }, [selectedSection]);

  useEffect(() => {
    if (!selectedSubSection) {
      setSelectedQuestion(null);
    }
  }, [selectedSubSection]);

  const getQuestionFromState = (
    mainSectionId: string,
    sectionId: string,
    subSectionId: string | null,
    questionId: string,
  ): Question | undefined => {
    const mainSection = mainSections.find((ms) => ms.id === mainSectionId);
    const section = mainSection?.sections.find((s) => s.id === sectionId);

    if (!section) {
      return undefined;
    }

    if (subSectionId) {
      const subSection = section.subSections.find(
        (ss) => ss.id === subSectionId,
      );
      return subSection?.questions.find((q) => q.id === questionId);
    }

    return section.questions?.find((q) => q.id === questionId);
  };

  const hasUnsavedQuestionChanges = (): boolean => {
    if (!selectedQuestion || !selectedMainSection || !selectedSection) {
      return false;
    }

    const originalQuestion = getQuestionFromState(
      selectedMainSection,
      selectedSection,
      selectedSubSection,
      selectedQuestion,
    );

    if (!originalQuestion) {
      return false;
    }

    const originalType = originalQuestion.type || "";
    const currentType = questionType || "";

    const originalIsBoolean = originalType === "boolean";
    const currentIsBoolean = currentType === "boolean";

    const originalHasConditionalLogic = originalIsBoolean
      ? Boolean(originalQuestion.hasConditionalLogic)
      : false;
    const currentHasConditionalLogic = currentIsBoolean
      ? hasConditionalLogic
      : false;

    const originalYesExitLevel = originalHasConditionalLogic
      ? resolveRedirectSelectionValue(
          redirectOptions,
          originalQuestion.conditionalRules?.yesExitLevel,
          originalQuestion.conditionalRules?.yesRank,
          originalQuestion.conditionalRules?.yesParentId,
        )
      : "";
    const originalNoExitLevel = originalHasConditionalLogic
      ? resolveRedirectSelectionValue(
          redirectOptions,
          originalQuestion.conditionalRules?.noExitLevel,
          originalQuestion.conditionalRules?.noRank,
          originalQuestion.conditionalRules?.noParentId,
        )
      : "";
    const originalYesRank = originalHasConditionalLogic
      ? originalQuestion.conditionalRules?.yesRank || ""
      : "";
    const originalNoRank = originalHasConditionalLogic
      ? originalQuestion.conditionalRules?.noRank || ""
      : "";

    const currentYesExitLevel = currentHasConditionalLogic ? yesExitLevel : "";
    const currentNoExitLevel = currentHasConditionalLogic ? noExitLevel : "";
    const currentYesRank = currentHasConditionalLogic ? yesRank : "";
    const currentNoRank = currentHasConditionalLogic ? noRank : "";

    return (
      questionText !== (originalQuestion.text || "") ||
      helpText !== (originalQuestion.helpText || "") ||
      criteriaInformation !== (originalQuestion.criteriaInformation || "") ||
      currentType !== originalType ||
      currentHasConditionalLogic !== originalHasConditionalLogic ||
      currentYesExitLevel !== originalYesExitLevel ||
      currentNoExitLevel !== originalNoExitLevel ||
      currentYesRank !== originalYesRank ||
      currentNoRank !== originalNoRank
    );
  };

  const canNavigateQuestion = (
    nextMainSectionId: string,
    nextSectionId: string | null,
    nextSubSectionId: string | null,
    nextQuestionId: string | null,
  ): boolean => {
    const isSameTarget =
      selectedMainSection === nextMainSectionId &&
      selectedSection === nextSectionId &&
      selectedSubSection === nextSubSectionId &&
      selectedQuestion === nextQuestionId;

    if (isSameTarget || !selectedQuestion || !hasUnsavedQuestionChanges()) {
      return true;
    }

    return window.confirm(
      "You have unsaved changes in this question. Press OK to discard and continue, or Cancel to stay on this question.",
    );
  };

  const fetchIndustries = useCallback(
    async (pageIndex: number, pageSize: number, append = false) => {
      setIsLoadingIndustries(true);
      try {
        const response = await axiosInstance.get<IndustriesResponse>(
          `/industries?page=${pageIndex}&limit=${pageSize}`,
        );

        const industriesData = response.data?.data?.data || [];
        const meta = response.data?.data || { total: 0, totalPages: 0 };

        if (append) {
          setIndustries((prev) => [...prev, ...industriesData]);
        } else {
          setIndustries(industriesData);
        }

        const options = industriesData.map((ind) => ({
          value: ind.id,
          label: ind.name,
        }));

        if (append) {
          setIndustryOptions((prev) => [...prev, ...options]);
        } else {
          setIndustryOptions(options);
        }

        setIndustryPagination({
          pageIndex,
          pageSize,
          totalPages: meta.totalPages || 1,
        });
      } catch (err) {
        if (!append) {
          setIndustries([]);
          setIndustryOptions([]);
        }
      } finally {
        setIsLoadingIndustries(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchIndustries(1, 20, false);
  }, [fetchIndustries]);

  useEffect(() => {
    const fetchCertificateData = async () => {
      if (!certificateIdFromUrl) {
        setCertificateId("");
        setDatabaseQuestionCount(0);
        return;
      }

      setIsLoadingCertificate(true);
      try {
        const response = await axiosInstance.get(
          `/certificates/${certificateIdFromUrl}?include=questions`,
        );
        const certData = response.data?.data;

        if (certData) {
          setDatabaseQuestionCount(countQuestionsFromCertificateData(certData));

          setCertificateId(certData.id);

          setCertificationName(certData.name || "");
          setProductId(certData.certificate_id || "");
          setIndustry(certData.industry_ids || []);
          setSelfDisclosurePrice(certData.disclosure_price?.toString() || "");
          setAssuredPrice(certData.assured_price?.toString() || "");
          setValidityDays(certData.validity_days?.toString() || "");
          setValidityMonths(certData.validity_months?.toString() || "");
          setValidityYears(certData.validity_years?.toString() || "");
          setIsPublished(certData.is_published || false);
          setShortDescription(certData.description || "");
          setCompulsoryDocuments(certData.compulsory_docs || []);

          if (certData.badges && Array.isArray(certData.badges)) {
            certData.badges.forEach((badge: any) => {
              if (badge.name === "ACES Rated" && badge.colors) {
                badge.colors.forEach((color: any) => {
                  if (color.color === "#CD7F32")
                    setAcesRatedBronze(color.min_score?.toString() || "");
                  if (color.color === "#C0C0C0")
                    setAcesRatedSilver(color.min_score?.toString() || "");
                  if (color.color === "#FFD700")
                    setAcesRatedGold(color.min_score?.toString() || "");
                  if (color.color === "#00C853")
                    setAcesRatedEmerald(color.min_score?.toString() || "");
                });
              }
              if (badge.name === "ACES Verified" && badge.colors) {
                badge.colors.forEach((color: any) => {
                  if (color.color === "#CD7F32")
                    setAcesVerifiedBronze(color.min_score?.toString() || "");
                  if (color.color === "#C0C0C0")
                    setAcesVerifiedSilver(color.min_score?.toString() || "");
                  if (color.color === "#FFD700")
                    setAcesVerifiedGold(color.min_score?.toString() || "");
                  if (color.color === "#00C853")
                    setAcesVerifiedEmerald(color.min_score?.toString() || "");
                });
              }
              if (badge.name === "ACES Certified" && badge.colors) {
                badge.colors.forEach((color: any) => {
                  if (color.color === "#C0C0C0")
                    setAcesCertifiedSilver(color.min_score?.toString() || "");
                  if (color.color === "#FFD700")
                    setAcesCertifiedGold(color.min_score?.toString() || "");
                  if (color.color === "#00C853")
                    setAcesCertifiedEmerald(color.min_score?.toString() || "");
                });
              }
            });
          }

          if (certData.main_sections && Array.isArray(certData.main_sections)) {
            const transformedMainSections: MainSection[] =
              certData.main_sections.map((ms: any) => {
                const sections: Section[] = (ms.sections || []).map(
                  (s: any) => {
                    const sectionQuestions: Question[] = (
                      s.questions || []
                    ).map((q: any) => ({
                      id: q.id,
                      text: q.question || "",
                      helpText: q.hint || "",
                      criteriaInformation: q.criteria || "",
                      type: q.type || "",
                      rank:
                        typeof q.rank === "number"
                          ? q.rank
                          : Number(q.rank) || undefined,
                      hasConditionalLogic:
                        q.conditions && Object.keys(q.conditions).length > 0,
                      conditionalRules: q.conditions
                        ? {
                            yesAction: q.conditions.yes?.redirect_type || "",
                            noAction: q.conditions.no?.redirect_type || "",
                            yesExitLevel: q.conditions.yes?.redirect_type || "",
                            noExitLevel: q.conditions.no?.redirect_type || "",
                            yesRank:
                              q.conditions.yes?.rank?.toString?.() || undefined,
                            noRank:
                              q.conditions.no?.rank?.toString?.() || undefined,
                            yesParentId:
                              q.conditions.yes?.target_id ||
                              q.conditions.yes?.parent_id ||
                              undefined,
                            noParentId:
                              q.conditions.no?.target_id ||
                              q.conditions.no?.parent_id ||
                              undefined,
                            yesParentName:
                              q.conditions.yes?.target_name ||
                              q.conditions.yes?.parent_name ||
                              undefined,
                            noParentName:
                              q.conditions.no?.target_name ||
                              q.conditions.no?.parent_name ||
                              undefined,
                            yesParentType:
                              q.conditions.yes?.target_type ||
                              q.conditions.yes?.parent_type ||
                              q.conditions.yes?.redirect_type ||
                              undefined,
                            noParentType:
                              q.conditions.no?.target_type ||
                              q.conditions.no?.parent_type ||
                              q.conditions.no?.redirect_type ||
                              undefined,
                          }
                        : undefined,
                    }));

                    const subSections: SubSection[] = (
                      s.sub_sections || []
                    ).map((ss: any) => ({
                      id: ss.id,
                      name: ss.name,
                      rank:
                        typeof ss.rank === "number"
                          ? ss.rank
                          : Number(ss.rank) || undefined,
                      questions: (ss.questions || []).map((q: any) => ({
                        id: q.id,
                        text: q.question || "",
                        helpText: q.hint || "",
                        criteriaInformation: q.criteria || "",
                        type: q.type || "",
                        rank:
                          typeof q.rank === "number"
                            ? q.rank
                            : Number(q.rank) || undefined,
                        hasConditionalLogic:
                          q.conditions && Object.keys(q.conditions).length > 0,
                        conditionalRules: q.conditions
                          ? {
                              yesAction: q.conditions.yes?.redirect_type || "",
                              noAction: q.conditions.no?.redirect_type || "",
                              yesExitLevel:
                                q.conditions.yes?.redirect_type || "",
                              noExitLevel: q.conditions.no?.redirect_type || "",
                              yesRank:
                                q.conditions.yes?.rank?.toString?.() ||
                                undefined,
                              noRank:
                                q.conditions.no?.rank?.toString?.() ||
                                undefined,
                              yesParentId:
                                q.conditions.yes?.target_id ||
                                q.conditions.yes?.parent_id ||
                                undefined,
                              noParentId:
                                q.conditions.no?.target_id ||
                                q.conditions.no?.parent_id ||
                                undefined,
                              yesParentName:
                                q.conditions.yes?.target_name ||
                                q.conditions.yes?.parent_name ||
                                undefined,
                              noParentName:
                                q.conditions.no?.target_name ||
                                q.conditions.no?.parent_name ||
                                undefined,
                              yesParentType:
                                q.conditions.yes?.target_type ||
                                q.conditions.yes?.parent_type ||
                                q.conditions.yes?.redirect_type ||
                                undefined,
                              noParentType:
                                q.conditions.no?.target_type ||
                                q.conditions.no?.parent_type ||
                                q.conditions.no?.redirect_type ||
                                undefined,
                            }
                          : undefined,
                      })),
                      isExpanded: (ss.questions || []).length > 0,
                    }));

                    const hasSectionQuestions = sectionQuestions.length > 0;
                    const hasSubSectionQuestions = subSections.some(
                      (subSection) => subSection.questions.length > 0,
                    );

                    return {
                      id: s.id,
                      name: s.name,
                      rank:
                        typeof s.rank === "number"
                          ? s.rank
                          : Number(s.rank) || undefined,
                      subSections,
                      questions: sectionQuestions,
                      isExpanded: hasSectionQuestions || hasSubSectionQuestions,
                    };
                  },
                );

                return {
                  id: ms.id,
                  name: ms.name,
                  rank:
                    typeof ms.rank === "number"
                      ? ms.rank
                      : Number(ms.rank) || undefined,
                  sections,
                  isExpanded: true,
                };
              });

            setMainSections(transformedMainSections);
          }
        }
      } catch (err) {
        showAlert("Failed to load certificate data. Please try again.", {
          onPress: () => router.push("/admin/certifications"),
        });
      } finally {
        setIsLoadingCertificate(false);
      }
    };

    fetchCertificateData();
  }, [certificateIdFromUrl]);

  useEffect(() => {
    if (step !== "sections") {
      return;
    }

    const resolvedCertificateId = certificateIdFromUrl || certificateId || "";
    if (!resolvedCertificateId) {
      setDatabaseQuestionCount(0);
      return;
    }

    fetchDatabaseQuestionCount(resolvedCertificateId);
  }, [step, certificateIdFromUrl, certificateId, fetchDatabaseQuestionCount]);

  const handleIndustryScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const { scrollTop, scrollHeight, clientHeight } = target;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (
        isNearBottom &&
        !isLoadingIndustries &&
        industryPagination.pageIndex < industryPagination.totalPages
      ) {
        const nextPage = industryPagination.pageIndex + 1;
        fetchIndustries(nextPage, industryPagination.pageSize, true);
      }
    },
    [isLoadingIndustries, industryPagination, fetchIndustries],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        industryDropdownRef.current &&
        !industryDropdownRef.current.contains(event.target as Node)
      ) {
        setShowIndustryDropdown(false);
      }
    };

    if (showIndustryDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showIndustryDropdown]);

  const resetMainSectionEditor = () => {
    setShowAddMainSectionInput(false);
    setEditingMainSectionId(null);
    setNewMainSectionName("");
  };

  const resetSectionEditor = () => {
    setShowAddSectionInput(null);
    setEditingSectionTarget(null);
    setNewSectionName("");
  };

  const resetSubSectionEditor = () => {
    setShowAddSubSectionInput(null);
    setEditingSubSectionTarget(null);
    setNewSubSectionName("");
  };

  const createMainSectionAPI = async (name: string) => {
    if (!certificateId) {
      return null;
    }
    try {
      const response = await axiosInstance.post(
        `/certificates/${certificateId}/main-sections`,
        {
          sections: [{ name: name.trim() }],
        },
      );
      return response.data?.data?.[0] || null;
    } catch (err) {
      throw err;
    }
  };

  const updateMainSectionAPI = async (mainSectionId: string, name: string) => {
    try {
      const response = await axiosInstance.patch(
        `/main-sections/${mainSectionId}`,
        {
          name: name.trim(),
        },
      );
      return response.data?.data || null;
    } catch (err) {
      throw err;
    }
  };

  const deleteMainSectionAPI = async (mainSectionId: string) => {
    if (!certificateId) {
      throw new Error("Certificate ID is required");
    }
    try {
      await axiosInstance.delete(`/main-sections/${mainSectionId}`);
      return true;
    } catch (err) {
      throw err;
    }
  };

  const deleteSectionAPI = async (sectionId: string) => {
    if (!certificateId) {
      throw new Error("Certificate ID is required");
    }
    try {
      await axiosInstance.delete(`/sections/${sectionId}`);
      return true;
    } catch (err) {
      throw err;
    }
  };

  const deleteSubSectionAPI = async (subSectionId: string) => {
    if (!certificateId) {
      throw new Error("Certificate ID is required");
    }
    try {
      await axiosInstance.delete(`/subsections/${subSectionId}`);
      return true;
    } catch (err) {
      throw err;
    }
  };

  const deleteQuestionAPI = async (questionId: string) => {
    if (!certificateId) {
      throw new Error("Certificate ID is required");
    }
    try {
      await axiosInstance.delete(`/questions/${questionId}`);
      return true;
    } catch (err) {
      throw err;
    }
  };

  const addMainSection = async () => {
    if (!newMainSectionName.trim() || !certificateId) {
      return;
    }

    setIsCreatingSection(true);
    try {
      const createdSection = await createMainSectionAPI(newMainSectionName);
      if (createdSection) {
        const newMainSection: MainSection = {
          id: createdSection.id,
          name: createdSection.name,
          sections: [],
          isExpanded: true,
        };
        setMainSections([...mainSections, newMainSection]);
        resetMainSectionEditor();
      }
    } catch (err) {
      showAlert("Failed to create main section. Please try again.");
    } finally {
      setIsCreatingSection(false);
    }
  };

  const startEditingMainSection = (mainSection: MainSection) => {
    setShowAddMainSectionInput(false);
    setEditingMainSectionId(mainSection.id);
    setNewMainSectionName(mainSection.name);
  };

  const updateMainSection = async () => {
    if (!editingMainSectionId || !newMainSectionName.trim()) {
      return;
    }

    setIsUpdatingStructure(editingMainSectionId);
    try {
      const response = await updateMainSectionAPI(
        editingMainSectionId,
        newMainSectionName,
      );
      const updatedName = response?.name || newMainSectionName.trim();

      setMainSections((prev) =>
        prev.map((mainSection) =>
          mainSection.id === editingMainSectionId
            ? { ...mainSection, name: updatedName }
            : mainSection,
        ),
      );
      resetMainSectionEditor();
    } catch (err) {
      showAlert("Failed to update main section. Please try again.");
    } finally {
      setIsUpdatingStructure(null);
    }
  };

  const toggleMainSection = (mainSectionId: string) => {
    setMainSections(
      mainSections.map((mainSection) =>
        mainSection.id === mainSectionId
          ? { ...mainSection, isExpanded: !mainSection.isExpanded }
          : mainSection,
      ),
    );

    if (
      showAddSectionInput === mainSectionId ||
      editingSectionTarget?.mainSectionId === mainSectionId
    ) {
      resetSectionEditor();
    }

    if (editingSubSectionTarget?.mainSectionId === mainSectionId) {
      resetSubSectionEditor();
    }
  };

  const deleteMainSection = async (mainSectionId: string) => {
    if (!certificateId) {
      showAlert(
        "Certificate ID is missing. Please save the certificate first.",
      );
      return;
    }

    setIsDeletingMainSection(mainSectionId);
    try {
      await deleteMainSectionAPI(mainSectionId);

      setMainSections(
        mainSections.filter((mainSection) => mainSection.id !== mainSectionId),
      );
      if (selectedMainSection === mainSectionId) {
        setSelectedMainSection(null);
        setSelectedSection(null);
        setSelectedSubSection(null);
        setSelectedQuestion(null);
      }

      if (
        showAddSectionInput === mainSectionId ||
        editingSectionTarget?.mainSectionId === mainSectionId
      ) {
        resetSectionEditor();
      }

      if (editingMainSectionId === mainSectionId) {
        resetMainSectionEditor();
      }

      if (editingSubSectionTarget?.mainSectionId === mainSectionId) {
        resetSubSectionEditor();
      }
    } catch (err) {
      showAlert("Failed to delete main section. Please try again.");
    } finally {
      setIsDeletingMainSection(null);
    }
  };

  const createSectionAPI = async (
    parentId: string,
    parentType: "main" | "section",
    name: string,
  ) => {
    try {
      const response = await axiosInstance.post(
        `/sections/${parentId}/subsections`,
        {
          parent_type: parentType,
          sections: [{ name: name.trim() }],
        },
      );
      return response.data?.data?.[0] || null;
    } catch (err) {
      throw err;
    }
  };

  const updateSectionAPI = async (sectionId: string, name: string) => {
    try {
      const response = await axiosInstance.patch(`/sections/${sectionId}`, {
        name: name.trim(),
      });
      return response.data?.data || null;
    } catch (err) {
      throw err;
    }
  };

  const updateSubSectionAPI = async (subSectionId: string, name: string) => {
    try {
      const response = await axiosInstance.patch(
        `/subsections/${subSectionId}`,
        {
          name: name.trim(),
        },
      );
      return response.data?.data || null;
    } catch (err) {
      throw err;
    }
  };

  const addSection = async (mainSectionId: string) => {
    if (!newSectionName.trim()) {
      return;
    }

    setIsCreatingSection(true);
    try {
      const createdSection = await createSectionAPI(
        mainSectionId,
        "main",
        newSectionName,
      );
      if (createdSection) {
        setMainSections(
          mainSections.map((mainSection) => {
            if (mainSection.id === mainSectionId) {
              return {
                ...mainSection,
                sections: [
                  ...mainSection.sections,
                  {
                    id: createdSection.id,
                    name: createdSection.name,
                    subSections: [],
                    questions: [],
                    isExpanded: false,
                  },
                ],
              };
            }
            return mainSection;
          }),
        );
        resetSectionEditor();
      }
    } catch (err) {
      showAlert("Failed to create section. Please try again.");
    } finally {
      setIsCreatingSection(false);
    }
  };

  const startEditingSection = (mainSectionId: string, section: Section) => {
    setShowAddSectionInput(null);
    setEditingSectionTarget({
      mainSectionId,
      sectionId: section.id,
    });
    setNewSectionName(section.name);
  };

  const updateSection = async () => {
    if (!editingSectionTarget || !newSectionName.trim()) {
      return;
    }

    setIsUpdatingStructure(editingSectionTarget.sectionId);
    try {
      const response = await updateSectionAPI(
        editingSectionTarget.sectionId,
        newSectionName,
      );
      const updatedName = response?.name || newSectionName.trim();

      setMainSections((prev) =>
        prev.map((mainSection) => {
          if (mainSection.id !== editingSectionTarget.mainSectionId) {
            return mainSection;
          }

          return {
            ...mainSection,
            sections: mainSection.sections.map((section) =>
              section.id === editingSectionTarget.sectionId
                ? { ...section, name: updatedName }
                : section,
            ),
          };
        }),
      );
      resetSectionEditor();
    } catch (err) {
      showAlert("Failed to update section. Please try again.");
    } finally {
      setIsUpdatingStructure(null);
    }
  };

  const toggleSection = (mainSectionId: string, sectionId: string) => {
    setMainSections(
      mainSections.map((mainSection) => {
        if (mainSection.id === mainSectionId) {
          return {
            ...mainSection,
            sections: mainSection.sections.map((section) =>
              section.id === sectionId
                ? { ...section, isExpanded: !section.isExpanded }
                : section,
            ),
          };
        }
        return mainSection;
      }),
    );

    if (
      showAddSubSectionInput === sectionId ||
      editingSubSectionTarget?.sectionId === sectionId
    ) {
      resetSubSectionEditor();
    }
  };

  const deleteSection = async (mainSectionId: string, sectionId: string) => {
    if (!certificateId) {
      showAlert(
        "Certificate ID is missing. Please save the certificate first.",
      );
      return;
    }

    setIsDeletingSection(sectionId);
    try {
      await deleteSectionAPI(sectionId);

      setMainSections(
        mainSections.map((mainSection) => {
          if (mainSection.id === mainSectionId) {
            return {
              ...mainSection,
              sections: mainSection.sections.filter(
                (section) => section.id !== sectionId,
              ),
            };
          }
          return mainSection;
        }),
      );
      if (selectedSection === sectionId) {
        setSelectedSection(null);
        setSelectedSubSection(null);
        setSelectedQuestion(null);
      }

      if (showAddSubSectionInput === sectionId) {
        resetSubSectionEditor();
      }

      if (editingSectionTarget?.sectionId === sectionId) {
        resetSectionEditor();
      }

      if (editingSubSectionTarget?.sectionId === sectionId) {
        resetSubSectionEditor();
      }
    } catch (err) {
      showAlert("Failed to delete section. Please try again.");
    } finally {
      setIsDeletingSection(null);
    }
  };

  const addSubSection = async (mainSectionId: string, sectionId: string) => {
    if (!newSubSectionName.trim()) {
      return;
    }

    setIsCreatingSubSection(true);
    try {
      const createdSubSection = await createSectionAPI(
        sectionId,
        "section",
        newSubSectionName,
      );
      if (createdSubSection) {
        setMainSections(
          mainSections.map((mainSection) => {
            if (mainSection.id === mainSectionId) {
              return {
                ...mainSection,
                sections: mainSection.sections.map((section) => {
                  if (section.id === sectionId) {
                    return {
                      ...section,
                      isExpanded: true,
                      subSections: [
                        ...section.subSections,
                        {
                          id: createdSubSection.id,
                          name: createdSubSection.name,
                          questions: [],
                          isExpanded: false,
                        },
                      ],
                    };
                  }
                  return section;
                }),
              };
            }
            return mainSection;
          }),
        );
        resetSubSectionEditor();
      }
    } catch (err) {
      showAlert("Failed to create subsection. Please try again.");
    } finally {
      setIsCreatingSubSection(false);
    }
  };

  const startEditingSubSection = (
    mainSectionId: string,
    sectionId: string,
    subSection: SubSection,
  ) => {
    setShowAddSubSectionInput(null);
    setEditingSubSectionTarget({
      mainSectionId,
      sectionId,
      subSectionId: subSection.id,
    });
    setNewSubSectionName(subSection.name);
  };

  const updateSubSection = async () => {
    if (!editingSubSectionTarget || !newSubSectionName.trim()) {
      return;
    }

    setIsUpdatingStructure(editingSubSectionTarget.subSectionId);
    try {
      const response = await updateSubSectionAPI(
        editingSubSectionTarget.subSectionId,
        newSubSectionName,
      );
      const updatedName = response?.name || newSubSectionName.trim();

      setMainSections((prev) =>
        prev.map((mainSection) => {
          if (mainSection.id !== editingSubSectionTarget.mainSectionId) {
            return mainSection;
          }

          return {
            ...mainSection,
            sections: mainSection.sections.map((section) => {
              if (section.id !== editingSubSectionTarget.sectionId) {
                return section;
              }

              return {
                ...section,
                subSections: section.subSections.map((subSection) =>
                  subSection.id === editingSubSectionTarget.subSectionId
                    ? { ...subSection, name: updatedName }
                    : subSection,
                ),
              };
            }),
          };
        }),
      );
      resetSubSectionEditor();
    } catch (err) {
      showAlert("Failed to update subsection. Please try again.");
    } finally {
      setIsUpdatingStructure(null);
    }
  };

  const deleteSubSection = async (
    mainSectionId: string,
    sectionId: string,
    subSectionId: string,
  ) => {
    if (!certificateId) {
      showAlert(
        "Certificate ID is missing. Please save the certificate first.",
      );
      return;
    }

    setIsDeletingSubSection(subSectionId);
    try {
      await deleteSubSectionAPI(subSectionId);

      setMainSections(
        mainSections.map((mainSection) => {
          if (mainSection.id === mainSectionId) {
            return {
              ...mainSection,
              sections: mainSection.sections.map((section) => {
                if (section.id === sectionId) {
                  return {
                    ...section,
                    subSections: section.subSections.filter(
                      (sub) => sub.id !== subSectionId,
                    ),
                  };
                }
                return section;
              }),
            };
          }
          return mainSection;
        }),
      );
      if (selectedSubSection === subSectionId) {
        setSelectedSubSection(null);
        setSelectedQuestion(null);
      }

      if (editingSubSectionTarget?.subSectionId === subSectionId) {
        resetSubSectionEditor();
      }
    } catch (err) {
      showAlert("Failed to delete subsection. Please try again.");
    } finally {
      setIsDeletingSubSection(null);
    }
  };

  const isLocalQuestionId = (questionId: string) =>
    questionId.startsWith("temp-");
  const isSavedQuestionSelected = Boolean(
    selectedQuestion && !isLocalQuestionId(selectedQuestion),
  );
  const isQuestionActionDisabled =
    isCreatingQuestion ||
    (isSavedQuestionSelected && !hasUnsavedQuestionChanges());
  const questionActionLabel = isCreatingQuestion
    ? isSavedQuestionSelected
      ? "Updating..."
      : "Saving..."
    : isSavedQuestionSelected
      ? "Update Question"
      : "Save Question";

  const removeQuestionFromState = (
    prevMainSections: MainSection[],
    mainSectionId: string,
    sectionId: string,
    subSectionId: string | null,
    questionId: string,
  ) => {
    return prevMainSections.map((mainSection) => {
      if (mainSection.id !== mainSectionId) {
        return mainSection;
      }

      return {
        ...mainSection,
        sections: mainSection.sections.map((section) => {
          if (section.id !== sectionId) {
            return section;
          }

          if (subSectionId) {
            return {
              ...section,
              subSections: section.subSections.map((subSection) => {
                if (subSection.id !== subSectionId) {
                  return subSection;
                }

                return {
                  ...subSection,
                  questions: subSection.questions.filter(
                    (question) => question.id !== questionId,
                  ),
                };
              }),
            };
          }

          return {
            ...section,
            questions: (section.questions || []).filter(
              (question) => question.id !== questionId,
            ),
          };
        }),
      };
    });
  };

  const addQuestion = (
    mainSectionId: string,
    sectionId: string,
    subSectionId?: string | null,
  ) => {
    const newQuestion: Question = {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: "",
      helpText: "",
      type: "",
      hasConditionalLogic: false,
    };

    setMainSections(
      mainSections.map((mainSection) => {
        if (mainSection.id === mainSectionId) {
          return {
            ...mainSection,
            isExpanded: true,
            sections: mainSection.sections.map((section) => {
              if (section.id === sectionId) {
                if (subSectionId) {
                  return {
                    ...section,
                    isExpanded: true,
                    subSections: section.subSections.map((subSection) => {
                      if (subSection.id === subSectionId) {
                        return {
                          ...subSection,
                          questions: [...subSection.questions, newQuestion],
                        };
                      }
                      return subSection;
                    }),
                  };
                }

                const existingQuestions = section.questions || [];
                return {
                  ...section,
                  isExpanded: true,
                  questions: [...existingQuestions, newQuestion],
                };
              }
              return section;
            }),
          };
        }
        return mainSection;
      }),
    );

    setSelectedMainSection(mainSectionId);
    setSelectedSection(sectionId);
    setSelectedSubSection(subSectionId || null);
    setSelectedQuestion(newQuestion.id);
  };

  const deleteQuestion = async (
    mainSectionId: string,
    sectionId: string,
    subSectionId: string | null,
    questionId: string,
  ) => {
    const isLocalOnlyQuestion = isLocalQuestionId(questionId);

    if (!isLocalOnlyQuestion && !certificateId) {
      showAlert(
        "Certificate ID is missing. Please save the certificate first.",
      );
      return;
    }

    setIsDeletingQuestion(questionId);
    try {
      if (!isLocalOnlyQuestion) {
        await deleteQuestionAPI(questionId);
        await fetchDatabaseQuestionCount();
      }

      setMainSections((prev) =>
        removeQuestionFromState(
          prev,
          mainSectionId,
          sectionId,
          subSectionId,
          questionId,
        ),
      );

      if (selectedQuestion === questionId) {
        setSelectedQuestion(null);
      }
    } catch (err) {
      showAlert("Failed to delete question. Please try again.");
    } finally {
      setIsDeletingQuestion(null);
    }
  };

  const createQuestionAPI = async (sectionId: string, questionData: any) => {
    try {
      const response = await axiosInstance.post(
        `/sections/${sectionId}/questions`,
        questionData,
      );
      const createdQuestion = response.data?.data?.questions?.[0] || null;
      return createdQuestion;
    } catch (err) {
      throw err;
    }
  };

  const updateQuestionAPI = async (questionId: string, questionData: any) => {
    try {
      console.log("update question payload:", {
        questionId,
        payload: questionData,
      });
      const response = await axiosInstance.patch(
        `/questions/${questionId}`,
        questionData,
      );
      return response.data;
    } catch (err) {
      throw err;
    }
  };

  const handleSaveQuestion = async () => {
    if (!selectedMainSection || !selectedSection || !selectedQuestion) {
      return;
    }

    if (!questionText.trim()) {
      showAlert("Question text is required");
      return;
    }

    if (!questionType.trim()) {
      showAlert("Question type is required");
      return;
    }

    if (!criteriaInformation.trim()) {
      showAlert("Criteria information is required");
      return;
    }

    const yesSelectedOption = findRedirectOptionByValue(
      redirectOptions,
      yesExitLevel,
    );
    const noSelectedOption = findRedirectOptionByValue(
      redirectOptions,
      noExitLevel,
    );

    if (questionType === "boolean" && hasConditionalLogic) {
      if (!yesSelectedOption || yesRank === "") {
        showAlert("Please select a redirect destination for YES condition");
        return;
      }
      if (!noSelectedOption || noRank === "") {
        showAlert("Please select a redirect destination for NO condition");
        return;
      }
    }

    const conditions: any = {};
    if (questionType === "boolean" && hasConditionalLogic) {
      const yesCondition = buildConditionPayload(yesSelectedOption, yesRank);
      if (yesCondition && yesRank !== "") {
        conditions.yes = yesCondition;
      }

      const noCondition = buildConditionPayload(noSelectedOption, noRank);
      if (noCondition && noRank !== "") {
        conditions.no = noCondition;
      }
    }

    const isForSubSection = Boolean(selectedSubSection);
    const sectionType = isForSubSection ? "sub_section" : "section";
    const targetId = selectedSubSection || selectedSection || "";

    const questionData = {
      section_type: sectionType,
      questions: [
        {
          question: questionText.trim(),
          type: questionType,
          hint: helpText.trim() || undefined,
          criteria: criteriaInformation.trim() || undefined,
          conditions:
            questionType === "boolean" && hasConditionalLogic ? conditions : {},
        },
      ],
    };

    const cleanedQuestion = { ...questionData.questions[0] };
    if (!cleanedQuestion.hint) delete cleanedQuestion.hint;
    if (!cleanedQuestion.criteria) delete cleanedQuestion.criteria;

    const finalQuestionData = {
      section_type: sectionType,
      questions: [cleanedQuestion],
    };

    setIsCreatingQuestion(true);
    try {
      const isNewQuestion = isLocalQuestionId(selectedQuestion);
      let savedQuestionId = selectedQuestion;

      if (isNewQuestion) {
        const createdQuestion = await createQuestionAPI(
          targetId,
          finalQuestionData,
        );
        if (!createdQuestion?.id) {
          throw new Error("Question creation failed");
        }
        savedQuestionId = createdQuestion.id;
      } else {
        await updateQuestionAPI(selectedQuestion, cleanedQuestion);
      }
      await fetchDatabaseQuestionCount();

      setMainSections(
        mainSections.map((mainSection) => {
          if (mainSection.id === selectedMainSection) {
            return {
              ...mainSection,
              sections: mainSection.sections.map((section) => {
                if (section.id === selectedSection) {
                  if (selectedSubSection) {
                    return {
                      ...section,
                      subSections: section.subSections.map((subSection) => {
                        if (subSection.id === selectedSubSection) {
                          return {
                            ...subSection,
                            questions: subSection.questions.map((question) => {
                              if (question.id === selectedQuestion) {
                                return {
                                  ...question,
                                  id: savedQuestionId,
                                  text: questionText.trim(),
                                  helpText: helpText.trim(),
                                  criteriaInformation:
                                    criteriaInformation.trim(),
                                  type: questionType,
                                  hasConditionalLogic:
                                    questionType === "boolean"
                                      ? hasConditionalLogic
                                      : false,
                                  conditionalRules:
                                    questionType === "boolean" &&
                                    hasConditionalLogic
                                      ? buildLocalConditionalRuleState(
                                          yesSelectedOption,
                                          noSelectedOption,
                                          yesRank,
                                          noRank,
                                        )
                                      : undefined,
                                };
                              }
                              return question;
                            }),
                          };
                        }
                        return subSection;
                      }),
                    };
                  }

                  const updatedQuestions = (section.questions || []).map(
                    (question) =>
                      question.id === selectedQuestion
                        ? {
                            ...question,
                            id: savedQuestionId,
                            text: questionText.trim(),
                            helpText: helpText.trim(),
                            criteriaInformation: criteriaInformation.trim(),
                            type: questionType,
                            hasConditionalLogic:
                              questionType === "boolean"
                                ? hasConditionalLogic
                                : false,
                            conditionalRules:
                              questionType === "boolean" && hasConditionalLogic
                                ? buildLocalConditionalRuleState(
                                    yesSelectedOption,
                                    noSelectedOption,
                                    yesRank,
                                    noRank,
                                  )
                                : undefined,
                          }
                        : question,
                  );

                  return {
                    ...section,
                    questions: updatedQuestions,
                  };
                }
                return section;
              }),
            };
          }
          return mainSection;
        }),
      );

      setSelectedQuestion(null);
      setQuestionText("");
      setHelpText("");
      setCriteriaInformation("");
      setQuestionType("");
      setHasConditionalLogic(false);
      setYesExitLevel("");
      setNoExitLevel("");
      setYesRank("");
      setNoRank("");
    } catch (err) {
      showAlert("Failed to save question. Please try again.");
    } finally {
      setIsCreatingQuestion(false);
    }
  };

  const handlePublish = async () => {
    const resolvedCertificateId = certificateId || certificateIdFromUrl;
    if (!resolvedCertificateId) {
      showAlert("Certificate ID is missing. Save the certificate first.");
      return;
    }

    if (isPublished) {
      router.push("/admin/certifications");
      return;
    }

    const totalQuestionsInDatabase = await fetchDatabaseQuestionCount(
      resolvedCertificateId,
    );
    if (totalQuestionsInDatabase === 0) {
      showAlert("Please add at least one question before publishing.");
      return;
    }

    setIsSaving(true);
    try {
      await axiosInstance.patch(
        `/certificates/${resolvedCertificateId}/publish`,
        {
          is_published: true,
        },
      );

      setIsPublished(true);
      setShowSuccessModal(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const serverMessage = err.response?.data?.message;

        if (serverMessage === "Certificate is already published") {
          setIsPublished(true);
          setShowSuccessModal(true);
          return;
        }
      }

      let errorMessage = "Failed to publish certificate. Please try again.";
      if (axios.isAxiosError(err)) {
        const serverMessage = err.response?.data?.message || err.message;
        errorMessage = serverMessage || errorMessage;
      }
      showAlert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDone = () => {
    setShowSuccessModal(false);
    router.push("/admin/certifications");
  };

  const handleAddDocument = () => {
    if (documentInput.trim()) {
      setCompulsoryDocuments([...compulsoryDocuments, documentInput.trim()]);
      setDocumentInput("");
    }
  };

  const handleRemoveDocument = (index: number) => {
    setCompulsoryDocuments(compulsoryDocuments.filter((_, i) => i !== index));
  };

  const prepareBadges = () => {
    const badges: any[] = [];

    const acesRatedColors: any[] = [];
    if (acesRatedEmerald)
      acesRatedColors.push({
        color: "#00C853",
        min_score: parseInt(acesRatedEmerald) || 90,
        max_score: 100,
      });
    if (acesRatedGold)
      acesRatedColors.push({
        color: "#FFD700",
        min_score: parseInt(acesRatedGold) || 80,
        max_score: parseInt(acesRatedEmerald) || 89,
      });
    if (acesRatedSilver)
      acesRatedColors.push({
        color: "#C0C0C0",
        min_score: parseInt(acesRatedSilver) || 70,
        max_score: parseInt(acesRatedGold) || 79,
      });
    if (acesRatedBronze)
      acesRatedColors.push({
        color: "#CD7F32",
        min_score: parseInt(acesRatedBronze) || 50,
        max_score: parseInt(acesRatedSilver) || 69,
      });

    if (acesRatedColors.length > 0) {
      badges.push({
        slot: 1,
        name: "ACES Rated",
        colors: acesRatedColors.reverse(),
      });
    }

    const acesVerifiedColors: any[] = [];
    if (acesVerifiedEmerald)
      acesVerifiedColors.push({
        color: "#00C853",
        min_score: parseInt(acesVerifiedEmerald) || 90,
        max_score: 100,
      });
    if (acesVerifiedGold)
      acesVerifiedColors.push({
        color: "#FFD700",
        min_score: parseInt(acesVerifiedGold) || 80,
        max_score: parseInt(acesVerifiedEmerald) || 89,
      });
    if (acesVerifiedSilver)
      acesVerifiedColors.push({
        color: "#C0C0C0",
        min_score: parseInt(acesVerifiedSilver) || 70,
        max_score: parseInt(acesVerifiedGold) || 79,
      });
    if (acesVerifiedBronze)
      acesVerifiedColors.push({
        color: "#CD7F32",
        min_score: parseInt(acesVerifiedBronze) || 50,
        max_score: parseInt(acesVerifiedSilver) || 69,
      });

    if (acesVerifiedColors.length > 0) {
      badges.push({
        slot: 2,
        name: "ACES Verified",
        colors: acesVerifiedColors.reverse(),
      });
    }

    const acesCertifiedColors: any[] = [];
    if (acesCertifiedEmerald)
      acesCertifiedColors.push({
        color: "#00C853",
        min_score: parseInt(acesCertifiedEmerald) || 90,
        max_score: 100,
      });
    if (acesCertifiedGold)
      acesCertifiedColors.push({
        color: "#FFD700",
        min_score: parseInt(acesCertifiedGold) || 80,
        max_score: parseInt(acesCertifiedEmerald) || 89,
      });
    if (acesCertifiedSilver)
      acesCertifiedColors.push({
        color: "#C0C0C0",
        min_score: parseInt(acesCertifiedSilver) || 70,
        max_score: parseInt(acesCertifiedGold) || 79,
      });

    if (acesCertifiedColors.length > 0) {
      badges.push({
        slot: 3,
        name: "ACES Certified",
        colors: acesCertifiedColors.reverse(),
      });
    }

    return badges;
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!certificationName.trim()) {
      newErrors.certificationName = "Certification name is required";
    }

    if (!certificateIdFromUrl && !productId.trim()) {
      newErrors.productId = "Product ID is required";
    }

    if (industry.length === 0) {
      newErrors.industry = "At least one industry is required";
    }

    if (!selfDisclosurePrice || parseFloat(selfDisclosurePrice) <= 0) {
      newErrors.selfDisclosurePrice =
        "Self Disclosure price is required and must be greater than 0";
    }

    if (!assuredPrice || parseFloat(assuredPrice) <= 0) {
      newErrors.assuredPrice =
        "Assured price is required and must be greater than 0";
    }

    if (!validityDays && !validityMonths && !validityYears) {
      newErrors.validityPeriod =
        "At least one validity period (Days, Months, or Years) is required";
    }

    const hasAcesRatedBadges =
      acesRatedBronze || acesRatedSilver || acesRatedGold || acesRatedEmerald;
    const hasAcesVerifiedBadges = acesVerifiedBronze;
    const hasAcesCertifiedBadges =
      acesCertifiedSilver || acesCertifiedGold || acesCertifiedEmerald;

    if (!hasAcesRatedBadges) {
      newErrors.acesRatedBronze = "At least one ACES Rated badge is required";
    }

    if (!acesVerifiedBronze.trim()) {
      newErrors.acesVerifiedBronze = "Bronze score is required";
    }

    if (!hasAcesCertifiedBadges) {
      newErrors.acesCertifiedSilver =
        "At least one ACES Certified badge is required";
    }

    if (
      acesRatedBronze ||
      acesRatedSilver ||
      acesRatedGold ||
      acesRatedEmerald
    ) {
      const bronze = parseFloat(acesRatedBronze) || 0;
      const silver = parseFloat(acesRatedSilver) || 0;
      const gold = parseFloat(acesRatedGold) || 0;
      const emerald = parseFloat(acesRatedEmerald) || 0;

      if (acesRatedBronze) {
        if (acesRatedSilver && silver <= bronze) {
          newErrors.acesRatedSilver =
            "Silver score must be greater than Bronze";
        }
        if (acesRatedGold && gold <= bronze) {
          newErrors.acesRatedGold = "Gold score must be greater than Bronze";
        }
        if (acesRatedEmerald && emerald <= bronze) {
          newErrors.acesRatedEmerald =
            "Emerald score must be greater than Bronze";
        }
      }

      if (acesRatedSilver) {
        if (acesRatedGold && gold <= silver) {
          newErrors.acesRatedGold = "Gold score must be greater than Silver";
        }
        if (acesRatedEmerald && emerald <= silver) {
          newErrors.acesRatedEmerald =
            "Emerald score must be greater than Silver";
        }
      }

      if (acesRatedGold && acesRatedEmerald && emerald <= gold) {
        newErrors.acesRatedEmerald = "Emerald score must be greater than Gold";
      }
    }

    if (acesCertifiedSilver || acesCertifiedGold || acesCertifiedEmerald) {
      const certifiedSilver = parseFloat(acesCertifiedSilver) || 0;
      const certifiedGold = parseFloat(acesCertifiedGold) || 0;
      const certifiedEmerald = parseFloat(acesCertifiedEmerald) || 0;

      if (acesCertifiedSilver) {
        if (acesCertifiedGold && certifiedGold <= certifiedSilver) {
          newErrors.acesCertifiedGold =
            "Gold score must be greater than Silver";
        }
        if (acesCertifiedEmerald && certifiedEmerald <= certifiedSilver) {
          newErrors.acesCertifiedEmerald =
            "Emerald score must be greater than Silver";
        }
      }

      if (
        acesCertifiedGold &&
        acesCertifiedEmerald &&
        certifiedEmerald <= certifiedGold
      ) {
        newErrors.acesCertifiedEmerald =
          "Emerald score must be greater than Gold";
      }
    }

    if (!shortDescription.trim()) {
      newErrors.shortDescription = "Short description is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearRatedBadgeErrors = () => {
    setErrors((prev) => ({
      ...prev,
      acesRatedBronze: undefined,
      acesRatedSilver: undefined,
      acesRatedGold: undefined,
      acesRatedEmerald: undefined,
    }));
  };

  const clearVerifiedBadgeErrors = () => {
    setErrors((prev) => ({
      ...prev,
      acesVerifiedBronze: undefined,
    }));
  };

  const clearCertifiedBadgeErrors = () => {
    setErrors((prev) => ({
      ...prev,
      acesCertifiedSilver: undefined,
      acesCertifiedGold: undefined,
      acesCertifiedEmerald: undefined,
    }));
  };

  const createCertificate = async (options?: { forcePublished?: boolean }) => {
    const isValid = validateForm();
    if (!isValid) {
      return null;
    }

    setIsSaving(true);
    setSaveError("");

    try {
      const publishValue = options?.forcePublished ?? isPublished;
      const payload = {
        certificate_id: productId.trim(),
        name: certificationName.trim(),
        industry_ids: industry,
        disclosure_price: selfDisclosurePrice
          ? parseFloat(selfDisclosurePrice)
          : 0,
        assured_price: assuredPrice ? parseFloat(assuredPrice) : 0,
        validity_days: validityDays ? parseInt(validityDays) : 0,
        validity_months: validityMonths ? parseInt(validityMonths) : 0,
        validity_years: validityYears ? parseInt(validityYears) : 0,
        compulsory_docs: compulsoryDocuments,
        description: shortDescription.trim(),
        is_published: publishValue,
        badges: prepareBadges(),
      };

      const isEdit = Boolean(certificateIdFromUrl);

      const payloadToSend = payload;

      let response;
      if (isEdit && certificateIdFromUrl) {
        response = await axiosInstance.patch(
          `/certificates/${certificateIdFromUrl}`,
          payloadToSend,
        );
      } else {
        response = await axiosInstance.post("/certificates", payloadToSend);
      }

      const returnedId = response?.data?.data?.id || response?.data?.id;
      if (returnedId) {
        setCertificateId(returnedId);
      }

      return response.data;
    } catch (err) {
      let errorMessage =
        "Failed to create/update certificate. Please try again.";
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      setSaveError(errorMessage);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await createCertificate({ forcePublished: false });

      if (!certificateIdFromUrl) {
        setCertificationName("");
        setProductId("");
        setIndustry([]);
        setSelfDisclosurePrice("");
        setAssuredPrice("");
        setValidityDays("");
        setValidityMonths("");
        setValidityYears("");
        setIsPublished(false);
        setShortDescription("");
        setCompulsoryDocuments([]);
        setDocumentInput("");
        setAcesRatedBronze("");
        setAcesRatedSilver("");
        setAcesRatedGold("");
        setAcesRatedEmerald("");
        setAcesVerifiedBronze("");
        setAcesCertifiedSilver("");
        setAcesCertifiedGold("");
        setAcesCertifiedEmerald("");
        setCertificateId(null);
        setSaveError("");
        setErrors({});
      }
    } catch (err) {}
  };

  const handleSaveAndNext = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const response = await createCertificate();
      if (response?.data?.id) {
        setCertificateId(response.data.id);
        setStep("sections");
      }
    } catch (err) {}
  };

  const handleBackToPreviousStep = () => {
    if (
      hasUnsavedQuestionChanges() &&
      !window.confirm(
        "You have unsaved changes in this question. Press OK to discard and go back, or Cancel to stay.",
      )
    ) {
      return;
    }
    setStep("details");
  };

  if (isLoadingCertificate) {
    return <FullPageSkeleton />;
  }

  if (step === "details") {
    return (
      <div className="relative bg-light-gray p-3 md:p-6">
        {isSaving && <SavingOverlaySkeleton />}

        <div className="mb-4 md:mb-6">
          <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary mb-1 md:mb-2">
            Certifications
          </h1>
          <p className="text-[13px] md:text-[15px] font-normal text-gray">
            Create and manage ESG certifications for your platform
          </p>
        </div>

        <div className="flex items-center  mb-4 md:mb-6 text-sm">
          <button
            onClick={() => router.push("/admin/certifications")}
            className="text-gray hover:text-secondary"
          >
            Certifications
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
          <span className="text-secondary">Create Certifications</span>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-secondary mb-1">
                Certification Details
              </h2>
              <p className="text-sm text-gray">
                Define the basic information for your new certification
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-normal text-secondary mb-2">
                Certification Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={certificationName}
                onChange={(e) => {
                  setCertificationName(e.target.value);
                  if (errors.certificationName) {
                    setErrors((prev) => ({
                      ...prev,
                      certificationName: undefined,
                    }));
                  }
                }}
                className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${
                  errors.certificationName
                    ? "border-red-500 focus:ring-red-200"
                    : "border-zinc-200 focus:ring-zinc-200"
                }`}
              />
              {errors.certificationName && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.certificationName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-normal text-secondary mb-2">
                Product ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  if (errors.productId) {
                    setErrors((prev) => ({ ...prev, productId: undefined }));
                  }
                }}
                placeholder="Enter Product ID"
                className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${
                  errors.productId
                    ? "border-red-500 focus:ring-red-200"
                    : "border-zinc-200 focus:ring-zinc-200"
                }`}
              />
              {errors.productId && (
                <p className="text-xs text-red-500 mt-1">{errors.productId}</p>
              )}
            </div>

            <div className="relative" ref={industryDropdownRef}>
              <label className="block text-sm font-medium text-secondary mb-2">
                Industry <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowIndustryDropdown(!showIndustryDropdown)}
                className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-gray text-sm font-normal leading-[19.2px] tracking-normal appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTciIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxNyAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUuMjQ4NjEgNi4zNzQ3Nkw4LjUwNDM3IDkuNjMwNTFMMTEuNzYwMSA2LjM3NDc2TDEyLjc1NjggNy4zNzE0Mkw4LjUwNDM3IDExLjYyMzhMNC4yNTE5NSA3LjM3MTQyTDUuMjQ4NjEgNi4zNzQ3NloiIGZpbGw9IiM5OTk5OTkiLz4KPC9zdmc+Cg==')] bg-size-[17px_18px] bg-position-[right_1rem_center] bg-no-repeat pr-12 text-left flex items-center justify-between ${
                  errors.industry
                    ? "border-red-500 focus:ring-red-200"
                    : "border-zinc-200 focus:ring-zinc-200"
                }`}
              >
                <span
                  className={
                    industry.length > 0 ? "text-secondary" : "text-gray"
                  }
                >
                  {industry.length > 0
                    ? `${industry.length} industr${industry.length === 1 ? "y" : "ies"} selected`
                    : "Select industries"}
                </span>
              </button>
              {showIndustryDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-md shadow-lg max-h-60 overflow-hidden">
                  <div
                    ref={industryListRef}
                    onScroll={handleIndustryScroll}
                    className="max-h-60 overflow-y-auto"
                  >
                    {isLoadingIndustries && industryOptions.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray text-center">
                        Loading...
                      </div>
                    ) : industryOptions.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray text-center">
                        No industries found
                      </div>
                    ) : (
                      <>
                        {industryOptions.map((option) => {
                          const isSelected = industry.includes(option.value);
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setIndustry(
                                    industry.filter(
                                      (id) => id !== option.value,
                                    ),
                                  );
                                } else {
                                  setIndustry([...industry, option.value]);
                                }
                                if (errors.industry) {
                                  setErrors((prev) => ({
                                    ...prev,
                                    industry: undefined,
                                  }));
                                }
                              }}
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 transition-colors flex items-center justify-between ${
                                isSelected
                                  ? "bg-zinc-100 text-secondary font-medium"
                                  : "text-gray"
                              }`}
                            >
                              <span>{option.label}</span>
                              {isSelected && (
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="text-secondary"
                                >
                                  <path
                                    d="M13.3334 4L6.00002 11.3333L2.66669 8"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                        {isLoadingIndustries && (
                          <div className="px-4 py-2 text-sm text-gray text-center">
                            Loading more...
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-normal text-secondary mb-2">
                Self Disclosure price<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={selfDisclosurePrice}
                onChange={(e) => {
                  setSelfDisclosurePrice(e.target.value);
                  if (errors.selfDisclosurePrice) {
                    setErrors((prev) => ({
                      ...prev,
                      selfDisclosurePrice: undefined,
                    }));
                  }
                }}
                placeholder="Enter Self Disclosure price*"
                min="0"
                step="1"
                className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${
                  errors.selfDisclosurePrice
                    ? "border-red-500 focus:ring-red-200"
                    : "border-zinc-200 focus:ring-zinc-200"
                }`}
              />
              {errors.selfDisclosurePrice && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.selfDisclosurePrice}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-normal text-secondary mb-2">
                Assured Price<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={assuredPrice}
                onChange={(e) => {
                  setAssuredPrice(e.target.value);
                  if (errors.assuredPrice) {
                    setErrors((prev) => ({ ...prev, assuredPrice: undefined }));
                  }
                }}
                placeholder="Enter Assured price"
                min="0"
                step="1"
                className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${
                  errors.assuredPrice
                    ? "border-red-500 focus:ring-red-200"
                    : "border-zinc-200 focus:ring-zinc-200"
                }`}
              />
              {errors.assuredPrice && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.assuredPrice}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-normal text-secondary">
                  Validity Period <span className="text-red-500">*</span>
                </label>
                {errors.validityPeriod && (
                  <span className="text-xs text-red-500">
                    {errors.validityPeriod}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={validityDays}
                  onChange={(e) => {
                    setValidityDays(e.target.value);
                    if (errors.validityPeriod) {
                      setErrors((prev) => ({
                        ...prev,
                        validityPeriod: undefined,
                      }));
                    }
                  }}
                  placeholder="Days"
                  className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${
                    errors.validityPeriod
                      ? "border-red-500 focus:ring-red-200"
                      : "border-zinc-200 focus:ring-zinc-200"
                  }`}
                />
                <input
                  type="text"
                  value={validityMonths}
                  onChange={(e) => {
                    setValidityMonths(e.target.value);
                    if (errors.validityPeriod) {
                      setErrors((prev) => ({
                        ...prev,
                        validityPeriod: undefined,
                      }));
                    }
                  }}
                  placeholder="Months"
                  className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${
                    errors.validityPeriod
                      ? "border-red-500 focus:ring-red-200"
                      : "border-zinc-200 focus:ring-zinc-200"
                  }`}
                />
                <input
                  type="text"
                  value={validityYears}
                  onChange={(e) => {
                    setValidityYears(e.target.value);
                    if (errors.validityPeriod) {
                      setErrors((prev) => ({
                        ...prev,
                        validityPeriod: undefined,
                      }));
                    }
                  }}
                  placeholder="Years"
                  className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${
                    errors.validityPeriod
                      ? "border-red-500 focus:ring-red-200"
                      : "border-zinc-200 focus:ring-zinc-200"
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-normal text-secondary mb-2">
                Compulsory documents
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={documentInput}
                  onChange={(e) => setDocumentInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddDocument()}
                  placeholder="Add Compulsory documents"
                  className="flex-1 px-4 py-3 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 text-sm font-normal leading-[19.2px] tracking-normal"
                />
                <button
                  type="button"
                  onClick={handleAddDocument}
                  className="w-10 h-10 bg-black text-white rounded-md flex items-center justify-center hover:bg-gray-800 transition-colors"
                >
                  <img
                    src="/assets/imgs/admin/certifications/plus.svg"
                    alt="Add"
                    className="w-5 h-5"
                  />
                </button>
              </div>
              {compulsoryDocuments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {compulsoryDocuments.map((doc, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-sm rounded-md"
                    >
                      {doc.length > 20 ? `${doc.substring(0, 20)}...` : doc}
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(index)}
                        className="hover:text-red-500 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-base font-semibold text-secondary">
                Add Badge <span className="text-red-500">*</span>
              </h3>
              {errors.badges && (
                <span className="text-xs text-red-500">{errors.badges}</span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 mb-4">
              <div>
                <label className="block text-xs text-transparent mb-1 select-none">
                  Type
                </label>
                <div className="w-full h-[42px] px-4 py-3 border border-zinc-200 rounded-md bg-white text-sm font-normal leading-[19.2px] tracking-normal flex items-center">
                  ACES Rated
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray mb-1">Bronze*</label>
                <input
                  type="number"
                  placeholder="Enter Score"
                  value={acesRatedBronze}
                  onChange={(e) => {
                    setAcesRatedBronze(e.target.value);
                    if (
                      errors.acesRatedBronze ||
                      errors.acesRatedSilver ||
                      errors.acesRatedGold ||
                      errors.acesRatedEmerald
                    ) {
                      clearRatedBadgeErrors();
                    }
                  }}
                  className={`w-full h-[42px] px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${
                    errors.acesRatedBronze
                      ? "border-red-500 focus:ring-red-200"
                      : "border-zinc-200 focus:ring-zinc-200"
                  }`}
                />
                {errors.acesRatedBronze && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {errors.acesRatedBronze}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray mb-1">Silver*</label>
                <input
                  type="number"
                  placeholder="Enter Score"
                  value={acesRatedSilver}
                  onChange={(e) => {
                    setAcesRatedSilver(e.target.value);
                    if (
                      errors.acesRatedBronze ||
                      errors.acesRatedSilver ||
                      errors.acesRatedGold ||
                      errors.acesRatedEmerald
                    ) {
                      clearRatedBadgeErrors();
                    }
                  }}
                  className={`w-full h-[42px] px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${
                    errors.acesRatedSilver
                      ? "border-red-500 focus:ring-red-200"
                      : "border-zinc-200 focus:ring-zinc-200"
                  }`}
                />
                {errors.acesRatedSilver && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {errors.acesRatedSilver}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray mb-1">Gold*</label>
                <input
                  type="number"
                  placeholder="Enter Score"
                  value={acesRatedGold}
                  onChange={(e) => {
                    setAcesRatedGold(e.target.value);
                    if (
                      errors.acesRatedBronze ||
                      errors.acesRatedSilver ||
                      errors.acesRatedGold ||
                      errors.acesRatedEmerald
                    ) {
                      clearRatedBadgeErrors();
                    }
                  }}
                  className={`w-full h-[42px] px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${
                    errors.acesRatedGold
                      ? "border-red-500 focus:ring-red-200"
                      : "border-zinc-200 focus:ring-zinc-200"
                  }`}
                />
                {errors.acesRatedGold && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {errors.acesRatedGold}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray mb-1">Emerald*</label>
                <input
                  type="number"
                  placeholder="Enter Score"
                  value={acesRatedEmerald}
                  onChange={(e) => {
                    setAcesRatedEmerald(e.target.value);
                    if (
                      errors.acesRatedBronze ||
                      errors.acesRatedSilver ||
                      errors.acesRatedGold ||
                      errors.acesRatedEmerald
                    ) {
                      clearRatedBadgeErrors();
                    }
                  }}
                  className={`w-full h-[42px] px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${
                    errors.acesRatedEmerald
                      ? "border-red-500 focus:ring-red-200"
                      : "border-zinc-200 focus:ring-zinc-200"
                  }`}
                />
                {errors.acesRatedEmerald && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {errors.acesRatedEmerald}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 mb-4">
              <div>
                <label className="block text-xs text-transparent mb-1 select-none">
                  Type
                </label>
                <div className="w-full h-[42px] px-4 py-3 border border-zinc-200 rounded-md bg-white text-sm font-normal leading-[19.2px] tracking-normal flex items-center">
                  ACES Verified
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray mb-1">Bronze*</label>
                <input
                  type="number"
                  placeholder="Enter Score"
                  value={acesVerifiedBronze}
                  onChange={(e) => {
                    setAcesVerifiedBronze(e.target.value);
                    if (errors.acesVerifiedBronze) {
                      clearVerifiedBadgeErrors();
                    }
                  }}
                  className={`w-full h-[42px] px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${
                    errors.acesVerifiedBronze
                      ? "border-red-500 focus:ring-red-200"
                      : "border-zinc-200 focus:ring-zinc-200"
                  }`}
                />
                {errors.acesVerifiedBronze && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {errors.acesVerifiedBronze}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray mb-1">Silver*</label>
                <input
                  type="number"
                  placeholder="Enter Score"
                  value={acesVerifiedSilver}
                  onChange={(e) => {
                    setAcesVerifiedSilver(e.target.value);
                    if (errors.acesVerifiedSilver) {
                      setErrors((prev) => ({
                        ...prev,
                        acesVerifiedSilver: undefined,
                      }));
                    }
                  }}
                  className={`w-full h-[42px] px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${
                    errors.acesVerifiedSilver
                      ? "border-red-500 focus:ring-red-200"
                      : "border-zinc-200 focus:ring-zinc-200"
                  }`}
                />
                {errors.acesVerifiedSilver && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {errors.acesVerifiedSilver}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray mb-1">Gold*</label>
                <input
                  type="number"
                  placeholder="Enter Score"
                  value={acesVerifiedGold}
                  onChange={(e) => {
                    setAcesVerifiedGold(e.target.value);
                    if (errors.acesVerifiedGold) {
                      setErrors((prev) => ({
                        ...prev,
                        acesVerifiedGold: undefined,
                      }));
                    }
                  }}
                  className={`w-full h-[42px] px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${
                    errors.acesVerifiedGold
                      ? "border-red-500 focus:ring-red-200"
                      : "border-zinc-200 focus:ring-zinc-200"
                  }`}
                />
                {errors.acesVerifiedGold && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {errors.acesVerifiedGold}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray mb-1">Emerald*</label>
                <input
                  type="number"
                  placeholder="Enter Score"
                  value={acesVerifiedEmerald}
                  onChange={(e) => {
                    setAcesVerifiedEmerald(e.target.value);
                    if (errors.acesVerifiedEmerald) {
                      setErrors((prev) => ({
                        ...prev,
                        acesVerifiedEmerald: undefined,
                      }));
                    }
                  }}
                  className={`w-full h-[42px] px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${
                    errors.acesVerifiedEmerald
                      ? "border-red-500 focus:ring-red-200"
                      : "border-zinc-200 focus:ring-zinc-200"
                  }`}
                />
                {errors.acesVerifiedEmerald && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {errors.acesVerifiedEmerald}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 mb-4">
              <div>
                <label className="block text-xs text-transparent mb-1 select-none">
                  Type
                </label>
                <div className="w-full h-[42px] px-4 py-3 border border-zinc-200 rounded-md bg-white text-sm font-normal leading-[19.2px] tracking-normal flex items-center">
                  ACES Certified
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Bronze*
                </label>
                <input
                  type="text"
                  placeholder="Enter Score"
                  className="w-full h-[42px] px-4 py-3 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 bg-gray-50 text-sm font-normal leading-[19.2px] tracking-normal"
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs text-gray mb-1">Silver*</label>
                <input
                  type="number"
                  placeholder="Enter Score"
                  value={acesCertifiedSilver}
                  onChange={(e) => {
                    setAcesCertifiedSilver(e.target.value);
                    if (
                      errors.acesCertifiedSilver ||
                      errors.acesCertifiedGold ||
                      errors.acesCertifiedEmerald
                    ) {
                      clearCertifiedBadgeErrors();
                    }
                  }}
                  className={`w-full h-[42px] px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${
                    errors.acesCertifiedSilver
                      ? "border-red-500 focus:ring-red-200"
                      : "border-zinc-200 focus:ring-zinc-200"
                  }`}
                />
                {errors.acesCertifiedSilver && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {errors.acesCertifiedSilver}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray mb-1">Gold*</label>
                <input
                  type="number"
                  placeholder="Enter Score"
                  value={acesCertifiedGold}
                  onChange={(e) => {
                    setAcesCertifiedGold(e.target.value);
                    if (
                      errors.acesCertifiedSilver ||
                      errors.acesCertifiedGold ||
                      errors.acesCertifiedEmerald
                    ) {
                      clearCertifiedBadgeErrors();
                    }
                  }}
                  className={`w-full h-[42px] px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${
                    errors.acesCertifiedGold
                      ? "border-red-500 focus:ring-red-200"
                      : "border-zinc-200 focus:ring-zinc-200"
                  }`}
                />
                {errors.acesCertifiedGold && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {errors.acesCertifiedGold}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray mb-1">Emerald*</label>
                <input
                  type="number"
                  placeholder="Enter Score"
                  value={acesCertifiedEmerald}
                  onChange={(e) => {
                    setAcesCertifiedEmerald(e.target.value);
                    if (
                      errors.acesCertifiedSilver ||
                      errors.acesCertifiedGold ||
                      errors.acesCertifiedEmerald
                    ) {
                      clearCertifiedBadgeErrors();
                    }
                  }}
                  className={`w-full h-[42px] px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${
                    errors.acesCertifiedEmerald
                      ? "border-red-500 focus:ring-red-200"
                      : "border-zinc-200 focus:ring-zinc-200"
                  }`}
                />
                {errors.acesCertifiedEmerald && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {errors.acesCertifiedEmerald}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-normal text-secondary mb-2">
              Short Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={shortDescription}
              onChange={(e) => {
                setShortDescription(e.target.value);
                if (errors.shortDescription) {
                  setErrors((prev) => ({
                    ...prev,
                    shortDescription: undefined,
                  }));
                }
              }}
              placeholder="Brief description of the certification purpose and scope...."
              rows={4}
              className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 resize-none text-sm font-normal leading-[19.2px] tracking-normal ${
                errors.shortDescription
                  ? "border-red-500 focus:ring-red-200"
                  : "border-zinc-200 focus:ring-zinc-200"
              }`}
            />
            {errors.shortDescription && (
              <p className="text-xs text-red-500 mt-1">
                {errors.shortDescription}
              </p>
            )}
          </div>
        </div>

        {saveError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{saveError}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="px-6 py-2.5 border border-zinc-200 rounded-md text-sm font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={handleSaveAndNext}
            disabled={isSaving}
            className="px-6 py-2.5 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save & Next"}
          </button>
        </div>

        <AlertPop
          isOpen={alertModal.isOpen}
          title={alertModal.title}
          subText={alertModal.subText}
          buttonTitle={alertModal.buttonTitle}
          onPress={handleAlertAction}
          onClose={closeAlertModal}
        />
      </div>
    );
  }

  const hasActiveCertificateId = Boolean(certificateId || certificateIdFromUrl);
  const isPublishDisabled =
    isSaving ||
    isCheckingPublishEligibility ||
    !hasActiveCertificateId ||
    (!isPublished && (databaseQuestionCount ?? 0) === 0);

  return (
    <div className="relative bg-light-gray p-3 md:p-6">
      {isSaving && <SavingOverlaySkeleton />}

      <div className="mb-4 md:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary mb-1 md:mb-2">
              Certifications
            </h1>
            <p className="text-[13px] md:text-[15px] font-normal text-gray">
              Create and manage ESG certifications for your platform
            </p>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <button
                onClick={() => router.push("/admin/certifications")}
                className="text-gray hover:text-secondary"
              >
                Certifications
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
              <button
                onClick={handleBackToPreviousStep}
                className="text-gray hover:text-secondary"
              >
                Create Certifications
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
              <span className="text-secondary">Sections & Questions</span>
            </div>
          </div>
          <button
            onClick={handlePublish}
            disabled={isPublishDisabled}
            className={`px-6 py-2.5 bg-black text-white rounded-md text-sm font-medium transition-colors ${
              isPublishDisabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-gray-800"
            }`}
          >
            Publish
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden flex flex-col h-[calc(100vh-180px)]">
          <div className="p-4 border-b border-zinc-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-secondary">
                Main Sections
              </h2>
              <button
                onClick={() => {
                  if (showAddMainSectionInput) {
                    resetMainSectionEditor();
                    return;
                  }

                  setEditingMainSectionId(null);
                  setNewMainSectionName("");
                  setShowAddMainSectionInput(true);
                }}
                className="w-9 h-9 bg-black text-white rounded-md flex items-center justify-center hover:bg-gray-800 transition-colors"
              >
                <span className="text-xl">+</span>
              </button>
            </div>
          </div>

          {showAddMainSectionInput && (
            <div className="p-4  bg-white">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newMainSectionName}
                  onChange={(e) => setNewMainSectionName(e.target.value)}
                  placeholder="Enter Main Section Name"
                  className="flex-1 px-3 py-3 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 text-sm font-normal leading-[19.2px] tracking-normal"
                  onKeyPress={(e) => e.key === "Enter" && addMainSection()}
                />
                <button
                  onClick={addMainSection}
                  disabled={isCreatingSection}
                  className="px-3 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {isCreatingSection ? "Adding..." : "Add"}
                </button>
                <button
                  onClick={resetMainSectionEditor}
                  className="w-10 h-10 flex items-center justify-center border border-zinc-200 rounded-md hover:bg-gray-50 transition-colors shrink-0"
                  title="Cancel"
                >
                  <img
                    src="/assets/imgs/admin/commons/cross.svg"
                    alt="Cancel"
                    className="w-5 h-5"
                  />
                </button>
              </div>
            </div>
          )}

          <div className="p-4 overflow-y-auto flex-1">
            {mainSections.length === 0 && !showAddMainSectionInput ? (
              <div className="py-12 text-center">
                <div className="w-[105px] h-[105px] mx-auto mb-4">
                  <svg
                    width="105"
                    height="105"
                    viewBox="0 0 105 105"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="105" height="105" rx="52.5" fill="#F6F6F6" />
                    <path
                      d="M41.3504 29.366L31.187 33.7189L41.9827 58.9261L46.1659 57.1346L43.3621 37.6402L43.2321 36.7353L51.2116 35.5877L49.9401 32.619C48.2459 33.0022 47.0079 32.9693 45.1259 34.7581L44.5172 35.3363L43.8894 34.7793C42.0493 33.147 41.7741 31.0656 41.3504 29.366ZM43.2711 29.4159C43.6005 30.7164 43.8333 31.8814 44.5688 32.8366C45.8706 31.7994 47.0517 31.3916 48.1185 31.1371C46.6474 30.3577 45.107 29.8963 43.2711 29.4159ZM56.2453 36.7108L45.3018 38.2846L49.2054 65.4272L52.961 64.887L55.316 45.1843L55.4245 44.2768L64.1676 45.3218L63.7006 42.0759C61.9647 42.0078 60.7777 41.6554 58.4966 42.8961L57.7592 43.2973L57.2969 42.5966C55.9421 40.5437 56.2148 38.4622 56.2453 36.7108ZM58.0876 37.2558C58.0691 38.5975 57.9924 39.783 58.4557 40.8961C59.9817 40.2311 61.2282 40.143 62.3246 40.1732C61.1052 39.0396 59.7366 38.1951 58.0876 37.2558ZM57.0227 46.309L53.7683 73.5371L71.3153 75.6342L73.8135 54.7333C72.1543 54.2181 71.0987 53.5702 68.5743 54.1783L67.7583 54.3749L67.4933 53.5787C66.7158 51.2451 67.5179 49.305 68.0008 47.6212L57.0227 46.309ZM69.6393 48.6246C69.2743 49.9157 68.8933 51.0409 69.0528 52.2359C70.6988 51.9886 71.9256 52.2261 72.9767 52.5391C72.0923 51.1285 70.9891 49.9585 69.6393 48.6246Z"
                      fill="#999999"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm mb-4">
                  No main sections created yet
                </p>
                <button
                  onClick={() => {
                    setEditingMainSectionId(null);
                    setNewMainSectionName("");
                    setShowAddMainSectionInput(true);
                  }}
                  className="px-4 py-2 border border-zinc-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
                >
                  <span>+</span> Add Main Section
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {mainSections.map((mainSection) => (
                  <div key={mainSection.id} className="bg-white">
                    <div className="flex items-start justify-between p-3 hover:bg-gray-50">
                      <div
                        className="flex items-start gap-2 flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          if (
                            !canNavigateQuestion(
                              mainSection.id,
                              null,
                              null,
                              null,
                            )
                          ) {
                            return;
                          }

                          setSelectedMainSection(mainSection.id);
                          setSelectedSection(null);
                          setSelectedSubSection(null);
                          setSelectedQuestion(null);
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMainSection(mainSection.id);
                          }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {mainSection.isExpanded ? (
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M16.5938 15.3071L12 10.8675L7.40625 15.3071L6 13.948L12 8.1493L18 13.948L16.5938 15.3071Z"
                                fill="#262626"
                              />
                            </svg>
                          ) : (
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 20 20"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M6.17188 7.24414L10 10.9439L13.8281 7.24414L15 8.37671L10 13.209L5 8.37671L6.17188 7.24414Z"
                                fill="#999999"
                              />
                            </svg>
                          )}
                        </button>
                        <span
                          className={`text-sm font-semibold break-words whitespace-normal ${
                            selectedMainSection === mainSection.id &&
                            !selectedSection
                              ? "text-black"
                              : "text-secondary"
                          }`}
                        >
                          {mainSection.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingSectionTarget(null);
                            setShowAddSectionInput(mainSection.id);
                            setNewSectionName("");
                          }}
                          className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded"
                          title="Add Section"
                        >
                          <img
                            src="/assets/imgs/admin/certifications/plus.svg"
                            alt="Add"
                            className="w-5 h-5"
                            style={{ filter: "brightness(0)" }}
                          />
                        </button>
                        <button
                          onClick={() => startEditingMainSection(mainSection)}
                          className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded"
                          title="Edit Main Section"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M12 20H21"
                              stroke="#262626"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M16.5 3.5C17.3284 2.67157 18.6716 2.67157 19.5 3.5C20.3284 4.32843 20.3284 5.67157 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z"
                              stroke="#262626"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteMainSection(mainSection.id)}
                          disabled={isDeletingMainSection === mainSection.id}
                          className="w-6 h-6 flex items-center justify-center hover:bg-red-50 rounded text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isDeletingMainSection === mainSection.id ? (
                            <span className="text-xs">...</span>
                          ) : (
                            <img
                              src="/assets/imgs/admin/certifications/delete.svg"
                              alt="Delete"
                              className="w-5 h-5"
                            />
                          )}
                        </button>
                      </div>
                    </div>

                    {editingMainSectionId === mainSection.id && (
                      <div className="p-3 bg-white">
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={newMainSectionName}
                            onChange={(e) =>
                              setNewMainSectionName(e.target.value)
                            }
                            placeholder="Enter Main Section Name"
                            className="flex-1 px-3 py-3 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 text-sm font-normal leading-[19.2px] tracking-normal"
                            onKeyPress={(e) =>
                              e.key === "Enter" && updateMainSection()
                            }
                            autoFocus
                          />
                          <button
                            onClick={updateMainSection}
                            disabled={isUpdatingStructure === mainSection.id}
                            className="px-3 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                          >
                            {isUpdatingStructure === mainSection.id
                              ? "Updating..."
                              : "Update"}
                          </button>
                          <button
                            onClick={resetMainSectionEditor}
                            className="w-10 h-10 flex items-center justify-center border border-zinc-200 rounded-md hover:bg-gray-50 transition-colors shrink-0"
                            title="Cancel"
                          >
                            <img
                              src="/assets/imgs/admin/commons/cross.svg"
                              alt="Cancel"
                              className="w-5 h-5"
                            />
                          </button>
                        </div>
                      </div>
                    )}

                    {showAddSectionInput === mainSection.id && (
                      <div className="pl-6 p-3 bg-white">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSectionName}
                            onChange={(e) => setNewSectionName(e.target.value)}
                            placeholder="Enter Section Name"
                            className="flex-1 px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 text-sm font-normal leading-[19.2px] tracking-normal"
                            onKeyPress={(e) =>
                              e.key === "Enter" && addSection(mainSection.id)
                            }
                            autoFocus
                          />
                          <button
                            onClick={() => addSection(mainSection.id)}
                            disabled={isCreatingSection}
                            className="px-3 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isCreatingSection ? "Adding..." : "Add"}
                          </button>
                          <button
                            onClick={resetSectionEditor}
                            className="w-10 h-10 flex items-center justify-center border border-zinc-200 rounded-md hover:bg-gray-50 transition-colors"
                            title="Cancel"
                          >
                            <img
                              src="/assets/imgs/admin/commons/cross.svg"
                              alt="Cancel"
                              className="w-5 h-5"
                            />
                          </button>
                        </div>
                      </div>
                    )}

                    {mainSection.isExpanded &&
                      mainSection.sections.length > 0 && (
                        <div className="bg-white">
                          {mainSection.sections.map((section) => (
                            <div key={section.id} className="pl-6">
                              <div className="flex items-start justify-between p-3 hover:bg-gray-100">
                                <div
                                  className="flex items-start gap-2 flex-1 min-w-0 cursor-pointer"
                                  onClick={() => {
                                    if (
                                      !canNavigateQuestion(
                                        mainSection.id,
                                        section.id,
                                        null,
                                        null,
                                      )
                                    ) {
                                      return;
                                    }
                                    setSelectedMainSection(mainSection.id);
                                    setSelectedSection(section.id);
                                    setSelectedSubSection(null);
                                    setSelectedQuestion(null);
                                  }}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSection(mainSection.id, section.id);
                                    }}
                                    className="text-gray-500 hover:text-gray-700"
                                  >
                                    {section.isExpanded ? (
                                      <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 16 16"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          d="M4 6L8 10L12 6"
                                          stroke="#999999"
                                          strokeWidth="1.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    ) : (
                                      <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 16 16"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          d="M6 4L10 8L6 12"
                                          stroke="#999999"
                                          strokeWidth="1.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    )}
                                  </button>
                                  <span
                                    className={`text-sm font-medium break-words whitespace-normal ${
                                      selectedSection === section.id &&
                                      !selectedSubSection
                                        ? "text-black"
                                        : "text-[#999999]"
                                    }`}
                                  >
                                    {section.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingSubSectionTarget(null);
                                      setShowAddSubSectionInput(section.id);
                                      setNewSubSectionName("");
                                    }}
                                    className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded"
                                    title="Add Sub-Section"
                                  >
                                    <img
                                      src="/assets/imgs/admin/certifications/plus.svg"
                                      alt="Add"
                                      className="w-4 h-4"
                                      style={{ filter: "brightness(0)" }}
                                    />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditingSection(
                                        mainSection.id,
                                        section,
                                      );
                                    }}
                                    className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded"
                                    title="Edit Section"
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        d="M12 20H21"
                                        stroke="#262626"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                      <path
                                        d="M16.5 3.5C17.3284 2.67157 18.6716 2.67157 19.5 3.5C20.3284 4.32843 20.3284 5.67157 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z"
                                        stroke="#262626"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() =>
                                      deleteSection(mainSection.id, section.id)
                                    }
                                    disabled={isDeletingSection === section.id}
                                    className="w-6 h-6 flex items-center justify-center hover:bg-red-50 rounded text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isDeletingSection === section.id ? (
                                      <span className="text-xs">...</span>
                                    ) : (
                                      <img
                                        src="/assets/imgs/admin/certifications/delete.svg"
                                        alt="Delete"
                                        className="w-4 h-4"
                                      />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {editingSectionTarget?.sectionId ===
                                section.id && (
                                <div className="pl-6 p-3 bg-white">
                                  <div className="flex gap-2 items-center">
                                    <input
                                      type="text"
                                      value={newSectionName}
                                      onChange={(e) =>
                                        setNewSectionName(e.target.value)
                                      }
                                      placeholder="Enter Section Name"
                                      className="flex-1 max-w-[220px] px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 text-sm font-normal leading-[19.2px] tracking-normal"
                                      onKeyPress={(e) =>
                                        e.key === "Enter" && updateSection()
                                      }
                                      autoFocus
                                    />
                                    <button
                                      onClick={updateSection}
                                      disabled={
                                        isUpdatingStructure === section.id
                                      }
                                      className="px-3 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {isUpdatingStructure === section.id
                                        ? "Updating..."
                                        : "Update"}
                                    </button>
                                    <button
                                      onClick={resetSectionEditor}
                                      className="w-6 h-10 flex items-center justify-center border border-zinc-200 rounded-md hover:bg-gray-50 transition-colors shrink-0"
                                      title="Cancel"
                                    >
                                      <img
                                        src="/assets/imgs/admin/commons/cross.svg"
                                        alt="Cancel"
                                        className="w-5 h-5"
                                      />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {showAddSubSectionInput === section.id && (
                                <div className="pl-6 p-3 bg-white">
                                  <div className="flex gap-2 items-center">
                                    <input
                                      type="text"
                                      value={newSubSectionName}
                                      onChange={(e) =>
                                        setNewSubSectionName(e.target.value)
                                      }
                                      placeholder="Enter Sub-Section Name"
                                      className="flex-1 max-w-[180px] px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 text-sm font-normal leading-[19.2px] tracking-normal"
                                      onKeyPress={(e) =>
                                        e.key === "Enter" &&
                                        addSubSection(
                                          mainSection.id,
                                          section.id,
                                        )
                                      }
                                      autoFocus
                                    />
                                    <button
                                      onClick={() =>
                                        addSubSection(
                                          mainSection.id,
                                          section.id,
                                        )
                                      }
                                      disabled={isCreatingSubSection}
                                      className="px-3 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {isCreatingSubSection
                                        ? "Adding..."
                                        : "Add"}
                                    </button>
                                    <button
                                      onClick={resetSubSectionEditor}
                                      className="w-6 h-10 flex items-center justify-center border border-zinc-200 rounded-md hover:bg-gray-50 transition-colors shrink-0"
                                      title="Cancel"
                                    >
                                      <img
                                        src="/assets/imgs/admin/commons/cross.svg"
                                        alt="Cancel"
                                        className="w-5 h-5"
                                      />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {section.isExpanded &&
                                section.questions &&
                                section.questions.length > 0 && (
                                  <div className="pl-6 bg-white">
                                    {section.questions.map((question, idx) => (
                                      <button
                                        key={question.id}
                                        onClick={() => {
                                          if (
                                            !canNavigateQuestion(
                                              mainSection.id,
                                              section.id,
                                              null,
                                              question.id,
                                            )
                                          ) {
                                            return;
                                          }
                                          setSelectedMainSection(
                                            mainSection.id,
                                          );
                                          setSelectedSection(section.id);
                                          setSelectedSubSection(null);
                                          setSelectedQuestion(question.id);
                                        }}
                                        className={`w-full text-left p-3 text-sm hover:bg-gray-50 ${
                                          selectedQuestion === question.id
                                            ? ""
                                            : ""
                                        }`}
                                      >
                                        <div className="flex items-start gap-2 min-w-0">
                                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 shrink-0"></span>
                                          <span
                                            className={`block min-w-0 ${selectedQuestion === question.id ? "text-black" : "text-[#999999]"}`}
                                            style={{
                                              display: "-webkit-box",
                                              WebkitLineClamp: 2,
                                              WebkitBoxOrient: "vertical",
                                              overflow: "hidden",
                                            }}
                                          >
                                            Q:{idx + 1}{" "}
                                            {question.text ||
                                              "Write your question..."}
                                          </span>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}

                              {section.isExpanded &&
                                section.subSections.length > 0 && (
                                  <div className="bg-white">
                                    {section.subSections.map((subSection) => (
                                      <div key={subSection.id} className="pl-6">
                                        <div
                                          onClick={() => {
                                            if (
                                              !canNavigateQuestion(
                                                mainSection.id,
                                                section.id,
                                                subSection.id,
                                                null,
                                              )
                                            ) {
                                              return;
                                            }
                                            setSelectedMainSection(
                                              mainSection.id,
                                            );
                                            setSelectedSection(section.id);
                                            setSelectedSubSection(
                                              subSection.id,
                                            );
                                            setSelectedQuestion(null);
                                          }}
                                          className={`flex items-center justify-between p-3 cursor-pointer ${
                                            selectedSubSection === subSection.id
                                              ? "bg-light-gray-2"
                                              : "hover:bg-gray-100"
                                          }`}
                                        >
                                          <div className="flex items-start gap-2 flex-1 min-w-0">
                                            <span
                                              className={`text-sm break-words whitespace-normal ${
                                                selectedSubSection ===
                                                subSection.id
                                                  ? "text-black"
                                                  : "text-[#999999]"
                                              }`}
                                            >
                                              {subSection.name}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                startEditingSubSection(
                                                  mainSection.id,
                                                  section.id,
                                                  subSection,
                                                );
                                              }}
                                              className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded"
                                              title="Edit Sub-Section"
                                            >
                                              <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                              >
                                                <path
                                                  d="M12 20H21"
                                                  stroke="#262626"
                                                  strokeWidth="1.8"
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                />
                                                <path
                                                  d="M16.5 3.5C17.3284 2.67157 18.6716 2.67157 19.5 3.5C20.3284 4.32843 20.3284 5.67157 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z"
                                                  stroke="#262626"
                                                  strokeWidth="1.8"
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                />
                                              </svg>
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                deleteSubSection(
                                                  mainSection.id,
                                                  section.id,
                                                  subSection.id,
                                                );
                                              }}
                                              disabled={
                                                isDeletingSubSection ===
                                                subSection.id
                                              }
                                              className="w-6 h-6 flex items-center justify-center hover:bg-red-50 rounded text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                              {isDeletingSubSection ===
                                              subSection.id ? (
                                                <span className="text-xs">
                                                  ...
                                                </span>
                                              ) : (
                                                <img
                                                  src="/assets/imgs/admin/certifications/delete.svg"
                                                  alt="Delete"
                                                  className="w-4 h-4"
                                                />
                                              )}
                                            </button>
                                          </div>
                                        </div>

                                        {editingSubSectionTarget?.subSectionId ===
                                          subSection.id && (
                                          <div className="pl-6 p-3 bg-white">
                                            <div className="flex gap-2 items-center">
                                              <input
                                                type="text"
                                                value={newSubSectionName}
                                                onChange={(e) =>
                                                  setNewSubSectionName(
                                                    e.target.value,
                                                  )
                                                }
                                                placeholder="Enter Sub-Section Name"
                                                className="flex-1 max-w-[220px] px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 text-sm font-normal leading-[19.2px] tracking-normal"
                                                onKeyPress={(e) =>
                                                  e.key === "Enter" &&
                                                  updateSubSection()
                                                }
                                                autoFocus
                                              />
                                              <button
                                                onClick={updateSubSection}
                                                disabled={
                                                  isUpdatingStructure ===
                                                  subSection.id
                                                }
                                                className="px-3 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                              >
                                                {isUpdatingStructure ===
                                                subSection.id
                                                  ? "Updating..."
                                                  : "Update"}
                                              </button>
                                              <button
                                                onClick={resetSubSectionEditor}
                                                className="w-6 h-10 flex items-center justify-center border border-zinc-200 rounded-md hover:bg-gray-50 transition-colors shrink-0"
                                                title="Cancel"
                                              >
                                                <img
                                                  src="/assets/imgs/admin/commons/cross.svg"
                                                  alt="Cancel"
                                                  className="w-5 h-5"
                                                />
                                              </button>
                                            </div>
                                          </div>
                                        )}

                                        {subSection.questions.length > 0 && (
                                          <div className="pl-6 bg-white">
                                            {subSection.questions.map(
                                              (question, idx) => (
                                                <button
                                                  key={question.id}
                                                  onClick={() => {
                                                    if (
                                                      !canNavigateQuestion(
                                                        mainSection.id,
                                                        section.id,
                                                        subSection.id,
                                                        question.id,
                                                      )
                                                    ) {
                                                      return;
                                                    }
                                                    setSelectedMainSection(
                                                      mainSection.id,
                                                    );
                                                    setSelectedSection(
                                                      section.id,
                                                    );
                                                    setSelectedSubSection(
                                                      subSection.id,
                                                    );
                                                    setSelectedQuestion(
                                                      question.id,
                                                    );
                                                  }}
                                                  className={`w-full text-left p-3 text-sm hover:bg-gray-50 ${
                                                    selectedQuestion ===
                                                    question.id
                                                      ? ""
                                                      : ""
                                                  }`}
                                                >
                                                  <div className="flex items-start gap-2 min-w-0">
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 shrink-0"></span>
                                                    <span
                                                      className={`block min-w-0 ${selectedQuestion === question.id ? "text-black" : "text-[#999999]"}`}
                                                      style={{
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient:
                                                          "vertical",
                                                        overflow: "hidden",
                                                      }}
                                                    >
                                                      Q:{idx + 1}{" "}
                                                      {question.text ||
                                                        "Write your question..."}
                                                    </span>
                                                  </div>
                                                </button>
                                              ),
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 ">
          <div className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden flex flex-col flex-1">
            <div className="p-4 border-b border-zinc-200">
              <div
                className={`flex items-center justify-between ${selectedSection && selectedSubSection ? "" : "py-1"}`}
              >
                <h2 className="text-lg font-semibold text-secondary">
                  {selectedQuestion ? "Question Details" : "Details"}
                </h2>
                {selectedMainSection && selectedSection && (
                  <button
                    onClick={() => {
                      if (
                        !canNavigateQuestion(
                          selectedMainSection,
                          selectedSection,
                          selectedSubSection || null,
                          null,
                        )
                      ) {
                        return;
                      }
                      addQuestion(
                        selectedMainSection,
                        selectedSection,
                        selectedSubSection || null,
                      );
                    }}
                    className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
                  >
                    Add Question
                    <img
                      src="/assets/imgs/admin/certifications/plus.svg"
                      alt="Add"
                      className="w-5 h-5"
                    />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {!selectedMainSection || !selectedSection ? (
                <div className="p-4 md:p-6 flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-[105px] h-[105px] mx-auto mb-4">
                      <svg
                        width="105"
                        height="105"
                        viewBox="0 0 105 105"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect
                          width="105"
                          height="105"
                          rx="52.5"
                          fill="#F6F6F6"
                        />
                        <path
                          d="M41.3504 29.366L31.187 33.7189L41.9827 58.9261L46.1659 57.1346L43.3621 37.6402L43.2321 36.7353L51.2116 35.5877L49.9401 32.619C48.2459 33.0022 47.0079 32.9693 45.1259 34.7581L44.5172 35.3363L43.8894 34.7793C42.0493 33.147 41.7741 31.0656 41.3504 29.366ZM43.2711 29.4159C43.6005 30.7164 43.8333 31.8814 44.5688 32.8366C45.8706 31.7994 47.0517 31.3916 48.1185 31.1371C46.6474 30.3577 45.107 29.8963 43.2711 29.4159ZM56.2453 36.7108L45.3018 38.2846L49.2054 65.4272L52.961 64.887L55.316 45.1843L55.4245 44.2768L64.1676 45.3218L63.7006 42.0759C61.9647 42.0078 60.7777 41.6554 58.4966 42.8961L57.7592 43.2973L57.2969 42.5966C55.9421 40.5437 56.2148 38.4622 56.2453 36.7108ZM58.0876 37.2558C58.0691 38.5975 57.9924 39.783 58.4557 40.8961C59.9817 40.2311 61.2282 40.143 62.3246 40.1732C61.1052 39.0396 59.7366 38.1951 58.0876 37.2558ZM57.0227 46.309L53.7683 73.5371L71.3153 75.6342L73.8135 54.7333C72.1543 54.2181 71.0987 53.5702 68.5743 54.1783L67.7583 54.3749L67.4933 53.5787C66.7158 51.2451 67.5179 49.305 68.0008 47.6212L57.0227 46.309ZM69.6393 48.6246C69.2743 49.9157 68.8933 51.0409 69.0528 52.2359C70.6988 51.9886 71.9256 52.2261 72.9767 52.5391C72.0923 51.1285 70.9891 49.9585 69.6393 48.6246Z"
                          fill="#999999"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-secondary mb-2">
                      Select an item
                    </h3>
                    <p
                      className="text-sm font-semibold tracking-normal text-center align-middle"
                      style={{ color: "#999999" }}
                    >
                      Choose a main section, section, or sub-section from the
                      left
                      <br />
                      panel to view and edit its details
                    </p>
                  </div>
                </div>
              ) : selectedQuestion ? (
                <div className="p-4 md:p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Question Text <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Enter your question...."
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      className="w-full px-4 py-3 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 text-sm font-normal leading-[19.2px] tracking-normal resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Question Type <span className="text-red-500">*</span>
                    </label>
                    <Dropdown
                      placeholder="Select question type"
                      options={[
                        { value: "boolean", label: "Yes/No" },
                        { value: "text", label: "Text" },
                        { value: "file", label: "File" },
                      ]}
                      value={questionType}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setQuestionType(e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Help Text / Tooltip
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Additional guidance for respondents....."
                      value={helpText}
                      onChange={(e) => setHelpText(e.target.value)}
                      className="w-full px-4 py-3 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 text-sm font-normal leading-[19.2px] tracking-normal resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Criteria Information{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Enter your criteria information...."
                      value={criteriaInformation}
                      onChange={(e) => setCriteriaInformation(e.target.value)}
                      className="w-full px-4 py-3 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 text-sm font-normal leading-[19.2px] tracking-normal resize-none"
                    />
                  </div>

                  {questionType === "boolean" && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="block text-sm font-medium text-secondary">
                          Conditional Logic
                        </label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={hasConditionalLogic}
                            onChange={(e) =>
                              setHasConditionalLogic(e.target.checked)
                            }
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                        </label>
                      </div>
                      {!hasConditionalLogic ? (
                        <div className="border border-zinc-200 rounded-md p-4">
                          <p className="text-sm text-gray-500 m-0">
                            No conditional logic configured. Add conditions to
                            show/hide this question based on other answers.
                          </p>
                        </div>
                      ) : (
                        <div className="border border-zinc-200 rounded-md p-4 space-y-3">
                          <h4 className="text-sm font-medium text-secondary mb-3">
                            Conditional Flow Rules
                          </h4>

                          <div className="bg-green-50 border border-green-200 rounded-md p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center text-white shrink-0">
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 14 14"
                                  fill="none"
                                >
                                  <path
                                    d="M2 7l3 3 7-7"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-gray-500">
                                    Rule 1
                                  </span>
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded border border-green-300">
                                    If Answer = YES
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-secondary mb-2">
                                  Continue to next question
                                </p>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">
                                      Redirect To{" "}
                                      <span className="text-red-500">*</span>
                                    </label>
                                    <Dropdown
                                      placeholder={redirectDropdownPlaceholder}
                                      options={redirectOptions}
                                      treeMode
                                      value={yesExitLevel}
                                      onChange={(
                                        e: React.ChangeEvent<HTMLSelectElement>,
                                      ) => {
                                        const selectedValue = e.target.value;
                                        const selectedOption =
                                          findRedirectOptionByValue(
                                            redirectOptions,
                                            selectedValue,
                                          );

                                        setYesExitLevel(selectedValue);
                                        setYesRank(selectedOption?.rank || "");
                                      }}
                                      disabled={
                                        !redirectOptions.some(
                                          (option) => !option.groupLabel,
                                        )
                                      }
                                      className="mb-0 bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">
                                      Rank{" "}
                                      <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="number"
                                      placeholder="Auto-filled rank"
                                      value={yesRank}
                                      readOnly
                                      min="0"
                                      step="1"
                                      className="w-full px-3 py-3 bg-zinc-50 border border-zinc-200 rounded-md focus:outline-none text-sm font-normal leading-[19.2px] tracking-normal text-zinc-500 cursor-not-allowed"
                                    />
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                  Choose the exact destination from your main
                                  sections, sections, sub-sections, or
                                  questions. Rank is filled automatically.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-red-50 border border-red-200 rounded-md p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center text-white shrink-0">
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 14 14"
                                  fill="none"
                                >
                                  <path
                                    d="M3 3l8 8M11 3l-8 8"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-gray-500">
                                    Rule 2
                                  </span>
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded border border-red-300">
                                    If Answer = NO
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-secondary mb-2">
                                  Continue to next question
                                </p>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">
                                      Redirect To{" "}
                                      <span className="text-red-500">*</span>
                                    </label>
                                    <Dropdown
                                      placeholder={redirectDropdownPlaceholder}
                                      options={redirectOptions}
                                      treeMode
                                      value={noExitLevel}
                                      onChange={(
                                        e: React.ChangeEvent<HTMLSelectElement>,
                                      ) => {
                                        const selectedValue = e.target.value;
                                        const selectedOption =
                                          findRedirectOptionByValue(
                                            redirectOptions,
                                            selectedValue,
                                          );

                                        setNoExitLevel(selectedValue);
                                        setNoRank(selectedOption?.rank || "");
                                      }}
                                      disabled={
                                        !redirectOptions.some(
                                          (option) => !option.groupLabel,
                                        )
                                      }
                                      className="mb-0 bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">
                                      Rank{" "}
                                      <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="number"
                                      placeholder="Auto-filled rank"
                                      value={noRank}
                                      readOnly
                                      min="0"
                                      step="1"
                                      className="w-full px-3 py-3 bg-zinc-50 border border-zinc-200 rounded-md focus:outline-none text-sm font-normal leading-[19.2px] tracking-normal text-zinc-500 cursor-not-allowed"
                                    />
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                  Choose the exact destination from your main
                                  sections, sections, sub-sections, or
                                  questions. Rank is filled automatically.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 md:p-6 text-center py-12">
                  <div className="w-[105px] h-[105px] mx-auto mb-4">
                    <svg
                      width="105"
                      height="105"
                      viewBox="0 0 105 105"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="105" height="105" rx="52.5" fill="#F6F6F6" />
                      <path
                        d="M41.3504 29.366L31.187 33.7189L41.9827 58.9261L46.1659 57.1346L43.3621 37.6402L43.2321 36.7353L51.2116 35.5877L49.9401 32.619C48.2459 33.0022 47.0079 32.9693 45.1259 34.7581L44.5172 35.3363L43.8894 34.7793C42.0493 33.147 41.7741 31.0656 41.3504 29.366ZM43.2711 29.4159C43.6005 30.7164 43.8333 31.8814 44.5688 32.8366C45.8706 31.7994 47.0517 31.3916 48.1185 31.1371C46.6474 30.3577 45.107 29.8963 43.2711 29.4159ZM56.2453 36.7108L45.3018 38.2846L49.2054 65.4272L52.961 64.887L55.316 45.1843L55.4245 44.2768L64.1676 45.3218L63.7006 42.0759C61.9647 42.0078 60.7777 41.6554 58.4966 42.8961L57.7592 43.2973L57.2969 42.5966C55.9421 40.5437 56.2148 38.4622 56.2453 36.7108ZM58.0876 37.2558C58.0691 38.5975 57.9924 39.783 58.4557 40.8961C59.9817 40.2311 61.2282 40.143 62.3246 40.1732C61.1052 39.0396 59.7366 38.1951 58.0876 37.2558ZM57.0227 46.309L53.7683 73.5371L71.3153 75.6342L73.8135 54.7333C72.1543 54.2181 71.0987 53.5702 68.5743 54.1783L67.7583 54.3749L67.4933 53.5787C66.7158 51.2451 67.5179 49.305 68.0008 47.6212L57.0227 46.309ZM69.6393 48.6246C69.2743 49.9157 68.8933 51.0409 69.0528 52.2359C70.6988 51.9886 71.9256 52.2261 72.9767 52.5391C72.0923 51.1285 70.9891 49.9585 69.6393 48.6246Z"
                        fill="#999999"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-secondary mb-2">
                    Select an item
                  </h3>
                  <p
                    className="text-sm font-semibold tracking-normal text-center align-middle"
                    style={{ color: "#999999" }}
                  >
                    Choose a section or sub-section from the left
                    <br />
                    panel to view and edit its details
                  </p>
                </div>
              )}
            </div>
          </div>

          {selectedQuestion && (
            <div className="bg-transparent py-4">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    if (
                      selectedMainSection &&
                      selectedSection &&
                      selectedQuestion
                    ) {
                      deleteQuestion(
                        selectedMainSection,
                        selectedSection,
                        selectedSubSection,
                        selectedQuestion,
                      );
                    }
                  }}
                  disabled={isDeletingQuestion === selectedQuestion}
                  className="px-6 py-2 border border-red-500 text-red-500 rounded-md text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeletingQuestion === selectedQuestion
                    ? "Deleting..."
                    : "Delete"}
                </button>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => router.push("/admin/certifications")}
                  >
                    Save Draft
                  </Button>
                  <button
                    onClick={handleSaveQuestion}
                    disabled={isQuestionActionDisabled}
                    className="px-6 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {questionActionLabel}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertPop
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        subText={alertModal.subText}
        buttonTitle={alertModal.buttonTitle}
        onPress={handleAlertAction}
        onClose={closeAlertModal}
      />

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="w-[80px] h-[80px] mx-auto mb-4 flex items-center justify-center">
                <svg
                  width="80"
                  height="80"
                  viewBox="0 0 122 122"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="61"
                    cy="61"
                    r="61"
                    fill="#262626"
                    fillOpacity="0.1"
                  />
                  <circle
                    cx="61"
                    cy="61"
                    r="53.375"
                    fill="#262626"
                    fillOpacity="0.1"
                  />
                  <circle cx="61" cy="61" r="45.75" fill="#262626" />
                  <path
                    d="M44.125 63.9994C44.125 63.9994 46.9375 65.25 50.6875 70.875C50.6875 70.875 51.2219 69.975 52.2269 68.5369M70.375 50.25C66.0794 52.3988 61.585 56.91 57.9775 61.1662M53.5 63.9994C53.5 63.9994 56.3125 65.25 60.0625 70.875C60.0625 70.875 70.375 54.9375 79.75 50.25"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3
                className="text-secondary mb-2"
                style={{
                  fontSize: "24px",
                }}
              >
                Published
              </h3>
              <p
                className="text-gray-500 mb-6"
                style={{
                  fontSize: "16px",
                }}
              >
                Your Certificate has been published successfully.
              </p>
              <button
                onClick={handleDone}
                className="w-full px-6 py-2.5 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateCertificationPage() {
  return (
    <Suspense fallback={<FullPageSkeleton />}>
      <CreateCertificationPageContent />
    </Suspense>
  );
}
