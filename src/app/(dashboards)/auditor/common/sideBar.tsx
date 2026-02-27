"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/app/components/dashboards/sidebarContext";
import { persistOrganizationId } from "@/lib/auth-utils";

const menuItems = [
  {
    label: "Dashboard",
    icon: "/assets/imgs/auditor/sidebar/home.svg",
    href: "/auditor",
  },
  {
    label: "Assigned Audits",
    icon: "/assets/imgs/auditor/sidebar/assigned.svg",
    href: "/auditor/assignAudits",
  },
  {
    label: "Completed Audits",
    icon: "/assets/imgs/auditor/sidebar/completed.svg",
    href: "/auditor/completeAudits",
  },
  {
    label: "Setting",
    icon: "/assets/imgs/auditor/sidebar/setting.svg",
    href: "/auditor/settings",
  },
];

export default function SideBar() {
  const pathname = usePathname();
  const { isOpen, isCollapsed, close } = useSidebar();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    persistOrganizationId(null);
    localStorage.removeItem("organization_profile");

    // Best-effort clear for non-HttpOnly cookies (HttpOnly cookies are cleared server-side).
    document.cookie = "auth_token=; path=/; max-age=0; samesite=strict";
    document.cookie = "refresh_token=; path=/; max-age=0; samesite=strict";

    // Hard redirect to ensure middleware sees cleared cookies.
    window.location.assign("/login");
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
          ${isCollapsed ? "w-20" : "w-64"}
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
                (item.href !== "/auditor" && pathname?.startsWith(item.href));

              return (
                <li key={item.href}>
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
                      <span className="text-sm font-medium">{item.label}</span>
                    )}
                  </Link>
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

