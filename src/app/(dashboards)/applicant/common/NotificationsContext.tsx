"use client";

import { axiosInstance } from "@/lib/axios";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface ApplicantNotification {
  id: string;
  title: string;
  description?: string;
  message?: string;
  created_at: string;
  read: boolean;
  type?: string;
  module?: string;
  status?: string;
  metadata?: Record<string, unknown> | string | null;
  assessment_id?: string;
  certificate_id?: string;
  certificate_assessment_id?: string;
  certificate?: Record<string, unknown> | null;
}

interface NotificationsContextValue {
  notifications: ApplicantNotification[];
  unreadCount: number;
  totalNotifications: number;
  isOnline: boolean;
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

const POLL_INTERVAL_MS = 30000;

export function ApplicantNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<ApplicantNotification[]>(
    [],
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isMountedRef = useRef(false);
  const isSyncingRef = useRef(false);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/notifications/status");
      const data = response.data?.data;
      if (!isMountedRef.current) return;

      if (response.data?.success) {
        if (data?.websocketSupported === false) {
          setIsOnline(true);
        } else {
          setIsOnline(data?.isOnline ?? true);
        }
      }
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (!isMountedRef.current) return;
      if (status === 404) {
        setIsOnline(true);
      }
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      const [notificationsResponse, unreadResponse] = await Promise.all([
        axiosInstance.get("/notifications", {
          params: { limit: 50, offset: 0 },
        }),
        axiosInstance.get("/notifications/unread-count"),
      ]);

      if (!isMountedRef.current) return;

      if (notificationsResponse.data?.success) {
        const data = notificationsResponse.data.data || {};
        setNotifications(data.notifications || []);
        setTotalNotifications(Number(data.total) || 0);
      }

      if (unreadResponse.data?.success) {
        setUnreadCount(Number(unreadResponse.data.data?.count) || 0);
      }

      setIsOnline(true);
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error("Failed to fetch notifications", error);
      setIsOnline(false);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      isSyncingRef.current = false;
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await axiosInstance.patch(`/notifications/${id}/read`);
      if (response.data?.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        void refreshNotifications();
      }
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  }, [refreshNotifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await axiosInstance.patch("/notifications/read-all");
      if (response.data?.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
        void refreshNotifications();
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
  }, [refreshNotifications]);

  useEffect(() => {
    isMountedRef.current = true;

    void fetchStatus();
    void refreshNotifications();

    const interval = setInterval(() => {
      void refreshNotifications();
    }, POLL_INTERVAL_MS);

    const handleForegroundSync = () => {
      if (document.visibilityState === "visible") {
        void refreshNotifications();
      }
    };

    window.addEventListener("focus", handleForegroundSync);
    document.addEventListener("visibilitychange", handleForegroundSync);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleForegroundSync);
      document.removeEventListener("visibilitychange", handleForegroundSync);
    };
  }, [fetchStatus, refreshNotifications]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      totalNotifications,
      isOnline,
      isLoading,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
    }),
    [
      notifications,
      unreadCount,
      totalNotifications,
      isOnline,
      isLoading,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useApplicantNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      "useApplicantNotifications must be used within ApplicantNotificationsProvider",
    );
  }
  return ctx;
}
