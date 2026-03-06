"use client";

import { motion } from "framer-motion";
import { Award, CreditCard, FileText } from "lucide-react";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useApplicantNotifications } from "../../common/NotificationsContext";
import type { ApplicantNotification } from "../../common/NotificationsContext";
import {
  buildApplicantNotificationHref,
  resolveApplicantNotificationNav,
} from "../../common/notification-navigation";
import { useRouter } from "next/navigation";

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

export const NotificationsPage = () => {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    refreshNotifications,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
  } = useApplicantNotifications();

  const loadingProgress = isLoading ? 65 : 100;

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  const handleNotificationClick = async (
    notification: ApplicantNotification,
  ) => {
    try {
      if (!notification.read) {
        await handleMarkAsRead(notification.id);
      }
    } finally {
      const action = resolveApplicantNotificationNav(notification);
      router.push(buildApplicantNotificationHref(action));
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "certificate":
        return <Award className="h-5 w-5 text-zinc-700" />;
      case "payment":
        return <CreditCard className="h-5 w-5 text-zinc-700" />;
      case "audit":
        return <FileText className="h-5 w-5 text-zinc-700" />;
      default:
        return <FileText className="h-5 w-5 text-zinc-700" />;
    }
  };

  return (
    <div className="min-h-screen bg-light-gray px-4 py-8 sm:px-6 lg:px-8 lg:pt-3">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 space-y-1">
          <h1 className="text-2xl font-semibold text-secondary">
            Notifications
          </h1>
          <p className="text-sm text-gray font-medium">
            System updates and action alerts
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-light-gray-2 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="mb-6 flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-secondary">
                Notifications History
              </h2>
              <p className="text-sm text-gray font-medium">
                View your complete notification history
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-4 p-4 bg-zinc-50 rounded-xl">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => void handleNotificationClick(item)}
                  className={`flex flex-col gap-4 rounded-xl p-4 transition-colors cursor-pointer sm:flex-row sm:items-start sm:justify-between ${
                    item.read
                      ? "bg-zinc-50 hover:bg-zinc-100/80"
                      : "bg-blue-50 hover:bg-blue-100/80 border border-blue-100"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                      {getIcon(item.type || "notification")}
                    </div>
                    <div className="space-y-1 pt-1">
                      <h3 className="text-base font-semibold text-secondary">
                        {item.title}
                      </h3>
                      <p className="text-sm font-medium leading-relaxed text-zinc-500">
                        {item.message || item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 sm:pt-0 sm:self-center">
                    {!item.read && (
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-sm" />
                    )}
                    <span className="text-xs font-medium text-gray/60 whitespace-nowrap">
                      {formatTimeAgo(item.created_at)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-24 text-center">
                <p className="text-gray/60 font-medium">No notifications yet</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
