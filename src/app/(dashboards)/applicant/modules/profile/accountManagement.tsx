"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFormik } from "formik";
import * as Yup from "yup";
import { ChevronRight, Mail, X, Check, ChevronLeft } from "lucide-react";
import axios from "axios";
import { Input, Button } from "@/components/ui";
import { axiosInstance } from "@/lib/axios";
import { persistOrganizationId } from "@/lib/auth-utils";
import {
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail as FiMailIcon,
  FiKey,
} from "react-icons/fi";

const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "bg-zinc-50 rounded-3xl border border-dull-white/50 shadow-sm p-6",
      className,
    )}
  >
    {children}
  </div>
);

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(" ");
}

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "default",
  contentClassName,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  size?: "default" | "large";
  contentClassName?: string;
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: "-45%", x: "-50%" }}
          animate={{ opacity: 1, scale: 1, y: "-50%", x: "-50%" }}
          exit={{ opacity: 0, scale: 0.95, y: "-45%", x: "-50%" }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
          className={cn(
            "fixed left-1/2 top-1/2 w-full bg-white rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-zinc-100 z-[110] overflow-hidden",
            size === "large" ? "max-w-xl" : "max-w-md",
            contentClassName,
          )}
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-secondary/5" />

          <div className={cn("space-y-6", size === "large" ? "p-10" : "p-8")}>
            <div className="flex justify-between items-center">
              {title && (
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-secondary tracking-tight">
                    {title}
                  </h3>
                </div>
              )}
              <button
                onClick={onClose}
                className="group p-2 hover:bg-zinc-50 rounded-2xl transition-all ml-auto focus:outline-none focus:ring-2 focus:ring-zinc-100"
              >
                <X className="w-5 h-5 text-gray group-hover:text-secondary" />
              </button>
            </div>
            {children}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

interface Activity {
  title: string;
  loc: string;
  date: string;
}

export function AccountManagementPage() {
  const [currentView, setCurrentView] = useState<"main" | "activity">("main");
  const [isNewEmailModalOpen, setIsNewEmailModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isProcessingUpdate, setIsProcessingUpdate] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const [activeAction, setActiveAction] = useState<"email" | "password" | null>(
    null,
  );
  const [passwordApiError, setPasswordApiError] = useState<string | null>(null);
  const [isForgotPromptOpen, setIsForgotPromptOpen] = useState(false);
  const [isForgotEmailModalOpen, setIsForgotEmailModalOpen] = useState(false);
  const [isForgotOtpModalOpen, setIsForgotOtpModalOpen] = useState(false);
  const [isForgotResetModalOpen, setIsForgotResetModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotOtpTimer, setForgotOtpTimer] = useState(0);
  const [isSendingForgotOtp, setIsSendingForgotOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [verifiedForgotOtp, setVerifiedForgotOtp] = useState("");
  const [forgotFlowError, setForgotFlowError] = useState<string | null>(null);

  const [currentEmail, setCurrentEmail] = useState("");
  const [profileData, setProfileData] = useState<any>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [emailApiError, setEmailApiError] = useState<string | null>(null);
  const [isNewEmailConfirmModalOpen, setIsNewEmailConfirmModalOpen] =
    useState(false);
  const [verifiedEmailOtp, setVerifiedEmailOtp] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axiosInstance.get("/organization/profile");
        const data = response?.data?.data || response?.data;
        setProfileData(data);
        if (data?.email) {
          setCurrentEmail(data.email);
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
      }
    };
    fetchProfile();
  }, []);

  const isPasswordFlowOverlayActive =
    isForgotPromptOpen ||
    isForgotEmailModalOpen ||
    isForgotOtpModalOpen ||
    isForgotResetModalOpen;

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] =
    useState(false);

  const [activities, setActivities] = useState<Activity[]>([
    { title: "Password changed", loc: "San Francisco, CA", date: "2025-01-15" },
    { title: "Logged in", loc: "San Francisco, CA", date: "2025-01-15" },
    { title: "Profile updated", loc: "San Francisco, CA", date: "2025-01-05" },
  ]);

  const addActivity = (title: string) => {
    const newActivity = {
      title,
      loc: "San Francisco, CA",
      date: new Date().toISOString().split("T")[0],
    };
    setActivities((prev) => [newActivity, ...prev]);
  };

  useEffect(() => {
    if (forgotOtpTimer <= 0) return;
    const id = setInterval(() => {
      setForgotOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [forgotOtpTimer]);

  const passwordForm = useFormik({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema: Yup.object({
      currentPassword: Yup.string().required("Current password is required"),
      newPassword: Yup.string()
        .min(8, "Minimum 8 characters")
        .notOneOf(
          [Yup.ref("currentPassword")],
          "New password cannot be the same as your current password",
        )
        .required("New password is required"),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref("newPassword")], "Passwords must match")
        .notOneOf(
          [Yup.ref("currentPassword")],
          "Confirm password cannot be the same as your current password",
        )
        .required("Please confirm your password"),
    }),
    onSubmit: async (values, { setSubmitting, resetForm, setFieldError }) => {
      try {
        setPasswordApiError(null);

        await axiosInstance.post("/auth/update-password", {
          oldPassword: values.currentPassword,
          newPassword: values.newPassword,
        });

        setActiveAction("password");
        addActivity("Password changed");
        setIsSuccessModalOpen(true);
        setIsPasswordModalOpen(false);
        resetForm();
      } catch (error) {
        let message = "Failed to update password.";

        if (axios.isAxiosError(error)) {
          const serverMessage = (error.response?.data as any)?.message;
          message = serverMessage || error.message || message;

          if (
            error.response?.status === 400 ||
            error.response?.status === 401 ||
            message.toLowerCase().includes("current password is incorrect")
          ) {
            setFieldError(
              "currentPassword",
              "The password you entered is incorrect.",
            );
            return;
          }
        } else {
          const anyErr = error as any;
          if (typeof anyErr?.message === "string") {
            message = anyErr.message;
            if (
              message.toLowerCase().includes("current password is incorrect")
            ) {
              setFieldError(
                "currentPassword",
                "The password you entered is incorrect.",
              );
              return;
            }
          }
        }

        setPasswordApiError(message);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const handleStartEmailUpdate = async () => {
    try {
      setEmailApiError(null);
      setIsProcessingUpdate(true);

      await axiosInstance.post("/auth/send-otp", {
        email: currentEmail,
        purpose: "email_verification",
      });

      setPendingEmail(currentEmail);
      setActiveAction("email");
      setIsOtpModalOpen(true);
    } catch (error) {
      let message = "Failed to send verification code.";
      if (error && typeof error === "object" && "message" in error) {
        message = (error as any).message;
      } else if (axios.isAxiosError(error)) {
        message =
          (error.response?.data as any)?.message || error.message || message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      setEmailApiError(message);
    } finally {
      setIsProcessingUpdate(false);
    }
  };

  const newEmailForm = useFormik({
    initialValues: { newEmail: "" },
    validationSchema: Yup.object({
      newEmail: Yup.string()
        .email("Invalid email")
        .required("Email is required"),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setEmailApiError(null);
        setIsProcessingUpdate(true);

        const token =
          typeof window !== "undefined"
            ? window.localStorage.getItem("access_token")
            : null;

        await axiosInstance.patch(
          "/organization/profile/email",
          {
            email: values.newEmail,
            otp: verifiedEmailOtp,
          },
          {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );

        setIsNewEmailModalOpen(false);
        setIsSuccessModalOpen(true);

        setTimeout(() => {
          handleLogout();
        }, 2000);
      } catch (error) {
        let message = "Failed to update email.";
        if (error && typeof error === "object" && "message" in error) {
          message = (error as any).message;
        } else if (axios.isAxiosError(error)) {
          message =
            (error.response?.data as any)?.message || error.message || message;
        } else if (error instanceof Error) {
          message = error.message;
        }
        setEmailApiError(message);
      } finally {
        setIsProcessingUpdate(false);
        setSubmitting(false);
      }
    },
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("access_token");
      window.localStorage.removeItem("refresh_token");
      persistOrganizationId(null);
      window.localStorage.removeItem("organization_profile");
      window.localStorage.removeItem("user_data");
      window.localStorage.removeItem("tokens_data");
      window.localStorage.removeItem("profile_data");

      document.cookie = "auth_token=; path=/; max-age=0; samesite=strict";
      document.cookie = "refresh_token=; path=/; max-age=0; samesite=strict";
    }

    window.location.assign("/login");
  };

  const otpForm = useFormik({
    initialValues: { otp: "" },
    validationSchema: Yup.object({
      otp: Yup.string()
        .matches(/^[A-Za-z0-9]*$/, "Only letters and numbers are allowed")
        .length(6, "Must be exactly 6 characters")
        .required("OTP is required"),
    }),
    onSubmit: async (_values, { setSubmitting, resetForm }) => {
      try {
        if (activeAction === "email") {
          if (!pendingEmail) {
            throw new Error("No current email provided for verification.");
          }

          setVerifiedEmailOtp(_values.otp);
          setIsOtpModalOpen(false);
          setIsNewEmailModalOpen(true);
        } else if (activeAction === "password") {
          addActivity("Password changed");
          setIsOtpModalOpen(false);
          setIsSuccessModalOpen(true);
        }
      } catch (error) {
        let message =
          activeAction === "email"
            ? "Failed to verify code or update email."
            : "Failed to verify code.";
        if (error && typeof error === "object" && "message" in error) {
          message = (error as any).message;
        } else if (axios.isAxiosError(error)) {
          message =
            (error.response?.data as any)?.message || error.message || message;
        } else if (error instanceof Error) {
          message = error.message;
        }
        setEmailApiError(message);
      } finally {
        setSubmitting(false);
        resetForm();
      }
    },
  });

  const forgotEmailForm = useFormik({
    initialValues: { email: "" },
    validationSchema: Yup.object({
      email: Yup.string().email("Invalid email").required("Email is required"),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setForgotFlowError(null);
        setIsSendingForgotOtp(true);
        await axiosInstance.post("/auth/send-otp", {
          email: values.email,
          purpose: "password_reset",
        });

        setForgotEmail(values.email);
        setForgotOtp("");
        setVerifiedForgotOtp("");
        setForgotOtpTimer(120);
        setIsForgotEmailModalOpen(false);
        setIsForgotOtpModalOpen(true);
      } catch (error) {
        let message = "Failed to send OTP.";
        if (error && typeof error === "object" && "message" in error) {
          message = (error as any).message;
        } else if (axios.isAxiosError(error)) {
          message =
            (error.response?.data as any)?.message || error.message || message;
        } else if (error instanceof Error) {
          message = error.message;
        }
        setForgotFlowError(message);
      } finally {
        setIsSendingForgotOtp(false);
        setSubmitting(false);
      }
    },
  });

  const forgotResetForm = useFormik({
    initialValues: {
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema: Yup.object({
      newPassword: Yup.string()
        .min(8, "Minimum 8 characters")
        .required("New password is required"),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref("newPassword")], "Passwords must match")
        .required("Please confirm your password"),
    }),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        setForgotFlowError(null);
        setIsResettingPassword(true);

        await axiosInstance.post("/auth/forgot-password", {
          email: forgotEmail,
          otp: verifiedForgotOtp,
          newPassword: values.newPassword,
        });

        setIsForgotResetModalOpen(false);
        setActiveAction("password");
        addActivity("Password reset via email");
        setIsSuccessModalOpen(true);
        resetForm();
      } catch (error) {
        let message = "Failed to reset password.";
        if (axios.isAxiosError(error)) {
          message =
            (error.response?.data as any)?.message || error.message || message;
        } else if (error instanceof Error) {
          message = error.message;
        }
        setForgotFlowError(message);
      } finally {
        setIsResettingPassword(false);
        setSubmitting(false);
      }
    },
  });

  if (currentView === "activity") {
    return (
      <div className="p-6 lg:p-10 bg-dull-white/10 font-sans">
        <div className="max-w-7xl mx-auto space-y-6">
          <header className="space-y-1">
            <h1 className="text-xl font-semibold text-secondary tracking-tight">
              Account Management
            </h1>
            <p className="text-gray text-sm max-w-2xl">
              Your data is protected through encrypted storage and role-based
              access controls
            </p>
          </header>

          <Card className="p-0 overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex items-center gap-3">
              <button
                onClick={() => setCurrentView("main")}
                className="p-1.5 cursor-pointer hover:bg-zinc-50 rounded-xl transition-colors text-secondary"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-lg font-semibold text-secondary">
                  Account Activity
                </h3>
                <p className="text-gray text-xs font-medium">
                  Recent login activity and security events
                </p>
              </div>
            </div>

            <div className="p-6 space-y-3">
              {activities.map((act, i) => (
                <div
                  key={i}
                  className="bg-primary/50 border border-zinc-100/50 rounded-xl p-4 flex justify-between items-center group transition-all hover:bg-zinc-50 hover:border-zinc-200"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-secondary text-sm">
                      {act.title}
                    </p>
                    <p className="text-xs text-gray font-medium">{act.loc}</p>
                  </div>
                  <p className="text-[10px] font-semibold text-zinc-400">
                    {act.date}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 bg-dull-white/10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-secondary tracking-tight">
            Account Management
          </h1>
          <p className="text-gray text-sm max-w-2xl">
            Your data is protected through encrypted storage and role-based
            access controls
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          <Card className="flex flex-col h-full p-0">
            <div className="p-0">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                  <img
                    src="https://res.cloudinary.com/dqp2z8oaq/image/upload/v1771330136/Group_kkepmk.svg"
                    alt="password"
                    className="w-5 h-5"
                  />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-lg font-semibold text-secondary">
                    Change Password
                  </h3>
                  <p className="text-gray text-xs font-medium">
                    Update your password to keep your account secure
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-auto p-0 pt-4">
              <Button
                variant="secondary"
                className="w-full h-11 text-sm"
                onClick={() => setIsPasswordModalOpen(true)}
              >
                Change Password
              </Button>
            </div>
          </Card>

          <Card className="flex flex-col row-span-2 h-full">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-0.5">
                <h3 className="text-lg font-semibold text-secondary">
                  Account Activity
                </h3>
                <p className="text-gray text-xs font-medium">
                  Recent login activity and security events
                </p>
              </div>
              <button
                onClick={() => setCurrentView("activity")}
                className="flex items-center cursor-pointer gap-1 text-secondary font-semibold text-xs hover:underline"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {activities.slice(0, 3).map((act, i) => (
                <div
                  key={i}
                  className="bg-primary/50 border border-dull-white/30 rounded-xl p-4 flex justify-between items-center group hover:border-dull-white transition-colors"
                >
                  <div className="space-y-0.5 text-xs font-sans">
                    <p className="font-semibold text-secondary">{act.title}</p>
                    <p className="text-[11px] text-gray font-medium">
                      {act.loc}
                    </p>
                  </div>
                  <p className="text-[10px] font-semibold text-zinc-400">
                    {act.date}
                  </p>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center text-primary">
                <Mail className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-semibold text-secondary font-sans">
                Current Email Address
              </h3>
            </div>
            <p className="text-gray text-xs font-medium mb-6 pl-[2.8rem]">
              Update your email address
            </p>
            <Button
              variant="secondary"
              className="w-full h-11 text-sm"
              isLoading={isProcessingUpdate}
              onClick={handleStartEmailUpdate}
            >
              Update Email Address
            </Button>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={isForgotPromptOpen}
        onClose={() => setIsForgotPromptOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <FiLock className="h-5 w-5 text-secondary" />
            <span>Incorrect Password</span>
          </div>
        }
        size="large"
      >
        <div className="space-y-6">
          <p className="text-sm font-medium text-gray">
            Your current password appears to be incorrect. Would you like to
            reset your password via email instead?
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="primary"
              className="h-11 px-5 bg-white border hover:text-primary border-zinc-200 text-secondary"
              onClick={() => setIsForgotPromptOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11 px-5"
              onClick={() => {
                setIsForgotPromptOpen(false);
                setIsForgotEmailModalOpen(true);
              }}
            >
              Forgot Password
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPasswordApiError(null);
        }}
        title="Security Settings"
        size="large"
      >
        <div className="space-y-1 -mt-4 mb-4">
          <p className="text-gray text-sm font-medium">
            Keep your account secure by regularly updating your password.
          </p>
        </div>

        <form onSubmit={passwordForm.handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[13px] font-bold text-secondary tracking-wide uppercase">
                Current Password
              </label>
              {passwordForm.touched.currentPassword &&
                passwordForm.errors.currentPassword && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsPasswordModalOpen(false);
                      setIsForgotEmailModalOpen(true);
                    }}
                    className="text-primary-blue text-xs font-bold hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
            </div>
            <div className="relative group">
              <Input
                name="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Enter current password"
                className="bg-zinc-50 border-zinc-100 hover:border-zinc-200 focus:bg-white pl-11 pr-12 h-14 rounded-2xl transition-all"
                value={passwordForm.values.currentPassword}
                onChange={passwordForm.handleChange}
                onBlur={passwordForm.handleBlur}
                error={
                  passwordForm.touched.currentPassword &&
                  Boolean(passwordForm.errors.currentPassword)
                }
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-20">
                <div
                  className="w-4 h-4 bg-zinc-800"
                  style={{
                    maskImage: `url(https://res.cloudinary.com/dqp2z8oaq/image/upload/v1771330136/Group_kkepmk.svg)`,
                    WebkitMaskImage: `url(https://res.cloudinary.com/dqp2z8oaq/image/upload/v1771330136/Group_kkepmk.svg)`,
                    maskSize: "contain",
                    WebkitMaskSize: "contain",
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-zinc-100 rounded-lg text-gray hover:text-secondary transition-all"
              >
                {showCurrentPassword ? (
                  <FiEyeOff className="h-4 w-4" />
                ) : (
                  <FiEye className="h-4 w-4" />
                )}
              </button>
            </div>
            {passwordForm.touched.currentPassword &&
              passwordForm.errors.currentPassword && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red text-xs font-semibold pl-1"
                >
                  {passwordForm.errors.currentPassword}
                </motion.p>
              )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-zinc-50 mt-2">
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-secondary tracking-wide uppercase">
                New Password
              </label>
              <div className="relative group">
                <Input
                  name="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Minimum 8 chars"
                  className="bg-zinc-50 border-zinc-100 hover:border-zinc-200 focus:bg-white pl-11 pr-12 h-14 rounded-2xl transition-all font-sans"
                  value={passwordForm.values.newPassword}
                  onChange={passwordForm.handleChange}
                  onBlur={passwordForm.handleBlur}
                  error={
                    passwordForm.touched.newPassword &&
                    Boolean(passwordForm.errors.newPassword)
                  }
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-20">
                  <div
                    className="w-4 h-4 bg-zinc-800"
                    style={{
                      maskImage: `url(https://res.cloudinary.com/dqp2z8oaq/image/upload/v1771330136/Group_kkepmk.svg)`,
                      WebkitMaskImage: `url(https://res.cloudinary.com/dqp2z8oaq/image/upload/v1771330136/Group_kkepmk.svg)`,
                      maskSize: "contain",
                      WebkitMaskSize: "contain",
                      maskRepeat: "no-repeat",
                      WebkitMaskRepeat: "no-repeat",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-zinc-100 rounded-lg text-gray hover:text-secondary transition-all"
                >
                  {showNewPassword ? (
                    <FiEyeOff className="h-4 w-4" />
                  ) : (
                    <FiEye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordForm.touched.newPassword &&
                passwordForm.errors.newPassword && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red text-[10px] font-semibold leading-tight px-1"
                  >
                    {passwordForm.errors.newPassword}
                  </motion.p>
                )}
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-bold text-secondary tracking-wide uppercase">
                Confirm Password
              </label>
              <div className="relative group">
                <Input
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-type new password"
                  className="bg-zinc-50 border-zinc-100 hover:border-zinc-200 focus:bg-white pl-11 pr-12 h-14 rounded-2xl transition-all font-sans"
                  value={passwordForm.values.confirmPassword}
                  onChange={passwordForm.handleChange}
                  onBlur={passwordForm.handleBlur}
                  error={
                    passwordForm.touched.confirmPassword &&
                    Boolean(passwordForm.errors.confirmPassword)
                  }
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-20">
                  <div
                    className="w-4 h-4 bg-zinc-800"
                    style={{
                      maskImage: `url(https://res.cloudinary.com/dqp2z8oaq/image/upload/v1771330136/Group_kkepmk.svg)`,
                      WebkitMaskImage: `url(https://res.cloudinary.com/dqp2z8oaq/image/upload/v1771330136/Group_kkepmk.svg)`,
                      maskSize: "contain",
                      WebkitMaskSize: "contain",
                      maskRepeat: "no-repeat",
                      WebkitMaskRepeat: "no-repeat",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-zinc-100 rounded-lg text-gray hover:text-secondary transition-all"
                >
                  {showConfirmPassword ? (
                    <FiEyeOff className="h-4 w-4" />
                  ) : (
                    <FiEye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordForm.touched.confirmPassword &&
                passwordForm.errors.confirmPassword && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red text-[10px] font-semibold leading-tight px-1"
                  >
                    {passwordForm.errors.confirmPassword}
                  </motion.p>
                )}
            </div>
          </div>

          {passwordApiError && (
            <div className="bg-red/5 border border-red/10 p-3 rounded-xl">
              <p className="text-red text-[11px] font-bold text-center">
                {passwordApiError}
              </p>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="primary"
              className="flex-1 h-14 bg-white border border-zinc-100 hover:bg-zinc-50 text-secondary font-bold rounded-2xl"
              onClick={() => {
                setIsPasswordModalOpen(false);
                setPasswordApiError(null);
                passwordForm.resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="secondary"
              className="flex-1 h-14 font-bold rounded-2xl shadow-lg shadow-secondary/20"
              isLoading={passwordForm.isSubmitting}
            >
              Update Security
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isForgotEmailModalOpen}
        onClose={() => setIsForgotEmailModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <FiMailIcon className="h-5 w-5 text-secondary" />
            <span>Reset Password</span>
          </div>
        }
        size="large"
      >
        <form
          onSubmit={forgotEmailForm.handleSubmit}
          className="space-y-6 mt-2"
        >
          <div className="space-y-2">
            <label className="text-sm font-semibold text-secondary">
              Enter your account email
            </label>
            <Input
              name="email"
              placeholder="you@example.com"
              className="bg-zinc-50 border-zinc-100"
              value={forgotEmailForm.values.email}
              onChange={forgotEmailForm.handleChange}
              onBlur={forgotEmailForm.handleBlur}
              error={
                forgotEmailForm.touched.email &&
                Boolean(forgotEmailForm.errors.email)
              }
            />
            {forgotEmailForm.touched.email && forgotEmailForm.errors.email && (
              <p className="text-red text-xs font-medium">
                {forgotEmailForm.errors.email}
              </p>
            )}
          </div>
          {forgotFlowError && (
            <p className="text-red text-xs font-medium text-right">
              {forgotFlowError}
            </p>
          )}
          <Button
            type="submit"
            variant="secondary"
            className="h-14 w-full"
            isLoading={isSendingForgotOtp || forgotEmailForm.isSubmitting}
          >
            Send Reset Code
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={isOtpModalOpen}
        onClose={() => setIsOtpModalOpen(false)}
        title=""
      >
        <div className="flex flex-col items-center gap-6">
          <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center">
            <div
              className="w-10 h-10"
              style={{
                backgroundImage: `url(https://res.cloudinary.com/dqp2z8oaq/image/upload/v1771330136/Group_kkepmk.svg)`,
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
            />
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-2xl font-semibold text-secondary font-sans">
              Enter Verification Code
            </h3>
            <p className="text-gray/50 text-sm font-medium">
              We&apos;ve sent a code to{" "}
              <span className="text-gray font-semibold">
                {pendingEmail || currentEmail}
              </span>
            </p>
          </div>

          <form onSubmit={otpForm.handleSubmit} className="w-full space-y-8">
            <div className="flex justify-between gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex-1">
                  <input
                    type="text"
                    maxLength={1}
                    value={otpForm.values.otp[i] || ""}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedData = e.clipboardData
                        .getData("text")
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "");
                      const otpValue = pastedData.slice(0, 6);
                      otpForm.setFieldValue("otp", otpValue);

                      const inputs = e.currentTarget
                        .closest(".flex")
                        ?.querySelectorAll("input");
                      if (inputs) {
                        const targetIndex = Math.min(otpValue.length, 5);
                        (inputs[targetIndex] as HTMLInputElement)?.focus();
                      }
                    }}
                    onChange={(e) => {
                      const raw = e.target.value.toUpperCase();
                      const val = raw.replace(/[^A-Z0-9]/g, "");

                      if (val.length >= 1) {
                        const newOtpArr = otpForm.values.otp.split("");
                        for (let j = 0; j < val.length && i + j < 6; j++) {
                          newOtpArr[i + j] = val[j];
                        }
                        const newOtp = newOtpArr.join("").slice(0, 6);
                        otpForm.setFieldValue("otp", newOtp);

                        const inputs = e.currentTarget
                          .closest(".flex")
                          ?.querySelectorAll("input");
                        if (inputs) {
                          const nextIndex = Math.min(i + val.length, 5);
                          (inputs[nextIndex] as HTMLInputElement)?.focus();
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace") {
                        if (!otpForm.values.otp[i] && i > 0) {
                          const inputs = e.currentTarget
                            .closest(".flex")
                            ?.querySelectorAll("input");
                          (inputs?.[i - 1] as HTMLInputElement)?.focus();
                        } else {
                          const newOtpArr = otpForm.values.otp.split("");
                          newOtpArr[i] = "";
                          otpForm.setFieldValue("otp", newOtpArr.join(""));
                        }
                      } else if (e.key === "ArrowLeft" && i > 0) {
                        const inputs = e.currentTarget
                          .closest(".flex")
                          ?.querySelectorAll("input");
                        (inputs?.[i - 1] as HTMLInputElement)?.focus();
                      } else if (e.key === "ArrowRight" && i < 5) {
                        const inputs = e.currentTarget
                          .closest(".flex")
                          ?.querySelectorAll("input");
                        (inputs?.[i + 1] as HTMLInputElement)?.focus();
                      }
                    }}
                    className={`w-full h-16 text-center text-2xl font-semibold rounded-xl border transition-all outline-none ${
                      otpForm.touched.otp && otpForm.errors.otp
                        ? "border-red bg-red/5"
                        : "border-zinc-100 bg-white focus:border-secondary focus:ring-4 focus:ring-secondary/5"
                    }`}
                  />
                </div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray/40">
                Didn&apos;t get a code?{" "}
                <button
                  type="button"
                  className="text-secondary font-semibold hover:underline"
                  onClick={async () => {
                    if (!pendingEmail && !currentEmail) return;
                    try {
                      setEmailApiError(null);
                      await axiosInstance.post("/auth/resend-otp", {
                        email: pendingEmail || currentEmail,
                        purpose: "email_verification",
                      });
                    } catch (error) {
                      let message = "Failed to resend verification code.";
                      if (axios.isAxiosError(error)) {
                        message =
                          (error.response?.data as any)?.message ||
                          error.message ||
                          message;
                      } else if (error instanceof Error) {
                        message = error.message;
                      }
                      setEmailApiError(message);
                    }
                  }}
                >
                  Click to resend.
                </button>
              </p>
            </div>
            <div className="flex gap-4">
              <Button
                type="button"
                variant="primary"
                onClick={() => setIsOtpModalOpen(false)}
                className="flex-1 h-14 bg-white hover:text-white border border-zinc-200"
              >
                Close
              </Button>
              <Button
                type="submit"
                variant="secondary"
                isLoading={otpForm.isSubmitting}
                className="flex-1 h-14 shadow-xl"
              >
                Verify
              </Button>
            </div>
            {emailApiError && activeAction === "email" && (
              <p className="text-red text-xs font-medium text-right mt-2">
                {emailApiError}
              </p>
            )}
          </form>
        </div>
      </Modal>

      <Modal
        isOpen={isNewEmailModalOpen}
        onClose={() => setIsNewEmailModalOpen(false)}
        title="Update Email Address"
      >
        <form onSubmit={newEmailForm.handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-secondary">
              Enter New Email Address
            </label>
            <Input
              name="newEmail"
              placeholder="new.email@example.com"
              className="bg-zinc-50 border-zinc-100"
              value={newEmailForm.values.newEmail}
              onChange={newEmailForm.handleChange}
              onBlur={newEmailForm.handleBlur}
              error={
                newEmailForm.touched.newEmail &&
                Boolean(newEmailForm.errors.newEmail)
              }
            />
            {newEmailForm.touched.newEmail && newEmailForm.errors.newEmail && (
              <p className="text-red text-xs font-medium">
                {newEmailForm.errors.newEmail}
              </p>
            )}
          </div>
          <Button
            type="submit"
            variant="secondary"
            className="h-14"
            isLoading={isProcessingUpdate}
          >
            Update Email
          </Button>
          {emailApiError && (
            <p className="text-red text-xs font-medium text-center">
              {emailApiError}
            </p>
          )}
        </form>
      </Modal>

      <Modal
        isOpen={isForgotOtpModalOpen}
        onClose={() => setIsForgotOtpModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <FiKey className="h-5 w-5 text-secondary" />
            <span>Enter Reset Code</span>
          </div>
        }
        size="large"
      >
        <div className="space-y-6 mt-2">
          <p className="text-sm font-medium text-gray">
            We&apos;ve sent a 6-digit code to
            <span className="font-semibold text-secondary"> {forgotEmail}</span>
            .
          </p>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-secondary">
              Verification Code
            </label>
            <Input
              name="forgotOtp"
              placeholder="Enter 6-digit code"
              className="bg-zinc-50 border-zinc-100"
              value={forgotOtp}
              maxLength={6}
              onChange={(e) => {
                let val = e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "");
                if (val.length > 6) {
                  val = val.slice(0, 6);
                }
                setForgotOtp(val);
              }}
            />
          </div>
          {forgotFlowError && (
            <p className="text-red text-xs font-medium text-right">
              {forgotFlowError}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-gray">
            {forgotOtpTimer > 0 ? (
              <span>Resend available in {forgotOtpTimer}s</span>
            ) : (
              <button
                type="button"
                className="font-semibold text-secondary hover:underline"
                onClick={async () => {
                  try {
                    setForgotFlowError(null);
                    await axiosInstance.post("/auth/resend-otp", {
                      email: forgotEmail,
                      purpose: "password_reset",
                    });
                    setForgotOtpTimer(120);
                  } catch (error) {
                    let message = "Failed to resend code.";
                    if (axios.isAxiosError(error)) {
                      message =
                        (error.response?.data as any)?.message ||
                        error.message ||
                        message;
                    } else if (error instanceof Error) {
                      message = error.message;
                    }
                    setForgotFlowError(message);
                  }
                }}
              >
                Resend code
              </button>
            )}
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="primary"
              className="h-11 px-5 bg-white hover:text-primary border border-zinc-200 text-secondary"
              onClick={() => setIsForgotOtpModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11 px-6"
              disabled={forgotOtp.length !== 6}
              onClick={() => {
                setForgotFlowError(null);
                setVerifiedForgotOtp(forgotOtp);
                setIsForgotOtpModalOpen(false);
                setIsForgotResetModalOpen(true);
              }}
            >
              Verify Code
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title=""
      >
        <div className="text-center space-y-6 py-6">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-12 h-12 text-green-500" />
          </div>
          <div className="space-y-2">
            <h4 className="text-2xl font-semibold text-secondary">Updated!</h4>
            <p className="text-gray text-base leading-relaxed px-4 font-medium">
              Your account {activeAction === "email" ? "email" : "password"} has
              been updated successfully.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => setIsSuccessModalOpen(false)}
            className="h-14 mt-4"
          >
            Continue
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isForgotResetModalOpen}
        onClose={() => setIsForgotResetModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dqp2z8oaq/image/upload/v1771330136/Group_kkepmk.svg"
              alt="password"
              className="h-5 w-5"
            />
            <span>Set New Password</span>
          </div>
        }
        size="large"
      >
        <form
          onSubmit={forgotResetForm.handleSubmit}
          className="space-y-6 mt-2"
        >
          <div className="space-y-2">
            <label className="text-sm font-semibold text-secondary">
              New Password
            </label>
            <div className="relative">
              <Input
                name="newPassword"
                type={showForgotNewPassword ? "text" : "password"}
                placeholder="Enter new password"
                className="bg-zinc-50 border-zinc-100 pr-10"
                value={forgotResetForm.values.newPassword}
                onChange={forgotResetForm.handleChange}
                onBlur={forgotResetForm.handleBlur}
                error={
                  forgotResetForm.touched.newPassword &&
                  Boolean(forgotResetForm.errors.newPassword)
                }
              />
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowForgotNewPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center justify-center text-gray hover:text-secondary transition-colors"
              >
                {showForgotNewPassword ? (
                  <FiEyeOff className="h-4 w-4" />
                ) : (
                  <FiEye className="h-4 w-4" />
                )}
              </motion.button>
            </div>
            {forgotResetForm.touched.newPassword &&
              forgotResetForm.errors.newPassword && (
                <p className="text-red text-xs font-medium">
                  {forgotResetForm.errors.newPassword}
                </p>
              )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-secondary">
              Confirm New Password
            </label>
            <div className="relative">
              <Input
                name="confirmPassword"
                type={showForgotConfirmPassword ? "text" : "password"}
                placeholder="Re-enter new password"
                className="bg-zinc-50 border-zinc-100 pr-10"
                value={forgotResetForm.values.confirmPassword}
                onChange={forgotResetForm.handleChange}
                onBlur={forgotResetForm.handleBlur}
                error={
                  forgotResetForm.touched.confirmPassword &&
                  Boolean(forgotResetForm.errors.confirmPassword)
                }
              />
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowForgotConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center justify-center text-gray hover:text-secondary transition-colors"
              >
                {showForgotConfirmPassword ? (
                  <FiEyeOff className="h-4 w-4" />
                ) : (
                  <FiEye className="h-4 w-4" />
                )}
              </motion.button>
            </div>
            {forgotResetForm.touched.confirmPassword &&
              forgotResetForm.errors.confirmPassword && (
                <p className="text-red text-xs font-medium">
                  {forgotResetForm.errors.confirmPassword}
                </p>
              )}
          </div>
          {forgotFlowError && (
            <p className="text-red text-xs font-medium text-right">
              {forgotFlowError}
            </p>
          )}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="primary"
              className="h-11 px-5 bg-white border hover:text-primary border-zinc-200 text-secondary"
              onClick={() => setIsForgotResetModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="secondary"
              className="h-11 px-6"
              isLoading={isResettingPassword || forgotResetForm.isSubmitting}
            >
              Save Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

