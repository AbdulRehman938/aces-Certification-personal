"use client";

import type { ApplicantNotification } from "./NotificationsContext";

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v ? v : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function extractFromMetadata(
  notification: ApplicantNotification,
): Record<string, unknown> | null {
  const raw = notification.metadata;
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return asRecord(parsed);
    } catch {
      return null;
    }
  }
  return asRecord(raw);
}

function pickFirstString(
  bag: Record<string, unknown> | null,
  keys: string[],
): string | null {
  if (!bag) return null;
  for (const k of keys) {
    const v = asNonEmptyString(bag[k]);
    if (v) return v;
  }
  return null;
}

function normalizeStatusTab(statusLike: string | null): "In Progress" | "Active" | "Expired" {
  const s = (statusLike || "").toLowerCase();
  if (s.includes("expired")) return "Expired";
  if (s.includes("active") || s.includes("approved") || s.includes("passed")) return "Active";
  return "In Progress";
}

type NotificationNavAction =
  | { kind: "dashboard_results"; assessmentId: string; tab?: "In Progress" | "Active" | "Expired" }
  | { kind: "dashboard_submission"; assessmentId: string; tab?: "In Progress" | "Active" | "Expired" }
  | { kind: "dashboard_certificate_results"; certificateId: string; tab?: "In Progress" | "Active" | "Expired" }
  | { kind: "dashboard_certificate_submission"; certificateId: string; tab?: "In Progress" | "Active" | "Expired" }
  | { kind: "dashboard_tab"; tab?: "In Progress" | "Active" | "Expired" }
  | { kind: "notifications_page" };

export function resolveApplicantNotificationNav(
  notification: ApplicantNotification,
): NotificationNavAction {
  const meta = extractFromMetadata(notification);
  const certificate = asRecord(notification.certificate);

  const type = asNonEmptyString(notification.type) || "";
  const moduleName = asNonEmptyString(notification.module) || "";
  const status =
    asNonEmptyString(notification.status) ||
    asNonEmptyString(meta?.status) ||
    asNonEmptyString(meta?.certificate_status) ||
    asNonEmptyString(certificate?.status) ||
    null;

  const typeLower = type.toLowerCase();
  const moduleLower = moduleName.toLowerCase();

  const assessmentId =
    asNonEmptyString(notification.assessment_id) ||
    asNonEmptyString(notification.certificate_assessment_id) ||
    pickFirstString(meta, [
      "assessment_id",
      "certificate_assessment_id",
      "certificateAssessmentId",
      "assessmentId",
      "id",
    ]) ||
    pickFirstString(certificate, ["assessment_id", "certificate_assessment_id", "id"]);

  const certificateId =
    asNonEmptyString(notification.certificate_id) ||
    pickFirstString(meta, ["certificate_id", "certificateId"]) ||
    asNonEmptyString(certificate?.id);

  const tab = normalizeStatusTab(status);

  const shouldOpenResults =
      typeLower.includes("submission") ||
      typeLower.includes("score") ||
      typeLower.includes("review") ||
      typeLower.includes("completed") ||
      typeLower.includes("failed") ||
      typeLower.includes("blocked") ||
      typeLower.includes("rejected") ||
      String(status || "").toLowerCase().includes("ai_review") ||
      String(status || "").toLowerCase().includes("submitted") ||
      moduleLower.includes("assessment") ||
      moduleLower.includes("ai_review");

  if (assessmentId) {
    if (shouldOpenResults) {
      return { kind: "dashboard_results", assessmentId, tab };
    }
    return { kind: "dashboard_submission", assessmentId, tab };
  }

  if (certificateId) {
    if (shouldOpenResults) {
      return { kind: "dashboard_certificate_results", certificateId, tab };
    }
    return { kind: "dashboard_certificate_submission", certificateId, tab };
  }

  if (moduleLower.includes("assessment") || moduleLower.includes("certificate")) {
    return { kind: "dashboard_tab", tab };
  }

  return { kind: "notifications_page" };
}

export function buildApplicantNotificationHref(
  action: NotificationNavAction,
  base: string = "/applicant"
): string {
  if (action.kind === "notifications_page") return `${base}/notifications`;

  if (action.kind === "dashboard_tab") {
    const params = new URLSearchParams();
    if (action.tab) params.set("tab", action.tab);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : `${base}`;
  }

  const params = new URLSearchParams();
  params.set("notification_action", action.kind);
  if ("assessmentId" in action) {
    params.set("assessment_id", action.assessmentId);
  }
  if ("certificateId" in action) {
    params.set("certificate_id", action.certificateId);
  }
  if (action.tab) params.set("tab", action.tab);
  return `${base}?${params.toString()}`;
}
