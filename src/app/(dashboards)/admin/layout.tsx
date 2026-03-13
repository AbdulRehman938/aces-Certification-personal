"use client";

import DashboardHeader from "@/app/components/dashboards/DashboardHeader";
import DashboardSidebar from "@/app/components/dashboards/DashboardSidebar";
import { SidebarProvider, useSidebar } from "@/app/components/dashboards/sidebarContext";
import { dashboardConfig } from "@/app/components/dashboards/dashboardConfig";
import { useMemo, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

const adminRouteAccess = [
  { prefix: "/admin/industry", resources: ["industry"] },
  { prefix: "/admin/certifications", resources: ["certifications"] },
  { prefix: "/admin/assessment", resources: ["assessment", "assessments"] },
  { prefix: "/admin/ai-flags", resources: ["aiFlags"] },
  { prefix: "/admin/auditors", resources: ["auditor"] },
  { prefix: "/admin/payment", resources: ["payment"] },
  { prefix: "/admin/team", resources: ["team", "users"] },
  { prefix: "/admin/messages", resources: ["messages"] },
  { prefix: "/admin/settings", resources: ["setting"] },
  { prefix: "/admin/support", resources: ["supportCenter"] },
];

const getRequiredResources = (pathname: string | null) => {
  if (!pathname) return [];
  for (const route of adminRouteAccess) {
    if (pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)) {
      return route.resources;
    }
  }
  return [];
};

const hasReadAccess = (
  resources: string[],
  permissions: Array<string | { resource?: string; action?: string[] }>,
) => {
  if (resources.length === 0) return true;
  if (!permissions.length) return false;

  return resources.some((resource) =>
    permissions.some((permission) => {
      if (typeof permission === "string") {
        return permission === resource;
      }
      const actions = Array.isArray(permission.action) ? permission.action : [];
      return permission.resource === resource && actions.includes("read");
    }),
  );
};

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user, isLoadingProfile } = useUser();
  const {
    menuItems,
    rootPath,
    expandedWidthClass,
    enablePermissions,
    roleLabel,
    defaultInitial,
  } = dashboardConfig.admin;
  const requiredResources = useMemo(
    () => getRequiredResources(pathname),
    [pathname],
  );
  const isSubadmin = (profile?.role || user?.role) === "subadmin";
  const permissions = Array.isArray(profile?.permissions)
    ? (profile.permissions as Array<
        string | { resource?: string; action?: string[] }
      >)
    : [];
  const isBlocked =
    isSubadmin &&
    profile &&
    !isLoadingProfile &&
    requiredResources.length > 0 &&
    !hasReadAccess(requiredResources, permissions);

  useEffect(() => {
    if (isBlocked) {
      router.replace("/");
    }
  }, [isBlocked, router]);

  if (isBlocked) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="shrink-0">
        <DashboardSidebar
          menuItems={menuItems}
          rootPath={rootPath}
          expandedWidthClass={expandedWidthClass}
          enablePermissions={enablePermissions}
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

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}
