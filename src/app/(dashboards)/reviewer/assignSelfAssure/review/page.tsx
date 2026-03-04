"use client";

import { Suspense, useEffect, useState } from "react";
import Button from "@/app/(dashboards)/admin/common/button";
import { DUMMY_MAIN_SECTIONS } from "@/lib/dummyMainSections";
import { useRouter, useSearchParams } from "next/navigation";
import { axiosInstance } from "@/lib/axios";
import axios from "axios";

const getFileNameFromUrl = (value: string): string => {
    const fallback = "Attached document";
    if (!value || value.startsWith("data:")) return fallback;

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

const formatStatusLabel = (value?: string | null): string => {
    const raw = String(value || "").trim();
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

function AssignSelfAssureReviewContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const assessmentId = searchParams.get("id");
    const [isLoading, setIsLoading] = useState(Boolean(assessmentId));
    const [mainSectionsData, setMainSectionsData] = useState(DUMMY_MAIN_SECTIONS);
    const [expandedMain, setExpandedMain] = useState<{ [key: string]: boolean }>(() =>
        Object.fromEntries(DUMMY_MAIN_SECTIONS.map((ms: any) => [ms.id, ms.isExpanded || false]))
    );
    const [activeSubsection, setActiveSubsection] = useState<string | null>(
        DUMMY_MAIN_SECTIONS[0]?.sections?.[0]?.name || null
    );
    const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [organizationName, setOrganizationName] = useState("Acme Corporation");
    const [certificateId, setCertificateId] = useState("");
    const [certificateName, setCertificateName] = useState("ISO 27001:2022");
    const [assessmentStatus, setAssessmentStatus] = useState("Assigned");
    const [auditDateLabel, setAuditDateLabel] = useState("N/A");
    const [reviewerNotesByQuestion, setReviewerNotesByQuestion] = useState<
        Record<string, string>
    >({});
    const [hasSavedReviewerNotes, setHasSavedReviewerNotes] = useState<
        Record<string, boolean>
    >({});
    const [noteSaveFeedbackByQuestion, setNoteSaveFeedbackByQuestion] = useState<
        Record<string, { type: 'success' | 'error'; message: string; isSaving?: boolean }>
    >({});

    const handleReviewerNotesChange = (questionId: string, value: string) => {
        setReviewerNotesByQuestion((prev) => ({ ...prev, [questionId]: value }));
        setNoteSaveFeedbackByQuestion((prev) => {
            if (!prev[questionId]) return prev;
            const next = { ...prev };
            delete next[questionId];
            return next;
        });
    };

    useEffect(() => {
        if (!assessmentId) {
            setIsLoading(false);
            console.warn("Assessment id is missing in query params");
            return;
        }

        let isCancelled = false;

        const fetchAssessmentById = async () => {
            setIsLoading(true);
            try {
                const response = await axiosInstance.get(`/audits/assessment/${assessmentId}`);
                if (isCancelled) return;
                console.log("reviewer assessment by id response:", response.data);

                const payload = response.data?.data;
                if (!payload || typeof payload !== "object") return;

                setOrganizationName(payload.organizationName || "N/A");
                setCertificateId(
                    String(payload.certificateId || payload.certificate_id || "").trim(),
                );
                setCertificateName(payload.certificateName || "N/A");
                setAssessmentStatus(formatStatusLabel(payload.status));

                const auditDateFromApi =
                    payload.auditRecord?.auditDate ||
                    payload.auditRecord?.date ||
                    payload.auditRecord?.scheduledAt ||
                    payload.auditDate ||
                    null;
                setAuditDateLabel(formatDateLabel(auditDateFromApi));

                const mainSections = Array.isArray(payload.sections) ? payload.sections : [];

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
                                            auditorNotes: question.auditorNotes || "",
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

                if (!mappedMainSections.length) return;

                setMainSectionsData(mappedMainSections);
                setExpandedMain(
                    Object.fromEntries(
                        mappedMainSections.map((mainSection: any, index: number) => [
                            mainSection.id,
                            index === 0,
                        ]),
                    ),
                );
                setActiveSubsection(mappedMainSections[0]?.sections?.[0]?.name || null);
                setSelectedQuestionIndex(0);

                const nextReviewerNotesByQuestion: Record<string, string> = {};
                const nextHasSavedReviewerNotes: Record<string, boolean> = {};

                mappedMainSections.forEach((mainSection: any) => {
                    (mainSection.sections || []).forEach((section: any) => {
                        (section.questions || []).forEach((question: any) => {
                            const questionId = String(question.id || "");
                            if (!questionId) return;

                            const noteValue =
                                typeof question.auditorNotes === "string"
                                    ? question.auditorNotes
                                    : "";
                            nextReviewerNotesByQuestion[questionId] = noteValue;
                            nextHasSavedReviewerNotes[questionId] = Boolean(noteValue.trim());
                        });
                    });
                });

                setReviewerNotesByQuestion(nextReviewerNotesByQuestion);
                setHasSavedReviewerNotes(nextHasSavedReviewerNotes);
                setNoteSaveFeedbackByQuestion({});
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

    const handleReviewerNotesSave = async (questionId: string) => {
        if (!assessmentId) {
            setNoteSaveFeedbackByQuestion((prev) => ({
                ...prev,
                [questionId]: { type: "error", message: "Assessment id is missing." },
            }));
            return;
        }

        const noteValue = (reviewerNotesByQuestion[questionId] || '').trim();
        if (!noteValue) {
            setNoteSaveFeedbackByQuestion((prev) => ({
                ...prev,
                [questionId]: { type: 'error', message: 'Please add notes before saving.' },
            }));
            return;
        }

        setNoteSaveFeedbackByQuestion((prev) => ({
            ...prev,
            [questionId]: { type: 'success', message: '', isSaving: true },
        }));

        try {
            await axiosInstance.patch(
                `/audits/assessment/${encodeURIComponent(assessmentId)}/questions/${encodeURIComponent(questionId)}/auditor-notes`,
                {
                    auditorNotes: noteValue,
                },
            );

            setHasSavedReviewerNotes((prev) => ({ ...prev, [questionId]: true }));
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
                [questionId]: { type: 'success', message: 'Notes saved successfully.' },
            }));
        } catch (error) {
            let message = "Failed to save notes";
            if (axios.isAxiosError(error)) {
                message = error.response?.data?.message || message;
            }
            setNoteSaveFeedbackByQuestion((prev) => ({
                ...prev,
                [questionId]: { type: "error", message },
            }));
        }
    };

    if (isLoading) {
        return (
            <div className="p-3 md:p-6 bg-light-gray min-h-screen flex items-center justify-center">
                <div className="text-secondary">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-3 md:p-6 bg-light-gray min-h-screen">
            
            <div className="mb-4 md:mb-6">
                <div className="flex items-start justify-between gap-3 mb-1 md:mb-2">
                    <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary leading-[21.6px] align-middle">
                        Self-assured Certificates
                    </h1>
                    {certificateId || assessmentId ? (
                        <button
                            type="button"
                            className="text-sm font-medium text-[#2563EB] underline underline-offset-4 hover:text-[#1D4ED8] transition-colors"
                            onClick={() => {
                                const params = new URLSearchParams();
                                if (certificateId) {
                                    params.set("certificateId", certificateId);
                                }
                                if (assessmentId) {
                                    params.set("assessmentId", assessmentId);
                                }
                                if (certificateName) {
                                    params.set("certificateCode", certificateName);
                                }
                                const query = params.toString();
                                router.push(
                                    query
                                        ? `/reviewer/certificate-details?${query}`
                                        : "/reviewer/certificate-details",
                                );
                            }}
                        >
                            Details
                        </button>
                    ) : null}
                </div>
                <p className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px] align-middle">
                    View and manage all Assigned Assurance to you
                </p>
            </div>

            
            <div className="bg-white rounded-xl border border-zinc-100 shadow-sm p-4 md:p-4 mb-4">
                <div className="flex items-center gap-4">
                    
                    <div className="w-7 h-7 md:w-8 md:h-8 border rounded-lg flex items-center justify-center shrink-0" style={{ borderColor: "#E6E6E6" }}>
                        <svg width="13" height="13" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_566_2113)">
                                <path d="M0 1.25C0 0.558594 0.558594 0 1.25 0H18.75C19.4414 0 20 0.558594 20 1.25C20 1.94141 19.4414 2.5 18.75 2.5V17.5C19.4414 17.5 20 18.0586 20 18.75C20 19.4414 19.4414 20 18.75 20H11.875V18.125C11.875 17.0898 11.0352 16.25 10 16.25C8.96484 16.25 8.125 17.0898 8.125 18.125V20H1.25C0.558594 20 0 19.4414 0 18.75C0 18.0586 0.558594 17.5 1.25 17.5V2.5C0.558594 2.5 0 1.94141 0 1.25ZM3.75 4.375V5.625C3.75 5.96875 4.03125 6.25 4.375 6.25H5.625C5.96875 6.25 6.25 5.96875 6.25 5.625V4.375C6.25 4.03125 5.96875 3.75 5.625 3.75H4.375C4.03125 3.75 3.75 4.03125 3.75 4.375ZM9.375 3.75C9.03125 3.75 8.75 4.03125 8.75 4.375V5.625C8.75 5.96875 9.03125 6.25 9.375 6.25H10.625C10.9688 6.25 11.25 5.96875 11.25 5.625V4.375C11.25 4.03125 10.9688 3.75 10.625 3.75H9.375ZM13.75 4.375V5.625C13.75 5.96875 14.0312 6.25 14.375 6.25H15.625C15.9688 6.25 16.25 5.96875 16.25 5.625V4.375C16.25 4.03125 15.9688 3.75 15.625 3.75H14.375C14.0312 3.75 13.75 4.03125 13.75 4.375ZM4.375 7.5C4.03125 7.5 3.75 7.78125 3.75 8.125V9.375C3.75 9.71875 4.03125 10 4.375 10H5.625C5.96875 10 6.25 9.71875 6.25 9.375V8.125C6.25 7.78125 5.96875 7.5 5.625 7.5H4.375ZM8.75 8.125V9.375C8.75 9.71875 9.03125 10 9.375 10H10.625C10.9688 10 11.25 9.71875 11.25 9.375V8.125C11.25 7.78125 10.9688 7.5 10.625 7.5H9.375C9.03125 7.5 8.75 7.78125 8.75 8.125ZM14.375 7.5C14.0312 7.5 13.75 7.78125 13.75 8.125V9.375C13.75 9.71875 14.0312 10 14.375 10H15.625C15.9688 10 16.25 9.71875 16.25 9.375V8.125C16.25 7.78125 15.9688 7.5 15.625 7.5H14.375ZM12.8125 15C13.332 15 13.7617 14.5742 13.6328 14.0703C13.2188 12.4492 11.75 11.25 10 11.25C8.25 11.25 6.77734 12.4492 6.36719 14.0703C6.23828 14.5703 6.67188 15 7.1875 15H12.8125Z" fill="black" />
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
                                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10.0002 6.66699V1.66699H5.00016C4.55814 1.66699 4.13421 1.84259 3.82165 2.15515C3.50909 2.46771 3.3335 2.89163 3.3335 3.33366V16.667C3.3335 17.109 3.50909 17.5329 3.82165 17.8455C4.13421 18.1581 4.55814 18.3337 5.00016 18.3337H15.0002C15.4422 18.3337 15.8661 18.1581 16.1787 17.8455C16.4912 17.5329 16.6668 17.109 16.6668 16.667V8.33366H11.6668C11.2248 8.33366 10.8009 8.15806 10.4883 7.8455C10.1758 7.53294 10.0002 7.10902 10.0002 6.66699ZM6.87516 9.58366H13.1252C13.2909 9.58366 13.4499 9.64951 13.5671 9.76672C13.6843 9.88393 13.7502 10.0429 13.7502 10.2087C13.7502 10.3744 13.6843 10.5334 13.5671 10.6506C13.4499 10.7678 13.2909 10.8337 13.1252 10.8337H6.87516C6.7094 10.8337 6.55043 10.7678 6.43322 10.6506C6.31601 10.5334 6.25016 10.3744 6.25016 10.2087C6.25016 10.0429 6.31601 9.88393 6.43322 9.76672C6.55043 9.64951 6.7094 9.58366 6.87516 9.58366ZM6.87516 11.8753H13.1252C13.2909 11.8753 13.4499 11.9412 13.5671 12.0584C13.6843 12.1756 13.7502 12.3346 13.7502 12.5003C13.7502 12.6661 13.6843 12.8251 13.5671 12.9423C13.4499 13.0595 13.2909 13.1253 13.1252 13.1253H6.87516C6.7094 13.1253 6.55043 13.0595 6.43322 12.9423C6.31601 12.8251 6.25016 12.6661 6.25016 12.5003C6.25016 12.3346 6.31601 12.1756 6.43322 12.0584C6.55043 11.9412 6.7094 11.8753 6.87516 11.8753ZM6.87516 14.167H13.1252C13.2909 14.167 13.4499 14.2328 13.5671 14.35C13.6843 14.4673 13.7502 14.6262 13.7502 14.792C13.7502 14.9578 13.6843 15.1167 13.5671 15.2339C13.4499 15.3511 13.2909 15.417 13.1252 15.417H6.87516C6.7094 15.417 6.55043 15.3511 6.43322 15.2339C6.31601 15.1167 6.25016 14.9578 6.25016 14.792C6.25016 14.6262 6.31601 14.4673 6.43322 14.35C6.55043 14.2328 6.7094 14.167 6.87516 14.167ZM11.2502 6.66699V2.08366L16.2502 7.08366H11.6668C11.5563 7.08366 11.4503 7.03976 11.3722 6.96162C11.2941 6.88348 11.2502 6.7775 11.2502 6.66699Z" fill="#999999" />
                                </svg>
                                <span className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px]">
                                    {certificateName}
                                </span>
                            </div>

                            
                            <div className="flex items-center gap-2">
                                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1.66675 7.50033C1.66675 5.92866 1.66675 5.14366 2.15508 4.65533C2.64341 4.65533 3.42841 4.16699 5.00008 4.16699H15.0001C16.5717 4.16699 17.3567 4.16699 17.8451 4.65533C18.3334 5.14366 18.3334 5.92866 18.3334 7.50033C18.3334 7.89283 18.3334 8.08949 18.2117 8.21199C18.0892 8.33366 17.8917 8.33366 17.5001 8.33366H2.50008C2.10758 8.33366 1.91091 8.33366 1.78841 8.21199C1.66675 8.08949 1.66675 7.89199 1.66675 7.50033ZM1.66675 15.0003C1.66675 16.572 1.66675 17.357 2.15508 17.8453C2.64341 18.3337 3.42841 18.3337 5.00008 18.3337H15.0001C16.5717 18.3337 17.3567 18.3337 17.8451 17.8453C18.3334 17.357 18.3334 16.572 18.3334 15.0003V10.8337C18.3334 10.4412 18.3334 10.2445 18.2117 10.122C18.0892 10.0003 17.8917 10.0003 17.5001 10.0003H2.50008C2.10758 10.0003 1.91091 10.0003 1.78841 10.122C1.66675 10.2445 1.66675 10.442 1.66675 10.8337V15.0003Z" fill="#999999" />
                                    <path d="M5.8335 2.5V5M14.1668 2.5V5" stroke="#999999" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                <span className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px]">
                                    {auditDateLabel}
                                </span>
                            </div>
                        </div>
                    </div>

                    
                    <button
                        type="button"
                        className="shrink-0 focus:outline-none"
                        onClick={() => {
                            router.push('/reviewer/assignSelfAssure/flagItems');
                        }}
                    >
                        <span className="inline-flex items-center justify-center px-4 py-1 rounded-md text-sm font-medium bg-green-50 text-green-600 border border-green-600">
                            {assessmentStatus}
                        </span>
                    </button>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                
                <div className="md:col-span-4 xl:col-span-3">
                    <div className="bg-white rounded-md border border-zinc-100 shadow-sm">
                        <div className="px-4 py-4 border-b border-zinc-100">
                            <h3 className="text-md font-medium text-secondary">Assessment Sections</h3>
                        </div>
                        <div className="space-y-1 mt-2 px-3">
                            {mainSectionsData.map((ms: any) => (
                                <div key={ms.id}>
                                    <button
                                        className="w-full text-left px-2 py-2 flex items-center gap-3"
                                        onClick={() => setExpandedMain((p) => ({ ...p, [ms.id]: !p[ms.id] }))}
                                    >
                                        
                                        <span className="shrink-0">
                                            {expandedMain[ms.id] ? (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                    <path d="M6 15l6-6 6 6" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            ) : (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                    <path d="M6 9l6 6 6-6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </span>
                                        <span
                                            className="font-medium text-sm"
                                            style={{
                                                color: expandedMain[ms.id] ? undefined : '#999999'
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
                                                        className={`pl-6 py-1 text-sm ${activeSubsection === s.name ? 'text-secondary font-medium' : ''} cursor-pointer`}
                                                        style={{
                                                            color: activeSubsection === s.name ? undefined : '#999999'
                                                        }}
                                                        onClick={() => {
                                                            setActiveSubsection(s.name);
                                                            setSelectedQuestionIndex(0);
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
                    <div className="bg-white rounded-md border border-zinc-100 p-4 md:p-6 shadow-sm">
                        
                        {activeSubsection && (() => {
                            const selectedSection = mainSectionsData
                                .flatMap((ms: any) => ms.sections || [])
                                .find((s: any) => s.name === activeSubsection);
                            const questionsCount = selectedSection?.questions?.length || 0;

                            return (
                                <div>
                                    <div>
                                        <h3 className="text-sm font-medium text-secondary leading-[21.6px]">{activeSubsection}</h3>
                                        <p className="text-sm font-normal" style={{ color: "#999999" }}>{questionsCount} questions to review</p>
                                    </div>

                                    {selectedSection?.questions?.length ? (
                                        selectedSection.questions.map((q: any, idx: number) => {
                                            const questionId = String(q.id);
                                            const noteValue =
                                                reviewerNotesByQuestion[questionId] ??
                                                q.auditorNotes ??
                                                "";
                                            const hasSavedNotes =
                                                hasSavedReviewerNotes[questionId] ||
                                                Boolean(String(q.auditorNotes || "").trim());
                                            const noteSaveFeedback = noteSaveFeedbackByQuestion[questionId];

                                            return (
                                            <div key={q.id} className="mt-6 border border-zinc-100 rounded-md p-6">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-semibold">
                                                            {idx + 1}
                                                        </div>
                                                        <h4 className="text-sm font-medium text-secondary leading-[21.6px]">{q.text}</h4>
                                                    </div>
                                                    <span
                                                        className="inline-flex items-center px-6 py-0.5 rounded-md text-sm font-medium"
                                                        style={{ color: "#FAAB00", backgroundColor: "#FEF7E5", border: "1px solid #FAAB00" }}
                                                    >
                                                        Pending
                                                    </span>
                                                </div>

                                                <div className="space-y-4 pl-12 pr-4">
                                                    
                                                    <div>
                                                        <h5 className="text-sm font-medium text-gray leading-[21.6px] mb-2">Applicant Response</h5>
                                                        <div className="min-h-[80px] p-4 rounded-md text-sm text-gray-700" style={{ border: "1px solid #E6E6E6" }}>
                                                            {q.applicantAnswer || "N/A"}
                                                        </div>
                                                    </div>

                                                    
                                                    <div>
                                                        <h5 className="text-sm font-medium text-gray mb-2">Attached Documents</h5>
                                                        {Array.isArray(q.attachments) && q.attachments.length > 0 ? (
                                                            <div className="flex gap-2 flex-wrap">
                                                                {q.attachments.map((attachment: any, fileIndex: number) => (
                                                                    <a
                                                                        key={`${questionId}-attachment-${fileIndex}`}
                                                                        href={attachment.url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="inline-flex items-center px-3 py-2 rounded-md text-sm bg-[#F6F6F6] max-w-full"
                                                                    >
                                                                        <span className="truncate max-w-[260px]">
                                                                            {attachment.name || getFileNameFromUrl(attachment.url)}
                                                                        </span>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-500">No documents attached.</p>
                                                        )}
                                                    </div>

                                                    
                                                    <div>
                                                        <h5 className="text-sm font-medium text-gray mb-2">AI Analysis</h5>
                                                        <div className="p-4 rounded-md text-sm text-gray-700 border" style={{ borderColor: "#E6E6E6" }}>
                                                            {q.aiSummary || "No AI analysis available"}
                                                        </div>
                                                    </div>

                                                    


                                                    
                                                    <div>
                                                        <h5 className="text-sm font-medium text-gray mb-2">Auditor Notes</h5>
                                                        <div className="p-4 rounded-md text-sm text-gray-700 border" style={{ borderColor: "#E6E6E6" }}>
                                                            {q.auditorNotes || "No auditor notes available"}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <h5 className="text-sm font-medium text-gray mb-2">Reviewer Notes</h5>
                                                        <textarea
                                                            className="w-full min-h-30 p-3 rounded-md text-sm border focus:outline-none focus:border-black"
                                                            style={{ borderColor: "#E6E6E6" }}
                                                            placeholder="Add your reviewer notes here..."
                                                            value={noteValue}
                                                            onChange={(event) =>
                                                                handleReviewerNotesChange(
                                                                    questionId,
                                                                    event.target.value
                                                                )
                                                            }
                                                        ></textarea>
                                                    </div>

                                                    <div className="mt-6 flex items-center gap-4">
                                                        <Button variant="custom" className="border border-black rounded-lg px-6 py-2 font-semibold" onClick={() => setShowSubmitModal(true)}>Request Clarification</Button>
                                                        <Button
                                                            variant="custom"
                                                            className="border border-black rounded-lg px-6 py-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                                            onClick={() => handleReviewerNotesSave(questionId)}
                                                            disabled={Boolean(noteSaveFeedback?.isSaving) || !noteValue.trim()}
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
                                                            className={`text-sm ${noteSaveFeedback.type === 'error'
                                                                ? 'text-red-600'
                                                                : 'text-green-600'
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
                                            <div className="text-sm text-gray-500">No questions available for this section.</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>
                {showSubmitModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setShowSubmitModal(false)} />
                        <div className="relative bg-white rounded-lg w-[90%] max-w-xl p-6 shadow-lg">
                            <button
                                className="absolute top-4 right-4"
                                onClick={() => setShowSubmitModal(false)}
                            >
                                <img src="/assets/imgs/admin/commons/cross.svg" alt="close" className="w-5 h-5" />
                            </button>

                            <h3 className="text-lg font-medium text-secondary mb-3">Request Clarification</h3>
                            <p className="text-sm text-gray-600 mb-4">Describe what additional information or documents you need from the applicant.</p>

                            <textarea
                                className="w-full min-h-30 p-3 rounded-md text-sm border"
                                style={{ borderColor: "#E6E6E6" }}
                                placeholder="Kindly provide additional documentation for....."
                            />

                            <div className="mt-6 flex justify-end gap-3">
                                <Button variant="secondary" onClick={() => setShowSubmitModal(false)}>Close</Button>
                                <Button variant="primary" onClick={() => { console.log("Request sent"); setShowSubmitModal(false); }}>Send Request</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}

export default function AssignSelfAssureReview() {
    return (
        <Suspense
            fallback={
                <div className="p-3 md:p-6 bg-light-gray min-h-screen flex items-center justify-center">
                    <div className="text-secondary">Loading...</div>
                </div>
            }
        >
            <AssignSelfAssureReviewContent />
        </Suspense>
    );
}
