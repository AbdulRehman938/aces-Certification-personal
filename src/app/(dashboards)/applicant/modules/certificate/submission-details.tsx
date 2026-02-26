"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Clock,
  Check,
  User,
  Calendar,
  Upload,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui";

export interface SubmissionCertificate {
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
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const details = certificate.details || {
    subtitle:
      "Choose from hotel and property certifications designed to align with global ESG standards.",
    badge: "In Progress",
    steps: [
      {
        label: "Assessment Submitted",
        sub: "Application received",
        status: "completed",
      },
      {
        label: "Sent to Auditor",
        sub: "Assigned for review",
        status: "completed",
      },
      {
        label: "Audit In Progress",
        sub: "Application received",
        status: "active",
      },
      {
        label: "Pending Management Reviewer",
        sub: "Application received",
        status: "pending",
      },
      { label: "Completed", sub: "Application received", status: "pending" },
    ],
    currentStage: {
      stage: "Assessment Submitted",
      leadAuditor: "Sarah Mitchell",
      startDate: "Jan 15, 2024",
    },
    actionRequired: [
      {
        title: "Risk Assessment Documentation",
        desc: "Please provide the latest risk assessment report dated within the last 6 months.",
      },
      {
        title: "Access Control Policy",
        desc: "The access control policy document appears to be outdated. Please upload the current version.",
      },
      {
        title: "Incident Response Procedures",
        desc: "Evidence of incident response testing is required. Please provide test reports.",
      },
    ],
    auditorRemarks: {
      name: "Sarah Mitchell",
      role: "Lead Auditor",
      text: "Documentation review completed. Several items require clarification before proceeding.",
      date: "Jan 19, 2024",
      status: "Needs Clarification",
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 font-sans pb-20"
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray hover:text-secondary transition-colors font-semibold text-base group cursor-pointer"
      >
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        Back
      </button>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-secondary tracking-tight">
            {certificate.title}
          </h1>
          <p className="text-gray text-base max-w-2xl">{details.subtitle}</p>
        </div>
        {details.badge && (
          <span className="px-5 py-2 bg-zinc-100 text-[10px] font-semibold text-zinc-500 rounded-xl border border-zinc-200  tracking-widest whitespace-nowrap">
            {details.badge}
          </span>
        )}
      </div>

      {/* Progress Tracker */}
      <div className="bg-zinc-50 rounded-4xl border border-zinc-100 shadow-sm p-8 md:p-10">
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-0">
          {/* Connecting Line (Desktop) */}
          <div className="absolute top-[21px] left-[40px] right-[40px] h-[2px] bg-zinc-100 hidden md:block" />

          {details.steps?.map((step, i) => (
            <div
              key={i}
              className="relative z-10 flex flex-col items-center text-center md:w-1/5 group"
            >
              {/* Step Circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  step.status === "completed"
                    ? "bg-secondary border-secondary text-primary"
                    : step.status === "active"
                      ? "bg-zinc-50 border-zinc-200 text-zinc-400"
                      : "bg-zinc-50 border-zinc-100 text-zinc-200"
                }`}
              >
                {step.status === "completed" ? (
                  <Check className="w-5 h-5 md:w-4 md:h-4 stroke-3" />
                ) : (
                  <span className="text-sm font-semibold">{i + 1}</span>
                )}
              </div>

              {/* Step Labels */}
              <div className="mt-4 space-y-1">
                <h4
                  className={`text-sm font-semibold transition-all ${
                    step.status === "pending"
                      ? "text-zinc-300"
                      : "text-secondary"
                  }`}
                >
                  {step.label}
                </h4>
                <p className="text-[10px] text-zinc-400 font-medium">
                  {step.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-50 rounded-4xl border border-zinc-100 shadow-sm p-8 md:p-10 space-y-6">
        <h3 className="text-xl font-semibold text-secondary">Current Stage</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center border border-zinc-100">
              <Clock className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-semibold  tracking-wider">
                Stage
              </p>
              <h5 className="text-sm font-semibold text-secondary">
                {details.currentStage?.stage}
              </h5>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center border border-zinc-100">
              <User className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-semibold  tracking-wider">
                Lead Auditor
              </p>
              <h5 className="text-sm font-semibold text-secondary">
                {details.currentStage?.leadAuditor}
              </h5>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center border border-zinc-100">
              <Calendar className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-semibold  tracking-wider">
                Start Date
              </p>
              <h5 className="text-sm font-semibold text-secondary">
                {details.currentStage?.startDate}
              </h5>
            </div>
          </div>
        </div>
      </div>

      {/* Action Required Section */}
      {details.actionRequired && (
        <div className="bg-primary/50 rounded-4xl border border-zinc-100 p-8 md:p-10 space-y-8">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-secondary">
              Action Required
            </h3>
            <p className="text-zinc-400 text-sm font-medium">
              The following items require your attention before the audit can
              proceed:
            </p>
          </div>

          <div className="space-y-4">
            {details.actionRequired.map((action, i) => (
              <div
                key={i}
                className="bg-zinc-50 rounded-2xl border border-zinc-100 p-6 flex gap-4 items-start shadow-sm"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center border border-zinc-100 text-xs font-semibold text-zinc-400 shrink-0">
                  {i + 1}
                </div>
                <div className="grow space-y-1">
                  <h4 className="text-sm font-semibold text-secondary">
                    {action.title}
                  </h4>
                  <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                    {action.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 pt-4">
            <Button
              variant="secondary"
              className="w-auto px-8 h-12 text-sm bg-secondary text-primary font-semibold shadow-xl"
            >
              <Upload className="w-4 h-4 mr-2" /> Upload Documents
            </Button>
            <Button
              variant="primary"
              className="w-auto px-8 h-12 text-sm bg-white border border-zinc-200 text-secondary font-semibold hover:bg-primary"
            >
              Respond to Auditor
            </Button>
          </div>
        </div>
      )}

      {/* Remarks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Auditor Remarks */}
        <div className="bg-zinc-50 rounded-4xl border border-zinc-100 shadow-sm p-8 md:p-10 space-y-6">
          <h3 className="text-xl font-semibold text-secondary">
            Auditor Remarks
          </h3>
          {details.auditorRemarks ? (
            <div className="bg-primary/30 rounded-3xl border border-zinc-100 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-500">
                    {details.auditorRemarks.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-semibold ">
                      Lead Auditor
                    </p>
                    <h5 className="text-sm font-semibold text-secondary">
                      {details.auditorRemarks.name}
                    </h5>
                  </div>
                </div>
                {details.auditorRemarks.status && (
                  <span className="px-3 py-1 bg-zinc-100 text-[9px] font-semibold text-zinc-500 rounded-lg border border-zinc-200  tracking-wider">
                    {details.auditorRemarks.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                {details.auditorRemarks.text}
              </p>
              <p className="text-[10px] text-zinc-300 font-semibold">
                {details.auditorRemarks.date}
              </p>
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-center space-y-3 bg-primary/30 rounded-3xl border border-dashed border-zinc-200">
              <MessageSquare className="w-8 h-8 text-zinc-200" />
              <p className="text-xs text-zinc-400 font-medium">
                No remarks yet
              </p>
            </div>
          )}
        </div>

        {/* Management Reviewer Remarks */}
        <div className="bg-zinc-50 rounded-4xl border border-zinc-100 shadow-sm p-8 md:p-10 space-y-6">
          <h3 className="text-xl font-semibold text-secondary">
            Management Reviewer Remarks
          </h3>
          {details.reviewerRemarks ? (
            <div className="bg-primary/30 rounded-3xl border border-zinc-100 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-500">
                    {details.reviewerRemarks.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-semibold ">
                      Reviewer
                    </p>
                    <h5 className="text-sm font-semibold text-secondary">
                      {details.reviewerRemarks.name}
                    </h5>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-center space-y-3 bg-primary/30 rounded-3xl border border-dashed border-zinc-200">
              <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200">
                <ShieldCheck className="w-6 h-6 text-zinc-300" />
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                No remarks yet
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

