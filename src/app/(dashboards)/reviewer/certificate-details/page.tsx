import { Suspense } from "react";
import DashboardCertificateDetailsPage from "@/app/components/dashboards/DashboardCertificateDetailsPage";

export default function ReviewerCertificateDetailsPage() {
  return (
    <Suspense>
      <DashboardCertificateDetailsPage fallbackHref="/reviewer" />
    </Suspense>
  );
}
