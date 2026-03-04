import { Suspense } from "react";
import DashboardCertificateDetailsPage from "@/app/components/dashboards/DashboardCertificateDetailsPage";

export default function AuditorCertificateDetailsPage() {
  return (
    <Suspense>
      <DashboardCertificateDetailsPage fallbackHref="/auditor" />
    </Suspense>
  );
}
