"use client";

import { useState, useRef, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import Button from "@/app/(dashboards)/admin/common/button";
import { Loading } from "@/app/(dashboards)/admin/common/Loading";
import { axiosInstance } from "@/lib/axios";
import { useUser } from "@/contexts/UserContext";

interface NotificationCardProps {
  label: string;
  description: string;
  isEnabled: boolean;
  onToggle: () => void;
}

type AccountModalType = "profile" | "email" | "password" | null;

function NotificationCard({
  label,
  description,
  isEnabled,
  onToggle,
}: NotificationCardProps) {
  return (
    <div className="bg-zinc-50 rounded-lg p-4 flex items-center justify-between">
      <div className="flex-1">
        <h3 className="text-sm font-medium text-secondary mb-1">{label}</h3>
        <p className="text-xs text-gray">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ml-4 ${isEnabled ? "bg-black" : "bg-zinc-400"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<"account" | "notification">(
    "account",
  );
  const { profile, fetchProfile, setProfile } = useUser();

  const [newAuditAssigned, setNewAuditAssigned] = useState(true);
  const [auditDeadlineReminder, setAuditDeadlineReminder] = useState(true);
  const [reviewSubmissionAlerts, setReviewSubmissionAlerts] = useState(true);
  const [systemAnnouncements, setSystemAnnouncements] = useState(false);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showProfileLoader, setShowProfileLoader] = useState(false);
  const [profileLoadingProgress, setProfileLoadingProgress] = useState(0);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState("");
  const [originalValues, setOriginalValues] = useState<{
    firstName: string;
    lastName: string;
    expertiseTags: string[];
    profilePicturePreview: string;
  } | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] =
    useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileLoaderIntervalRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const profileLoaderFinishTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const [expertiseTags, setExpertiseTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [activeAccountModal, setActiveAccountModal] =
    useState<AccountModalType>(null);

  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState(["", "", "", "", "", ""]);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccessMessage, setEmailSuccessMessage] = useState("");
  const emailOtpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordOtp, setPasswordOtp] = useState(["", "", "", "", "", ""]);
  const [isSendingPasswordOtp, setIsSendingPasswordOtp] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState("");
  const [passwordOtpSecondsLeft, setPasswordOtpSecondsLeft] = useState(0);
  const passwordOtpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const getInitials = (first: string, last: string): string => {
    const firstInitial = first?.charAt(0).toUpperCase() || "";
    const lastInitial = last?.charAt(0).toUpperCase() || "";
    return firstInitial + lastInitial;
  };

  const handleProfilePictureChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (profileLoaderIntervalRef.current) {
      clearInterval(profileLoaderIntervalRef.current);
      profileLoaderIntervalRef.current = null;
    }
    if (profileLoaderFinishTimeoutRef.current) {
      clearTimeout(profileLoaderFinishTimeoutRef.current);
      profileLoaderFinishTimeoutRef.current = null;
    }

    if (isSavingProfile) {
      setShowProfileLoader(true);
      setProfileLoadingProgress(0);
      profileLoaderIntervalRef.current = setInterval(() => {
        setProfileLoadingProgress((prev) => {
          if (prev >= 95) return prev;
          const step = Math.max(1, Math.round((95 - prev) / 8));
          return Math.min(prev + step, 95);
        });
      }, 120);
      return;
    }

    if (showProfileLoader) {
      setProfileLoadingProgress(100);
      profileLoaderFinishTimeoutRef.current = setTimeout(() => {
        setShowProfileLoader(false);
        setProfileLoadingProgress(0);
      }, 300);
    }
  }, [isSavingProfile, showProfileLoader]);

  const handleEditClick = () => {
    setOriginalValues({
      firstName,
      lastName,
      expertiseTags: [...expertiseTags],
      profilePicturePreview,
    });
    setIsEditingProfile(true);
  };

  const handleCancel = () => {
    if (originalValues) {
      setFirstName(originalValues.firstName);
      setLastName(originalValues.lastName);
      setExpertiseTags([...originalValues.expertiseTags]);
      setProfilePicturePreview(originalValues.profilePicturePreview);
      setProfilePicture(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
    setNewTag("");
    setIsEditingProfile(false);
    setOriginalValues(null);
    setProfileSuccessMessage("");
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);

    const response = await axiosInstance.post<{
      message?: string;
      url: string;
      type: string;
    }>("/uploads/images", formData);

    if (!response.data?.url) {
      throw new Error("Failed to get image URL from upload response");
    }

    return response.data.url;
  };

  const hasProfileChanges = (): boolean => {
    if (!originalValues) return false;
    const tagsChanged =
      [...expertiseTags].sort().join(",") !==
      [...originalValues.expertiseTags].sort().join(",");
    return (
      firstName.trim() !== originalValues.firstName.trim() ||
      lastName.trim() !== originalValues.lastName.trim() ||
      tagsChanged ||
      profilePicture !== null
    );
  };

  const handleSaveChanges = async () => {
    if (!originalValues) {
      return;
    }

    if (!hasProfileChanges()) {
      alert("No changes detected");
      return;
    }

    setIsSavingProfile(true);
    try {
      let profilePictureUrl = originalValues.profilePicturePreview;

      if (profilePicture) {
        profilePictureUrl = await uploadImage(profilePicture);
      }

      const currentValues = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        tags: expertiseTags.map((tag) => tag.trim()).filter(Boolean),
      };

      const payload: Record<string, unknown> = {};

      if (currentValues.firstName !== originalValues.firstName.trim()) {
        payload.first_name = currentValues.firstName;
      }

      if (currentValues.lastName !== originalValues.lastName.trim()) {
        payload.last_name = currentValues.lastName;
      }

      const originalTagsSorted = [...originalValues.expertiseTags]
        .sort()
        .join(",");
      const currentTagsSorted = [...currentValues.tags].sort().join(",");
      if (originalTagsSorted !== currentTagsSorted) {
        payload.tags = currentValues.tags;
      }

      if (profilePictureUrl !== originalValues.profilePicturePreview) {
        payload.profile_picture_url = profilePictureUrl;
      }

      if (Object.keys(payload).length > 0) {
        const endpoint = profile?.id
          ? `/reviewers/profile?reviewerId=${profile.id}`
          : "/reviewers/profile";
        await axiosInstance.patch(endpoint, payload);

        if (profile) {
          setProfile({
            ...profile,
            first_name: currentValues.firstName,
            last_name: currentValues.lastName,
            tags: currentValues.tags,
            profile_picture: profilePictureUrl || null,
          });
        }

        setOriginalValues({
          firstName: currentValues.firstName,
          lastName: currentValues.lastName,
          expertiseTags: currentValues.tags,
          profilePicturePreview: profilePictureUrl,
        });

        setProfilePicture(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        await fetchProfile();
        setProfileSuccessMessage("Profile update successfully");
        setTimeout(() => {
          setProfileSuccessMessage("");
        }, 1500);
      }

      setIsEditingProfile(false);
    } catch (error: unknown) {
      console.error("Failed to update profile:", error);
      const errorMessage =
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data &&
        typeof (error.response.data as { message: unknown }).message ===
          "string"
          ? (error.response.data as { message: string }).message
          : "Failed to update profile. Please try again.";
      alert(errorMessage);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const formatOtpTimer = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    const padded = remaining.toString().padStart(2, "0");
    return `${minutes}:${padded}`;
  };

  const validatePasswordInputs = (): boolean => {
    if (!currentPassword.trim()) {
      setPasswordError("Current password is required");
      return false;
    }
    if (!newPasswordValue.trim()) {
      setPasswordError("New password is required");
      return false;
    }
    if (newPasswordValue !== confirmPassword) {
      setPasswordError("New password and confirm password must match");
      return false;
    }
    return true;
  };

  const handleRequestEmailOtp = async () => {
    const currentEmail = profile?.email || email;
    if (!currentEmail?.trim()) {
      setEmailError("Current email is not available");
      return;
    }

    setIsSendingEmailOtp(true);
    setEmailError("");
    try {
      await axiosInstance.post("/auth/send-otp", {
        email: currentEmail.trim(),
        purpose: "email_verification",
      });

      setEmailOtp(["", "", "", "", "", ""]);
      setIsChangingEmail(true);
    } catch (error: unknown) {
      console.error("Failed to send OTP:", error);
      const errorMessage =
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data &&
        typeof (error.response.data as { message: unknown }).message ===
          "string"
          ? (error.response.data as { message: string }).message
          : "Failed to send OTP. Please try again.";
      setEmailError(errorMessage);
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  const handleEmailChange = async () => {
    if (!newEmail.trim()) {
      setEmailError("New email is required");
      return;
    }
    if (emailOtp.some((digit) => !digit.trim())) {
      setEmailError("OTP is required");
      return;
    }

    if (!newEmail.includes("@")) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setIsSavingEmail(true);
    setEmailError("");
    try {
      await axiosInstance.patch("/reviewers/email", {
        email: newEmail.trim(),
        otp: emailOtp.join(""),
      });

      setEmail(newEmail.trim());
      if (profile) {
        setProfile({
          ...profile,
          email: newEmail.trim(),
        });
      }

      setNewEmail("");
      setEmailOtp(["", "", "", "", "", ""]);
      setIsChangingEmail(false);

      await fetchProfile();
      setEmailSuccessMessage("Successfully email change");
      setTimeout(() => {
        setEmailSuccessMessage("");
      }, 1500);
    } catch (error: unknown) {
      console.error("Failed to update email:", error);
      const errorMessage =
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data &&
        typeof (error.response.data as { message: unknown }).message ===
          "string"
          ? (error.response.data as { message: string }).message
          : "Failed to update email. Please try again.";
      setEmailError(errorMessage);
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleCancelEmailChange = () => {
    setNewEmail("");
    setEmailOtp(["", "", "", "", "", ""]);
    setEmailError("");
    setEmailSuccessMessage("");
    setIsChangingEmail(false);
  };

  const handleRequestPasswordOtp = async () => {
    const currentEmail = profile?.email || email;
    if (!currentEmail?.trim()) {
      setPasswordError("Current email is not available");
      return;
    }

    setIsSendingPasswordOtp(true);
    setPasswordError("");
    try {
      await axiosInstance.post("/auth/send-otp", {
        email: currentEmail.trim(),
        purpose: "password_reset",
      });

      setPasswordOtp(["", "", "", "", "", ""]);
      setPasswordOtpSecondsLeft(60);
      setIsChangingPassword(true);
    } catch (error: unknown) {
      console.error("Failed to send OTP:", error);
      const errorMessage =
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data &&
        typeof (error.response.data as { message: unknown }).message ===
          "string"
          ? (error.response.data as { message: string }).message
          : "Failed to send OTP. Please try again.";
      setPasswordError(errorMessage);
    } finally {
      setIsSendingPasswordOtp(false);
    }
  };

  const handleResendPasswordOtp = async () => {
    const currentEmail = profile?.email || email;
    if (!currentEmail?.trim()) {
      setPasswordError("Current email is not available");
      return;
    }

    setIsSendingPasswordOtp(true);
    setPasswordError("");
    try {
      await axiosInstance.post("/auth/send-otp", {
        email: currentEmail.trim(),
        purpose: "email_verification",
      });

      setPasswordOtp(["", "", "", "", "", ""]);
      setPasswordOtpSecondsLeft(60);
    } catch (error: unknown) {
      console.error("Failed to resend OTP:", error);
      const errorMessage =
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data &&
        typeof (error.response.data as { message: unknown }).message ===
          "string"
          ? (error.response.data as { message: string }).message
          : "Failed to resend OTP. Please try again.";
      setPasswordError(errorMessage);
    } finally {
      setIsSendingPasswordOtp(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!validatePasswordInputs()) {
      return;
    }
    if (passwordOtp.some((digit) => !digit.trim())) {
      setPasswordError("OTP is required");
      return;
    }

    setIsSavingPassword(true);
    setPasswordError("");
    try {
      await axiosInstance.patch("/reviewers/password", {
        oldPassword: currentPassword,
        newPassword: newPasswordValue,
        otp: passwordOtp.join(""),
      });

      setCurrentPassword("");
      setNewPasswordValue("");
      setConfirmPassword("");
      setPasswordOtp(["", "", "", "", "", ""]);
      setPasswordOtpSecondsLeft(0);
      setIsChangingPassword(false);

      setPasswordSuccessMessage("Password updated successfully");
      setTimeout(() => {
        setPasswordSuccessMessage("");
      }, 1500);
    } catch (error: unknown) {
      console.error("Failed to update password:", error);
      const rawMessage =
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data &&
        typeof (error.response.data as { message: unknown }).message ===
          "string"
          ? (error.response.data as { message: string }).message
          : "Failed to update password. Please try again.";

      const errorMessage =
        typeof rawMessage === "string" &&
        rawMessage.toLowerCase().includes("expired")
          ? "OTP expired. Please resend."
          : rawMessage;
      setPasswordError(errorMessage);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setPasswordError("");
    setPasswordSuccessMessage("");
    setPasswordOtp(["", "", "", "", "", ""]);
    setPasswordOtpSecondsLeft(0);
    setIsChangingPassword(false);
  };

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name || "");
    setLastName(profile.last_name || "");
    setEmail(profile.email || "");
    setProfilePicturePreview(profile.profile_picture || "");
    setExpertiseTags(profile.tags || []);
  }, [profile]);

  useEffect(() => {
    if (passwordOtpSecondsLeft <= 0) return;
    const timerId = window.setTimeout(() => {
      setPasswordOtpSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [passwordOtpSecondsLeft]);

  const openProfileModal = () => {
    handleEditClick();
    setActiveAccountModal("profile");
  };

  const openEmailModal = () => {
    setActiveAccountModal("email");
    if (!isChangingEmail && !isSendingEmailOtp) {
      void handleRequestEmailOtp();
    }
  };

  const openPasswordModal = () => {
    setActiveAccountModal("password");
    if (!isChangingPassword && !isSendingPasswordOtp) {
      void handleRequestPasswordOtp();
    }
  };

  const closeActiveAccountModal = () => {
    if (activeAccountModal === "profile") {
      handleCancel();
    }
    if (activeAccountModal === "email") {
      handleCancelEmailChange();
    }
    if (activeAccountModal === "password") {
      handleCancelPasswordChange();
    }
    setActiveAccountModal(null);
  };

  return (
    <div className="p-6 bg-light-gray min-h-screen">
      <div className="mb-8">
        <h1 className="text-[24px] font-semibold text-secondary mb-2 leading-[21.6px] align-middle">
          Reviewer Settings
        </h1>
        <p className="text-[15px] font-normal text-gray leading-[21.6px] align-middle">
          Manage your profile, security, and preferences
        </p>
      </div>

      <div className="bg-white rounded-xl p-2 md:p-3 inline-flex gap-1.5 mb-3 md:mb-4">
        <button
          onClick={() => setActiveTab("account")}
          className={`px-7 py-1.5 md:px-10 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors ${
            activeTab === "account"
              ? "bg-black text-white shadow-lg"
              : "bg-white text-secondary hover:bg-primary"
          }`}
          style={
            activeTab === "account"
              ? {
                  boxShadow:
                    "0px 3.91px 5.11px 0px rgba(142, 142, 142, 0.15), 0px 10.82px 14.12px 0px rgba(142, 142, 142, 0.22), 0px 26.06px 34px 0px rgba(142, 142, 142, 0.19), 0px 44.27px 112.79px 0px rgba(142, 142, 142, 0.34), inset 0px 1.05px 4.22px 2.11px rgba(142, 142, 142, 0.55), inset 0px 1.05px 18.97px 2.11px rgba(142, 142, 142, 0.55)",
                }
              : undefined
          }
        >
          Account Setting
        </button>
        <button
          onClick={() => setActiveTab("notification")}
          className={`px-7 py-1.5 md:px-10 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors ${
            activeTab === "notification"
              ? "bg-black text-white shadow-lg"
              : "bg-white text-secondary hover:bg-primary"
          }`}
          style={
            activeTab === "notification"
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

      {activeTab === "account" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-zinc-100 p-5">
              <h3 className="text-base font-semibold text-secondary">
                Profile Information
              </h3>
              <p className="text-sm text-gray mt-2">
                Update your personal details, expertise, and profile photo.
              </p>
              <div className="mt-5">
                <Button variant="primary" onClick={openProfileModal}>
                  Update Profile
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-zinc-100 p-5">
              <h3 className="text-base font-semibold text-secondary">
                Change Email
              </h3>
              <p className="text-sm text-gray mt-2">
                Change your email with OTP verification sent to current email.
              </p>
              <div className="mt-5">
                <Button variant="primary" onClick={openEmailModal}>
                  Change Email
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-zinc-100 p-5">
              <h3 className="text-base font-semibold text-secondary">
                Change Password
              </h3>
              <p className="text-sm text-gray mt-2">
                Update password securely using OTP verification.
              </p>
              <div className="mt-5">
                <Button variant="primary" onClick={openPasswordModal}>
                  Change Password
                </Button>
              </div>
            </div>
          </div>

          {activeAccountModal === "profile" && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={closeActiveAccountModal}
              />
              <div className="relative w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto">
                <button
                  className="absolute top-4 right-4 z-20"
                  onClick={closeActiveAccountModal}
                >
                  <img
                    src="/assets/imgs/admin/commons/cross.svg"
                    alt="close"
                    className="w-5 h-5"
                  />
                </button>

                <div className="bg-white rounded-xl border border-zinc-100 p-6 relative">
                  {(showProfileLoader || profileSuccessMessage) && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
                      <Loading
                        isLoading
                        size="sm"
                        progress={showProfileLoader ? profileLoadingProgress : 100}
                        className="p-4"
                      />
                    </div>
                  )}
                  <div
                    className={
                      showProfileLoader || profileSuccessMessage
                        ? "blur-sm pointer-events-none"
                        : ""
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-secondary">
                          Profile Information
                        </h3>
                      </div>
                    </div>

                    <div className="mt-6">
                      <label className="block text-xs font-medium text-dull-gray mb-2">
                        Profile Picture
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-zinc-200 flex items-center justify-center shrink-0 overflow-hidden">
                          {profilePicturePreview ? (
                            <img
                              src={profilePicturePreview}
                              alt="Profile preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-semibold text-zinc-600">
                              {getInitials(firstName, lastName) || "PP"}
                            </span>
                          )}
                        </div>
                        <div>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleProfilePictureChange}
                            accept="image/*"
                            className="hidden"
                          />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!isEditingProfile}
                            className={`px-4 py-2 text-sm font-medium text-secondary border border-zinc-200 rounded-lg transition-colors ${
                              isEditingProfile
                                ? "hover:bg-zinc-50 cursor-pointer"
                                : "opacity-50 cursor-not-allowed"
                            }`}
                          >
                            Upload Photo
                          </button>
                          {profilePicture && (
                            <button
                              onClick={() => {
                                setProfilePicture(null);
                                setProfilePicturePreview("");
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = "";
                                }
                              }}
                              disabled={!isEditingProfile}
                              className={`ml-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg transition-colors ${
                                isEditingProfile
                                  ? "hover:bg-red-50 cursor-pointer"
                                  : "opacity-50 cursor-not-allowed"
                              }`}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-medium text-dull-gray mb-2">
                          First Name
                        </label>
                        <input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          disabled={!isEditingProfile}
                          className={`w-full p-3 rounded-md text-sm border ${
                            !isEditingProfile ? "bg-zinc-50 cursor-not-allowed" : ""
                          }`}
                          style={{ borderColor: "#E6E6E6" }}
                          placeholder="Sarah"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-dull-gray mb-2">
                          Last Name
                        </label>
                        <input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          disabled={!isEditingProfile}
                          className={`w-full p-3 rounded-md text-sm border ${
                            !isEditingProfile ? "bg-zinc-50 cursor-not-allowed" : ""
                          }`}
                          style={{ borderColor: "#E6E6E6" }}
                          placeholder="Mitchell"
                        />
                      </div>
                    </div>

                    <div className="mt-6">
                      <label className="block text-xs font-medium text-dull-gray mb-2">
                        Expertise Tags
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {expertiseTags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 rounded-full text-sm text-secondary"
                          >
                            <span>{tag}</span>
                            {isEditingProfile && (
                              <button
                                onClick={() =>
                                  setExpertiseTags(
                                    expertiseTags.filter((_, i) => i !== index),
                                  )
                                }
                                className="hover:bg-zinc-200 rounded-full p-0.5 transition-colors"
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 12 12"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M9 3L3 9M3 3L9 9"
                                    stroke="#262626"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                      {isEditingProfile && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === "Enter" && newTag.trim()) {
                                e.preventDefault();
                                setExpertiseTags([...expertiseTags, newTag.trim()]);
                                setNewTag("");
                              }
                            }}
                            placeholder="Add expertise tag"
                            className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-secondary placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:border-transparent"
                            style={{ borderColor: "#E6E6E6" }}
                          />
                          <button
                            onClick={() => {
                              if (newTag.trim()) {
                                setExpertiseTags([...expertiseTags, newTag.trim()]);
                                setNewTag("");
                              }
                            }}
                            className="px-4 py-2.5 bg-zinc-100 text-secondary rounded-lg hover:bg-zinc-200 transition-colors text-sm font-medium"
                          >
                            Add
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      {isEditingProfile ? (
                        <>
                          <button
                            onClick={closeActiveAccountModal}
                            className="px-4 py-2 text-sm font-medium text-secondary border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <Button
                            variant="primary"
                            onClick={handleSaveChanges}
                            disabled={isSavingProfile}
                          >
                            {isSavingProfile ? "Saving..." : "Save Changes"}
                          </Button>
                        </>
                      ) : (
                        <Button variant="primary" onClick={handleEditClick}>
                          Update Profile
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeAccountModal === "email" && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={closeActiveAccountModal}
              />
              <div className="relative w-[95%] max-w-2xl max-h-[90vh] overflow-y-auto">
                <button
                  className="absolute top-4 right-4 z-20"
                  onClick={closeActiveAccountModal}
                >
                  <img
                    src="/assets/imgs/admin/commons/cross.svg"
                    alt="close"
                    className="w-5 h-5"
                  />
                </button>

                <div className="bg-white rounded-xl border border-zinc-100 p-6 relative">
                  {(isSendingEmailOtp || isSavingEmail || emailSuccessMessage) && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
                      <Loading isLoading size="sm" className="p-4" />
                    </div>
                  )}
                  <div
                    className={
                      isSendingEmailOtp || isSavingEmail || emailSuccessMessage
                        ? "blur-sm pointer-events-none"
                        : ""
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-secondary">
                          Email Address
                        </h3>
                        <p className="text-xs text-gray mt-1">
                          Change your email address
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <label className="block text-xs font-medium text-dull-gray mb-2">
                        Current Email
                      </label>
                      <input
                        value={email}
                        disabled
                        className="w-full p-3 rounded-md text-sm border bg-zinc-50 cursor-not-allowed"
                        style={{ borderColor: "#E6E6E6" }}
                      />
                    </div>

                    {!isChangingEmail ? (
                      <div className="mt-6 flex justify-end">
                        <Button variant="primary" onClick={handleRequestEmailOtp}>
                          Change Email
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="mt-6">
                          <label className="block text-xs font-medium text-dull-gray mb-2">
                            New Email Address
                          </label>
                          <input
                            value={newEmail}
                            onChange={(e) => {
                              setNewEmail(e.target.value);
                              setEmailError("");
                            }}
                            type="email"
                            className={`w-full p-3 rounded-md text-sm border ${
                              emailError ? "border-red" : ""
                            }`}
                            style={{
                              borderColor: emailError ? "#ef4444" : "#E6E6E6",
                            }}
                            placeholder="Enter new email address"
                          />
                        </div>

                        <div className="mt-4">
                          <p className="text-xs text-gray">
                            We sent an OTP email to your old email. Enter the
                            6-digit code below.
                          </p>
                          <div className="mt-3 flex gap-2">
                            {emailOtp.map((digit, index) => (
                              <input
                                key={index}
                                ref={(el) => {
                                  emailOtpRefs.current[index] = el;
                                }}
                                value={digit}
                                onChange={(e) => {
                                  const value = e.target.value.slice(-1);
                                  setEmailOtp((prev) => {
                                    const next = [...prev];
                                    next[index] = value;
                                    return next;
                                  });
                                  setEmailError("");
                                  if (value && index < emailOtp.length - 1) {
                                    emailOtpRefs.current[index + 1]?.focus();
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "Backspace" &&
                                    !emailOtp[index] &&
                                    index > 0
                                  ) {
                                    emailOtpRefs.current[index - 1]?.focus();
                                  }
                                }}
                                inputMode="text"
                                maxLength={1}
                                className={`w-10 h-10 text-center rounded-md text-sm border ${
                                  emailError ? "border-red" : ""
                                }`}
                                style={{
                                  borderColor: emailError ? "#ef4444" : "#E6E6E6",
                                }}
                                aria-label={`OTP digit ${index + 1}`}
                              />
                            ))}
                          </div>
                        </div>

                        {emailError && (
                          <p className="text-xs text-red mt-2">{emailError}</p>
                        )}

                        <div className="mt-6 flex justify-end gap-3">
                          <button
                            onClick={closeActiveAccountModal}
                            disabled={isSavingEmail}
                            className="px-4 py-2 text-sm font-medium text-secondary border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                          <Button
                            variant="primary"
                            onClick={handleEmailChange}
                            disabled={
                              isSavingEmail ||
                              !newEmail.trim() ||
                              emailOtp.some((digit) => !digit.trim())
                            }
                          >
                            {isSavingEmail ? "Updating..." : "Update Email"}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeAccountModal === "password" && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={closeActiveAccountModal}
              />
              <div className="relative w-[95%] max-w-3xl max-h-[90vh] overflow-y-auto">
                <button
                  className="absolute top-4 right-4 z-20"
                  onClick={closeActiveAccountModal}
                >
                  <img
                    src="/assets/imgs/admin/commons/cross.svg"
                    alt="close"
                    className="w-5 h-5"
                  />
                </button>

                <div className="bg-white rounded-xl border border-zinc-100 p-6 relative">
                  {(isSendingPasswordOtp ||
                    isSavingPassword ||
                    passwordSuccessMessage) && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
                      <Loading isLoading size="sm" className="p-4" />
                    </div>
                  )}
                  <div
                    className={
                      isSendingPasswordOtp ||
                      isSavingPassword ||
                      passwordSuccessMessage
                        ? "blur-sm pointer-events-none"
                        : ""
                    }
                  >
                    <h3 className="text-lg font-medium text-secondary">
                      Security Settings
                    </h3>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-medium text-dull-gray mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            value={currentPassword}
                            onChange={(e) => {
                              setCurrentPassword(e.target.value);
                              setPasswordError("");
                            }}
                            disabled={!isChangingPassword}
                            className="w-full p-3 pr-10 rounded-md text-sm border"
                            style={{ borderColor: "#E6E6E6" }}
                            placeholder="Enter current password"
                            type={showCurrentPassword ? "text" : "password"}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword((prev) => !prev)}
                            disabled={!isChangingPassword}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray disabled:opacity-50"
                            aria-label={
                              showCurrentPassword ? "Hide password" : "Show password"
                            }
                          >
                            {showCurrentPassword ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-dull-gray mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            value={newPasswordValue}
                            onChange={(e) => {
                              setNewPasswordValue(e.target.value);
                              setPasswordError("");
                            }}
                            disabled={!isChangingPassword}
                            className="w-full p-3 pr-10 rounded-md text-sm border"
                            style={{ borderColor: "#E6E6E6" }}
                            placeholder="Enter new password"
                            type={showNewPassword ? "text" : "password"}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            disabled={!isChangingPassword}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray disabled:opacity-50"
                            aria-label={
                              showNewPassword ? "Hide password" : "Show password"
                            }
                          >
                            {showNewPassword ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <label className="block text-xs font-medium text-dull-gray mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setPasswordError("");
                          }}
                          disabled={!isChangingPassword}
                          className="w-full p-3 pr-10 rounded-md text-sm border"
                          style={{ borderColor: "#E6E6E6" }}
                          placeholder="Confirm new password"
                          type={showConfirmPassword ? "text" : "password"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          disabled={!isChangingPassword}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray disabled:opacity-50"
                          aria-label={
                            showConfirmPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    {isChangingPassword && (
                      <div className="mt-4">
                        <p className="text-xs text-gray">
                          We sent an OTP email to your current email. Enter the
                          6-digit code below.
                        </p>
                        <div className="mt-3 flex gap-2">
                          {passwordOtp.map((digit, index) => (
                            <input
                              key={index}
                              ref={(el) => {
                                passwordOtpRefs.current[index] = el;
                              }}
                              value={digit}
                              onChange={(e) => {
                                const value = e.target.value.slice(-1);
                                setPasswordOtp((prev) => {
                                  const next = [...prev];
                                  next[index] = value;
                                  return next;
                                });
                                setPasswordError("");
                                if (value && index < passwordOtp.length - 1) {
                                  passwordOtpRefs.current[index + 1]?.focus();
                                }
                              }}
                              onKeyDown={(e) => {
                                if (
                                  e.key === "Backspace" &&
                                  !passwordOtp[index] &&
                                  index > 0
                                ) {
                                  passwordOtpRefs.current[index - 1]?.focus();
                                }
                              }}
                              inputMode="text"
                              maxLength={1}
                              className={`w-10 h-10 text-center rounded-md text-sm border ${
                                passwordError ? "border-red" : ""
                              }`}
                              style={{
                                borderColor: passwordError ? "#ef4444" : "#E6E6E6",
                              }}
                              aria-label={`Password OTP digit ${index + 1}`}
                            />
                          ))}
                        </div>
                        <div className="mt-2 text-xs text-gray">
                          {passwordOtpSecondsLeft > 0 ? (
                            <span>
                              Resend OTP in {formatOtpTimer(passwordOtpSecondsLeft)}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleResendPasswordOtp}
                              disabled={isSendingPasswordOtp}
                              className="text-secondary underline disabled:opacity-50"
                            >
                              Resend OTP
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {passwordError && (
                      <p className="text-xs text-red mt-2">{passwordError}</p>
                    )}

                    <div className="mt-6 flex justify-end gap-3">
                      {isChangingPassword ? (
                        <>
                          <button
                            onClick={closeActiveAccountModal}
                            disabled={isSavingPassword}
                            className="px-4 py-2 text-sm font-medium text-secondary border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                          <Button
                            variant="primary"
                            onClick={handlePasswordChange}
                            disabled={isSavingPassword}
                          >
                            {isSavingPassword ? "Updating..." : "Update Password"}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="primary"
                          onClick={handleRequestPasswordOtp}
                          disabled={isSendingPasswordOtp}
                        >
                          {isSendingPasswordOtp ? "Sending..." : "Update Password"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "notification" && (
        <div className="bg-white rounded-xl border border-zinc-100 p-6">
          <h3 className="text-lg font-medium text-secondary">
            Notification Preferences
          </h3>
          <div className="mt-6 space-y-3">
            <NotificationCard
              label="New review assigned"
              description="Get notified when a new review is assigned to you"
              isEnabled={newAuditAssigned}
              onToggle={() => setNewAuditAssigned(!newAuditAssigned)}
            />
            <NotificationCard
              label="Review deadline reminder"
              description="Receive reminders before review deadlines"
              isEnabled={auditDeadlineReminder}
              onToggle={() => setAuditDeadlineReminder(!auditDeadlineReminder)}
            />
            <NotificationCard
              label="System announcements"
              description="Receive platform updates and announcements"
              isEnabled={systemAnnouncements}
              onToggle={() => setSystemAnnouncements(!systemAnnouncements)}
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="primary">Save Notification Settings</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-zinc-100 p-6 mt-6">
        <h3 className="text-lg font-medium text-secondary">
          Session &amp; Access
        </h3>

        <div className="mt-4">
          <div className="bg-[#f2fff7] rounded-md border border-green-200 p-4 flex items-center justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-md bg-white flex items-center justify-center">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5 4C4.20435 4 3.44129 4.31607 2.87868 4.87868C2.31607 5.44129 2 6.20435 2 7V24H30V7C30 6.20435 29.6839 5.44129 29.1213 4.87868C28.5587 4.31607 27.7956 4 27 4H5ZM0 25H32C32 25.7956 31.6839 26.5587 31.1213 27.1213C30.5587 27.6839 29.7956 28 29 28H3C2.20435 28 1.44129 27.6839 0.87868 27.1213C0.31607 26.5587 0 25.7956 0 25Z"
                    fill="#262626"
                  />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-secondary">
                  Dr. Sarah Mitchell
                </div>
                <div className="text-xs text-gray font-text mt-2">
                  Chrome on macOS • London, UK
                </div>
                <div className="text-xs text-gray font-text mt-1">
                  Last active: Just now
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <span className="inline-flex items-center px-10 py-1 rounded-md text-sm font-medium bg-green-50 text-green-600 border border-green-600">
                Active
              </span>
            </div>
          </div>

          <p className="text-xs text-gray mt-4">
            Log out from all other devices where you&apos;re currently signed
            in.
          </p>

          <div className="mt-4">
            <Button variant="secondary">Log out from all sessions</Button>
          </div>
        </div>
      </div>

      {/* <div className="bg-white rounded-xl border border-zinc-100 p-6 mt-6 space-y-3">
        <h3 className="text-lg font-medium text-secondary">Your Permissions</h3>
        <p className="text-xs text-gray">
          As an reviewer, you can review assessments, verify evidence, and
          submit audits. System rules and certification decisions are managed by
          Admin.
        </p>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center text-green-600">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16.6666 1.6665H3.33329C2.41663 1.6665 1.66663 2.4165 1.66663 3.33317V18.3332L4.99996 14.9998H16.6666C17.5833 14.9998 18.3333 14.2498 18.3333 13.3332V3.33317C18.3333 2.4165 17.5833 1.6665 16.6666 1.6665ZM4.99996 11.6665V9.60817L10.7333 3.87484C10.9 3.70817 11.1583 3.70817 11.325 3.87484L12.8 5.34984C12.9666 5.5165 12.9666 5.77484 12.8 5.9415L7.05829 11.6665H4.99996ZM14.1666 11.6665H8.74996L10.4166 9.99984H14.1666C14.625 9.99984 15 10.3748 15 10.8332C15 11.2915 14.625 11.6665 14.1666 11.6665Z"
                  fill="#00B448"
                />
              </svg>
            </div>
            <div className="text-sm font-medium">Review assessments</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center text-green-600">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M8.55746 2.08333C8.55746 2.02808 8.53551 1.97509 8.49644 1.93602C8.45737 1.89695 8.40438 1.875 8.34912 1.875H2.51579C1.908 1.875 1.32511 2.11644 0.895335 2.54621C0.465564 2.97598 0.224121 3.55888 0.224121 4.16667V15.8333C0.224121 16.4411 0.465564 17.024 0.895335 17.4538C1.32511 17.8836 1.908 18.125 2.51579 18.125H10.8491C11.4569 18.125 12.0398 17.8836 12.4696 17.4538C12.8993 17.024 13.1408 16.4411 13.1408 15.8333V7.6225C13.1408 7.56725 13.1188 7.51426 13.0798 7.47519C13.0407 7.43612 12.9877 7.41417 12.9325 7.41417H9.18246C9.01669 7.41417 8.85772 7.34832 8.74051 7.23111C8.6233 7.1139 8.55746 6.95493 8.55746 6.78917V2.08333ZM9.18246 10.2083C9.34822 10.2083 9.50719 10.2742 9.6244 10.3914C9.74161 10.5086 9.80746 10.6676 9.80746 10.8333C9.80746 10.9991 9.74161 11.1581 9.6244 11.2753C9.50719 11.3925 9.34822 11.4583 9.18246 11.4583H4.18245C4.01669 11.4583 3.85772 11.3925 3.74051 11.2753C3.6233 11.1581 3.55745 10.9991 3.55745 10.8333C3.55745 10.6676 3.6233 10.5086 3.74051 10.3914C3.85772 10.2742 4.01669 10.2083 4.18245 10.2083H9.18246ZM9.18246 13.5417C9.34822 13.5417 9.50719 13.6075 9.6244 13.7247C9.74161 13.8419 9.80746 14.0009 9.80746 14.1667C9.80746 14.3324 9.74161 14.4914 9.6244 14.6086C9.50719 14.7258 9.34822 14.7917 9.18246 14.7917H4.18245C4.01669 14.7917 3.85772 14.7258 3.74051 14.6086C3.6233 14.4914 3.55745 14.3324 3.55745 14.1667C3.55745 14.0009 3.6233 13.8419 3.74051 13.7247C3.85772 13.6075 4.01669 13.5417 4.18245 13.5417H9.18246Z"
                  fill="#00B448"
                />
                <path
                  d="M9.80737 2.35322C9.80737 2.19988 9.96821 2.10238 10.0874 2.19822C10.1885 2.27988 10.2782 2.37488 10.3565 2.48322L12.8674 5.98072C12.924 6.06072 12.8624 6.16405 12.764 6.16405H10.0157C9.96045 6.16405 9.90746 6.1421 9.86839 6.10303C9.82932 6.06396 9.80737 6.01097 9.80737 5.95572V2.35322Z"
                  fill="#00B448"
                />
              </svg>
            </div>
            <div className="text-sm font-medium">Submit review</div>
          </div>
        </div>
      </div> */}
    </div>
  );
}
