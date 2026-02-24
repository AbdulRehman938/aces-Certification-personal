"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Modal } from "@/components/ui";
import { axiosInstance } from "@/lib/axios";
import { getApiErrorMessage } from "@/lib/api-error";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const [displayEmail, setDisplayEmail] = useState(emailParam || "your email");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [timer, setTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [modal, setModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "default" as "default" | "error" | "success",
    action: null as (() => void) | null,
  });

  const closeModal = () => {
    setModal((prev) => ({ ...prev, isOpen: false }));
    if (modal.action) {
      modal.action();
    }
  };

  useEffect(() => {
    if (emailParam) {
      setDisplayEmail(emailParam);
    } else {
      router.push("/login");
    }
  }, [emailParam, router]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const submitVerification = async (verificationCode: string) => {
    try {
      if (verificationCode.length !== 6) return;
      setIsLoading(true);

      if (!displayEmail || displayEmail === "your email") {
        setModal({
          isOpen: true,
          title: "Email Not Found",
          message: "Could not find your email. Please try logging in again.",
          type: "error",
          action: () => router.push("/login"),
        });
        return;
      }

      const payload = {
        email: displayEmail,
        otp: verificationCode,
        purpose: "email_verification",
      };

      console.log("Submitting verification payload:", payload);

      await axiosInstance.post(`/auth/verify-otp`, payload);

      setModal({
        isOpen: true,
        title: "Verification Successful",
        message: "Email verified successfully.",
        type: "success",
        action: () => setIsSuccess(true),
      });
    } catch (err: unknown) {
      console.error("OTP verification error:", err);
      const errorMessage = getApiErrorMessage(
        err,
        "Verification failed. Please try again.",
      );

      setModal({
        isOpen: true,
        title: "Verification Failed",
        message: errorMessage,
        type: "error",
        action: () => setCode(["", "", "", "", "", ""]),
      });
      setCode(["", "", "", "", "", ""]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (index: number, value: string) => {
    if (value.length === 6) {
      const chars = value.split("");
      const newCode = [...code];
      chars.forEach((c, i) => {
        if (i < 6) newCode[i] = c;
      });
      setCode(newCode);
      inputRefs.current[5]?.focus();
      submitVerification(value);
      return;
    }

    if (value.length > 1) value = value[value.length - 1];

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = newCode.join("");
    if (fullCode.length === 6) {
      submitVerification(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startIndex: number,
  ) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!pastedData) return;

    const chars = pastedData
      .replace(/[^a-zA-Z0-9]/g, "")
      .split("")
      .slice(0, 6);

    if (chars.length === 0) return;

    const newCode = [...code];
    chars.forEach((char, idx) => {
      if (startIndex + idx < 6) {
        newCode[startIndex + idx] = char;
      }
    });
    setCode(newCode);

    const nextIndex = Math.min(startIndex + chars.length, 5);
    inputRefs.current[nextIndex]?.focus();

    const fullCode = newCode.join("");
    if (fullCode.length === 6) {
      submitVerification(fullCode);
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    await submitVerification(fullCode);
  };

  const handleResend = async () => {
    try {
      if (!displayEmail || displayEmail === "your email") {
        setModal({
          isOpen: true,
          title: "Email Not Found",
          message: "Could not find your email. Please try logging in again.",
          type: "error",
          action: () => router.push("/login"),
        });
        return;
      }

      setIsResending(true);
      await axiosInstance.post(`/auth/send-otp`, {
        email: displayEmail,
        purpose: "email_verification",
      });

      setTimer(30);
      setCode(["", "", "", "", "", ""]);
      setModal({
        isOpen: true,
        title: "Code Resent",
        message: "A new verification code has been sent to your email.",
        type: "success",
        action: null,
      });
    } catch (error: unknown) {
      console.error("Resend failed:", error);
      const errorMessage = getApiErrorMessage(error, "Failed to resend code.");

      setModal({
        isOpen: true,
        title: "Resend Failed",
        message: errorMessage,
        type: "error",
        action: null,
      });
    } finally {
      setIsResending(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full flex flex-col items-center justify-center text-center py-4">
        <div className="relative mb-5 flex items-center justify-center">
          <div className="w-36 h-36 bg-zinc-100 rounded-full flex items-center justify-center">
            <div className="w-28 h-28 bg-zinc-200 rounded-full flex items-center justify-center">
              <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center shadow-lg">
                <img
                  src="/assets/imgs/icons/doubletick.svg"
                  alt="Success"
                  className="w-10 h-10"
                />
              </div>
            </div>
          </div>
        </div>
        <h1 className="text-4xl font-semibold text-secondary mb-5">
          Email Verified
        </h1>
        <p className="text-gray text-[clamp(0.875rem,2vw,1.125rem)] mb-5 max-w-[90%] mx-auto font-medium leading-[1.3]">
          Your email has been verified successfully. You can now log in to your
          account.
        </p>
        <Button
          onClick={() => {
            router.push("/login?verified=true");
          }}
          className="max-w-[clamp(16rem,40vw,20rem)] h-[clamp(3.5rem,8vh,4rem)] text-[clamp(1rem,2.5vw,1.125rem)] font-semibold shadow-xl"
        >
          Continue to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center justify-center">
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />

      <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-5 shadow-lg">
        <img src="/assets/imgs/icons/key.svg" alt="key" className="w-10 h-10" />
      </div>

      <div className="mb-2 text-center text-secondary lg:mb-5">
        <h2 className="text-2xl font-semibold mb-0">Enter Verification Code</h2>
        <p className="text-[clamp(0.875rem,2vw,1rem)] text-zinc-400">
          We&apos;ve sent a code to{" "}
          <span className="font-semibold text-secondary">{displayEmail}</span>
        </p>
      </div>

      <div className="flex w-full flex-col gap-6">
        <div className="flex justify-center gap-3 lg:gap-5">
          {code.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              autoComplete="one-time-code"
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={(e) => handlePaste(e, idx)}
              className="h-14 w-12 lg:h-16 lg:w-16 short-laptop:h-10 short-laptop:w-10 rounded-xl border border-secondary/40 bg-white text-center text-xl lg:text-2xl short-laptop:text-lg font-semibold text-secondary focus:border-secondary focus:outline-none focus:ring-4 focus:ring-secondary/5 transition-all outline-none"
            />
          ))}
        </div>

        <div className="text-center text-base">
          <p className="text-zinc-400">
            Didn&apos;t get a code?{" "}
            {timer > 0 ? (
              <span className="font-semibold text-secondary/50">
                Resend in {timer}s
              </span>
            ) : (
              <button
                onClick={handleResend}
                disabled={isResending}
                className="font-semibold text-secondary hover:text-secondary/70 transition-colors cursor-pointer inline-flex items-center gap-2 align-baseline"
              >
                {isResending && (
                  <span className="animate-spin h-3 w-3 border-2 border-secondary border-t-transparent rounded-full" />
                )}
                {isResending ? "Resending..." : "Click to resend."}
              </button>
            )}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="primary"
            onClick={() => router.push("/login")}
            className="flex-1 hover:text-white"
          >
            Close
          </Button>
          <Button
            onClick={handleVerify}
            isLoading={isLoading}
            loadingText="Verifying..."
            disabled={code.join("").length < 6}
            variant="secondary"
            className="flex-1"
          >
            Verify
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="w-full max-w-xl mx-auto bg-primary rounded-[50px] px-6 py-10 md:p-14 short-laptop:p-6 shadow-2xl flex flex-col items-center">
      <Suspense fallback={<div>Loading...</div>}>
        <VerifyEmailContent />
      </Suspense>

      <div className="mt-5 text-center text-secondary font-medium">
        Already have an account?{" "}
        <Link href="/login" replace className="font-semibold underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
