"use client";

import { useEffect, useState } from "react";
import { axiosInstance } from "@/lib/axios";
import axios from "axios";

type ChatThreadItem = {
  id?: string;
  threadId?: string;
  chatThreadId?: string;
  name?: string;
  title?: string;
  participantName?: string;
  recipientName?: string;
  preview?: string;
  message?: string;
  lastMessage?: { content?: string } | string | null;
  unread?: number;
  unreadCount?: number;
  updatedAt?: string;
  lastMessageAt?: string;
  createdAt?: string;
};

type ConversationCard = {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread: number;
};

const formatThreadTime = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const mapThreadToCard = (
  thread: ChatThreadItem,
  index: number,
): ConversationCard => {
  const rawLastMessage =
    typeof thread.lastMessage === "string"
      ? thread.lastMessage
      : thread.lastMessage?.content || "";

  const unreadCount = Number(thread.unreadCount ?? thread.unread ?? 0);

  return {
    id:
      String(
        thread.id || thread.threadId || thread.chatThreadId || `thread-${index}`,
      ) || `thread-${index}`,
    name:
      String(
        thread.name ||
          thread.title ||
          thread.participantName ||
          thread.recipientName ||
          "Conversation",
      ) || "Conversation",
    preview:
      String(thread.preview || rawLastMessage || thread.message || "").trim() ||
      "No messages yet",
    time: formatThreadTime(
      thread.updatedAt || thread.lastMessageAt || thread.createdAt,
    ),
    unread: Number.isFinite(unreadCount) && unreadCount > 0 ? unreadCount : 0,
  };
};

export default function DashboardMessagesPage() {
  const [threads, setThreads] = useState<ConversationCard[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const fetchThreads = async () => {
      setIsLoadingThreads(true);
      try {
        const response = await axiosInstance.get("/chat/threads");
        if (isCancelled) return;

        console.log("chat threads response:", response.data);

        const payload = response.data?.data;
        const items: ChatThreadItem[] = Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload)
            ? payload
            : Array.isArray(response.data?.items)
              ? response.data.items
              : Array.isArray(response.data)
                ? response.data
                : [];

        setThreads(items.map(mapThreadToCard));
      } catch (error) {
        if (isCancelled) return;
        console.error("Failed to fetch chat threads:", error);
        if (axios.isAxiosError(error)) {
          console.error("API message:", error.response?.data?.message);
        }
        setThreads([]);
      } finally {
        if (!isCancelled) {
          setIsLoadingThreads(false);
        }
      }
    };

    void fetchThreads();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className="p-3 md:p-6 bg-light-gray h-full min-h-0 overflow-hidden flex flex-col">
      <div className="mb-4 md:mb-6 shrink-0">
        <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary mb-1 md:mb-2 leading-[21.6px]">
          Messages
        </h1>
        <p className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px]">
          View and manage your role-based conversations.
        </p>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 grid-rows-2 xl:grid-rows-1 gap-4">
        <div className="xl:col-span-4 min-h-0 flex flex-col overflow-hidden bg-white border border-zinc-100 rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-zinc-100 shrink-0">
            <h2 className="text-sm font-semibold text-secondary">
              Conversations
            </h2>
          </div>
          <div className="p-2 flex-1 min-h-0 overflow-y-auto">
            {isLoadingThreads ? (
              <p className="text-sm text-gray px-2 py-3">Loading conversations...</p>
            ) : threads.length === 0 ? (
              <p className="text-sm text-gray px-2 py-3">No conversations found.</p>
            ) : (
              threads.map((thread) => (
                <div
                  key={thread.id}
                  className="p-3 rounded-lg hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-200"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-secondary truncate">
                      {thread.name}
                    </p>
                    <span className="text-xs text-gray whitespace-nowrap">
                      {thread.time || "N/A"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-gray flex-1 truncate">
                      {thread.preview}
                    </p>
                    {thread.unread > 0 ? (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-medium bg-black text-white shrink-0">
                        {thread.unread}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="xl:col-span-8 min-h-0 flex flex-col overflow-hidden bg-white border border-zinc-100 rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-zinc-100 shrink-0">
            <h2 className="text-sm font-semibold text-secondary">
              Conversation
            </h2>
          </div>
          <div className="p-6 flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center text-center">
            <p className="text-base font-medium text-secondary">
              Messages page is ready
            </p>
            <p className="text-sm text-gray mt-2 max-w-md">
              API integration for real-time chat can be connected next.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
