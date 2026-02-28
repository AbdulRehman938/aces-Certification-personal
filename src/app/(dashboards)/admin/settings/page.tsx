"use client";

import { useState } from "react";
import Dropdown from "../common/dropdown";
import Button from "../common/button";
import { useUser } from "@/contexts/UserContext";

interface NotificationCardProps {
  label: string;
  description: string;
  isEnabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function NotificationCard({
  label,
  description,
  isEnabled,
  onToggle,
  disabled = false,
}: NotificationCardProps) {
  return (
    <div className="bg-zinc-50 rounded-lg p-4 flex items-center justify-between">
      <div className="flex-1">
        <h3 className="text-sm font-medium text-secondary mb-1">{label}</h3>
        <p className="text-xs text-gray">{description}</p>
      </div>
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ml-4 ${
          isEnabled ? "bg-black" : "bg-zinc-400"
        } ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isEnabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { profile } = useUser();
  const [activeTab, setActiveTab] = useState<"generals" | "notifications">(
    "generals",
  );

  const [platformName, setPlatformName] = useState("CertifyPro");
  const [timeZone, setTimeZone] = useState("UTC");
  const [defaultLanguage, setDefaultLanguage] = useState("English");
  const [defaultCurrency, setDefaultCurrency] = useState("USD ($)");

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [assessmentSubmissions, setAssessmentSubmissions] = useState(true);
  const [aiFlags, setAiFlags] = useState(false);
  const [auditScheduling, setAuditScheduling] = useState(true);
  const [paymentEvents, setPaymentEvents] = useState(true);
  const [certificateEvents, setCertificateEvents] = useState(true);
  const [reminderFrequency, setReminderFrequency] = useState("UTC");

  const timeZoneOptions = [
    { value: "UTC", label: "UTC" },
    { value: "EST", label: "EST" },
    { value: "PST", label: "PST" },
    { value: "GMT", label: "GMT" },
  ];

  const languageOptions = [
    { value: "English", label: "English" },
    { value: "Spanish", label: "Spanish" },
    { value: "French", label: "French" },
    { value: "German", label: "German" },
  ];

  const currencyOptions = [
    { value: "USD ($)", label: "USD ($)" },
    { value: "EUR (€)", label: "EUR (€)" },
    { value: "GBP (£)", label: "GBP (£)" },
    { value: "JPY (¥)", label: "JPY (¥)" },
  ];

  const reminderFrequencyOptions = [
    { value: "UTC", label: "UTC" },
    { value: "Daily", label: "Daily" },
    { value: "Weekly", label: "Weekly" },
    { value: "Monthly", label: "Monthly" },
  ];
  const isSubadmin = profile?.role === "subadmin";
  const permissions = Array.isArray(profile?.permissions)
    ? (profile.permissions as Array<
        string | { resource?: string; action?: string[] }
      >)
    : [];
  const hasActionPermission = (
    resources: string[],
    action: "read" | "write" | "edit" | "delete",
  ) => {
    if (!isSubadmin) return true;
    if (!permissions.length) return false;
    return permissions.some((permission) => {
      if (typeof permission === "string") {
        return action === "read" && resources.includes(permission);
      }
      const actions = Array.isArray(permission.action) ? permission.action : [];
      return (
        resources.includes(permission.resource ?? "") && actions.includes(action)
      );
    });
  };
  const canWrite = hasActionPermission(["setting", "settings"], "write");
  const canEdit = hasActionPermission(["setting", "settings"], "edit");
  const canManageSettings = canWrite || canEdit;

  return (
    <div className="p-3 md:p-6 bg-light-gray min-h-screen">
      <div className="mb-4 md:mb-6">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary mb-1 md:mb-2 leading-[21.6px] align-middle">
            Settings
          </h1>
          <p className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px] align-middle">
            Configure your platform settings and preferences
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-2 md:p-3 inline-flex gap-1.5 mb-3 md:mb-4">
        <button
          onClick={() => setActiveTab("generals")}
          className={`px-7 py-1.5 md:px-10 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors ${
            activeTab === "generals"
              ? "bg-black text-white shadow-lg"
              : "bg-white text-secondary hover:bg-primary"
          }`}
          style={
            activeTab === "generals"
              ? {
                  boxShadow:
                    "0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)",
                }
              : undefined
          }
        >
          General
        </button>
        <button
          onClick={() => setActiveTab("notifications")}
          className={`px-7 py-1.5 md:px-10 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors ${
            activeTab === "notifications"
              ? "bg-black text-white shadow-lg"
              : "bg-white text-secondary hover:bg-primary"
          }`}
          style={
            activeTab === "notifications"
              ? {
                  boxShadow:
                    "0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)",
                }
              : undefined
          }
        >
          Notification
        </button>
      </div>

      {activeTab === "generals" && (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-secondary mb-6">
            General Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            <div className="space-y-4 md:space-y-6">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Platform Name
                </label>
                <input
                  type="text"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  disabled={!canManageSettings}
                  className={`w-full px-4 py-3 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 text-gray text-sm font-normal ${
                    !canManageSettings ? "bg-gray-50 cursor-not-allowed" : ""
                  }`}
                />
              </div>

              <div>
                <Dropdown
                  label="Time Zone"
                  options={timeZoneOptions}
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  disabled={!canManageSettings}
                />
              </div>
            </div>

            <div className="space-y-4 md:space-y-6">
              <div>
                <Dropdown
                  label="Default Language"
                  options={languageOptions}
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value)}
                  disabled={!canManageSettings}
                />
              </div>

              <div>
                <Dropdown
                  label="Default Currency"
                  options={currencyOptions}
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                  disabled={!canManageSettings}
                />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-secondary mb-2">
              Logo
            </label>
            <div
              className={`border-2 border-dashed border-zinc-300 rounded-lg p-8 md:p-12 flex flex-col items-center justify-center transition-colors ${
                canManageSettings
                  ? "cursor-pointer hover:border-zinc-400"
                  : "cursor-not-allowed opacity-70"
              }`}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="mb-4"
              >
                <path
                  d="M5.33337 22.6663V25.333C5.33337 26.0403 5.61433 26.7185 6.11442 27.2186C6.61452 27.7187 7.2928 27.9997 8.00004 27.9997H24C24.7073 27.9997 25.3856 27.7187 25.8857 27.2186C26.3858 26.7185 26.6667 26.0403 26.6667 25.333V22.6663M9.33337 11.9997L16 5.33301M16 5.33301L22.6667 11.9997M16 5.33301V21.333"
                  stroke="#999999"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-sm font-medium text-secondary mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray">
                PDF, DOC, DOCX, XLS, XLSX (max 10MB)
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="primary"
              className={`text-white ${
                !canManageSettings ? "opacity-60 cursor-not-allowed" : ""
              }`}
              disabled={!canManageSettings}
            >
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-secondary mb-6">
            General Settings
          </h2>

          <div className="mb-6">
            <h3 className="text-base font-semibold text-secondary mb-4">
              Notification Channels
            </h3>
            <div className="space-y-3">
              <NotificationCard
                label="Email Notifications"
                description="Receive notifications via email"
                isEnabled={emailNotifications}
                onToggle={() => setEmailNotifications(!emailNotifications)}
                disabled={!canManageSettings}
              />
              <NotificationCard
                label="In-App Notifications"
                description="Show notifications within the platform"
                isEnabled={inAppNotifications}
                onToggle={() => setInAppNotifications(!inAppNotifications)}
                disabled={!canManageSettings}
              />
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-base font-semibold text-secondary mb-4">
              Notification Types
            </h3>
            <div className="space-y-3">
              <NotificationCard
                label="Assessment Submissions"
                description="When a new assessment is submitted"
                isEnabled={assessmentSubmissions}
                onToggle={() =>
                  setAssessmentSubmissions(!assessmentSubmissions)
                }
                disabled={!canManageSettings}
              />
              <NotificationCard
                label="AI Flags"
                description="When AI detects discrepancies"
                isEnabled={aiFlags}
                onToggle={() => setAiFlags(!aiFlags)}
                disabled={!canManageSettings}
              />
              <NotificationCard
                label="Audit scheduling and results"
                description="Audit scheduling and results"
                isEnabled={auditScheduling}
                onToggle={() => setAuditScheduling(!auditScheduling)}
                disabled={!canManageSettings}
              />
              <NotificationCard
                label="Payment Events"
                description="Payment confirmations and refunds"
                isEnabled={paymentEvents}
                onToggle={() => setPaymentEvents(!paymentEvents)}
                disabled={!canManageSettings}
              />
              <NotificationCard
                label="Certificate Events"
                description="Issuance, renewal, and expiry"
                isEnabled={certificateEvents}
                onToggle={() => setCertificateEvents(!certificateEvents)}
                disabled={!canManageSettings}
              />
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-base font-semibold text-secondary mb-4">
              Reminder Frequency
            </h3>
            <div className="w-fit ">
              <Dropdown
                options={reminderFrequencyOptions}
                value={reminderFrequency}
                onChange={(e) => setReminderFrequency(e.target.value)}
                disabled={!canManageSettings}
              />
              <p className="text-xs text-gray mt-2">
                How often to send reminder notifications for pending actions
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="primary"
              className={`text-white ${
                !canManageSettings ? "opacity-60 cursor-not-allowed" : ""
              }`}
              disabled={!canManageSettings}
            >
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
