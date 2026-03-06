"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "@/app/components/dashboards/sidebarContext";
import { useUser } from "@/contexts/UserContext";
import { axiosInstance } from "@/lib/axios";
import {
  fetchNotifications,
  markNotificationAsRead,
  type DashboardNotification,
} from "@/lib/notifications";

type DashboardHeaderProps = {
  roleLabel: string;
  defaultInitial: string;
};

export default function DashboardHeader({
  roleLabel,
  defaultInitial,
}: DashboardHeaderProps) {
  const { toggle, toggleCollapse } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<DashboardNotification[]>(
    [],
  );
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(
    null,
  );
  const [isNotificationOnline, setIsNotificationOnline] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { profile } = useUser();

  const getUserName = () => {
    if (!profile) return roleLabel;
    const firstName = profile.first_name || "";
    const lastName = profile.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || roleLabel;
  };

  const getUserInitials = () => {
    if (!profile) return defaultInitial;
    const firstName = profile.first_name || "";
    const lastName = profile.last_name || "";
    const firstInitial = firstName.charAt(0).toUpperCase() || "";
    const lastInitial = lastName.charAt(0).toUpperCase() || "";
    return `${firstInitial}${lastInitial}` || defaultInitial;
  };

  const userName = getUserName();
  const userInitials = getUserInitials();
  const profilePicture = profile?.profile_picture;

  const handleMenuClick = () => {
    if (window.innerWidth < 1024) {
      toggle();
    } else {
      toggleCollapse();
    }
  };

  const getNotificationsRoute = () => {
    if (pathname.startsWith("/admin")) {
      return "/admin/notifications";
    }
    if (pathname.startsWith("/auditor")) {
      return "/auditor/notifications";
    }
    if (pathname.startsWith("/reviewer")) {
      return "/reviewer/notifications";
    }
    return "/admin/notifications";
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${Math.max(seconds, 0)} seconds ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} days ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} months ago`;

    const years = Math.floor(months / 12);
    return `${years} years ago`;
  };

  const loadNotificationsPreview = async () => {
    setIsLoadingNotifications(true);
    setNotificationError(null);

    try {
      const result = await fetchNotifications(10, 0);
      setNotifications(result.notifications.slice(0, 5));
      setIsNotificationOnline(true);
    } catch (error) {
      console.error("Failed to fetch notifications preview:", error);
      setNotificationError("Failed to load notifications");
      setNotifications([]);
      setIsNotificationOnline(false);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const handleNotificationsClick = () => {
    const nextOpen = !isNotificationOpen;
    setIsNotificationOpen(nextOpen);
    if (nextOpen) {
      void loadNotificationsPreview();
    }
  };

  const handleNotificationItemClick = async (item: DashboardNotification) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === item.id
          ? { ...notification, read: true }
          : notification,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - (item.read ? 0 : 1)));

    try {
      if (!item.read) {
        await markNotificationAsRead(item.id);
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === item.id
            ? { ...notification, read: false }
            : notification,
        ),
      );
      setUnreadCount((prev) => prev + (item.read ? 0 : 1));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      if (
        mobileDropdownRef.current &&
        !mobileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsMobileDropdownOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setIsNotificationOpen(false);
      }
    };

    if (isDropdownOpen || isMobileDropdownOpen || isNotificationOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen, isMobileDropdownOpen, isNotificationOpen]);

  useEffect(() => {
    const syncNetwork = () => {
      setIsNotificationOnline(navigator.onLine);
    };

    syncNetwork();
    window.addEventListener("online", syncNetwork);
    window.addEventListener("offline", syncNetwork);

    return () => {
      window.removeEventListener("online", syncNetwork);
      window.removeEventListener("offline", syncNetwork);
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let interval: NodeJS.Timeout | null = null;

    const POLL_INTERVAL_MS = 30000;

    const fetchUnreadCount = async () => {
      try {
        const response = await axiosInstance.get("/notifications/unread-count");
        if (isCancelled) return;
        const count = response.data?.data?.count ?? 0;
        setUnreadCount(Number(count) || 0);
        setIsNotificationOnline(true);
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to fetch unread notification count:", error);
          setUnreadCount(0);
          setIsNotificationOnline(false);
        }
      }
    };

    const sync = async () => {
      await fetchUnreadCount();
    };

    void sync();
    interval = setInterval(() => {
      void sync();
    }, POLL_INTERVAL_MS);

    const handleForegroundSync = () => {
      if (document.visibilityState === "visible") {
        void sync();
      }
    };

    window.addEventListener("focus", handleForegroundSync);
    document.addEventListener("visibilitychange", handleForegroundSync);

    return () => {
      isCancelled = true;
      if (interval) clearInterval(interval);
      window.removeEventListener("focus", handleForegroundSync);
      document.removeEventListener("visibilitychange", handleForegroundSync);
    };
  }, []);

  return (
    <div className="bg-light-gray md:bg-zinc-50 shadow-lg border-b border-zinc-100">
      <header className="h-[60px] flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-4">
            <button
              onClick={handleMenuClick}
              className="p-2 hover:bg-zinc-50 rounded-lg transition-colors"
            >
              <Image
                src="/assets/imgs/admin/dashboard/menu.svg"
                alt="Menu"
                width={24}
                height={24}
                className="w-6 h-6"
              />
            </button>
            <span className="text-base font-medium text-secondary">
              Good Morning, {userName}
            </span>
          </div>
          <div
            className="flex lg:hidden items-center gap-2 relative"
            ref={mobileDropdownRef}
          >
            <div className="w-8 h-8 rounded-full bg-zinc-200 overflow-hidden">
              {profilePicture ? (
                <Image
                  src={profilePicture}
                  alt={userName}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-zinc-300 flex items-center justify-center text-xs font-medium text-secondary">
                  {userInitials}
                </div>
              )}
            </div>
            <span className="text-sm font-medium text-secondary">
              {userName}
            </span>
            <button
              onClick={() => setIsMobileDropdownOpen(!isMobileDropdownOpen)}
              className="p-1 hover:bg-zinc-50 rounded transition-colors"
            >
              <Image
                src="/assets/imgs/admin/dashboard/dropdown.svg"
                alt="Dropdown"
                width={14}
                height={14}
                className="w-3.5 h-3.5"
              />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden lg:block relative">
            <Image
              src="/assets/imgs/admin/dashboard/search.svg"
              alt="Search"
              width={16}
              height={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-secondary placeholder:text-gray focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:border-transparent w-64"
            />
          </div>
          <div className="relative" ref={notificationRef}>
            <button
              onClick={handleNotificationsClick}
              className="relative p-2 hover:bg-zinc-50 rounded-lg transition-colors"
            >
              <Image
                src="/assets/imgs/admin/dashboard/bell.svg"
                alt="Notifications"
                width={24}
                height={24}
                className="w-6 h-6"
              />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red rounded-full flex items-center justify-center text-[10px] font-semibold text-primary">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotificationOpen && (
              <div className="notification-container absolute right-0 top-full mt-2 w-80 bg-white border border-zinc-200 rounded-xl shadow-lg z-50">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-secondary flex items-center gap-2">
                      <span
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
                          isNotificationOnline
                            ? "bg-green-50 border-green-100"
                            : "bg-zinc-50 border-zinc-100"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isNotificationOnline
                              ? "bg-green-500 animate-pulse"
                              : "bg-zinc-400"
                          }`}
                        />
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            isNotificationOnline
                              ? "text-green-600"
                              : "text-zinc-500"
                          }`}
                        >
                          {isNotificationOnline ? "Online" : "Connecting..."}
                        </span>
                      </span>
                      Notifications
                    </h3>
                    {!isLoadingNotifications && !notificationError && (
                      <span className="text-xs text-zinc-400">
                        {notifications.length} latest
                      </span>
                    )}
                  </div>

                  {notificationError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                      {notificationError}
                    </div>
                  )}

                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {isLoadingNotifications ? (
                      <div className="py-8 text-center">
                        <p className="text-sm text-zinc-400">
                          Loading notifications...
                        </p>
                      </div>
                    ) : notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() =>
                            void handleNotificationItemClick(notification)
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
                                {formatTimeAgo(notification.createdAt)}
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
                    onClick={() => {
                      setIsNotificationOpen(false);
                      router.push(getNotificationsRoute());
                    }}
                    className="w-full mt-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    See All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleMenuClick}
            className="lg:hidden p-2 hover:bg-zinc-50 rounded-lg transition-colors"
          >
            <Image
              src="/assets/imgs/admin/dashboard/menu.svg"
              alt="Menu"
              width={24}
              height={24}
              className="w-6 h-6"
            />
          </button>
          <div
            className="hidden lg:flex items-center gap-2 pl-2 relative"
            ref={dropdownRef}
          >
            <div className="w-8 h-8 rounded-full bg-zinc-200 overflow-hidden">
              {profilePicture ? (
                <Image
                  src={profilePicture}
                  alt={userName}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-zinc-300 flex items-center justify-center text-xs font-medium text-secondary">
                  {userInitials}
                </div>
              )}
            </div>
            <span className="text-sm font-medium text-secondary">
              {userName}
            </span>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="p-1 hover:bg-zinc-50 rounded transition-colors"
            >
              <Image
                src="/assets/imgs/admin/dashboard/dropdown.svg"
                alt="Dropdown"
                width={14}
                height={14}
                className="w-3.5 h-3.5"
              />
            </button>
          </div>
        </div>
      </header>
      <div className="lg:hidden px-4 pb-3 bg-light-gray">
        <div className="relative">
          <Image
            src="/assets/imgs/admin/dashboard/search.svg"
            alt="Search"
            width={16}
            height={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-secondary placeholder:text-gray focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}
