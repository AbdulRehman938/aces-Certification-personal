"use client";

import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { AiOutlineMail } from "react-icons/ai";
import { Input, Button } from "@/components/ui";
import { axiosInstance } from "@/lib/axios";
import { useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/lib/api-error";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  const formik = useFormik({
    initialValues: { email: "" },
    validationSchema: Yup.object({
      email: Yup.string()
        .email("Invalid email address")
        .required("Email is required"),
    }),
    onSubmit: async (values) => {
      setError("");
      try {
        await axiosInstance.post(`/auth/send-otp`, {
          email: values.email,
          purpose: "password_reset",
        });

        document.cookie =
          "reset_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
        document.cookie = `reset_session_id=active; path=/; max-age=300; samesite=strict`;

        router.replace(
          `/login/verify-code?email=${encodeURIComponent(values.email)}`,
        );
      } catch (err: unknown) {
        console.error("Forgot password error:", err);
        const errorMessage = getApiErrorMessage(
          err,
          "Failed to send verification code. Please try again.",
        );
        setError(errorMessage);
      }
    },
  });

  return (
    <div className="w-full max-w-[95vw] sm:max-w-[80vw] md:max-w-[65vw] lg:max-w-[min(32rem,45vw)] mx-auto bg-zinc-50 rounded-[clamp(1.5rem,4vw,3.125rem)] px-[clamp(1rem,3vw,1.5rem)] py-[clamp(1.5rem,4vh,2.5rem)] md:px-[clamp(2rem,4vw,3.5rem)] md:py-[clamp(2rem,5vh,3.5rem)] shadow-2xl flex flex-col items-center">
      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-[clamp(1rem,3vh,1.5rem)] shadow-lg">
        <img
          src="/assets/imgs/icons/envelope.svg"
          alt="envelope"
          className="w-8 h-8"
        />
      </div>
      <h1 className="text-[clamp(1.5rem,4vw,2rem)] font-semibold text-secondary mb-1 text-center">
        Enter Email Address
      </h1>
      <p className="text-gray text-center mb-[clamp(1rem,3vh,1.5rem)] text-[clamp(0.875rem,1.8vw,1rem)] max-w-[80%]">
        Enter a valid email address to get a verification code
      </p>

      {error && (
        <div className="w-full mb-4 p-3 bg-red/10 border border-red/20 rounded-lg text-center">
          <p className="text-sm font-semibold text-red">{error}</p>
        </div>
      )}

      <form onSubmit={formik.handleSubmit} className="w-full flex flex-col">
        <div className="mb-[clamp(1.5rem,4vh,2rem)]">
          <div className="flex justify-between items-center mb-1">
            <label className="block text-[clamp(0.75rem,1.5vw,0.875rem)] font-semibold text-secondary">
              Email Address
            </label>
            {formik.touched.email && formik.errors.email && (
              <span className="text-[clamp(0.625rem,1.2vw,0.75rem)] font-semibold text-red">
                {formik.errors.email}
              </span>
            )}
          </div>
          <Input
            type="email"
            placeholder="alica@sunrisegrand.com"
            icon={<AiOutlineMail />}
            {...formik.getFieldProps("email")}
            error={!!(formik.touched.email && formik.errors.email)}
            className="h-[clamp(3rem,6vh,3.5rem)] text-[clamp(0.875rem,1.8vw,1rem)]"
          />
        </div>
        <Button
          type="submit"
          isLoading={formik.isSubmitting}
          loadingText="Sending..."
          className="h-[clamp(3rem,6vh,3.5rem)] text-[clamp(1rem,2vw,1.125rem)] shadow-[inset_0_0_20px_6px_rgba(255,255,255,0.40),0_10px_20px_rgba(0,0,0,0.4)]"
        >
          Send
        </Button>
      </form>
    </div>
  );
}

