"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { TermsOfService } from "./TermsOfService";
import { PrivacyPolicy } from "./PrivacyPolicy";

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");

  return (
    <div className="flex-1 bg-gray-50 h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-10 lg:pt-3 space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-secondary">Legal</h1>
          <p className="text-base text-gray font-medium">
            Review our Terms & Conditions and Privacy Policy to understand how
            we operate, your responsibilities, and how your data is protected.
          </p>
        </div>

        <div className="flex items-center gap-4 ">
          <Button
            variant={activeTab === "terms" ? "secondary" : "primary"}
            onClick={() => setActiveTab("terms")}
            className="w-auto h-10 px-6 text-sm font-semibold rounded-lg"
          >
            Terms of Service
          </Button>
          <Button
            variant={activeTab === "privacy" ? "secondary" : "primary"}
            onClick={() => setActiveTab("privacy")}
            className="w-auto h-10 px-6 text-sm font-semibold rounded-lg"
          >
            Privacy Policy
          </Button>
        </div>

        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-zinc-100">
          {activeTab === "terms" ? <TermsOfService /> : <PrivacyPolicy />}
        </div>
      </div>
    </div>
  );
}
