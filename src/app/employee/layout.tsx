"use client";

import { Suspense } from "react";
import EmployeeSidebar from "./common/sidebar";
import EmployeeHeader from "./common/header";
import { SidebarProvider } from "@/app/(dashboards)/applicant/common/SidebarContext";
import { ApplicantNotificationsProvider } from "@/app/(dashboards)/applicant/common/NotificationsContext";
import { usePathname } from "next/navigation";

function HeaderWithSuspense() {
  return (
    <Suspense
      fallback={<div className="h-16 bg-white border-b border-zinc-200" />}
    >
      <EmployeeHeader />
    </Suspense>
  );
}

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAssessmentPage = pathname.includes("/assessment");

  return (
    <SidebarProvider>
      <ApplicantNotificationsProvider>
        <div className="flex min-h-screen bg-primary">
          {!isAssessmentPage && <EmployeeSidebar />}

          <div className="flex-1 flex flex-col min-w-0">
            {!isAssessmentPage && <HeaderWithSuspense />}

            <main
              className={`flex-1 bg-zinc-50 ${isAssessmentPage ? "h-screen overflow-hidden" : "overflow-y-auto"}`}
            >
              {children}
            </main>
          </div>
        </div>
      </ApplicantNotificationsProvider>
    </SidebarProvider>
  );
}
