import { Suspense } from "react";
import DashboardCertificateDetailsPage from "@/app/components/dashboards/DashboardCertificateDetailsPage";

export default function AdminCertificateDetailsPage() {
  return (
    <Suspense>
      <DashboardCertificateDetailsPage fallbackHref="/admin" />
    </Suspense>
  );
}
