"use client";

import { useEffect, useRef, useState } from "react";
import { axiosInstance } from "@/lib/axios";
import axios from "axios";
import { usePathname } from "next/navigation";

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
  unreadCount?: number | string;
  updatedAt?: string;
  lastMessageAt?: string;
  createdAt?: string;
  assessmentId?: string;
  assessmentType?: string;
  certificateName?: string;
  organizationName?: string;
  participantCount?: number | string;
  status?: string;
  supportTicketSubject?: string;
  threadType?: string;
  lockedAt?: string | null;
  lockedReason?: string | null;
};

type ConversationCard = {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread: number;
  organizationName: string;
  certificateName: string;
  assessmentId: string;
  assessmentType: string;
  threadType: string;
  status: string;
  participantCount: number;
  createdAt: string;
  updatedAt: string;
  lockedAt: string;
  lockedReason: string;
};

type ChatMessageItem = {
  id?: string;
  messageId?: string;
  content?: string;
  message?: string;
  body?: string;
  text?: string;
  createdAt?: string;
  sentAt?: string;
  updatedAt?: string;
  senderName?: string;
  senderType?: string;
  senderRole?: string;
  sender?: {
    name?: string;
    fullName?: string;
    role?: string;
    type?: string;
  } | null;
  isSystemMessage?: boolean;
};

type ChatParticipantItem = {
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
};

type MessageCard = {
  id: string;
  content: string;
  time: string;
  senderName: string;
  senderType: string;
  senderRoleKey: string;
  isSystemMessage: boolean;
};

const formatLabel = (value?: string): string => {
  const raw = String(value || "").trim();
  if (!raw) return "N/A";

  return raw
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

const parseCount = (value?: number | string): number => {
  const count = Number(value ?? 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

const normalizeRoleKey = (value?: string): string => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
};

const getDashboardRoleKey = (pathname: string): string => {
  if (pathname.startsWith("/reviewer")) return "reviewer";
  if (pathname.startsWith("/auditor")) return "auditor";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/applicant")) return "applicant";
  return "";
};

const getParticipantDisplayName = (
  participant: ChatParticipantItem,
): string | null => {
  const firstName = String(participant.firstName || "").trim();
  const lastName = String(participant.lastName || "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return fullName || null;
};

const createPendingMessageCard = (
  content: string,
  currentRoleKey: string,
  index: number,
): MessageCard => {
  const roleLabel = formatLabel(currentRoleKey);

  return {
    id: `pending-message-${index}-${Date.now()}`,
    content,
    time: formatThreadTime(new Date().toISOString()) || "Now",
    senderName: "You",
    senderType: roleLabel === "N/A" ? "User" : roleLabel,
    senderRoleKey: currentRoleKey,
    isSystemMessage: false,
  };
};

const mapMessageToCard = (
  message: ChatMessageItem,
  index: number,
): MessageCard => {
  const senderName = String(
    message.senderName ||
      message.sender?.name ||
      message.sender?.fullName ||
      "",
  ).trim();
  const senderType = formatLabel(
    message.senderType ||
      message.senderRole ||
      message.sender?.role ||
      message.sender?.type,
  );
  const content = String(
    message.content || message.message || message.body || message.text || "",
  ).trim();

  return {
    id:
      String(message.id || message.messageId || `message-${index}`) ||
      `message-${index}`,
    content: content || "No message content",
    time: formatThreadTime(
      message.createdAt || message.sentAt || message.updatedAt,
    ),
    senderName: senderName || "Unknown Sender",
    senderType,
    senderRoleKey: normalizeRoleKey(
      message.senderRole || message.senderType || message.sender?.role,
    ),
    isSystemMessage: Boolean(message.isSystemMessage),
  };
};

const mapThreadToCard = (
  thread: ChatThreadItem,
  index: number,
): ConversationCard => {
  const rawLastMessage =
    typeof thread.lastMessage === "string"
      ? thread.lastMessage
      : thread.lastMessage?.content || "";

  const unreadCount = parseCount(thread.unreadCount ?? thread.unread ?? 0);
  const participantCount = parseCount(thread.participantCount);
  const organizationName = String(thread.organizationName || "").trim();
  const certificateName = String(thread.certificateName || "").trim();
  const assessmentType = formatLabel(thread.assessmentType);
  const threadType = formatLabel(thread.threadType);
  const status = formatLabel(thread.status);

  return {
    id:
      String(
        thread.id ||
          thread.threadId ||
          thread.chatThreadId ||
          `thread-${index}`,
      ) || `thread-${index}`,
    name:
      String(
        organizationName ||
          thread.name ||
          thread.title ||
          thread.participantName ||
          thread.recipientName ||
          certificateName ||
          thread.supportTicketSubject ||
          "Conversation",
      ) || "Conversation",
    preview:
      String(
        thread.preview ||
          certificateName ||
          rawLastMessage ||
          thread.message ||
          `${assessmentType} conversation`,
      ).trim() || "No messages yet",
    time: formatThreadTime(
      thread.updatedAt || thread.lastMessageAt || thread.createdAt,
    ),
    unread: unreadCount,
    organizationName: organizationName || "N/A",
    certificateName: certificateName || "N/A",
    assessmentId: String(thread.assessmentId || "").trim() || "N/A",
    assessmentType,
    threadType,
    status,
    participantCount,
    createdAt: formatThreadTime(thread.createdAt) || "N/A",
    updatedAt:
      formatThreadTime(thread.updatedAt || thread.lastMessageAt) || "N/A",
    lockedAt: formatThreadTime(thread.lockedAt || undefined) || "",
    lockedReason: String(thread.lockedReason || "").trim(),
  };
};

export default function DashboardMessagesPage() {
  const pathname = usePathname();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [threads, setThreads] = useState<ConversationCard[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [messages, setMessages] = useState<MessageCard[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [sendMessageError, setSendMessageError] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const currentRoleKey = getDashboardRoleKey(pathname);

  useEffect(() => {
    const controller = new AbortController();
    let isCancelled = false;

    const fetchThreads = async () => {
      setIsLoadingThreads(true);
      try {
        const response = await axiosInstance.get("/chat/threads", {
          signal: controller.signal,
        });
        if (isCancelled || controller.signal.aborted) return;

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

        const mappedThreads = items.map(mapThreadToCard);
        setThreads(mappedThreads);
        setSelectedThreadId((prev) =>
          mappedThreads.some((thread) => thread.id === prev) ? prev : null,
        );
      } catch (error) {
        if (isCancelled || controller.signal.aborted) return;
        console.error("Failed to fetch chat threads:", error);
        if (axios.isAxiosError(error)) {
          console.error("API message:", error.response?.data?.message);
        }
        setThreads([]);
        setSelectedThreadId(null);
      } finally {
        if (!isCancelled && !controller.signal.aborted) {
          setIsLoadingThreads(false);
        }
      }
    };

    void fetchThreads();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, []);

  const selectedThread =
    threads.find((thread) => thread.id === selectedThreadId) || null;

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      setIsLoadingMessages(false);
      setDraftMessage("");
      setSendMessageError("");
      setParticipants([]);
      return;
    }

    const controller = new AbortController();
    let isCancelled = false;

    const fetchThreadMessages = async () => {
      setIsLoadingMessages(true);

      try {
        const response = await axiosInstance.get(
          `/chat/threads/${encodeURIComponent(selectedThreadId)}/messages`,
          {
            params: {
              page: 1,
              limit: 20,
            },
            signal: controller.signal,
          },
        );
        if (isCancelled || controller.signal.aborted) return;

        console.log("chat thread messages response:", response.data);

        const payload = response.data?.data;
        const items: ChatMessageItem[] = Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.messages)
            ? payload.messages
            : Array.isArray(payload)
              ? payload
              : Array.isArray(response.data?.items)
                ? response.data.items
                : Array.isArray(response.data?.messages)
                  ? response.data.messages
                  : [];

        setMessages(items.map(mapMessageToCard));
      } catch (error) {
        if (isCancelled || controller.signal.aborted) return;
        console.error("Failed to fetch chat thread messages:", error);
        if (axios.isAxiosError(error)) {
          console.error("API message:", error.response?.data?.message);
        }
        setMessages([]);
      } finally {
        if (!isCancelled && !controller.signal.aborted) {
          setIsLoadingMessages(false);
        }
      }
    };

    void fetchThreadMessages();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [selectedThreadId]);

  useEffect(() => {
    if (!selectedThreadId) {
      setParticipants([]);
      return;
    }

    const controller = new AbortController();
    let isCancelled = false;

    const fetchThreadParticipants = async () => {
      try {
        const response = await axiosInstance.get(
          `/chat/threads/${encodeURIComponent(selectedThreadId)}/participants`,
          {
            signal: controller.signal,
          },
        );
        if (isCancelled || controller.signal.aborted) return;

        console.log("chat thread participants response:", response.data);
        const payload = response.data?.data;
        const items: ChatParticipantItem[] = Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload)
            ? payload
            : Array.isArray(response.data?.items)
              ? response.data.items
              : Array.isArray(response.data)
                ? response.data
                : [];

        setParticipants(
          items
            .map(getParticipantDisplayName)
            .filter((value): value is string => Boolean(value)),
        );
      } catch (error) {
        if (isCancelled || controller.signal.aborted) return;
        console.error("Failed to fetch chat thread participants:", error);
        if (axios.isAxiosError(error)) {
          console.error("API message:", error.response?.data?.message);
        }
        setParticipants([]);
      }
    };

    void fetchThreadParticipants();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [selectedThreadId]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, selectedThreadId]);

  const handleSendMessage = async () => {
    if (!selectedThreadId || isSendingMessage) return;

    const content = draftMessage.trim();
    if (!content) return;

    setIsSendingMessage(true);
    setSendMessageError("");

    try {
      const response = await axiosInstance.post(
        `/chat/threads/${encodeURIComponent(selectedThreadId)}/messages`,
        {
          content,
        },
      );

      console.log("chat send message response:", response.data);

      const payload = response.data?.data;
      const responseMessage =
        payload && typeof payload === "object" && !Array.isArray(payload)
          ? (payload.message ?? payload)
          : null;

      setMessages((prev) => {
        const nextMessage =
          responseMessage &&
          typeof responseMessage === "object" &&
          !Array.isArray(responseMessage)
            ? mapMessageToCard(responseMessage as ChatMessageItem, prev.length)
            : createPendingMessageCard(content, currentRoleKey, prev.length);

        return [...prev, nextMessage];
      });

      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === selectedThreadId
            ? {
                ...thread,
                time: formatThreadTime(new Date().toISOString()) || thread.time,
              }
            : thread,
        ),
      );

      setDraftMessage("");
    } catch (error) {
      let message = "Failed to send message";
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      setSendMessageError(message);
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <div className="p-3 md:p-5 bg-light-gray h-full min-h-0 overflow-hidden flex flex-col">
      <div className="mb-3 md:mb-4 shrink-0">
        <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary mb-1 md:mb-2 leading-[21.6px]">
          Messages
        </h1>
        <p className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px]">
          View and manage your role-based conversations.
        </p>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 grid-rows-2 xl:grid-rows-1 gap-3">
        <div className="xl:col-span-4 min-h-0 flex flex-col overflow-hidden bg-white border border-zinc-100 rounded-xl shadow-sm">
          <div className="px-3 py-3 border-b border-zinc-100 shrink-0">
            <h2 className="text-sm font-semibold text-secondary">
              Conversations {threads.length ? `(${threads.length})` : ""}
            </h2>
          </div>
          <div className="p-1.5 flex-1 min-h-0 overflow-y-auto">
            {isLoadingThreads ? (
              <p className="text-sm text-gray px-2 py-3">
                Loading conversations...
              </p>
            ) : threads.length === 0 ? (
              <p className="text-sm text-gray px-2 py-3">
                No conversations found.
              </p>
            ) : (
              threads.map((thread) => (
                <button
                  type="button"
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-full text-left p-2.5 rounded-lg transition-colors border ${
                    selectedThread?.id === thread.id
                      ? "bg-zinc-100 border-zinc-300"
                      : "border-transparent hover:bg-zinc-50 hover:border-zinc-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-secondary whitespace-normal break-words leading-5">
                        {thread.certificateName}
                      </p>
                    </div>
                    <span className="shrink-0 pt-0.5 text-[11px] text-gray whitespace-nowrap">
                      {thread.time || "N/A"}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <p className="text-[11px] text-gray flex-1 truncate">
                      {thread.assessmentType}
                    </p>
                    {thread.unread > 0 ? (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full border border-black bg-black text-[11px] font-medium text-white shrink-0">
                        {thread.unread}
                      </span>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="xl:col-span-8 min-h-0 flex flex-col overflow-hidden bg-white border border-zinc-100 rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-zinc-100 shrink-0 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-secondary truncate">
                {selectedThread?.certificateName || "Conversation"}
              </h2>
              {selectedThread ? (
                <p className="mt-0.5 text-[11px] text-gray truncate">
                  {selectedThread.assessmentType}
                </p>
              ) : null}
            </div>
            <div className="min-w-0 max-w-[55%] text-right">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray">
                Members in chat
              </p>
              <p className="mt-0.5 text-[11px] text-secondary whitespace-normal break-words">
                {participants.length
                  ? participants.join(", ")
                  : "No members found"}
              </p>
            </div>
          </div>
          {selectedThread ? (
            <div className="flex flex-1 min-h-0 flex-col bg-zinc-50">
              <div
                ref={messagesContainerRef}
                className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4"
              >
                {isLoadingMessages ? (
                  <p className="text-sm text-gray">Loading messages...</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-gray">
                    No messages found for this thread.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {messages.map((message) => {
                      const isOwnMessage =
                        !message.isSystemMessage &&
                        Boolean(currentRoleKey) &&
                        message.senderRoleKey === currentRoleKey;

                      if (message.isSystemMessage) {
                        return (
                          <div
                            key={message.id}
                            className="flex justify-center py-1"
                          >
                            <div className="max-w-[85%] rounded-full bg-zinc-200 px-3 py-1.5 text-[11px] text-gray">
                              {message.content}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl border px-3 py-2.5 shadow-sm ${
                              isOwnMessage
                                ? "border-zinc-300 bg-zinc-100 text-secondary"
                                : "border-zinc-200 bg-white text-secondary"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-secondary">
                                {message.senderName}
                              </p>
                              {message.senderType &&
                              message.senderType !== "N/A" ? (
                                <span className="inline-flex items-center rounded-full bg-black px-2 py-0.5 text-[10px] font-medium text-white">
                                  {message.senderType}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1.5 text-[13px] leading-5 whitespace-pre-wrap break-words text-secondary">
                              {message.content}
                            </p>
                            <div className="mt-2 flex items-center justify-end">
                              <p className="text-[11px] text-gray">
                                {message.time || "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-zinc-200 bg-white p-3">
                {sendMessageError ? (
                  <p className="mb-2 text-xs text-red-600">
                    {sendMessageError}
                  </p>
                ) : null}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={draftMessage}
                    onChange={(event) => setDraftMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-secondary outline-none focus:border-black"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void handleSendMessage();
                    }}
                    disabled={isSendingMessage || !draftMessage.trim()}
                    className="inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
                  >
                    {isSendingMessage ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center text-center">
              <p className="text-base font-medium text-secondary">
                No conversation selected
              </p>
              <p className="text-sm text-gray mt-2 max-w-md">
                Choose a thread from the left to view its details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
