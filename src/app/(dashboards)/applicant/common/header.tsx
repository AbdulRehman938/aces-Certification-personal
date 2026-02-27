"use client";

function extractUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  return isUuid ? v : null;
}

import {
  Bell,
  Search,
  User,
  Menu,
  ChevronDown,
  X,
  Calendar,
  UserCircle,
  Edit,
} from "lucide-react";
import { useSidebar } from "./SidebarContext";
import { useApplicantNotifications } from "./NotificationsContext";
import type { ApplicantNotification } from "./NotificationsContext";
import {
  buildApplicantNotificationHref,
  resolveApplicantNotificationNav,
} from "./notification-navigation";
import { useEffect, useState, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { axiosInstance } from "@/lib/axios";
import { persistOrganizationId } from "@/lib/auth-utils";
import Link from "next/link";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";

export default function Header() {
  const { toggleSidebar, toggleMobileMenu, closeMobileMenu, isMobileMenuOpen } =
    useSidebar();
  const router = useRouter();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 18 ? "Good Evening" : "Good Night";
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const searchParams = useSearchParams();
  const q = searchParams.get("q");
  const [searchQuery, setSearchQuery] = useState(q || "");
  const [realCertificates, setRealCertificates] = useState<any[]>([]);
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
  const pathname = usePathname();
  const isEmployee = pathname.startsWith("/employee");
  const base = isEmployee ? "/employee" : "/applicant";

  const { isEmployee: isEmployeeRole, hasAccess } =
    useEmployeePermissions(profileData);
  const canAccessProfile = !isEmployeeRole || hasAccess("profile");
  const canAccessCertificates = !isEmployeeRole || hasAccess("certificates");
  const [lastPathname, setLastPathname] = useState(pathname);
  const {
    isOnline,
    notifications,
    unreadCount,
    markAsRead: handleMarkAsRead,
    refreshNotifications,
  } = useApplicantNotifications();

  const handleNotificationClick = async (
    notification: ApplicantNotification,
  ) => {
    try {
      if (!notification.read) {
        await handleMarkAsRead(notification.id);
      }
    } finally {
      setIsNotificationOpen(false);
      const action = resolveApplicantNotificationNav(notification);
      router.push(buildApplicantNotificationHref(action, base));
    }
  };

  useEffect(() => {
    setSearchQuery(q || "");
  }, [q]);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsSearchOpen(false);
    setIsNotificationOpen(false);
    setIsProfileOpen(false);
    closeMobileMenu();
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (
        !target.closest(".search-container") &&
        !target.closest(".search-trigger")
      ) {
        setIsSearchOpen(false);
      }
      if (
        !target.closest(".notification-container") &&
        !target.closest(".notification-trigger")
      ) {
        setIsNotificationOpen(false);
      }
      if (
        !target.closest(".profile-container") &&
        !target.closest(".profile-trigger")
      ) {
        setIsProfileOpen(false);
      }
    };

    if (isSearchOpen || isNotificationOpen || isProfileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSearchOpen, isNotificationOpen, isProfileOpen]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  };

  useEffect(() => {
    const fetchRealCertificates = async () => {
      try {
        const response = await axiosInstance.get("/certificates");
        const items = response?.data?.data?.data ?? response?.data?.data ?? [];
        setRealCertificates(items);
      } catch (error) {
        console.error("Failed to fetch certificates for search", error);
      }
    };
    fetchRealCertificates();

    const fetchProfile = async () => {
      const isEmp = pathname.startsWith("/employee");

      if (isEmp) {
        try {
          const empResponse = await axiosInstance.get("/employee/my-profile");
          const data = empResponse?.data?.data || empResponse?.data;
          const processedData = {
            ...data,
            name: `${data.first_name} ${data.last_name}`.trim(),
            _type: "employee",
          };
          setProfileData(processedData);
          if (typeof window !== "undefined") {
            localStorage.setItem(
              "organization_profile",
              JSON.stringify(processedData),
            );
            const orgId = extractUuid(data?.organization_id);
            if (orgId) {
              persistOrganizationId(orgId);
            }
          }
        } catch (empErr) {
          console.error("Failed to fetch employee profile", empErr);
        }
        return;
      }

      try {
        const response = await axiosInstance.get("/organization/profile");
        const data = response?.data?.data || response?.data;
        const processedData = {
          ...data,
          _type: "organization",
        };
        setProfileData(processedData);
        if (typeof window !== "undefined") {
          localStorage.setItem("profile_type", "organization");
          localStorage.setItem(
            "organization_profile",
            JSON.stringify(processedData),
          );
          const orgId =
            extractUuid(data?.organization_id) ||
            extractUuid(data?.organizationId) ||
            extractUuid(data?.id);
          if (orgId) {
            persistOrganizationId(orgId);
          }
        }
      } catch (error: any) {
        if (error.status === 404 || error.response?.status === 404) {
          try {
            const empResponse = await axiosInstance.get("/employee/my-profile");
            const data = empResponse?.data?.data || empResponse?.data;
            const processedData = {
              ...data,
              name: `${data.first_name} ${data.last_name}`.trim(),
              _type: "employee",
            };
            setProfileData(processedData);
            if (typeof window !== "undefined") {
              localStorage.setItem("profile_type", "employee");
              localStorage.setItem(
                "organization_profile",
                JSON.stringify(processedData),
              );
              const orgId = extractUuid(data?.organization_id);
              if (orgId) {
                persistOrganizationId(orgId);
              }
            }
          } catch (empErr) {
            console.error("Failed to fetch employee profile", empErr);
          }
        } else {
          console.error("Failed to fetch profile", error);
        }
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const loadProfile = () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("organization_profile");
        if (stored) {
          try {
            setProfileData(JSON.parse(stored));
          } catch (e) {}
        }
      }
    };

    loadProfile();
    window.addEventListener("storage", loadProfile);
    window.addEventListener("profile-updated", loadProfile);
    return () => {
      window.removeEventListener("storage", loadProfile);
      window.removeEventListener("profile-updated", loadProfile);
    };
  }, []);

  const filteredSearchCertificates = searchQuery
    ? realCertificates
        .filter(
          (cert) =>
            cert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cert.certificate_id
              .toLowerCase()
              .includes(searchQuery.toLowerCase()),
        )
        .slice(0, 5)
    : [];

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("q", searchQuery);

    if (
      pathname.includes(`${base}/certificate`) ||
      pathname.includes(`${base}/dashboard`) ||
      pathname === base
    ) {
      router.push(`${pathname}?${params.toString()}`);
    } else {
      router.push(`${base}/certificate?${params.toString()}`);
    }
    setIsSearchOpen(false);
  };

  const creationDate = "January 8, 2026";

  const handleSeeAllNotifications = () => {
    setIsNotificationOpen(false);
    router.push(`${base}/notifications`);
  };

  return (
    <>
      <header className="h-12 border-b border-zinc-200 bg-white flex items-center justify-between px-4 lg:px-6 lg:pl-3 sticky top-0 z-30">
        <div className="flex lg:hidden items-center">
          <span className="text-sm font-semibold text-secondary">
            {greeting}, {profileData?.name || "User"}
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-1.5 hover:bg-zinc-50 rounded-lg transition-colors text-secondary cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center py-1">
            <span className="text-sm font-medium text-secondary">
              {greeting},
            </span>
            <span className="text-sm font-medium text-secondary pl-1.5 pt-0.5">
              {profileData?.name || "User"}
            </span>
            {profileData?._type && (
              <span className="text-xs font-medium bg-gray/20 mt-0.5 text-secondary px-3 py-0.5 rounded-full border ml-3 border-zinc-200">
                {isEmployee ? "Employee" : "Applicant"}
              </span>
            )}
          </div>
        </div>

        <div className="flex lg:hidden items-center gap-1 relative">
          <button
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              setIsNotificationOpen(false);
              setIsProfileOpen(false);
            }}
            className="search-trigger p-1 hover:bg-zinc-50 rounded-lg transition-colors text-secondary"
          >
            <Search className="w-5 h-5 text-secondary" />
          </button>
          <button
            onClick={() => {
              const nextOpen = !isNotificationOpen;
              setIsNotificationOpen(nextOpen);
              if (nextOpen) {
                void refreshNotifications();
              }
              setIsSearchOpen(false);
              setIsProfileOpen(false);
            }}
            className="notification-trigger relative p-1 hover:bg-zinc-50 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5 text-zinc-600" />
            {unreadCount > 0 && (
              <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-semibold px-1 rounded-full border border-white">
                {unreadCount}
              </div>
            )}
          </button>
          <button
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsSearchOpen(false);
              setIsNotificationOpen(false);
            }}
            className="profile-trigger p-1 hover:bg-zinc-50 rounded-lg transition-colors"
          >
            <User className="w-5 h-5 text-zinc-600" />
          </button>
          <button
            onClick={() => {
              console.log(
                "Hamburger menu clicked, current state:",
                isMobileMenuOpen,
              );
              toggleMobileMenu();
              setIsSearchOpen(false);
              setIsNotificationOpen(false);
              setIsProfileOpen(false);
            }}
            className="mobile-menu-trigger p-1 hover:bg-zinc-50 rounded-lg transition-colors text-secondary"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2">
          {canAccessCertificates && (
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 rounded-lg w-56"
            >
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchOpen(true)}
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-zinc-400"
              />

              {isSearchOpen && searchQuery && (
                <div className="search-container absolute top-full left-0 mt-2 w-80 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-zinc-400  tracking-wider">
                      Certificate Results
                    </h3>
                    <div className="space-y-2">
                      {filteredSearchCertificates.length > 0 ? (
                        filteredSearchCertificates.map((cert) => (
                          <div
                            key={cert.id}
                            onClick={() => {
                              router.push(`${base}/certificate?q=${cert.name}`);
                              setIsSearchOpen(false);
                            }}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 cursor-pointer transition-colors border border-transparent hover:border-zinc-100"
                          >
                            <div className="w-8 h-8 rounded bg-dull-white/20 flex items-center justify-center">
                              <Search className="w-4 h-4 text-secondary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-secondary truncate">
                                {cert.name}
                              </p>
                              <p className="text-[10px] text-zinc-400">
                                {cert.certificate_id}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-400 py-2">
                          No certificates found...
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        router.push(`${base}/certificate`);
                        setIsSearchOpen(false);
                      }}
                      className="w-full mt-2 py-2 text-sm font-semibold text-secondary bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors border border-zinc-200"
                    >
                      See All Results
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}

          <div className="relative">
            <button
              onClick={() => {
                const nextOpen = !isNotificationOpen;
                setIsNotificationOpen(nextOpen);
                if (nextOpen) {
                  void refreshNotifications();
                }
                setIsProfileOpen(false);
              }}
              className="notification-trigger relative p-1.5 cursor-pointer hover:bg-zinc-50 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5 text-zinc-600" />
              {unreadCount > 0 && (
                <div className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-semibold px-0.5 rounded-full border border-white">
                  {unreadCount}
                </div>
              )}
            </button>

            {isNotificationOpen && (
              <div className="notification-container absolute right-0 top-full mt-2 w-80 bg-white border border-zinc-200 rounded-xl shadow-lg z-50">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-secondary flex items-center gap-2">
                      <span
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
                          isOnline
                            ? "bg-green-50 border-green-100"
                            : "bg-zinc-50 border-zinc-100"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOnline
                              ? "bg-green-500 animate-pulse"
                              : "bg-zinc-400"
                          }`}
                        />
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            isOnline ? "text-green-600" : "text-zinc-500"
                          }`}
                        >
                          {isOnline ? "Online" : "Connecting..."}
                        </span>
                      </span>
                      Notifications
                    </h3>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 5).map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() =>
                            void handleNotificationClick(notification)
                          }
                          className={`p-3 rounded-lg border transition-colors cursor-pointer hover:bg-zinc-50 ${
                            !notification.read
                              ? "bg-blue-50 border-blue-100"
                              : "bg-zinc-50 border-zinc-100"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-secondary truncate">
                                {notification.title}
                              </h4>
                              <p className="text-xs text-zinc-600 mt-1 line-clamp-2">
                                {notification.message ||
                                  notification.description ||
                                  ""}
                              </p>
                              <p className="text-xs text-zinc-400 mt-1">
                                {formatTimeAgo(notification.created_at)}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1"></div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-sm text-zinc-400">
                          No notifications yet
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSeeAllNotifications}
                    className="w-full mt-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    See All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <div
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsNotificationOpen(false);
              }}
              className="profile-trigger flex items-center gap-2 pl-2 border-l border-zinc-200 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200 overflow-hidden">
                {profileData?.logo ? (
                  <img
                    src={profileData.logo}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-zinc-600" />
                )}
              </div>
              <p className="text-xs font-semibold text-secondary hidden sm:block">
                {profileData?.name || "User"}
              </p>
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isProfileOpen ? "rotate-180" : ""}`}
              />
            </div>

            {isProfileOpen && (
              <div className="profile-container absolute right-0 top-full mt-2 w-64 bg-white border border-zinc-200 rounded-xl shadow-lg z-50">
                <div className="p-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-zinc-200">
                    <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200 overflow-hidden">
                      {profileData?.logo ? (
                        <img
                          src={profileData.logo}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-zinc-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-secondary truncate">
                        {profileData?.name || "User"}
                      </p>
                    </div>
                  </div>

                  <div className="py-3 border-b border-zinc-200">
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                      <Calendar className="w-4 h-4" />
                      <span>Joined: {creationDate}</span>
                    </div>
                  </div>

                  <div className="pt-3 space-y-1">
                    {canAccessProfile ? (
                      <>
                        <Link
                          href={`${base}/profile`}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 rounded-lg transition-colors"
                        >
                          <UserCircle className="w-4 h-4" />
                          <span>View Profile</span>
                        </Link>
                        <Link
                          href={`${base}/profile`}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit Profile</span>
                        </Link>
                      </>
                    ) : (
                      <p className="px-3 py-2 text-xs text-zinc-400 italic">
                        Profile access not granted
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div
        className={`lg:hidden search-container fixed left-0 right-0 bg-white border-b border-zinc-200 shadow-lg z-20 transition-all duration-300 ease-in-out ${
          isSearchOpen
            ? "top-16 opacity-100"
            : "-top-20 opacity-0 pointer-events-none"
        }`}
        style={{ top: isSearchOpen ? "64px" : "-80px" }}
      >
        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center gap-2 px-4 py-3"
        >
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-base w-full placeholder:text-zinc-400"
            autoFocus={isSearchOpen}
          />
          <button
            type="button"
            onClick={() => setIsSearchOpen(false)}
            className="p-1 hover:bg-zinc-50 rounded-lg transition-colors text-secondary shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Mobile Notification Dropdown */}
      <div
        className={`lg:hidden notification-container fixed left-0 right-0 bg-white border-b border-zinc-200 shadow-lg z-20 transition-all duration-300 ease-in-out ${
          isNotificationOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{
          top: isNotificationOpen ? "64px" : "-400px",
          maxHeight: "400px",
          overflowY: "auto",
        }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-secondary flex items-center gap-2">
              <span
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
                  isOnline
                    ? "bg-green-50 border-green-100"
                    : "bg-zinc-50 border-zinc-100"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOnline ? "bg-green-500 animate-pulse" : "bg-zinc-400"
                  }`}
                />
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isOnline ? "text-green-600" : "text-zinc-500"
                  }`}
                >
                  {isOnline ? "Online" : "Connecting..."}
                </span>
              </span>
              Notifications
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsNotificationOpen(false)}
                className="p-1 hover:bg-zinc-50 rounded-lg transition-colors text-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {notifications.length > 0 ? (
              notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => void handleNotificationClick(notification)}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                    !notification.read
                      ? "bg-blue-50 border-blue-100"
                      : "bg-zinc-50 border-zinc-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-secondary truncate">
                        {notification.title}
                      </h4>
                      <p className="text-xs text-zinc-600 mt-1 line-clamp-2">
                        {notification.message || notification.description || ""}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1"></div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-zinc-400">No notifications yet</p>
              </div>
            )}
          </div>
          <button
            onClick={handleSeeAllNotifications}
            className="w-full mt-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            See All Notifications
          </button>
        </div>
      </div>

      {/* Mobile Profile Dropdown */}
      <div
        className={`lg:hidden profile-container fixed left-0 right-0 bg-white border-b border-zinc-200 shadow-lg z-20 transition-all duration-300 ease-in-out ${
          isProfileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{
          top: isProfileOpen ? "64px" : "-300px",
        }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-secondary">Profile</h3>
            <button
              onClick={() => setIsProfileOpen(false)}
              className="p-1 hover:bg-zinc-50 rounded-lg transition-colors text-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 pb-3 border-b border-zinc-200">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200 overflow-hidden">
              {profileData?.logo ? (
                <img
                  src={profileData.logo}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-zinc-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-secondary truncate">
                {profileData?.name || "User"}
              </p>
              <p className="text-xs text-zinc-500">
                {profileData?._type === "employee" ? "Employee" : "Applicant"}
              </p>
            </div>
          </div>

          <div className="py-3 border-b border-zinc-200">
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <Calendar className="w-4 h-4" />
              <span>Joined: {creationDate}</span>
            </div>
          </div>

          <div className="pt-3 space-y-1">
            {canAccessProfile ? (
              <>
                <Link
                  href={`${base}/profile`}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 rounded-lg transition-colors"
                >
                  <UserCircle className="w-4 h-4" />
                  <span>View Profile</span>
                </Link>
                <Link
                  href={`${base}/profile`}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit Profile</span>
                </Link>
              </>
            ) : (
              <p className="px-3 py-2 text-xs text-zinc-400 italic">
                Profile access not granted
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
