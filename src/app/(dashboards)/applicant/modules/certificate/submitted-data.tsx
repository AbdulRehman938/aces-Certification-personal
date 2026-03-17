"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  Info,
} from "lucide-react";
import { axiosInstance } from "@/lib/axios";
import { Skeleton } from "@/components/ui/skeleton";

export interface SubmittedDataProps {
  onBack: () => void;
  assessmentId: string | number;
}

export function SubmittedData({ onBack, assessmentId }: SubmittedDataProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [activeMainSectionId, setActiveMainSectionId] = useState<string | null>(
    null,
  );
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    const fetchSubmittedData = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(
          `/assessments/${assessmentId}/submitted-view`,
        );
        const payload = res.data?.data || res.data;
        if (Array.isArray(payload)) {
          setData(payload);
          if (payload.length > 0) {
            setActiveMainSectionId(payload[0].main_section_id);
            setExpandedSectionIds(new Set([payload[0].main_section_id]));
          }
        }
      } catch (err) {
        console.error("Failed to fetch submitted data", err);
      } finally {
        setLoading(false);
      }
    };

    if (assessmentId) {
      fetchSubmittedData();
    }
  }, [assessmentId]);

  const toggleSection = (id: string) => {
    const newExpanded = new Set(expandedSectionIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSectionIds(newExpanded);
  };

  const activeMainSection = data.find(
    (s) => s.main_section_id === activeMainSectionId,
  );

  if (loading) {
    return (
      <div className="space-y-6 font-sans pb-20 max-w-7xl mx-auto animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32 rounded-lg" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Sidebar Skeleton */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-zinc-100 p-6 space-y-6">
            <Skeleton className="h-4 w-1/2" />
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-3xl border border-zinc-100 p-8 space-y-8">
              <div className="space-y-3">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <div className="space-y-6">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="border border-zinc-50 rounded-2xl p-6 space-y-4"
                  >
                    <div className="flex gap-4">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <Skeleton className="h-20 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-archivo">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-900 font-bold text-sm mb-8 hover:text-secondary group transition-colors"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Details
        </button>
        <div className="w-20 h-20 rounded-full bg-zinc-50 flex items-center justify-center">
          <Info className="w-10 h-10 text-zinc-200" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-zinc-900 font-bold">No submitted data found</p>
          <p className="text-zinc-400 text-xs font-medium">
            There are no responses available for this assessment yet.
          </p>
        </div>
      </div>
    );
  }

  const handleDownload = async (
    e: React.MouseEvent,
    url: string,
    fileName: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      window.open(url, "_blank");
    }
  };

  return (
    <div className="space-y-6 font-sans pb-20 text-archivo relative overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors font-bold text-sm group cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Submission
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 relative items-start">
        {/* Sidebar Column */}
        <aside className="lg:col-span-1 sticky top-20 z-40 self-start">
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
            <div className="p-6 border-b border-zinc-50 shrink-0">
              <h3 className="text-[13px] font-bold text-zinc-900 uppercase tracking-wider">
                Sections
              </h3>
            </div>
            <div className="py-2 overflow-y-auto scrollbar-hide">
            {data.map((mainSection) => (
              <div
                key={mainSection.main_section_id}
                className="border-b border-zinc-50 last:border-0"
              >
                <button
                  onClick={() => {
                    setActiveMainSectionId(mainSection.main_section_id);
                    toggleSection(mainSection.main_section_id);
                  }}
                  className={`w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-50 transition-all text-left group ${
                    activeMainSectionId === mainSection.main_section_id
                      ? "bg-zinc-50/50"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[12px] font-bold transition-colors ${
                        activeMainSectionId === mainSection.main_section_id
                          ? "text-zinc-900"
                          : "text-zinc-400 group-hover:text-zinc-600"
                      }`}
                    >
                      {mainSection.main_section_name}
                    </span>
                  </div>
                  {expandedSectionIds.has(mainSection.main_section_id) ? (
                    <ChevronUp className="w-3 h-3 text-zinc-300" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-zinc-300" />
                  )}
                </button>

                <AnimatePresence>
                  {expandedSectionIds.has(mainSection.main_section_id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-zinc-50/30"
                    >
                      <div className="py-2 space-y-1">
                        {mainSection.sections.map((sec: any) => (
                          <div key={sec.section_id} className="px-8 py-2">
                            <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mb-2">
                              {sec.section_name}
                            </p>
                            <div className="space-y-1.5 border-l border-zinc-100 ml-1 pl-3">
                              {sec.sub_sections.map(
                                (sub: any, subIdx: number) => (
                                  <div
                                    key={subIdx}
                                    className="text-[11px] font-bold text-zinc-400 py-0.5"
                                  >
                                    {sub.sub_section_name || "General"}
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Content Area */}
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-8 md:p-12">
            <div className="mb-12 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-4 w-1 bg-zinc-900 rounded-full" />
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                  Main Section
                </span>
              </div>
              <h2 className="text-2xl font-black text-zinc-900 leading-tight">
                {activeMainSection?.main_section_name}
              </h2>
            </div>

            <div className="space-y-16">
              {activeMainSection?.sections.map((section: any) => (
                <div key={section.section_id} className="space-y-8">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-zinc-900 shrink-0">
                      {section.section_name}
                    </h3>
                    <div className="h-px w-full bg-zinc-50" />
                  </div>

                  <div className="space-y-12">
                    {section.sub_sections.map((sub: any, subIdx: number) => (
                      <div key={subIdx} className="space-y-6">
                        {sub.sub_section_name && (
                          <h4 className="text-[13px] font-bold text-zinc-400 border-l-2 border-zinc-200 pl-4">
                            {sub.sub_section_name}
                          </h4>
                        )}

                        <div className="space-y-6">
                          {sub.questions.map((q: any, qIdx: number) => (
                            <div
                              key={q.question_id}
                              className="group bg-white rounded-2xl border border-zinc-100 p-8 hover:border-zinc-200 hover:shadow-xl hover:shadow-zinc-500/5 transition-all duration-300"
                            >
                              <div className="flex items-start gap-4 mb-8">
                                <div className="w-8 h-8 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 text-[11px] font-black text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-all duration-300">
                                  {q.rank || qIdx + 1}
                                </div>
                                <div className="space-y-1 pt-1">
                                  <h3 className="text-[15px] font-bold text-zinc-900 leading-snug">
                                    {q.question_text}
                                  </h3>
                                  {q.hint && (
                                    <p className="text-[11px] text-zinc-400 font-medium italic">
                                      {q.hint}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-6 pl-12">
                                {/* Response Bubble */}
                                <div className="space-y-2">
                                  <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">
                                    Response
                                  </span>
                                  <div className="bg-[#FAFBFB] border border-zinc-100 rounded-[20px] p-6 shadow-inner">
                                    <p className="text-[13px] text-zinc-600 font-medium leading-relaxed">
                                      {q.response_value ||
                                        "No response provided."}
                                    </p>
                                  </div>
                                </div>

                                {/* Files */}
                                {(q.response_files &&
                                  q.response_files.length > 0) ||
                                q.response_value?.startsWith("http") ? (
                                  <div className="space-y-3">
                                    <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest text-archivo">
                                      Supporting Evidence
                                    </span>
                                    <div className="flex flex-wrap gap-3">
                                      {(
                                        q.response_files || [q.response_value]
                                      ).map((file: any, fIdx: number) => {
                                        const isUrl =
                                          typeof file === "string" &&
                                          (file.startsWith("http") ||
                                            file.startsWith("blob"));
                                        if (!isUrl && !file?.name) return null;

                                        const fileName = isUrl
                                          ? file.split("/").pop()
                                          : file.name;

                                        return (
                                          <a
                                            key={fIdx}
                                            href={isUrl ? file : "#"}
                                            target="_blank"
                                            rel="noreferrer"
                                            download={fileName}
                                            className="flex items-center gap-3 bg-white border border-zinc-100 rounded-xl px-5 py-3 hover:border-zinc-900 hover:shadow-lg transition-all cursor-pointer group/file"
                                          >
                                            <FileText className="w-4 h-4 text-zinc-400 group-hover/file:text-zinc-900" />
                                            <span className="text-[11px] font-bold text-zinc-600 group-hover/file:text-zinc-900 max-w-[150px] truncate">
                                              {fileName}
                                            </span>
                                            <button
                                              onClick={(e) =>
                                                handleDownload(
                                                  e,
                                                  isUrl ? file : "#",
                                                  fileName,
                                                )
                                              }
                                              className="p-1 hover:bg-zinc-100 rounded-md transition-colors"
                                            >
                                              <Download className="w-3.5 h-3.5 text-zinc-300 group-hover/file:text-zinc-900" />
                                            </button>
                                          </a>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
