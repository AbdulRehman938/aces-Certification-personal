"use client";

import { FileText } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  respondToAssessmentInvitation,
  type DashboardNotification,
} from "@/lib/notifications";

const PAGE_SIZE = 50;

function formatTimeAgo(dateString: string): string {
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
}

export default function DashboardNotificationsPage() {
  const pathname = usePathname();
  const isAuditorRoute = pathname.startsWith("/auditor");
  const [notifications, setNotifications] = useState<DashboardNotification[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [actionLoadingById, setActionLoadingById] = useState<
    Record<string, boolean>
  >({});
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const isFetchingMoreRef = useRef(false);
  const unreadCount = notifications.reduce(
    (count, notification) => count + (notification.read ? 0 : 1),
    0,
  );

  const loadNotifications = useCallback(async (offset = 0, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setError(null);
    }

    try {
      const result = await fetchNotifications(PAGE_SIZE, offset);
      const incoming = result.notifications;

      setNotifications((prev) => {
        if (!append) return incoming;

        const merged = [...prev];
        const existingIds = new Set(prev.map((item) => item.id));

        incoming.forEach((item) => {
          if (!existingIds.has(item.id)) {
            merged.push(item);
            existingIds.add(item.id);
          }
        });

        return merged;
      });

      setTotal(result.total);
      const computedNextOffset = offset + incoming.length;
      setNextOffset(computedNextOffset);
      setHasMore(computedNextOffset < result.total && incoming.length > 0);
    } catch (err) {
      if (!append) {
        setError(getApiErrorMessage(err, "Failed to load notifications"));
        setNotifications([]);
        setTotal(0);
        setNextOffset(0);
        setHasMore(false);
      }
    } finally {
      if (append) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadNotifications(0, false);
  }, [loadNotifications]);

  const loadMoreNotifications = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore || isFetchingMoreRef.current) {
      return;
    }

    isFetchingMoreRef.current = true;
    try {
      await loadNotifications(nextOffset, true);
    } finally {
      isFetchingMoreRef.current = false;
    }
  }, [hasMore, isLoading, isLoadingMore, loadNotifications, nextOffset]);

  useEffect(() => {
    const target = loadMoreTriggerRef.current;
    if (!target || isLoading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMoreNotifications();
        }
      },
      {
        root: null,
        rootMargin: "200px 0px",
        threshold: 0.1,
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, loadMoreNotifications]);

  const handleNotificationPress = async (item: DashboardNotification) => {
    if (item.read) return;

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === item.id
          ? { ...notification, read: true }
          : notification,
      ),
    );

    try {
      await markNotificationAsRead(item.id);
    } catch {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === item.id
            ? { ...notification, read: false }
            : notification,
        ),
      );
    }
  };

  const handlePendingActionClick = async (
    action: "accept" | "reject",
    item: DashboardNotification,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();

    const invitationId = item.invitationId;
    if (!invitationId || actionLoadingById[item.id]) return;

    const endpointAction = action === "accept" ? "accept" : "decline";

    setActionLoadingById((prev) => ({ ...prev, [item.id]: true }));
    setError(null);

    try {
      await respondToAssessmentInvitation(invitationId, endpointAction);

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === item.id ? { ...notification, read: true } : notification,
        ),
      );

      await loadNotifications(0, false);
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          `Failed to ${action === "accept" ? "accept" : "reject"} invitation`,
        ),
      );
    } finally {
      setActionLoadingById((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handleItemKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    item: DashboardNotification,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void handleNotificationPress(item);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (isMarkingAllRead || isLoading || unreadCount === 0) return;

    const previousNotifications = notifications;
    setIsMarkingAllRead(true);
    setError(null);
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true })),
    );

    try {
      await markAllNotificationsAsRead();
    } catch (err) {
      setNotifications(previousNotifications);
      setError(
        getApiErrorMessage(err, "Failed to mark all notifications as read"),
      );
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  return (
    <div className="bg-light-gray p-3 md:p-6 min-h-screen">
      <div className="rounded-xl bg-white border border-zinc-100 p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-secondary">
              Notifications
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Latest updates from the system
            </p>
          </div>

          <button
            onClick={() => void handleMarkAllAsRead()}
            disabled={isLoading || isMarkingAllRead || unreadCount === 0}
            className="h-10 px-4 rounded-lg bg-zinc-100 text-zinc-700 text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isMarkingAllRead ? "Marking..." : "Mark all as read"}
          </button>
        </div>

        <div className="mt-6">
          {!isLoading && !error && (
            <p className="text-xs text-gray-500 mb-3">
              Showing {notifications.length} of {total} notifications
            </p>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="py-12 text-sm text-gray-500">Loading...</div>
          )}

          {!isLoading && !error && notifications.length === 0 && (
            <div className="py-12 text-sm text-gray-500">
              No notifications found.
            </div>
          )}

          {!isLoading && !error && notifications.length > 0 && (
            <div className="space-y-3">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => void handleNotificationPress(item)}
                  onKeyDown={(event) => handleItemKeyDown(event, item)}
                  role="button"
                  tabIndex={0}
                  className={`w-full text-left rounded-xl border p-4 transition-colors ${
                    item.read
                      ? "bg-zinc-50 border-zinc-100 hover:bg-zinc-100"
                      : "bg-blue-50 border-blue-200 hover:bg-blue-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-full bg-white border border-zinc-100 flex items-center justify-center text-zinc-500 shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-secondary">
                          {item.title}
                        </p>
                        <p className="text-sm text-zinc-500 mt-1">
                          {item.message || item.description || "-"}
                        </p>
                        {isAuditorRoute &&
                          item.type.toLowerCase() === "action_required" &&
                          item.invitationId && (
                            <div className="mt-3 flex items-center gap-2">
                              <button
                                onClick={(event) =>
                                  void handlePendingActionClick(
                                    "accept",
                                    item,
                                    event,
                                  )
                                }
                                disabled={Boolean(actionLoadingById[item.id])}
                                className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {actionLoadingById[item.id]
                                  ? "Processing..."
                                  : "Accept"}
                              </button>
                              <button
                                onClick={(event) =>
                                  void handlePendingActionClick(
                                    "reject",
                                    item,
                                    event,
                                  )
                                }
                                disabled={Boolean(actionLoadingById[item.id])}
                                className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {actionLoadingById[item.id]
                                  ? "Processing..."
                                  : "Reject"}
                              </button>
                            </div>
                          )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!item.read && (
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      )}
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {hasMore && (
                <div
                  ref={loadMoreTriggerRef}
                  className="py-4 text-center text-xs text-gray-500"
                >
                  {isLoadingMore
                    ? "Loading more notifications..."
                    : "Scroll down to load more"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
