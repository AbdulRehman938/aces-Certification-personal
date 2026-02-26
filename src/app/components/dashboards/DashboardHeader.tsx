"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useSidebar } from "@/app/components/dashboards/sidebarContext";
import { useUser } from "@/contexts/UserContext";
import { axiosInstance } from "@/lib/axios";

type DashboardHeaderProps = {
  roleLabel: string;
  defaultInitial: string;
};

export default function DashboardHeader({
  roleLabel,
  defaultInitial,
}: DashboardHeaderProps) {
  const { toggle, toggleCollapse } = useSidebar();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);
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
    };

    if (isDropdownOpen || isMobileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen, isMobileDropdownOpen]);

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
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to fetch unread notification count:", error);
          setUnreadCount(0);
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
          <button className="relative p-2 hover:bg-zinc-50 rounded-lg transition-colors">
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

