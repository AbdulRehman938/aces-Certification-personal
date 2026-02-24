"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { Button } from "@/components/ui";
import { useSearchParams, useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/lib/api-error";

function VerifyCodeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(0);
  const [resendCount, setResendCount] = useState(() => {
    if (typeof window === "undefined") return 0;
    const today = new Date().toDateString();
    const stored = localStorage.getItem("resend_data");
    if (stored) {
      const { count, date } = JSON.parse(stored);
      if (date === today) return count;
    }
    return 0;
  });
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0)
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);

    const today = new Date().toDateString();
    const stored = localStorage.getItem("resend_data");
    if (stored) {
      const { date } = JSON.parse(stored);
      if (date !== today) {
        localStorage.setItem(
          "resend_data",
          JSON.stringify({ count: 0, date: today })
        );
      }
    } else {
      localStorage.setItem(
        "resend_data",
        JSON.stringify({ count: 0, date: today })
      );
    }
    
    return () => clearTimeout(timeout);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value && !/^[a-zA-Z0-9]+$/.test(value)) return;
    if (value.length > 1) value = value.slice(-1);
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError("");
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !code[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startIndex: number,
  ) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!pastedData) return;

    const chars = pastedData.replace(/[^a-zA-Z0-9]/g, "").split("").slice(0, 6);

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
  };

  const handleResend = () => {
    if (resendCount >= 20) {
      setError("Daily resend limit reached. Please try again tomorrow.");
      return;
    }
    if (timer > 0) return;
    setTimer(30);
    const newCount = resendCount + 1;
    setResendCount(newCount);
    localStorage.setItem(
      "resend_data",
      JSON.stringify({ count: newCount, date: new Date().toDateString() })
    );
    setError("");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleVerify = async () => {
    const otp = code.join("");
    if (otp.length < 6) {
      setError("Please enter the complete 6-character code.");
      return;
    }
    setIsLoading(true);
    setError("");

    try {

      document.cookie = `reset_auth_token=verified; path=/; max-age=300; samesite=strict`;
      document.cookie =
        "reset_session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      router.replace(
        `/login/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`
      );
    } catch (err: unknown) {
      console.error("OTP verification error:", err);
      const errorMessage = getApiErrorMessage(err, "Invalid code. Please try again.");
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[95vw] sm:max-w-[80vw] md:max-w-[65vw] lg:max-w-[min(36rem,50vw)] mx-auto bg-primary rounded-[clamp(1.5rem,4vw,3.125rem)] px-[clamp(1rem,3vw,1.5rem)] py-[clamp(1.5rem,4vh,2.5rem)] md:px-[clamp(2rem,4vw,3.5rem)] md:py-[clamp(2rem,5vh,3.5rem)] shadow-2xl flex flex-col items-center">
      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-[clamp(1rem,3vh,1.5rem)] shadow-lg">
        <img src="/assets/imgs/icons/key.svg" alt="key" className="w-8 h-8" />
      </div>
      <h1 className="text-[clamp(1.5rem,4vw,2rem)] font-semibold text-secondary mb-1 text-center">
        Enter Verification Code
      </h1>
      <p className="text-gray text-center mb-[clamp(1rem,3vh,1.5rem)] text-[clamp(0.875rem,1.8vw,1rem)] max-w-[80%]">
        We&apos;ve sent a code to{" "}
        <span className="text-secondary font-semibold">{email}</span>
      </p>
      {error && <p className="text-red text-sm mb-4 font-semibold">{error}</p>}
      <div className="flex gap-2 mb-6">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="text"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={(e) => handlePaste(e, index)}
            className="w-10 h-12 md:w-14 md:h-16 text-center text-lg md:text-xl font-semibold rounded-xl border border-secondary/40 focus:border-secondary focus:ring-2 focus:ring-secondary/5 outline-none transition-all"
          />
        ))}
      </div>
      <p className="text-gray text-center mb-[clamp(1.5rem,4vh,2rem)] text-sm md:text-base">
        Didn&apos;t get a code?{" "}
        <button
          onClick={handleResend}
          disabled={timer > 0 || resendCount >= 20}
          className="text-secondary cursor-pointer font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {timer > 0 ? `Resend in ${formatTime(timer)}` : "Click to resend."}
        </button>
        {resendCount >= 15 && resendCount < 20 && (
          <span className="block text-xs mt-1 text-gray/60">
            {20 - resendCount} attempts remaining today
          </span>
        )}
      </p>
      <div className="w-full flex gap-4">
        <Button
          variant="primary"
          onClick={() => router.replace("/login")}
          className="h-[clamp(3rem,6vh,3.5rem)] text-base md:text-lg hover:text-primary border-2 border-zinc-200"
        >
          Close
        </Button>
        <Button
          isLoading={isLoading}
          loadingText="Verifying..."
          onClick={handleVerify}
          className="h-[clamp(3rem,6vh,3.5rem)] text-base md:text-lg shadow-[inset_0_0_20px_6px_rgba(255,255,255,0.40),0_10px_20px_rgba(0,0,0,0.4)]"
        >
          Verify
        </Button>
      </div>
    </div>
  );
}

export default function VerifyCodePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyCodeContent />
    </Suspense>
  );
}
