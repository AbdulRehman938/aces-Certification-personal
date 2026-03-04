"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CertificateDetails } from "@/app/(dashboards)/applicant/modules/certificate/details";
import { axiosInstance } from "@/lib/axios";

type DashboardCertificateDetailsPageProps = {
  fallbackHref: string;
};

export default function DashboardCertificateDetailsPage({
  fallbackHref,
}: DashboardCertificateDetailsPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawCertificateId = useMemo(
    () =>
      String(
        searchParams.get("certificateId") || searchParams.get("id") || "",
      ).trim(),
    [searchParams],
  );

  const rawCertificateCode = useMemo(
    () =>
      String(
        searchParams.get("certificateCode") ||
          searchParams.get("code") ||
          rawCertificateId,
      ).trim(),
    [searchParams, rawCertificateId],
  );

  const assessmentId = useMemo(
    () =>
      String(
        searchParams.get("assessmentId") ||
          searchParams.get("auditAssessmentId") ||
          "",
      ).trim(),
    [searchParams],
  );

  const [certificateId, setCertificateId] = useState(rawCertificateId);
  const [certificateCode, setCertificateCode] = useState(rawCertificateCode);
  const [isResolvingCertificate, setIsResolvingCertificate] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    if (rawCertificateId) {
      setCertificateId(rawCertificateId);
      setCertificateCode(rawCertificateCode || rawCertificateId);
      setResolveError(null);
      setIsResolvingCertificate(false);
      return;
    }

    if (!assessmentId) {
      setCertificateId("");
      setCertificateCode(rawCertificateCode || "");
      setResolveError(null);
      setIsResolvingCertificate(false);
      return;
    }

    let isCancelled = false;

    const resolveCertificateByAssessment = async () => {
      setIsResolvingCertificate(true);
      setResolveError(null);
      try {
        const response = await axiosInstance.get(
          `/audits/assessment/${assessmentId}`,
        );
        if (isCancelled) return;

        const payload = response.data?.data;
        const resolvedId = String(
          payload?.certificateId || payload?.certificate_id || "",
        ).trim();
        const resolvedCode = String(
          rawCertificateCode ||
            payload?.certificateCode ||
            payload?.certificate_code ||
            payload?.certificateName ||
            "",
        ).trim();

        if (!resolvedId) {
          setCertificateId("");
          setCertificateCode(resolvedCode);
          setResolveError(
            "Certificate id is not available for this assessment.",
          );
          return;
        }

        setCertificateId(resolvedId);
        setCertificateCode(resolvedCode || resolvedId);
      } catch (error) {
        if (isCancelled) return;
        console.error("Failed to resolve certificate id from assessment:", error);
        setCertificateId("");
        setResolveError("Unable to resolve certificate details.");
      } finally {
        if (!isCancelled) {
          setIsResolvingCertificate(false);
        }
      }
    };

    void resolveCertificateByAssessment();

    return () => {
      isCancelled = true;
    };
  }, [assessmentId, rawCertificateCode, rawCertificateId]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  if (isResolvingCertificate) {
    return (
      <div className="p-6 md:p-10 bg-light-gray min-h-screen">
        <div className="max-w-4xl mx-auto bg-white border border-zinc-100 rounded-xl p-6">
          <h1 className="text-xl font-semibold text-secondary">
            Certificate Details
          </h1>
          <p className="text-sm text-gray mt-2">Loading certificate details...</p>
        </div>
      </div>
    );
  }

  if (!certificateId) {
    return (
      <div className="p-6 md:p-10 bg-light-gray min-h-screen">
        <div className="max-w-4xl mx-auto bg-white border border-zinc-100 rounded-xl p-6">
          <h1 className="text-xl font-semibold text-secondary">
            Certificate Details
          </h1>
          <p className="text-sm text-gray mt-2">
            {resolveError || "Certificate id is missing in query params."}
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-5 px-4 py-2 rounded-lg border border-black text-sm font-medium text-secondary hover:bg-zinc-50 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 bg-dull-white/10 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <CertificateDetails
          certificateId={certificateId}
          certificateCode={certificateCode}
          onBack={handleBack}
        />
      </div>
    </div>
  );
}
