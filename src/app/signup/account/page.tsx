"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { axiosInstance } from "@/lib/axios";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Input, Button } from "@/components/ui";
import { ChevronLeft, Eye, EyeOff, Check } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAccountData } from "@/store/signupSlice";
import { getApiErrorMessage } from "@/lib/api-error";

const steps = [
  {
    id: 1,
    title: "Organisation information",
    subtitle: "Add Your organisation info",
  },
  { id: 2, title: "Organisation info", subtitle: "Add Organisation info" },
  {
    id: 3,
    title: "Account",
    subtitle: "Create your account",
  },
];

export default function AccountCredentialsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const createState = useAppSelector((s) => s.signup.create);
  const orgState = useAppSelector((s) => s.signup.organisationInfo);
  const accountState = useAppSelector((s) => s.signup.account);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const formik = useFormik({
    initialValues: {
      password: accountState.password || "",
      confirmPassword: accountState.confirmPassword || "",
      agree: !!accountState.agree,
    },
    validationSchema: Yup.object({
      password: Yup.string()
        .min(8, "At least 8 characters")
        .matches(/[A-Z]/, "One  letter")
        .matches(/[0-9]/, "One number")
        .matches(/[^A-Za-z0-9]/, "One special character")
        .required("Password is required"),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref("password")], "Passwords must match")
        .required("Please confirm your password"),
      agree: Yup.boolean().oneOf(
        [true],
        "You must agree to the terms to continue",
      ),
    }),
    onSubmit: async (values, { setSubmitting, setStatus }) => {
      try {
        const businessId =
          orgState.businessId ||
          "BIZ-" + Math.random().toString(36).substr(2, 9).toUpperCase();

        const organizationName =
          orgState.organisation || createState.organisation || "";

        const email = createState.email || "";
        const contactNo =
          createState.contact_no ||
          (createState.phoneDialCode && createState.phoneNumber
            ? `${createState.phoneDialCode}-${createState.phoneNumber}`
            : "");

        const payload = {
          email,
          password: values.password,
          organization_name: organizationName,
          industry_ids: orgState.industry_ids || [],
          business_id: businessId,
          country: orgState.country || "",
          state: orgState.state || "",
          city: orgState.city || "",
          description:
            orgState.description ||
            "A leading technology company specializing in innovative solutions",
          contact_no: contactNo,
        };

        const response = await axiosInstance.post(
          `/auth/register-organization`,
          payload,
        );

        if (response.data && response.data.success === false) {
          throw response.data;
        }

        console.log("Signup complete.");
        router.push(`/signup/verify-email?email=${encodeURIComponent(email)}`);
      } catch (error: unknown) {
        console.error("Registration failed:", error);
        const errorMessage = getApiErrorMessage(
          error,
          "An unexpected error occurred",
        );

        const status =
          (error as { status?: number; response?: { status?: number } })
            .status ||
          (error as { response?: { status?: number } }).response?.status;
        if (status === 409) {
          console.warn("Organization already exists (409).");
        }

        setStatus({
          error: errorMessage,
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    dispatch(
      setAccountData({
        password: formik.values.password,
        confirmPassword: formik.values.confirmPassword,
        agree: formik.values.agree,
      }),
    );
  }, [formik.values, isLoaded, dispatch]);

  return (
    <div className="h-screen w-full overflow-y-auto scrollbar-hide lg:fixed lg:inset-0 lg:p-10">
      <div className="mx-auto flex min-h-screen w-full flex-col justify-between px-2 py-6 lg:min-h-0 lg:h-full lg:max-w-7xl lg:flex-row lg:items-center lg:p-0">
        {/* Left Side (Stepper) */}
        <div className="mb-8 flex flex-col justify-center lg:mb-0 lg:w-1/2 lg:pr-20">
          <div className="mb-8 flex items-center justify-center gap-4 lg:mb-12 lg:justify-start">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg lg:h-16 lg:w-16">
              <img
                src="/assets/imgs/logo.svg"
                alt="logo"
                className="h-14 w-14"
              />
            </div>
            <div className="flex flex-col text-white">
              <span className="text-2xl font-semibold lg:text-4xl text-white">
                ACES
              </span>
              <span className="text-2xl -mt-2 font-light text-white lg:text-2xl">
                Certification
              </span>
            </div>
          </div>

          <div className="mb-10 text-center lg:mb-16 lg:text-left text-white">
            <h1 className="mb-3 text-2xl font-semibold text-white lg:mb-4 lg:text-2xl leading-tight">
              Create your account
            </h1>
            <p className="max-w-xl text-base text-white lg:text-xl leading-[1.2] short-laptop:text-lg font-light">
              Create your account and begin the <br /> certification process.
              Our AI-powered platform <br /> makes it simple.
            </p>
          </div>

          <div className="flex w-full overflow-x-auto pb-4 gap-6 lg:flex-col lg:overflow-visible lg:pb-0 scrollbar-hide">
            {steps.map((step, idx) => {
              const isActive = step.id === 3;
              const isPast = step.id < 3;
              return (
                <div
                  key={step.id}
                  className="relative flex shrink-0 items-start group"
                >
                  {idx !== steps.length - 1 && (
                    <div className="absolute left-5 top-10 hidden h-9 w-0.5 bg-white lg:block" />
                  )}
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                    {isActive && (
                      <div className="absolute inset-0 rounded-full border border-white" />
                    )}
                    <div
                      className={`flex items-center justify-center rounded-full transition-all duration-300 ${isActive ? "h-7 w-7 bg-white text-secondary" : isPast ? "h-10 w-10 bg-white text-secondary" : "h-10 w-10 border-2 border-white text-white bg-transparent"}`}
                    >
                      <span
                        className={`font-semibold ${isActive ? "text-[10px]" : "text-base"}`}
                      >
                        {step.id}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col pt-1">
                    <h3
                      className={`text-base font-semibold lg:text-lg ${isActive ? "text-white" : "text-white"}`}
                    >
                      {step.title}
                    </h3>
                    <p className="text-[10px] text-white/40 lg:text-sm">
                      {step.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side Card */}
        <div className="flex w-full flex-col justify-start rounded-[48px] bg-white px-5 py-8 md:p-16 short-laptop:p-6 shadow-2xl lg:h-full lg:w-1/2 lg:py-6 relative lg:overflow-y-auto scrollbar-hide">
          <div className="mx-auto flex w-full max-w-lg flex-col justify-center">
            <div className="mb-[clamp(1.5rem,4vh,2.5rem)] text-center lg:text-left">
              <h2 className="text-2xl font-semibold text-secondary mb-0">
                Create your account
              </h2>
              <p className="text-base text-zinc-400 ml-1">
                Create your account and begin the certification process.
              </p>
            </div>

            <form
              onSubmit={formik.handleSubmit}
              className="flex flex-col gap-6"
            >
              {/* Password */}
              <div className="flex flex-col">
                <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary mb-[clamp(0.25rem,1vh,0.5rem)]">
                  Password
                </label>
                <Input
                  className="short-laptop:h-9 short-laptop:text-xs"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create Your Strong Password"
                  icon={
                    <img
                      src="https://res.cloudinary.com/di9tb45rl/image/upload/v1770006843/hugeicons_lock_dakrvw.png"
                      alt="lock"
                      className="h-5 w-5"
                    />
                  }
                  {...formik.getFieldProps("password")}
                  error={formik.touched.password && !!formik.errors.password}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-zinc-400 hover:text-secondary transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  }
                />
                {formik.touched.password && formik.errors.password && (
                  <span className="text-[10px] font-semibold text-red mt-1 ml-1">
                    {formik.errors.password}
                  </span>
                )}
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col mb-[clamp(0.25rem,1vh,0.5rem)]">
                <label className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary mb-[clamp(0.25rem,1vh,0.5rem)]">
                  Confirm Password
                </label>
                <Input
                  className="short-laptop:h-9 short-laptop:text-xs"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your Password"
                  icon={
                    <img
                      src="https://res.cloudinary.com/di9tb45rl/image/upload/v1770006843/hugeicons_lock_dakrvw.png"
                      alt="lock"
                      className="h-5 w-5"
                    />
                  }
                  {...formik.getFieldProps("confirmPassword")}
                  error={
                    formik.touched.confirmPassword &&
                    !!formik.errors.confirmPassword
                  }
                  rightElement={
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="p-1 text-zinc-400 hover:text-secondary transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  }
                />
                {formik.touched.confirmPassword &&
                  formik.errors.confirmPassword && (
                    <span className="text-[10px] font-semibold text-red mt-1 ml-1">
                      {formik.errors.confirmPassword}
                    </span>
                  )}
              </div>

              {/* Requirements Box */}
              <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-50 space-y-2">
                <h4 className="text-base font-semibold text-secondary opacity-80">
                  Password requirements:
                </h4>
                <ul className="space-y-1">
                  {[
                    {
                      label: "At least 8 characters",
                      test: (p: string) => p.length >= 8,
                    },
                    {
                      label: "One  letter",
                      test: (p: string) => /[A-Z]/.test(p),
                    },
                    {
                      label: "One number",
                      test: (p: string) => /[0-9]/.test(p),
                    },
                    {
                      label: "One special character",
                      test: (p: string) => /[^A-Za-z0-9]/.test(p),
                    },
                  ].map((req, i) => {
                    const isFulfilled = req.test(formik.values.password);
                    return (
                      <li
                        key={i}
                        className={`text-xs font-medium flex items-center transition-colors duration-200 ${
                          isFulfilled ? "text-secondary" : "text-zinc-400"
                        }`}
                      >
                        <span
                          className={`mr-2 transition-opacity ${
                            isFulfilled ? "opacity-100" : "opacity-50"
                          }`}
                        >
                          •
                        </span>
                        {req.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Consent Checkbox */}
              <div className="flex flex-col gap-1">
                <label className="flex cursor-pointer items-start gap-4">
                  <div className="relative flex items-center justify-center pt-1">
                    <input
                      type="checkbox"
                      className={`peer h-5 w-5 appearance-none cursor-pointer rounded border ${
                        (formik.touched.agree && formik.errors.agree) ||
                        (formik.submitCount > 0 && formik.errors.agree)
                          ? "border-red"
                          : "border-zinc-300"
                      } bg-white checked:bg-secondary transition-all`}
                      {...formik.getFieldProps("agree")}
                    />
                    <Check className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                  </div>
                  <span className="text-xs leading-relaxed text-zinc-400 font-medium">
                    I confirm that I am authorized to create an organisation
                    account on behalf of my company, and I agree to the{" "}
                    <Link
                      href="/signup/account/policy/terms"
                      className="font-semibold underline text-secondary opacity-80 hover:opacity-100"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/signup/account/policy/privacy"
                      className="font-semibold underline text-secondary opacity-80 hover:opacity-100"
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {(formik.errors.agree && formik.touched.agree) ||
                (formik.submitCount > 0 && formik.errors.agree) ? (
                  <span className="text-[10px] font-semibold text-red mt-1 ml-10">
                    {formik.errors.agree}
                  </span>
                ) : null}
              </div>

              {formik.status && formik.status.error && (
                <div className="mb-0 p-3 text-sm text-red bg-red/10 border border-red/20 rounded-lg text-center">
                  {formik.status.error}
                </div>
              )}

              {/* Buttons Row */}
              <div className="mt-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.replace("/signup/organisation-info")}
                  className="flex h-14 w-14 font-medium shrink-0 items-center justify-center cursor-pointer rounded-2xl border-2 border-secondary/80 text-secondary hover:border-zinc-400 transition-all bg-white"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <Button type="submit" isLoading={formik.isSubmitting}>
                  Create Account
                </Button>
              </div>

              <div className="text-center mt-4">
                <p className="text-base font-medium text-zinc-500">
                  Already have an account?{" "}
                  <span
                    onClick={() => {
                      router.push("/login");
                    }}
                    className="font-semibold underline text-secondary hover:opacity-80 transition-all ml-1 cursor-pointer inline-block"
                  >
                    Sign in
                  </span>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
