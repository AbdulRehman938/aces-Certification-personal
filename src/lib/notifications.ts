import axios from "axios";
import { axiosInstance } from "@/lib/axios";

export interface DashboardNotification {
  id: string;
  title: string;
  message: string;
  description: string;
  createdAt: string;
  read: boolean;
  type: string;
  invitationId?: string;
}

type NotificationsResult = {
  notifications: DashboardNotification[];
  total: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function parseMetadata(
  value: unknown,
): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return asRecord(parsed);
    } catch {
      return null;
    }
  }
  return asRecord(value);
}

function normalizeNotification(value: unknown): DashboardNotification | null {
  const data = asRecord(value);
  if (!data) return null;

  const id = asString(data.id);
  if (!id) return null;

  const title = asString(data.title) || "Notification";
  const message = asString(data.message);
  const description = asString(data.description);
  const createdAt =
    asString(data.created_at) || asString(data.createdAt) || "";
  const read = asBoolean(data.read);
  const type = asString(data.type) || "notification";
  const metadata = parseMetadata(data.metadata);
  const invitationId =
    asString(metadata?.invitationId) || asString(metadata?.invitation_id);

  return {
    id,
    title,
    message,
    description,
    createdAt,
    read,
    type,
    invitationId: invitationId || undefined,
  };
}

export async function fetchNotifications(
  limit = 50,
  offset = 0,
): Promise<NotificationsResult> {
  const response = await axiosInstance.get("/notifications", {
    params: { limit, offset },
  });
  console.log("notifications list response:", response.data);

  const payload = response.data?.data;
  const payloadRecord = asRecord(payload);
  const rawItems = Array.isArray(payload)
    ? payload
    : Array.isArray(payloadRecord?.notifications)
      ? payloadRecord.notifications
      : [];

  const notifications = rawItems
    .map((item) => normalizeNotification(item))
    .filter((item): item is DashboardNotification => item !== null);
  const totalRaw =
    (payloadRecord && typeof payloadRecord.total === "number"
      ? payloadRecord.total
      : notifications.length) || notifications.length;

  return {
    notifications,
    total: totalRaw,
  };
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await axiosInstance.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await axiosInstance.patch("/notifications/read-all");
}

async function postAssessmentInvitationAction(
  invitationId: string,
  action: "accept" | "decline",
): Promise<void> {
  await axiosInstance.post(`/assessment-invitations/${invitationId}/${action}`);
}

export async function respondToAssessmentInvitation(
  invitationId: string,
  action: "accept" | "decline",
): Promise<void> {
  try {
    await postAssessmentInvitationAction(invitationId, action);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 405) {
      await axiosInstance.patch(
        `/assessment-invitations/${invitationId}/${action}`,
      );
      return;
    }
    throw error;
  }
}
