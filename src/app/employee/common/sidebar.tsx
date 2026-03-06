"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X, ChevronRight } from "lucide-react";
import { FiHome } from "react-icons/fi";
import { PiCertificateDuotone } from "react-icons/pi";
import { useSidebar } from "@/app/(dashboards)/applicant/common/SidebarContext";
import { persistOrganizationId } from "@/lib/auth-utils";
import { useEffect, useState } from "react";

export default function EmployeeSidebar() {
  const pathname = usePathname();
  const base = "/employee";

  const navigation = [
    { name: "Dashboard", href: `${base}`, icon: FiHome, isCustom: false },
    {
      name: "Certificate",
      href: `${base}/certificate`,
      icon: PiCertificateDuotone,
      isCustom: false,
    },
    {
      name: "Branch",
      href: `${base}/branch`,
      icon: "/assets/imgs/icons/branch.svg",
      isCustom: true,
    },
    {
      name: "Profile",
      href: `${base}/profile`,
      icon: "/assets/imgs/icons/profile.svg",
      isCustom: true,
      subItems: [
        {
          name: "Account Management",
          href: `${base}/profile/account-management`,
        },
        { name: "Payments", href: `${base}/profile/payments` },
        { name: "Certificates", href: `${base}/profile/certificates` },
      ],
    },
    {
      name: "Organization Users",
      href: `${base}/organisation-users`,
      icon: "/assets/imgs/icons/users.svg",
      isCustom: true,
    },

    {
      name: "Support Center",
      href: `${base}/support-center`,
      icon: "/assets/imgs/icons/support.svg",
      isCustom: true,
    },
    {
      name: "Legal",
      href: `${base}/legal`,
      icon: "/assets/imgs/icons/legal.svg",
      isCustom: true,
    },
  ];
  const { isOpen, isMobileMenuOpen, closeMobileMenu } = useSidebar();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedItems((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name],
    );
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}

    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      persistOrganizationId(null);
      localStorage.removeItem("organization_profile");
      localStorage.removeItem("user_data");
      localStorage.removeItem("tokens_data");
      localStorage.removeItem("profile_data");

      document.cookie = "auth_token=; path=/; max-age=0; samesite=strict";
      document.cookie = "refresh_token=; path=/; max-age=0; samesite=strict";
    }
    window.location.assign("/login");
  };

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const [profileData, setProfileData] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("organization_profile");
      try {
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    const loadProfile = () => {
      const stored = localStorage.getItem("organization_profile");
      if (stored) {
        try {
          setProfileData(JSON.parse(stored));
        } catch (e) {}
      }
    };
    loadProfile();
    window.addEventListener("profile-updated", loadProfile);
    window.addEventListener("storage", loadProfile);
    return () => {
      window.removeEventListener("profile-updated", loadProfile);
      window.removeEventListener("storage", loadProfile);
    };
  }, []);

  const filteredNavigation = navigation.filter((item) => {
    if (!profileData || Object.keys(profileData).length === 0) return false;

    if (profileData?._type !== "employee") return true;

    const permissions = profileData.permissions || [];

    const nameToResourceMap: Record<string, string> = {
      Dashboard: "dashboard",
      Certificate: "certificates",
      Branch: "branches",
      Profile: "profile",
      "Organization Users": "organization_users",
      "Support Center": "support_center",
      Legal: "legal",
    };

    const targetResource = nameToResourceMap[item.name];

    if (targetResource) {
      return permissions.some(
        (p: { resource: string }) => p.resource === targetResource,
      );
    }

    return false;
  });

  return (
    <>
      <aside
        className={`hidden lg:flex ${isOpen ? "w-64" : "w-20"} border-r border-zinc-200 h-screen bg-white flex-col sticky top-0 transition-all duration-300`}
      >
        <SidebarContent
          isOpen={isOpen}
          pathname={pathname}
          expandedItems={expandedItems}
          toggleExpand={toggleExpand}
          handleLogout={handleLogout}
          closeMobileMenu={closeMobileMenu}
          navigation={filteredNavigation}
        />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[70%] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent
          isMobile={true}
          isOpen={isOpen}
          pathname={pathname}
          expandedItems={expandedItems}
          toggleExpand={toggleExpand}
          handleLogout={handleLogout}
          closeMobileMenu={closeMobileMenu}
          navigation={filteredNavigation}
        />
      </aside>
    </>
  );
}

const SidebarContent = ({
  isOpen,
  isMobile = false,
  closeMobileMenu,
  pathname,
  expandedItems,
  toggleExpand,
  handleLogout,
  navigation,
}: {
  isOpen: boolean;
  isMobile?: boolean;
  closeMobileMenu: () => void;
  pathname: string;
  expandedItems: string[];
  toggleExpand: (e: React.MouseEvent, name: string) => void;
  handleLogout: () => void;
  navigation: any[];
}) => (
  <>
    <div className="p-4 relative">
      {(isOpen || isMobile) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img
              src="/assets/imgs/logo.svg"
              alt="ACES Logo"
              className="w-8 h-8 shrink-0 invert bg-secondary text-secondary"
            />
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-black leading-none">
                ACES
              </span>
              <span className="text-[10px] font-medium text-black  tracking-wide">
                Certification
              </span>
            </div>
          </div>
          {isMobile && (
            <button
              onClick={closeMobileMenu}
              className="p-1.5 hover:bg-zinc-50 rounded-lg transition-colors text-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {!isOpen && !isMobile && (
        <div className="flex items-center justify-center mb-4 px-0">
          <img
            src="/assets/imgs/logo.svg"
            alt="ACES Logo"
            className="w-8 h-8 shrink-0 invert bg-secondary text-secondary"
          />
        </div>
      )}
      {(isOpen || isMobile) && (
        <div className="mb-2 px-4 text-xs font-semibold text-zinc-400">
          MENU
        </div>
      )}

      <nav className="0 space-y-1">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            item.subItems?.some(
              (sub: { href: string }) => pathname === sub.href,
            );
          const isExpanded = expandedItems.includes(item.name);

          return (
            <div key={item.name} className="flex flex-col">
              <div
                className={`flex items-center group py-2 rounded-lg transition-all relative ${
                  isActive
                    ? "text-black font-semibold bg-gray/30"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-600"
                } ${isOpen || isMobile ? "px-3" : "justify-center px-1"}`}
              >
                <Link
                  href={item.href}
                  onClick={isMobile ? closeMobileMenu : undefined}
                  title={!isOpen && !isMobile ? item.name : ""}
                  className={`flex items-center gap-2 grow ${
                    !isOpen && !isMobile ? "justify-center" : ""
                  }`}
                >
                  {item.isCustom ? (
                    <div
                      className={`w-4 h-4 shrink-0 transition-colors duration-200  ${
                        isActive ? "bg-black" : "bg-black"
                      }`}
                      style={{
                        maskImage: `url(${item.icon})`,
                        maskSize: "contain",
                        maskRepeat: "no-repeat",
                        maskPosition: "center",
                        WebkitMaskImage: `url(${item.icon})`,
                        WebkitMaskSize: "contain",
                        WebkitMaskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                      }}
                    />
                  ) : (
                    <item.icon
                      className={`w-4 h-4 shrink-0  ${isActive ? "text-black" : "group-hover:text-zinc-600"}`}
                    />
                  )}
                  {(isOpen || isMobile) && (
                    <span
                      className={`text-xs font-medium ${isActive ? "font-semibold text-black" : ""}`}
                    >
                      {item.name}
                    </span>
                  )}
                </Link>

                {item.subItems && (isOpen || isMobile) && (
                  <button
                    onClick={(e) => toggleExpand(e, item.name)}
                    className="p-0.5 rounded cursor-pointer transition-colors duration-200 hover:bg-zinc-100"
                  >
                    {isExpanded ? (
                      <ChevronRight className="w-3.5 h-3.5 rotate-90 transition-transform duration-200" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200" />
                    )}
                  </button>
                )}
              </div>
              {/* Sub Items */}
              {item.subItems && isExpanded && (isOpen || isMobile) && (
                <div className="ml-9 mt-0.5 space-y-2 pb-1 pt-1">
                  {item.subItems.map((sub: { name: string; href: string }) => {
                    const isSubActive = pathname === sub.href;
                    return (
                      <Link
                        key={sub.name}
                        href={sub.href}
                        onClick={isMobile ? closeMobileMenu : undefined}
                        className={`block text-xs transition-colors ${
                          isSubActive
                            ? "text-black font-semibold"
                            : "text-gray hover:text-secondary font-medium"
                        }`}
                      >
                        {sub.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>

    <div className="mt-auto p-4 border-t border-zinc-50">
      <button
        onClick={handleLogout}
        title={!isOpen && !isMobile ? "Logout" : ""}
        className={`flex items-center gap-2 py-2 w-full cursor-pointer text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-all rounded-lg ${
          isOpen || isMobile ? "px-3" : "justify-center"
        }`}
      >
        <LogOut className="w-4 h-4 shrink-0" />
        {(isOpen || isMobile) && (
          <span className="text-xs font-medium">Logout</span>
        )}
      </button>
    </div>
  </>
);
