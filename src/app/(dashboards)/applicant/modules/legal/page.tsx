"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { TermsOfService } from "./TermsOfService";
import { PrivacyPolicy } from "./PrivacyPolicy";

function LegalPageContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "privacy") {
      setActiveTab("privacy");
    } else if (tab === "terms") {
      setActiveTab("terms");
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
     
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:pt-3">
        <div className="space-y-2 mb-5">
          <h1 className="text-2xl font-semibold text-secondary">Legal</h1>
          <p className="text-base text-gray font-medium">
            Review our Terms & Conditions and Privacy Policy to understand how
            we operate, your responsibilities, and how your data is protected.
          </p>
        </div>
        <div className="mb-8 flex items-center gap-2 bg-white w-full max-w-[28%] p-2 rounded-md shadow-md">
          <button
            onClick={() => setActiveTab("terms")}
            className={`rounded-lg cursor-pointer px-6 py-2.5 text-sm font-semibold transition-all ${
              activeTab === "terms"
                ? "bg-[#2F2F2F] text-white shadow-md"
                : "text-gray/60 hover:text-secondary"
            }`}
          >
            Terms of Service
          </button>
          <button
            onClick={() => setActiveTab("privacy")}
            className={`rounded-lg cursor-pointer px-6 py-2.5 text-sm font-semibold transition-all ${
              activeTab === "privacy"
                ? "bg-[#2F2F2F] text-white shadow-md"
                : "text-gray/60 hover:text-secondary"
            }`}
          >
            Privacy Policy
          </button>
        </div>

        <div className="mb-12 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5 md:p-12">
          {activeTab === "terms" ? <TermsOfService /> : <PrivacyPolicy />}
        </div>
      </main>
    </div>
  );
}

export default function LegalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <LegalPageContent />
    </Suspense>
  );
}
