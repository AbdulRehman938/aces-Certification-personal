"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "@/app/components/dashboards/sidebarContext";
import { useUser } from "@/contexts/UserContext";
import type { MenuItem } from "@/app/components/dashboards/dashboardConfig";

type DashboardSidebarProps = {
  menuItems: MenuItem[];
  rootPath: string;
  expandedWidthClass?: string;
  enablePermissions?: boolean;
};

export default function DashboardSidebar({
  menuItems,
  rootPath,
  expandedWidthClass = "w-64",
  enablePermissions = false,
}: DashboardSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isOpen, isCollapsed, close } = useSidebar();
  const { profile } = useUser();
  const isSubadmin = enablePermissions && profile?.role === "subadmin";
  const permissions = Array.isArray(profile?.permissions)
    ? (profile?.permissions as Array<
        string | { resource?: string; action?: string[] }
      >)
    : [];

  const hasReadAccess = (resources: string[]) => {
    if (!enablePermissions) return true;
    if (resources.length === 0) return true;
    if (!isSubadmin) return true;
    if (!permissions.length) return false;

    return resources.some((resource) =>
      permissions.some((permission) => {
        if (typeof permission === "string") {
          return permission === resource;
        }
        const actions = Array.isArray(permission.action)
          ? permission.action
          : [];
        return permission.resource === resource && actions.includes("read");
      }),
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    document.cookie =
      "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=strict";
    document.cookie =
      "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=strict";
    document.cookie =
      "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=strict";

    router.push("/login");
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={close}
        />
      )}

      <aside
        className={`
          fixed lg:static
          top-0 left-0
          ${isCollapsed ? "w-20" : expandedWidthClass}
          h-screen lg:h-[calc(100vh-60px)]
          bg-zinc-50 border-r border-zinc-100
          flex flex-col
          z-50
          transform transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div
          className={`${isCollapsed ? "px-3" : "px-8"} pt-3 pb-3 flex items-center justify-center`}
        >
          {isCollapsed ? (
            <Image
              src="/assets/imgs/admin/dashboard/characterLogo.svg"
              alt="ACES"
              width={44}
              height={44}
              className="w-11 h-11"
            />
          ) : (
            <Image
              src="/assets/imgs/admin/dashboard/logo.svg"
              alt="ACES Certification"
              width={100}
              height={30}
              className="h-11 w-auto"
            />
          )}
        </div>

        <nav className="flex-1 px-3 md:px-6 pt-0 pb-6 overflow-y-auto flex flex-col">
          {!isCollapsed && (
            <h2 className="text-[11px] font-semibold text-dull-gray  tracking-[0.55px] leading-[16.5px] align-middle mb-4">
              MENU
            </h2>
          )}
          <ul className="space-y-1 flex-1">
            {menuItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== rootPath && pathname?.startsWith(item.href));
              const isDisabled =
                isSubadmin && !hasReadAccess(item.resources || []);

              return (
                <li key={item.href}>
                  {isDisabled ? (
                    <div
                      className={`
                        flex items-center 
                        ${isCollapsed ? "justify-center px-2" : "gap-3 px-4"} 
                        py-2.5 rounded-sm transition-all
                        text-secondary/50 cursor-not-allowed
                      `}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Image
                        src={item.icon}
                        alt={item.label}
                        width={16}
                        height={16}
                        className={isCollapsed ? "w-6 h-6" : "w-5 h-5"}
                      />
                      {!isCollapsed && (
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => {
                        if (window.innerWidth < 1024) {
                          close();
                        }
                      }}
                      className={`
                        flex items-center 
                        ${isCollapsed ? "justify-center px-2" : "gap-3 px-4"} 
                        py-2.5 rounded-sm transition-all
                        ${
                          isActive
                            ? "bg-light-gray-2 text-dull-gray font-medium"
                            : "text-secondary hover:bg-[rgba(187,187,187,0.2)]"
                        }
                      `}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Image
                        src={item.icon}
                        alt={item.label}
                        width={16}
                        height={16}
                        className={isCollapsed ? "w-6 h-6" : "w-5 h-5"}
                      />
                      {!isCollapsed && (
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-auto pt-2">
            <button
              onClick={handleLogout}
              className={`
                w-full flex items-center 
                ${isCollapsed ? "justify-center px-2" : "gap-3 px-4"} 
                py-2.5 rounded-sm transition-all
                text-secondary hover:bg-[rgba(187,187,187,0.2)]
              `}
              title={isCollapsed ? "Log out" : undefined}
            >
              <Image
                src="/assets/imgs/auditor/sidebar/logout.svg"
                alt="Log out"
                width={20}
                height={20}
                className={isCollapsed ? "w-6 h-6" : "w-5 h-5"}
              />
              {!isCollapsed && (
                <span className="text-sm font-medium">Log out</span>
              )}
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
}

