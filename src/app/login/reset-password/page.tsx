"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { MdOutlineLock } from "react-icons/md";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Input, Button } from "@/components/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { axiosInstance } from "@/lib/axios";
import { getApiErrorMessage } from "@/lib/api-error";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const otp = searchParams.get("otp") || "";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [otpCode, setOtpCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [showManualOtp, setShowManualOtp] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const urlOtp = searchParams.get("otp") || "";

  useEffect(() => {
    if (showManualOtp) {
      otpRefs.current[0]?.focus();
    }
  }, [showManualOtp]);

  const formik = useFormik({
    initialValues: { password: "", confirmPassword: "" },
    validationSchema: Yup.object({
      password: Yup.string()
        .min(8, "At least 8 characters")
        .matches(/[A-Z]/, "One  letter")
        .matches(/[0-9]/, "One number")
        .matches(/[^A-Za-z0-9]/, "One special character")
        .required("Required"),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref("password")], "Passwords must match")
        .required("Required"),
    }),
    onSubmit: async (values, { setStatus }) => {
      const otpToSubmit = showManualOtp ? otpCode.join("") : urlOtp;

      if (!otpToSubmit || otpToSubmit.length < 6) {
        setStatus({
          error: showManualOtp
            ? "Please enter the full 6-digit OTP code."
            : "No verification code found. Please request a new one.",
        });
        return;
      }

      try {
        await axiosInstance.post(`/auth/forgot-password`, {
          email: email,
          otp: otpToSubmit,
          newPassword: values.password,
        });

        document.cookie =
          "reset_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
        router.replace("/login/reset-success");
      } catch (err: unknown) {
        if (process.env.NODE_ENV === "development") {
          console.error("[API Error]:", err);
        }

        const errorMessage = getApiErrorMessage(
          err,
          "An unexpected error occurred.",
        );

        setStatus({
          error: errorMessage,
        });
      }
    },
  });

  const handleResendOtp = async () => {
    setResendLoading(true);
    setResendStatus(null);
    try {
      await axiosInstance.post(`/auth/send-otp`, {
        email: email,
        purpose: "password_reset",
      });
      setResendStatus({
        type: "success",
        message: "A new verification code has been sent to your email.",
      });
      // Show manual entry section for the new code
      setShowManualOtp(true);
      setOtpCode(["", "", "", "", "", ""]);
      formik.setStatus(null);
    } catch (err: unknown) {
      const errorMessage = getApiErrorMessage(
        err,
        "Failed to resend code. Please try again.",
      );
      setResendStatus({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^[a-zA-Z0-9]$/.test(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!pastedData) return;
    const chars = pastedData
      .replace(/[^a-zA-Z0-9]/g, "")
      .split("")
      .slice(0, 6);
    if (chars.length === 0) return;
    const newCode = [...otpCode];
    chars.forEach((char, idx) => {
      if (idx < 6) newCode[idx] = char;
    });
    setOtpCode(newCode);
    otpRefs.current[Math.min(chars.length, 5)]?.focus();
  };

  return (
    <div className="w-full max-w-[95vw] sm:max-w-[80vw] md:max-w-[65vw] lg:max-w-lg mx-auto bg-white rounded-[clamp(1.5rem,4vw,3.125rem)] px-[clamp(1rem,3vw,1.5rem)] py-[clamp(1.5rem,4vh,1.5rem)] md:px-[clamp(2rem,4vw,3.5rem)] md:py-[clamp(1.5rem,5vh,2rem)] shadow-2xl flex flex-col items-center relative overflow-hidden max-h-[90vh]">
      <div className="w-full h-full overflow-y-auto scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex flex-col items-center w-full max-w-lg mx-auto py-[clamp(1rem,3vh,2rem)]">
          <div className="relative w-full h-[clamp(7rem,18vh,10rem)] flex items-center justify-center mb-[clamp(0.75rem,2vh,1.5rem)]">
            <img
              src="/assets/imgs/login/login2.svg"
              alt="vector1"
              className="absolute max-w-full max-h-full object-contain"
            />
            <div className="relative flex flex-col items-center">
              <img
                src="/assets/imgs/login/login1.svg"
                alt="vector2"
                className="z-10 max-w-full translate-y-[-0.2rem] max-h-full object-contain"
              />
              <div className="absolute top-29 w-[110%] h-0.5 bg-auth-middle rounded-full z-20" />
            </div>
          </div>
          <h1 className="text-[clamp(1.25rem,3.5vw,1.75rem)] font-semibold text-secondary mb-[clamp(0.25rem,1vh,0.5rem)]">
            Update password
          </h1>
          <p className="text-gray text-center mb-[clamp(1.5rem,4vh,2.5rem)] text-[clamp(0.8rem,1.8vw,0.95rem)]">
            For your safety, please create a new password to secure your
            account.
          </p>

          {formik.status?.error && (
            <div className="w-full mb-4 p-3 bg-red/10 border border-red/20 rounded-lg text-center">
              <p className="text-sm font-semibold text-red">
                {formik.status.error}
              </p>
              {formik.status.error ===
                "OTP has expired. Please request a new OTP." && (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendLoading}
                  className="mt-2 text-xs font-bold text-secondary underline cursor-pointer hover:opacity-80 disabled:opacity-50"
                >
                  {resendLoading ? "Sending..." : "Resend OTP"}
                </button>
              )}
            </div>
          )}

          {resendStatus && (
            <div
              className={`w-full mb-4 p-3 border rounded-lg text-center ${
                resendStatus.type === "success"
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red/10 border-red/20 text-red"
              }`}
            >
              <p className="text-sm font-semibold">{resendStatus.message}</p>
            </div>
          )}

          <form onSubmit={formik.handleSubmit} className="w-full flex flex-col">
            {showManualOtp && (
              <div className="mb-6 w-full animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-[clamp(0.7rem,1.6vw,0.8rem)] font-semibold text-secondary mb-2">
                  New Verification Code
                </label>
                <div className="flex justify-between gap-1 sm:gap-2">
                  {otpCode.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpRefs.current[index] = el;
                      }}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-bold rounded-xl border border-secondary/20 focus:border-secondary outline-none transition-all placeholder:text-zinc-200"
                      placeholder="•"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mb-[clamp(1rem,3vh,1.5rem)]">
              <div className="flex justify-between items-center mb-[clamp(0.25rem,1vh,0.5rem)]">
                <label className="block text-[clamp(0.7rem,1.6vw,0.8rem)] font-semibold text-secondary">
                  New Password
                </label>
                {formik.touched.password && formik.errors.password && (
                  <span className="text-[clamp(0.6rem,1.4vw,0.7rem)] font-semibold text-red">
                    {formik.errors.password}
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter New Password"
                  icon={<MdOutlineLock />}
                  {...formik.getFieldProps("password")}
                  error={!!(formik.touched.password && formik.errors.password)}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-[clamp(0.75rem,2vw,1rem)] top-1/2 cursor-pointer -translate-y-1/2 text-gray hover:text-secondary p-1 z-10"
                >
                  {showPassword ? (
                    <FiEyeOff className="text-[clamp(0.95rem,2.2vw,1.15rem)]" />
                  ) : (
                    <FiEye className="text-[clamp(0.95rem,2.2vw,1.15rem)]" />
                  )}
                </button>
              </div>
            </div>
            <div className="mb-[clamp(0.25rem,1vh,0.5rem)]">
              <div className="flex justify-between items-center mb-[clamp(0.25rem,1vh,0.5rem)]">
                <label className="block text-[clamp(0.7rem,1.6vw,0.8rem)] font-semibold text-secondary">
                  Confirm Password
                </label>
                {formik.touched.confirmPassword &&
                  formik.errors.confirmPassword && (
                    <span className="text-[clamp(0.6rem,1.4vw,0.7rem)] font-semibold text-red">
                      {formik.errors.confirmPassword}
                    </span>
                  )}
              </div>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repeat Your New Password"
                  icon={<MdOutlineLock />}
                  {...formik.getFieldProps("confirmPassword")}
                  error={
                    !!(
                      formik.touched.confirmPassword &&
                      formik.errors.confirmPassword
                    )
                  }
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-[clamp(0.75rem,2vw,1rem)] top-1/2 cursor-pointer -translate-y-1/2 text-gray hover:text-secondary p-1 z-10"
                >
                  {showConfirmPassword ? (
                    <FiEyeOff className="text-[clamp(0.95rem,2.2vw,1.15rem)]" />
                  ) : (
                    <FiEye className="text-[clamp(0.95rem,2.2vw,1.15rem)]" />
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-[clamp(0.6rem,1.8vw,0.8rem)] bg-white/50 p-[clamp(0.65rem,1.6vw,0.85rem)] mb-[clamp(1.5rem,4vh,2rem)] mt-[clamp(1rem,3vh,1.5rem)] border border-zinc-100">
              <h4 className="mb-[clamp(0.3rem,0.8vh,0.4rem)] text-[clamp(0.7rem,1.6vw,0.8rem)] font-semibold text-secondary">
                Password requirements:
              </h4>
              <ul className="space-y-[clamp(0.15rem,0.4vh,0.2rem)] text-[clamp(0.6rem,1.4vw,0.7rem)] text-zinc-400">
                <li
                  className={`flex items-center gap-2 ${formik.values.password.length >= 8 ? "text-secondary font-medium" : ""}`}
                >
                  • At least 8 characters
                </li>
                <li
                  className={`flex items-center gap-2 ${/[A-Z]/.test(formik.values.password) ? "text-secondary font-medium" : ""}`}
                >
                  • One letter
                </li>
                <li
                  className={`flex items-center gap-2 ${/[0-9]/.test(formik.values.password) ? "text-secondary font-medium" : ""}`}
                >
                  • One number
                </li>
                <li
                  className={`flex items-center gap-2 ${/[^A-Za-z0-9]/.test(formik.values.password) ? "text-secondary font-medium" : ""}`}
                >
                  • One special character
                </li>
              </ul>
            </div>
            <div className="pt-2">
              <Button
                type="submit"
                isLoading={formik.isSubmitting}
                loadingText="Updating..."
              >
                Update Password
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
