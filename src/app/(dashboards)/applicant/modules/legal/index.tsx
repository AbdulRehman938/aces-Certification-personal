"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import { TermsOfService } from "./TermsOfService";
import { PrivacyPolicy } from "./PrivacyPolicy";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import { Lock } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");
  const router = useRouter();
  const pathname = usePathname();
  const [profileData, setProfileData] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("organization_profile");
      try {
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const { isEmployee, hasAccess } = useEmployeePermissions(profileData);
  const canAccess = !isEmployee || hasAccess("legal");

  useEffect(() => {
    const loadProfile = () => {
      const stored = localStorage.getItem("organization_profile");
      if (stored) {
        try {
          setProfileData(JSON.parse(stored));
        } catch (e) {}
      }
    };
    window.addEventListener("storage", loadProfile);
    window.addEventListener("profile-updated", loadProfile);
    return () => {
      window.removeEventListener("storage", loadProfile);
      window.removeEventListener("profile-updated", loadProfile);
    };
  }, []);

  if (!canAccess) {
    const isEmployeePath = pathname.startsWith("/employee");
    const base = isEmployeePath ? "/employee" : "/applicant";
    return (
      <div className="p-6 lg:p-10 bg-dull-white/10 min-h-[80vh] flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-sm border border-zinc-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-secondary mb-2">
            Access Denied
          </h2>
          <p className="text-gray text-sm mb-6">
            You do not have permission to view this page. Please contact your
            administrator to request access.
          </p>
          <Button
            variant="secondary"
            className="w-full h-12 bg-secondary text-primary hover:bg-zinc-800 transition-colors rounded-xl"
            onClick={() => router.push(base)}
          >
            Go Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

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
