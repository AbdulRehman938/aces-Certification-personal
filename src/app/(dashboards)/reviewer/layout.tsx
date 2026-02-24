"use client";

import DashboardHeader from "@/app/components/dashboards/DashboardHeader";
import DashboardSidebar from "@/app/components/dashboards/DashboardSidebar";
import { SidebarProvider, useSidebar } from "@/app/components/dashboards/sidebarContext";
import { dashboardConfig } from "@/app/components/dashboards/dashboardConfig";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar();
  const { menuItems, rootPath, expandedWidthClass, roleLabel, defaultInitial } =
    dashboardConfig.reviewer;

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="shrink-0">
        <DashboardSidebar
          menuItems={menuItems}
          rootPath={rootPath}
          expandedWidthClass={expandedWidthClass}
        />
      </aside>

      <div
        className={`flex flex-col flex-1 overflow-hidden transition-all ${isOpen ? "lg:blur-0 blur-sm" : ""}`}
      >
        <header className="shrink-0">
          <DashboardHeader
            roleLabel={roleLabel}
            defaultInitial={defaultInitial}
          />
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export default function ReviewerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}
