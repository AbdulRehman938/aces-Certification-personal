"use client";

import { Suspense } from "react";
import { CertificatePage } from "@/app/(dashboards)/applicant/modules/certificate/index";

export default function Page() {
  return (
    <Suspense>
      <CertificatePage />
    </Suspense>
  );
}
