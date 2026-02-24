"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { axiosInstance } from "@/lib/axios";
import Dropdown from "../../common/dropdown";
import Button from "../../common/button";
import { Loading } from "../../common/Loading";
import AlertPop from "@/app/components/alertPop/AlertPop";

type Question = {
  id: string;
  text: string;
  helpText: string;
  criteriaInformation?: string;
  type: string;
  hasConditionalLogic: boolean;
  conditionalRules?: {
    yesAction: string;
    noAction: string;
    yesExitLevel: string;
    noExitLevel: string;
    yesRank?: string;
    noRank?: string;
  };
};

type SubSection = {
  id: string;
  name: string;
  questions: Question[];
  isExpanded: boolean;
};

type Section = {
  id: string;
  name: string;
  subSections: SubSection[];
  questions?: Question[];
  isExpanded: boolean;
};

type MainSection = {
  id: string;
  name: string;
  sections: Section[];
  isExpanded: boolean;
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

function CreateCertificationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const certificateIdFromUrl = searchParams.get("id");
  const [step, setStep] = useState<"details" | "sections">("details");
  const [isLoadingCertificate, setIsLoadingCertificate] = useState(false);
  const [showAddMainSectionInput, setShowAddMainSectionInput] = useState(false);
  const [newMainSectionName, setNewMainSectionName] = useState("");
  const [showAddSectionInput, setShowAddSectionInput] = useState<string | null>(null); 
  const [newSectionName, setNewSectionName] = useState("");
  const [showAddSubSectionInput, setShowAddSubSectionInput] = useState<string | null>(null); 
  const [newSubSectionName, setNewSubSectionName] = useState("");
  const [mainSections, setMainSections] = useState<MainSection[]>([]);
  const [selectedMainSection, setSelectedMainSection] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSubSection, setSelectedSubSection] = useState<string | null>(
    null
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
    options?: { title?: string; buttonTitle?: string; onPress?: () => void }
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

  
  const [acesCertifiedSilver, setAcesCertifiedSilver] = useState("");
  const [acesCertifiedGold, setAcesCertifiedGold] = useState("");
  const [acesCertifiedEmerald, setAcesCertifiedEmerald] = useState("");

  
  const [certificateId, setCertificateId] = useState<string | null>("");
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [isCreatingSubSection, setIsCreatingSubSection] = useState(false);
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isDeletingMainSection, setIsDeletingMainSection] = useState<string | null>(null);
  const [isDeletingSection, setIsDeletingSection] = useState<string | null>(null);
  const [isDeletingSubSection, setIsDeletingSubSection] = useState<string | null>(null);
  const [isDeletingQuestion, setIsDeletingQuestion] = useState<string | null>(null);
  const [databaseQuestionCount, setDatabaseQuestionCount] = useState<number | null>(null);
  const [isCheckingPublishEligibility, setIsCheckingPublishEligibility] = useState(false);

  
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
    acesCertifiedSilver?: string;
    acesCertifiedGold?: string;
    acesCertifiedEmerald?: string;
  }>({});


  
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [industryOptions, setIndustryOptions] = useState<{ value: string; label: string }[]>([]);
  const [isLoadingIndustries, setIsLoadingIndustries] = useState(false);
  const [industryPagination, setIndustryPagination] = useState({
    pageIndex: 1,
    pageSize: 20,
    totalPages: 1,
  });
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);
  const industryDropdownRef = useRef<HTMLDivElement>(null);
  const industryListRef = useRef<HTMLDivElement>(null);

  const countQuestionsFromCertificateData = useCallback((certData: any): number => {
    const directCount = Number(certData?.questions_count);
    if (!Number.isNaN(directCount) && directCount >= 0) {
      return directCount;
    }

    let total = 0;
    const mainSectionsData = Array.isArray(certData?.main_sections)
      ? certData.main_sections
      : [];

    mainSectionsData.forEach((mainSection: any) => {
      const sections = Array.isArray(mainSection?.sections) ? mainSection.sections : [];
      sections.forEach((section: any) => {
        total += Array.isArray(section?.questions) ? section.questions.length : 0;
        const subSections = Array.isArray(section?.sub_sections) ? section.sub_sections : [];
        subSections.forEach((subSection: any) => {
          total += Array.isArray(subSection?.questions) ? subSection.questions.length : 0;
        });
      });
    });

    return total;
  }, []);

  const fetchDatabaseQuestionCount = useCallback(
    async (targetCertificateId?: string): Promise<number> => {
      const resolvedCertificateId = targetCertificateId || certificateIdFromUrl || certificateId || "";
      if (!resolvedCertificateId) {
        setDatabaseQuestionCount(0);
        return 0;
      }

      setIsCheckingPublishEligibility(true);
      try {
        const response = await axiosInstance.get(
          `/certificates/${resolvedCertificateId}?include=questions`
        );
        const certData = response.data?.data;
        const count = countQuestionsFromCertificateData(certData);
        setDatabaseQuestionCount(count);
        return count;
      } catch (err) {
        console.error("Failed to fetch question count from database:", err);
        setDatabaseQuestionCount(0);
        return 0;
      } finally {
        setIsCheckingPublishEligibility(false);
      }
    },
    [certificateIdFromUrl, certificateId, countQuestionsFromCertificateData]
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
      const mainSection = mainSections.find(ms => ms.id === selectedMainSection);
      const section = mainSection?.sections.find(s => s.id === selectedSection);

      let question: Question | undefined;

      
      if (selectedSubSection) {
        const subSection = section?.subSections.find(ss => ss.id === selectedSubSection);
        question = subSection?.questions.find(q => q.id === selectedQuestion);
      } else {
        
        question = section?.questions?.find(q => q.id === selectedQuestion);
      }

      if (question) {
        setQuestionText(question.text || "");
        setHelpText(question.helpText || "");
        setCriteriaInformation(question.criteriaInformation || "");
        setQuestionType(question.type || "");
        setHasConditionalLogic(question.hasConditionalLogic || false);
        setYesExitLevel(question.conditionalRules?.yesExitLevel || "");
        setNoExitLevel(question.conditionalRules?.noExitLevel || "");
        setYesRank(question.conditionalRules?.yesRank || "");
        setNoRank(question.conditionalRules?.noRank || "");
      }
    }
  }, [selectedQuestion, selectedMainSection, selectedSection, selectedSubSection, mainSections]);

  
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
    questionId: string
  ): Question | undefined => {
    const mainSection = mainSections.find((ms) => ms.id === mainSectionId);
    const section = mainSection?.sections.find((s) => s.id === sectionId);

    if (!section) {
      return undefined;
    }

    if (subSectionId) {
      const subSection = section.subSections.find((ss) => ss.id === subSectionId);
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
      selectedQuestion
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
    const currentHasConditionalLogic = currentIsBoolean ? hasConditionalLogic : false;

    const originalYesExitLevel = originalHasConditionalLogic
      ? originalQuestion.conditionalRules?.yesExitLevel || ""
      : "";
    const originalNoExitLevel = originalHasConditionalLogic
      ? originalQuestion.conditionalRules?.noExitLevel || ""
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
    nextSectionId: string,
    nextSubSectionId: string | null,
    nextQuestionId: string | null
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
      "You have unsaved changes in this question. Press OK to discard and continue, or Cancel to stay on this question."
    );
  };

  
  const fetchIndustries = useCallback(async (pageIndex: number, pageSize: number, append = false) => {
    setIsLoadingIndustries(true);
    try {
      const response = await axiosInstance.get<IndustriesResponse>(
        `/industries?page=${pageIndex}&limit=${pageSize}`
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
      console.error("Failed to fetch industries:", err);
      if (!append) {
        setIndustries([]);
        setIndustryOptions([]);
      }
    } finally {
      setIsLoadingIndustries(false);
    }
  }, []);

  
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
        const response = await axiosInstance.get(`/certificates/${certificateIdFromUrl}?include=questions`);
        const certData = response.data?.data;
        console.log("certData", certData);

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
                  if (color.color === "#CD7F32") setAcesRatedBronze(color.min_score?.toString() || "");
                  if (color.color === "#C0C0C0") setAcesRatedSilver(color.min_score?.toString() || "");
                  if (color.color === "#FFD700") setAcesRatedGold(color.min_score?.toString() || "");
                  if (color.color === "#00C853") setAcesRatedEmerald(color.min_score?.toString() || "");
                });
              }
              if (badge.name === "ACES Verified" && badge.colors) {
                badge.colors.forEach((color: any) => {
                  if (color.color === "#CD7F32") setAcesVerifiedBronze(color.min_score?.toString() || "");
                });
              }
              if (badge.name === "ACES Certified" && badge.colors) {
                badge.colors.forEach((color: any) => {
                  if (color.color === "#C0C0C0") setAcesCertifiedSilver(color.min_score?.toString() || "");
                  if (color.color === "#FFD700") setAcesCertifiedGold(color.min_score?.toString() || "");
                  if (color.color === "#00C853") setAcesCertifiedEmerald(color.min_score?.toString() || "");
                });
              }
            });
          }

          
          if (certData.main_sections && Array.isArray(certData.main_sections)) {
            const transformedMainSections: MainSection[] = certData.main_sections.map(
              (ms: any) => {
                const sections: Section[] = (ms.sections || []).map((s: any) => {
                  
                  const sectionQuestions: Question[] = (s.questions || []).map((q: any) => ({
                    id: q.id,
                    text: q.question || "",
                    helpText: q.hint || "",
                    criteriaInformation: q.criteria || "",
                    type: q.type || "",
                    hasConditionalLogic: q.conditions && Object.keys(q.conditions).length > 0,
                    conditionalRules: q.conditions
                      ? {
                        yesAction: q.conditions.yes?.redirect_type || "",
                        noAction: q.conditions.no?.redirect_type || "",
                        yesExitLevel: q.conditions.yes?.redirect_type || "",
                        noExitLevel: q.conditions.no?.redirect_type || "",
                        yesRank: q.conditions.yes?.rank?.toString?.() || undefined,
                        noRank: q.conditions.no?.rank?.toString?.() || undefined,
                      }
                      : undefined,
                  }));

                  
                  const subSections: SubSection[] = (s.sub_sections || []).map((ss: any) => ({
                    id: ss.id,
                    name: ss.name,
                    questions: (ss.questions || []).map((q: any) => ({
                      id: q.id,
                      text: q.question || "",
                      helpText: q.hint || "",
                      criteriaInformation: q.criteria || "",
                      type: q.type || "",
                      hasConditionalLogic: q.conditions && Object.keys(q.conditions).length > 0,
                      conditionalRules: q.conditions
                        ? {
                          yesAction: q.conditions.yes?.redirect_type || "",
                          noAction: q.conditions.no?.redirect_type || "",
                          yesExitLevel: q.conditions.yes?.redirect_type || "",
                          noExitLevel: q.conditions.no?.redirect_type || "",
                          yesRank: q.conditions.yes?.rank?.toString?.() || undefined,
                          noRank: q.conditions.no?.rank?.toString?.() || undefined,
                        }
                        : undefined,
                    })),
                    isExpanded: (ss.questions || []).length > 0,
                  }));

                  const hasSectionQuestions = sectionQuestions.length > 0;
                  const hasSubSectionQuestions = subSections.some(
                    (subSection) => subSection.questions.length > 0
                  );

                  return {
                    id: s.id,
                    name: s.name,
                    subSections,
                    questions: sectionQuestions,
                    isExpanded: hasSectionQuestions || hasSubSectionQuestions,
                  };
                });

                return {
                  id: ms.id,
                  name: ms.name,
                  sections,
                  isExpanded: true,
                };
              }
            );

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

  
  const handleIndustryScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
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
  }, [isLoadingIndustries, industryPagination, fetchIndustries]);

  
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

  
  const createMainSectionAPI = async (name: string) => {
    if (!certificateId) {
      console.error("Certificate ID is required");
      return null;
    }
    try {
      const response = await axiosInstance.post(
        `/certificates/${certificateId}/main-sections`,
        {
          sections: [{ name: name.trim() }],
        }
      );
      return response.data?.data?.[0] || null;
    } catch (err) {
      console.error("Failed to create main section:", err);
      throw err;
    }
  };

  
  const deleteMainSectionAPI = async (mainSectionId: string) => {
    if (!certificateId) {
      console.error("Certificate ID is required");
      throw new Error("Certificate ID is required");
    }
    try {
      await axiosInstance.delete(
        `/main-sections/${mainSectionId}`
      );
      return true;
    } catch (err) {
      console.error("Failed to delete main section:", err);
      throw err;
    }
  };

  
  const deleteSectionAPI = async (sectionId: string) => {
    if (!certificateId) {
      console.error("Certificate ID is required");
      throw new Error("Certificate ID is required");
    }
    try {
      await axiosInstance.delete(
        `/sections/${sectionId}`
      );
      return true;
    } catch (err) {
      console.error("Failed to delete section:", err);
      throw err;
    }
  };

  
  const deleteSubSectionAPI = async (subSectionId: string) => {
    if (!certificateId) {
      console.error("Certificate ID is required");
      throw new Error("Certificate ID is required");
    }
    try {
      await axiosInstance.delete(
        `/subsections/${subSectionId}`
      );
      return true;
    } catch (err) {
      console.error("Failed to delete subsection:", err);
      throw err;
    }
  };

  
  const deleteQuestionAPI = async (questionId: string) => {
    console.log("questionId", questionId);
    if (!certificateId) {
      console.error("Certificate ID is required");
      throw new Error("Certificate ID is required");
    }
    try {
      await axiosInstance.delete(
        `/questions/${questionId}`
      );
      return true;
    } catch (err) {
      console.error("Failed to delete question:", err);
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
        setNewMainSectionName("");
        setShowAddMainSectionInput(false);
      }
    } catch (err) {
      console.error("Error creating main section:", err);
      showAlert("Failed to create main section. Please try again.");
    } finally {
      setIsCreatingSection(false);
    }
  };

  const toggleMainSection = (mainSectionId: string) => {
    setMainSections(
      mainSections.map((mainSection) =>
        mainSection.id === mainSectionId
          ? { ...mainSection, isExpanded: !mainSection.isExpanded }
          : mainSection
      )
    );
    
    if (showAddSectionInput === mainSectionId) {
      setShowAddSectionInput(null);
      setNewSectionName("");
    }
  };

  const deleteMainSection = async (mainSectionId: string) => {
    if (!certificateId) {
      showAlert("Certificate ID is missing. Please save the certificate first.");
      return;
    }

    setIsDeletingMainSection(mainSectionId);
    try {
      await deleteMainSectionAPI(mainSectionId);
      
      setMainSections(mainSections.filter((mainSection) => mainSection.id !== mainSectionId));
      if (selectedMainSection === mainSectionId) {
        setSelectedMainSection(null);
        setSelectedSection(null);
        setSelectedSubSection(null);
        setSelectedQuestion(null);
      }
      
      if (showAddSectionInput === mainSectionId) {
        setShowAddSectionInput(null);
        setNewSectionName("");
      }
    } catch (err) {
      console.error("Error deleting main section:", err);
      showAlert("Failed to delete main section. Please try again.");
    } finally {
      setIsDeletingMainSection(null);
    }
  };

  
  const createSectionAPI = async (parentId: string, parentType: "main" | "section", name: string) => {
    try {
      const response = await axiosInstance.post(
        `/sections/${parentId}/subsections`,
        {
          parent_type: parentType,
          sections: [{ name: name.trim() }],
        }
      );
      return response.data?.data?.[0] || null;
    } catch (err) {
      console.error("Failed to create section:", err);
      throw err;
    }
  };

  
  const addSection = async (mainSectionId: string) => {
    if (!newSectionName.trim()) {
      return;
    }

    setIsCreatingSection(true);
    try {
      const createdSection = await createSectionAPI(mainSectionId, "main", newSectionName);
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
          })
        );
        setNewSectionName("");
        setShowAddSectionInput(null);
      }
    } catch (err) {
      console.error("Error creating section:", err);
      showAlert("Failed to create section. Please try again.");
    } finally {
      setIsCreatingSection(false);
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
                : section
            ),
          };
        }
        return mainSection;
      })
    );
    
    if (showAddSubSectionInput === sectionId) {
      setShowAddSubSectionInput(null);
      setNewSubSectionName("");
    }
  };

  const deleteSection = async (mainSectionId: string, sectionId: string) => {
    if (!certificateId) {
      showAlert("Certificate ID is missing. Please save the certificate first.");
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
                (section) => section.id !== sectionId
              ),
            };
          }
          return mainSection;
        })
      );
      if (selectedSection === sectionId) {
        setSelectedSection(null);
        setSelectedSubSection(null);
        setSelectedQuestion(null);
      }
      
      if (showAddSubSectionInput === sectionId) {
        setShowAddSubSectionInput(null);
        setNewSubSectionName("");
      }
    } catch (err) {
      console.error("Error deleting section:", err);
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
      const createdSubSection = await createSectionAPI(sectionId, "section", newSubSectionName);
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
          })
        );
        setNewSubSectionName("");
        setShowAddSubSectionInput(null);
      }
    } catch (err) {
      console.error("Error creating subsection:", err);
      showAlert("Failed to create subsection. Please try again.");
    } finally {
      setIsCreatingSubSection(false);
    }
  };


  const deleteSubSection = async (mainSectionId: string, sectionId: string, subSectionId: string) => {
    if (!certificateId) {
      showAlert("Certificate ID is missing. Please save the certificate first.");
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
                      (sub) => sub.id !== subSectionId
                    ),
                  };
                }
                return section;
              }),
            };
          }
          return mainSection;
        })
      );
      if (selectedSubSection === subSectionId) {
        setSelectedSubSection(null);
        setSelectedQuestion(null);
      }
    } catch (err) {
      console.error("Error deleting subsection:", err);
      showAlert("Failed to delete subsection. Please try again.");
    } finally {
      setIsDeletingSubSection(null);
    }
  };

  
  const isLocalQuestionId = (questionId: string) => questionId.startsWith("temp-");
  const isSavedQuestionSelected = Boolean(
    selectedQuestion && !isLocalQuestionId(selectedQuestion)
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
    questionId: string
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
                    (question) => question.id !== questionId
                  ),
                };
              }),
            };
          }

          return {
            ...section,
            questions: (section.questions || []).filter(
              (question) => question.id !== questionId
            ),
          };
        }),
      };
    });
  };

  const addQuestion = (mainSectionId: string, sectionId: string, subSectionId?: string | null) => {
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
      })
    );

    setSelectedMainSection(mainSectionId);
    setSelectedSection(sectionId);
    setSelectedSubSection(subSectionId || null);
    setSelectedQuestion(newQuestion.id);
  };

  const deleteQuestion = async (mainSectionId: string, sectionId: string, subSectionId: string | null, questionId: string) => {
    const isLocalOnlyQuestion = isLocalQuestionId(questionId);

    if (!isLocalOnlyQuestion && !certificateId) {
      showAlert("Certificate ID is missing. Please save the certificate first.");
      return;
    }

    setIsDeletingQuestion(questionId);
    try {
      if (!isLocalOnlyQuestion) {
        await deleteQuestionAPI(questionId);
        await fetchDatabaseQuestionCount();
      }

      setMainSections((prev) =>
        removeQuestionFromState(prev, mainSectionId, sectionId, subSectionId, questionId)
      );

      
      if (selectedQuestion === questionId) {
        setSelectedQuestion(null);
      }
    } catch (err) {
      console.error("Error deleting question:", err);
      showAlert("Failed to delete question. Please try again.");
    } finally {
      setIsDeletingQuestion(null);
    }
  };

  
  const createQuestionAPI = async (sectionId: string, questionData: any) => {
    try {
      console.log("Creating question with data:", questionData);
      const response = await axiosInstance.post(
        `/sections/${sectionId}/questions`,
        questionData
      );
      console.log("API response:", response.data);
      const createdQuestion = response.data?.data?.questions?.[0] || null;
      console.log("Created question:", createdQuestion);
      return createdQuestion;
    } catch (err) {
      console.error("Error creating question:", err);
      throw err;
    }
  };

  const updateQuestionAPI = async (questionId: string, questionData: any) => {
    try {
      console.log("Updating question with data:", questionData);
      const response = await axiosInstance.patch(
        `/questions/${questionId}`,
        questionData
      );
      console.log("Update question API response:", response.data);
      return response.data;
    } catch (err) {
      console.error("Error updating question:", err);
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

    
    if (questionType === "boolean" && hasConditionalLogic) {
      if (!yesExitLevel || yesRank === "") {
        showAlert("Please provide both Redirect Type and Rank for YES condition");
        return;
      }
      if (!noExitLevel || noRank === "") {
        showAlert("Please provide both Redirect Type and Rank for NO condition");
        return;
      }
    }

    
    const conditions: any = {};
    if (questionType === "boolean" && hasConditionalLogic) {
      
      if (yesExitLevel && yesRank !== "") {
        conditions.yes = {
          redirect_type: yesExitLevel,
          rank: parseInt(yesRank) || 0,
        };
      }

      
      if (noExitLevel && noRank !== "") {
        conditions.no = {
          redirect_type: noExitLevel,
          rank: parseInt(noRank) || 0,
        };
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
          conditions: questionType === "boolean" && hasConditionalLogic ? conditions : {},
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

    console.log("Setting isCreatingQuestion to true (starting save)");
    setIsCreatingQuestion(true);
    try {
      const isNewQuestion = isLocalQuestionId(selectedQuestion);
      let savedQuestionId = selectedQuestion;

      if (isNewQuestion) {
        const createdQuestion = await createQuestionAPI(targetId, finalQuestionData);
        console.log("About to update question with createdQuestion:", createdQuestion);
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
                                  criteriaInformation: criteriaInformation.trim(),
                                  type: questionType,
                                  hasConditionalLogic: questionType === "boolean" ? hasConditionalLogic : false,
                                  conditionalRules: questionType === "boolean" && hasConditionalLogic
                                    ? {
                                      yesAction: "continue",
                                      noAction: "continue",
                                      yesExitLevel: yesExitLevel,
                                      noExitLevel: noExitLevel,
                                      yesRank: yesRank,
                                      noRank: noRank,
                                    }
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

                  const updatedQuestions = (section.questions || []).map((question) =>
                    question.id === selectedQuestion
                      ? {
                        ...question,
                        id: savedQuestionId,
                        text: questionText.trim(),
                        helpText: helpText.trim(),
                        criteriaInformation: criteriaInformation.trim(),
                        type: questionType,
                        hasConditionalLogic: questionType === "boolean" ? hasConditionalLogic : false,
                        conditionalRules:
                          questionType === "boolean" && hasConditionalLogic
                            ? {
                              yesAction: "continue",
                              noAction: "continue",
                              yesExitLevel: yesExitLevel,
                              noExitLevel: noExitLevel,
                              yesRank: yesRank,
                              noRank: noRank,
                            }
                            : undefined,
                      }
                      : question
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
        })
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
      console.log("Setting isCreatingQuestion to false (save completed)");
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

    const totalQuestionsInDatabase = await fetchDatabaseQuestionCount(resolvedCertificateId);
    if (totalQuestionsInDatabase === 0) {
      showAlert("Please add at least one question before publishing.");
      return;
    }

    setIsSaving(true);
    try {
      
      await axiosInstance.patch(`/certificates/${resolvedCertificateId}/publish`, {
        is_published: true,
      });
      
      setIsPublished(true);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Failed to publish certificate:", err);
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
    if (acesRatedEmerald) acesRatedColors.push({ color: "#00C853", min_score: parseInt(acesRatedEmerald) || 90, max_score: 100 });
    if (acesRatedGold) acesRatedColors.push({ color: "#FFD700", min_score: parseInt(acesRatedGold) || 80, max_score: parseInt(acesRatedEmerald) || 89 });
    if (acesRatedSilver) acesRatedColors.push({ color: "#C0C0C0", min_score: parseInt(acesRatedSilver) || 70, max_score: parseInt(acesRatedGold) || 79 });
    if (acesRatedBronze) acesRatedColors.push({ color: "#CD7F32", min_score: parseInt(acesRatedBronze) || 50, max_score: parseInt(acesRatedSilver) || 69 });

    if (acesRatedColors.length > 0) {
      badges.push({
        slot: 1,
        name: "ACES Rated",
        colors: acesRatedColors.reverse(),
      });
    }

    
    if (acesVerifiedBronze) {
      badges.push({
        slot: 2,
        name: "ACES Verified",
        colors: [
          { color: "#CD7F32", min_score: parseInt(acesVerifiedBronze) || 50, max_score: 100 }
        ],
      });
    }

    
    const acesCertifiedColors: any[] = [];
    if (acesCertifiedEmerald) acesCertifiedColors.push({ color: "#00C853", min_score: parseInt(acesCertifiedEmerald) || 90, max_score: 100 });
    if (acesCertifiedGold) acesCertifiedColors.push({ color: "#FFD700", min_score: parseInt(acesCertifiedGold) || 80, max_score: parseInt(acesCertifiedEmerald) || 89 });
    if (acesCertifiedSilver) acesCertifiedColors.push({ color: "#C0C0C0", min_score: parseInt(acesCertifiedSilver) || 70, max_score: parseInt(acesCertifiedGold) || 79 });

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
      newErrors.selfDisclosurePrice = "Self Disclosure price is required and must be greater than 0";
    }

    if (!assuredPrice || parseFloat(assuredPrice) <= 0) {
      newErrors.assuredPrice = "Assured price is required and must be greater than 0";
    }

    if (!validityDays && !validityMonths && !validityYears) {
      newErrors.validityPeriod = "At least one validity period (Days, Months, or Years) is required";
    }

    
    const hasAcesRatedBadges = acesRatedBronze || acesRatedSilver || acesRatedGold || acesRatedEmerald;
    const hasAcesVerifiedBadges = acesVerifiedBronze;
    const hasAcesCertifiedBadges = acesCertifiedSilver || acesCertifiedGold || acesCertifiedEmerald;

    
    if (!hasAcesRatedBadges) {
      newErrors.acesRatedBronze = "At least one ACES Rated badge is required";
    }

    
    if (!acesVerifiedBronze.trim()) {
      newErrors.acesVerifiedBronze = "Bronze score is required";
    }

    
    if (!hasAcesCertifiedBadges) {
      newErrors.acesCertifiedSilver = "At least one ACES Certified badge is required";
    }

    
    if (acesRatedBronze || acesRatedSilver || acesRatedGold || acesRatedEmerald) {
      const bronze = parseFloat(acesRatedBronze) || 0;
      const silver = parseFloat(acesRatedSilver) || 0;
      const gold = parseFloat(acesRatedGold) || 0;
      const emerald = parseFloat(acesRatedEmerald) || 0;

      
      if (acesRatedBronze) {
        if (acesRatedSilver && silver <= bronze) {
          newErrors.acesRatedSilver = "Silver score must be greater than Bronze";
        }
        if (acesRatedGold && gold <= bronze) {
          newErrors.acesRatedGold = "Gold score must be greater than Bronze";
        }
        if (acesRatedEmerald && emerald <= bronze) {
          newErrors.acesRatedEmerald = "Emerald score must be greater than Bronze";
        }
      }

      
      if (acesRatedSilver) {
        if (acesRatedGold && gold <= silver) {
          newErrors.acesRatedGold = "Gold score must be greater than Silver";
        }
        if (acesRatedEmerald && emerald <= silver) {
          newErrors.acesRatedEmerald = "Emerald score must be greater than Silver";
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
          newErrors.acesCertifiedGold = "Gold score must be greater than Silver";
        }
        if (acesCertifiedEmerald && certifiedEmerald <= certifiedSilver) {
          newErrors.acesCertifiedEmerald = "Emerald score must be greater than Silver";
        }
      }

      
      if (acesCertifiedGold && acesCertifiedEmerald && certifiedEmerald <= certifiedGold) {
        newErrors.acesCertifiedEmerald = "Emerald score must be greater than Gold";
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
      console.log("isValid->>>>", isValid)
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
        disclosure_price: selfDisclosurePrice ? parseFloat(selfDisclosurePrice) : 0,
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
        
        response = await axiosInstance.patch(`/certificates/${certificateIdFromUrl}`, payloadToSend);
      } else {
        
        response = await axiosInstance.post("/certificates", payloadToSend);
      }

      const returnedId = response?.data?.data?.id || response?.data?.id;
      if (returnedId) {
        setCertificateId(returnedId);
      }

      return response.data;
    } catch (err) {
      let errorMessage = "Failed to create/update certificate. Please try again.";
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
    } catch (err) {
    }
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
    } catch (err) {
      
    }
  };

  const handleBackToPreviousStep = () => {
    if (
      hasUnsavedQuestionChanges() &&
      !window.confirm(
        "You have unsaved changes in this question. Press OK to discard and go back, or Cancel to stay."
      )
    ) {
      return;
    }
    setStep("details");
  };

  
  if (isLoadingCertificate) {
    return (
      <div className="bg-light-gray p-3 md:p-6">
        <div className="flex items-center justify-center min-h-100">
          <Loading isLoading size="lg" />
        </div>
      </div>
    );
  }

  if (step === "details") {
    return (
      <div className="relative bg-light-gray p-3 md:p-6">
        {isSaving && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-light-gray/80 backdrop-blur-sm">
            <Loading isLoading size="lg" className="p-6" />
          </div>
        )}
        
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
                    setErrors((prev) => ({ ...prev, certificationName: undefined }));
                  }
                }}
                className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${errors.certificationName
                  ? "border-red-500 focus:ring-red-200"
                  : "border-zinc-200 focus:ring-zinc-200"
                  }`}
              />
              {errors.certificationName && (
                <p className="text-xs text-red-500 mt-1">{errors.certificationName}</p>
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
                className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${errors.productId
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
                className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-gray text-sm font-normal leading-[19.2px] tracking-normal appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTciIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxNyAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUuMjQ4NjEgNi4zNzQ3Nkw4LjUwNDM3IDkuNjMwNTFMMTEuNzYwMSA2LjM3NDc2TDEyLjc1NjggNy4zNzE0Mkw4LjUwNDM3IDExLjYyMzhMNC4yNTE5NSA3LjM3MTQyTDUuMjQ4NjEgNi4zNzQ3NloiIGZpbGw9IiM5OTk5OTkiLz4KPC9zdmc+Cg==')] bg-size-[17px_18px] bg-position-[right_1rem_center] bg-no-repeat pr-12 text-left flex items-center justify-between ${errors.industry
                  ? "border-red-500 focus:ring-red-200"
                  : "border-zinc-200 focus:ring-zinc-200"
                  }`}
              >
                <span className={industry.length > 0 ? "text-secondary" : "text-gray"}>
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
                                  setIndustry(industry.filter((id) => id !== option.value));
                                } else {
                                  setIndustry([...industry, option.value]);
                                }
                                if (errors.industry) {
                                  setErrors((prev) => ({ ...prev, industry: undefined }));
                                }
                              }}
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 transition-colors flex items-center justify-between ${isSelected
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
                    setErrors((prev) => ({ ...prev, selfDisclosurePrice: undefined }));
                  }
                }}
                placeholder="Enter Self Disclosure price*"
                min="0"
                step="1"
                className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${errors.selfDisclosurePrice
                  ? "border-red-500 focus:ring-red-200"
                  : "border-zinc-200 focus:ring-zinc-200"
                  }`}
              />
              {errors.selfDisclosurePrice && (
                <p className="text-xs text-red-500 mt-1">{errors.selfDisclosurePrice}</p>
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
                className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${errors.assuredPrice
                  ? "border-red-500 focus:ring-red-200"
                  : "border-zinc-200 focus:ring-zinc-200"
                  }`}
              />
              {errors.assuredPrice && (
                <p className="text-xs text-red-500 mt-1">{errors.assuredPrice}</p>
              )}
            </div>

            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-normal text-secondary">
                  Validity Period <span className="text-red-500">*</span>
                </label>
                {errors.validityPeriod && (
                  <span className="text-xs text-red-500">{errors.validityPeriod}</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={validityDays}
                  onChange={(e) => {
                    setValidityDays(e.target.value);
                    if (errors.validityPeriod) {
                      setErrors((prev) => ({ ...prev, validityPeriod: undefined }));
                    }
                  }}
                  placeholder="Days"
                  className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${errors.validityPeriod
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
                      setErrors((prev) => ({ ...prev, validityPeriod: undefined }));
                    }
                  }}
                  placeholder="Months"
                  className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${errors.validityPeriod
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
                      setErrors((prev) => ({ ...prev, validityPeriod: undefined }));
                    }
                  }}
                  placeholder="Years"
                  className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${errors.validityPeriod
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
                    if (errors.acesRatedBronze || errors.acesRatedSilver || errors.acesRatedGold || errors.acesRatedEmerald) {
                      clearRatedBadgeErrors();
                    }
                  }}
                  className={`w-full h-[42px] px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${errors.acesRatedBronze
                    ? "border-red-500 focus:ring-red-200"
                    : "border-zinc-200 focus:ring-zinc-200"
                    }`}
                />
                {errors.acesRatedBronze && (
                  <span className="text-xs text-red-500 mt-1 block">{errors.acesRatedBronze}</span>
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
                    if (errors.acesRatedBronze || errors.acesRatedSilver || errors.acesRatedGold || errors.acesRatedEmerald) {
                      clearRatedBadgeErrors();
                    }
                  }}
                  className={`w-full h-[42px] px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${errors.acesRatedSilver
                    ? "border-red-500 focus:ring-red-200"
                    : "border-zinc-200 focus:ring-zinc-200"
                    }`}
                />
                {errors.acesRatedSilver && (
                  <span className="text-xs text-red-500 mt-1 block">{errors.acesRatedSilver}</span>
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
                    if (errors.acesRatedBronze || errors.acesRatedSilver || errors.acesRatedGold || errors.acesRatedEmerald) {
                      clearRatedBadgeErrors();
                    }
                  }}
                  className={`w-full h-[42px] px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${errors.acesRatedGold
                    ? "border-red-500 focus:ring-red-200"
                    : "border-zinc-200 focus:ring-zinc-200"
                    }`}
                />
                {errors.acesRatedGold && (
                  <span className="text-xs text-red-500 mt-1 block">{errors.acesRatedGold}</span>
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
                    if (errors.acesRatedBronze || errors.acesRatedSilver || errors.acesRatedGold || errors.acesRatedEmerald) {
                      clearRatedBadgeErrors();
                    }
                  }}
                  className={`w-full h-[42px] px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${errors.acesRatedEmerald
                    ? "border-red-500 focus:ring-red-200"
                    : "border-zinc-200 focus:ring-zinc-200"
                    }`}
                />
                {errors.acesRatedEmerald && (
                  <span className="text-xs text-red-500 mt-1 block">{errors.acesRatedEmerald}</span>
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
                  className={`w-full h-[42px] px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${errors.acesVerifiedBronze
                    ? "border-red-500 focus:ring-red-200"
                    : "border-zinc-200 focus:ring-zinc-200"
                    }`}
                />
                {errors.acesVerifiedBronze && (
                  <span className="text-xs text-red-500 mt-1 block">{errors.acesVerifiedBronze}</span>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Silver*
                </label>
                <input
                  type="text"
                  placeholder="Enter Score"
                  className="w-full h-[42px] px-4 py-3 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 bg-gray-50 text-sm font-normal leading-[19.2px] tracking-normal"
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Gold*
                </label>
                <input
                  type="text"
                  placeholder="Enter Score"
                  className="w-full h-[42px] px-4 py-3 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 bg-gray-50 text-sm font-normal leading-[19.2px] tracking-normal"
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Emerald*
                </label>
                <input
                  type="text"
                  placeholder="Enter Score"
                  className="w-full h-[42px] px-4 py-3 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 bg-gray-50 text-sm font-normal leading-[19.2px] tracking-normal"
                  disabled
                />
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
                    if (errors.acesCertifiedSilver || errors.acesCertifiedGold || errors.acesCertifiedEmerald) {
                      clearCertifiedBadgeErrors();
                    }
                  }}
                  className={`w-full h-[42px] px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${errors.acesCertifiedSilver
                    ? "border-red-500 focus:ring-red-200"
                    : "border-zinc-200 focus:ring-zinc-200"
                    }`}
                />
                {errors.acesCertifiedSilver && (
                  <span className="text-xs text-red-500 mt-1 block">{errors.acesCertifiedSilver}</span>
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
                    if (errors.acesCertifiedSilver || errors.acesCertifiedGold || errors.acesCertifiedEmerald) {
                      clearCertifiedBadgeErrors();
                    }
                  }}
                  className={`w-full h-[42px] px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${errors.acesCertifiedGold
                    ? "border-red-500 focus:ring-red-200"
                    : "border-zinc-200 focus:ring-zinc-200"
                    }`}
                />
                {errors.acesCertifiedGold && (
                  <span className="text-xs text-red-500 mt-1 block">{errors.acesCertifiedGold}</span>
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
                    if (errors.acesCertifiedSilver || errors.acesCertifiedGold || errors.acesCertifiedEmerald) {
                      clearCertifiedBadgeErrors();
                    }
                  }}
                  className={`w-full h-[42px] px-4 py-3 border rounded-md focus:outline-none focus:ring-2 text-sm font-normal leading-[19.2px] tracking-normal ${errors.acesCertifiedEmerald
                    ? "border-red-500 focus:ring-red-200"
                    : "border-zinc-200 focus:ring-zinc-200"
                    }`}
                />
                {errors.acesCertifiedEmerald && (
                  <span className="text-xs text-red-500 mt-1 block">{errors.acesCertifiedEmerald}</span>
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
                  setErrors((prev) => ({ ...prev, shortDescription: undefined }));
                }
              }}
              placeholder="Brief description of the certification purpose and scope...."
              rows={4}
              className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 resize-none text-sm font-normal leading-[19.2px] tracking-normal ${errors.shortDescription
                ? "border-red-500 focus:ring-red-200"
                : "border-zinc-200 focus:ring-zinc-200"
                }`}
            />
            {errors.shortDescription && (
              <p className="text-xs text-red-500 mt-1">{errors.shortDescription}</p>
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
      {isSaving && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-light-gray/80 backdrop-blur-sm">
          <Loading isLoading size="lg" className="p-6" />
        </div>
      )}
      
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
              <h2 className="text-lg font-semibold text-secondary">Main Sections</h2>
              <button
                onClick={() => setShowAddMainSectionInput(!showAddMainSectionInput)}
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
                  onClick={() => {
                    setShowAddMainSectionInput(false);
                    setNewMainSectionName("");
                  }}
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
                  onClick={() => setShowAddMainSectionInput(true)}
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
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <button
                          onClick={() => toggleMainSection(mainSection.id)}
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
                        <span className="text-sm font-semibold text-secondary break-words whitespace-normal">
                          {mainSection.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
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

                    
                    {showAddSectionInput === mainSection.id && (
                      <div className="pl-6 p-3 bg-white">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSectionName}
                            onChange={(e) => setNewSectionName(e.target.value)}
                            placeholder="Enter Section Name"
                            className="flex-1 px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 text-sm font-normal leading-[19.2px] tracking-normal"
                            onKeyPress={(e) => e.key === "Enter" && addSection(mainSection.id)}
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
                            onClick={() => {
                              setShowAddSectionInput(null);
                              setNewSectionName("");
                            }}
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

                    
                    {mainSection.isExpanded && mainSection.sections.length > 0 && (
                      <div className="bg-white">
                        {mainSection.sections.map((section) => (
                          <div key={section.id} className="pl-6">
                            <div className="flex items-start justify-between p-3 hover:bg-gray-100">
                              <div
                                className="flex items-start gap-2 flex-1 min-w-0 cursor-pointer"
                                onClick={() => {
                                  if (!canNavigateQuestion(mainSection.id, section.id, null, null)) {
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
                                <span className={`text-sm font-medium break-words whitespace-normal ${selectedSection === section.id && !selectedSubSection ? "text-black" : "text-[#999999]"
                                  }`}>
                                  {section.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
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
                                  onClick={() => deleteSection(mainSection.id, section.id)}
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

                            
                            {showAddSubSectionInput === section.id && (
                              <div className="pl-6 p-3 bg-white">
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="text"
                                    value={newSubSectionName}
                                    onChange={(e) => setNewSubSectionName(e.target.value)}
                                    placeholder="Enter Sub-Section Name"
                                    className="flex-1 max-w-[180px] px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 text-sm font-normal leading-[19.2px] tracking-normal"
                                    onKeyPress={(e) => e.key === "Enter" && addSubSection(mainSection.id, section.id)}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => addSubSection(mainSection.id, section.id)}
                                    disabled={isCreatingSubSection}
                                    className="px-3 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isCreatingSubSection ? "Adding..." : "Add"}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowAddSubSectionInput(null);
                                      setNewSubSectionName("");
                                    }}
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

                            
                            {section.isExpanded && section.questions && section.questions.length > 0 && (
                              <div className="pl-6 bg-white">
                                {section.questions.map((question, idx) => (
                                  <button
                                    key={question.id}
                                    onClick={() => {
                                      if (!canNavigateQuestion(mainSection.id, section.id, null, question.id)) {
                                        return;
                                      }
                                      setSelectedMainSection(mainSection.id);
                                      setSelectedSection(section.id);
                                      setSelectedSubSection(null);
                                      setSelectedQuestion(question.id);
                                    }}
                                    className={`w-full text-left p-3 text-sm hover:bg-gray-50 ${selectedQuestion === question.id
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

                            
                            {section.isExpanded && section.subSections.length > 0 && (
                              <div className="bg-white">
                                {section.subSections.map((subSection) => (
                                  <div key={subSection.id} className="pl-6">
                                    <div
                                      onClick={() => {
                                        if (!canNavigateQuestion(mainSection.id, section.id, subSection.id, null)) {
                                          return;
                                        }
                                        setSelectedMainSection(mainSection.id);
                                        setSelectedSection(section.id);
                                        setSelectedSubSection(subSection.id);
                                        setSelectedQuestion(null);
                                      }}
                                      className={`flex items-center justify-between p-3 cursor-pointer ${selectedSubSection === subSection.id
                                        ? "bg-light-gray-2"
                                        : "hover:bg-gray-100"
                                        }`}
                                    >
                                      <div className="flex items-start gap-2 flex-1 min-w-0">
                                        <span className={`text-sm break-words whitespace-normal ${selectedSubSection === subSection.id ? "text-black" : "text-[#999999]"
                                          }`}>
                                          {subSection.name}
                                        </span>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteSubSection(mainSection.id, section.id, subSection.id);
                                        }}
                                        disabled={isDeletingSubSection === subSection.id}
                                        className="w-6 h-6 flex items-center justify-center hover:bg-red-50 rounded text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {isDeletingSubSection === subSection.id ? (
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

                                    
                                    {subSection.questions.length > 0 && (
                                      <div className="pl-6 bg-white">
                                        {subSection.questions.map((question, idx) => (
                                          <button
                                            key={question.id}
                                            onClick={() => {
                                              if (!canNavigateQuestion(mainSection.id, section.id, subSection.id, question.id)) {
                                                return;
                                              }
                                              setSelectedMainSection(mainSection.id);
                                              setSelectedSection(section.id);
                                              setSelectedSubSection(subSection.id);
                                              setSelectedQuestion(question.id);
                                            }}
                                            className={`w-full text-left p-3 text-sm hover:bg-gray-50 ${selectedQuestion === question.id
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
                          null
                        )
                      ) {
                        return;
                      }
                      addQuestion(selectedMainSection, selectedSection, selectedSubSection || null);
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
                      Choose a main section, section, or sub-section from the left
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
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setQuestionType(e.target.value)}
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
                      Criteria Information <span className="text-red-500">*</span>
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
                                    <label className="block text-xs text-gray-600 mb-1">Redirect Type <span className="text-red-500">*</span></label>
                                    <Dropdown
                                      placeholder="Select level"
                                      options={[
                                        { value: "main", label: "main" },
                                        { value: "section", label: "section" },
                                        { value: "subsection", label: "subsection" },
                                        { value: "question", label: "question" },
                                      ]}
                                      value={yesExitLevel}
                                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setYesExitLevel(e.target.value)}
                                      className="mb-0 bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Rank <span className="text-red-500">*</span></label>
                                    <input
                                      type="number"
                                      placeholder="Enter rank"
                                      value={yesRank}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        
                                        if (value === "" || (!isNaN(Number(value)) && Number(value) >= 0 && Number(value) % 1 === 0)) {
                                          setYesRank(value);
                                        }
                                      }}
                                      min="0"
                                      step="1"
                                      className="w-full px-3 py-3 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 text-sm font-normal leading-[19.2px] tracking-normal"
                                    />
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                  Select option to redirect with rank as per the selected level
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
                                    <label className="block text-xs text-gray-600 mb-1">Redirect Type <span className="text-red-500">*</span></label>
                                    <Dropdown
                                      placeholder="Select level"
                                      options={[
                                        { value: "main", label: "main" },
                                        { value: "section", label: "section" },
                                        { value: "subsection", label: "subsection" },
                                        { value: "question", label: "question" },
                                      ]}
                                      value={noExitLevel}
                                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNoExitLevel(e.target.value)}
                                      className="mb-0 bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Rank <span className="text-red-500">*</span></label>
                                    <input
                                      type="number"
                                      placeholder="Enter rank"
                                      value={noRank}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        
                                        if (value === "" || (!isNaN(Number(value)) && Number(value) >= 0 && Number(value) % 1 === 0)) {
                                          setNoRank(value);
                                        }
                                      }}
                                      min="0"
                                      step="1"
                                      className="w-full px-3 py-3 bg-white border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 text-sm font-normal leading-[19.2px] tracking-normal"
                                    />
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                  Select option to redirect with rank as per the selected level
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
                    if (selectedMainSection && selectedSection && selectedQuestion) {
                      deleteQuestion(
                        selectedMainSection,
                        selectedSection,
                        selectedSubSection,
                        selectedQuestion
                      );
                    }
                  }}
                  disabled={isDeletingQuestion === selectedQuestion}
                  className="px-6 py-2 border border-red-500 text-red-500 rounded-md text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeletingQuestion === selectedQuestion ? "Deleting..." : "Delete"}
                </button>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => router.push("/admin/certifications")}>Save Draft</Button>
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
                <svg width="80" height="80" viewBox="0 0 122 122" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="61" cy="61" r="61" fill="#262626" fillOpacity="0.1" />
                  <circle cx="61" cy="61" r="53.375" fill="#262626" fillOpacity="0.1" />
                  <circle cx="61" cy="61" r="45.75" fill="#262626" />
                  <path d="M44.125 63.9994C44.125 63.9994 46.9375 65.25 50.6875 70.875C50.6875 70.875 51.2219 69.975 52.2269 68.5369M70.375 50.25C66.0794 52.3988 61.585 56.91 57.9775 61.1662M53.5 63.9994C53.5 63.9994 56.3125 65.25 60.0625 70.875C60.0625 70.875 70.375 54.9375 79.75 50.25" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3
                className="text-secondary mb-2"
                style={{
                  fontSize: '24px'
                }}
              >
                Published
              </h3>
              <p
                className="text-gray-500 mb-6"
                style={{
                  fontSize: '16px'
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
    <Suspense fallback={
      <div className="bg-light-gray p-3 md:p-6">
        <div className="flex items-center justify-center min-h-100">
          <Loading isLoading size="lg" />
        </div>
      </div>
    }>
      <CreateCertificationPageContent />
    </Suspense>
  );
}
