"use client";

import { Suspense } from "react";
import Sidebar from "./common/sidebar";
import Header from "./common/header";
import { SidebarProvider } from "./common/SidebarContext";
import { ApplicantNotificationsProvider } from "./common/NotificationsContext";
import { usePathname } from "next/navigation";

function HeaderWithSuspense() {
  return (
    <Suspense
      fallback={<div className="h-16 bg-white border-b border-zinc-200" />}
    >
      <Header />
    </Suspense>
  );
}

export default function ApplicantLayout({
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
          {!isAssessmentPage && <Sidebar />}

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
