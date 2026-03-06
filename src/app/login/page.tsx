"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { AiOutlineMail } from "react-icons/ai";
import { MdOutlineLock } from "react-icons/md";
import { FiEye, FiEyeOff } from "react-icons/fi";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import axios from "axios";

import { Input, Button, Modal } from "@/components/ui";
import { axiosInstance } from "@/lib/axios";
import { useUser } from "@/contexts/UserContext";
import { getRoleRedirectPath, persistOrganizationId } from "@/lib/auth-utils";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAppDispatch } from "@/store/hooks";
import { resetSignup } from "@/store/signupSlice";
import { clearSignupSessionStorage } from "@/app/providers";

const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 1 * 60 * 60 * 1000;

function LoginContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifiedModalOpen, setIsVerifiedModalOpen] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuthData, clearAuth } = useUser();
  const dispatch = useAppDispatch();

  useEffect(() => {
    clearAuth();

    localStorage.removeItem("register_user");
    localStorage.removeItem("signup_draft");
    localStorage.removeItem("signup_completed");

    dispatch(resetSignup());
    clearSignupSessionStorage();

    if (searchParams.get("verified") === "true") {
      setIsVerifiedModalOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("verified");
      window.history.replaceState({}, "", url.toString());
    }
  }, [dispatch, searchParams, clearAuth]);

  const getLockoutKey = (email: string) =>
    `login_lockout_until_${email.toLowerCase().trim()}`;
  const getAttemptsKey = (email: string) =>
    `login_attempts_${email.toLowerCase().trim()}`;

  const getRemainingTime = useCallback((email: string) => {
    const lockoutUntil = localStorage.getItem(getLockoutKey(email));
    if (!lockoutUntil) return 0;
    const remaining = parseInt(lockoutUntil) - Date.now();
    return remaining > 0 ? Math.ceil(remaining / (60 * 1000)) : 0;
  }, []);

  const checkLockout = useCallback((email: string) => {
    if (!email || typeof window === "undefined") return false;
    const lockoutUntil = localStorage.getItem(getLockoutKey(email));
    if (lockoutUntil) {
      if (Date.now() < parseInt(lockoutUntil)) {
        return true;
      } else {
        localStorage.removeItem(getLockoutKey(email));
        localStorage.removeItem(getAttemptsKey(email));
      }
    }
    return false;
  }, []);

  const updateLockoutError = useCallback(
    (email: string) => {
      const minutes = getRemainingTime(email);
      if (minutes > 0) {
        setGlobalError(
          `Account is temporarily locked due to too many failed attempts. Please try again in ${minutes} minutes`,
        );
        return true;
      }
      return false;
    },
    [getRemainingTime],
  );

  const handleFailedAttempt = (email: string) => {
    if (!email) return;
    const attemptsKey = getAttemptsKey(email);
    const lockoutKey = getLockoutKey(email);

    const attempts = parseInt(localStorage.getItem(attemptsKey) || "0") + 1;
    localStorage.setItem(attemptsKey, attempts.toString());

    if (attempts >= MAX_ATTEMPTS) {
      const lockoutUntil = Date.now() + LOCKOUT_TIME;
      localStorage.setItem(lockoutKey, lockoutUntil.toString());
      updateLockoutError(email);
    }
  };

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email("Invalid email address")
        .required("Email is required"),
      password: Yup.string()
        .min(6, "Password must be at least 6 characters")
        .required("Password is required"),
    }),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setIsRedirecting(false);

      if (!values.email || !values.password) {
        setSubmitting(false);
        return;
      }

      if (checkLockout(values.email)) {
        updateLockoutError(values.email);
        setSubmitting(false);
        return;
      }

      setGlobalError("");

      try {
        const response = await axiosInstance.post(`/auth/login`, values);

        localStorage.removeItem(getAttemptsKey(values.email));
        localStorage.removeItem(getLockoutKey(values.email));

        const rawData = response.data?.data || response.data;
        const userData = rawData?.user;
        const userRole = (userData?.role || "").toLowerCase().trim();

        const token =
          rawData?.tokens?.access_token ||
          rawData?.token ||
          rawData?.accessToken;
        const refreshToken =
          rawData?.tokens?.refresh_token ||
          rawData?.refresh_token ||
          rawData?.refreshToken;
        let finalAccessToken = token;
        let finalRefreshToken = refreshToken;

        if (token) {
          document.cookie = `auth_token=${token}; path=/; max-age=86400; samesite=strict`;
          localStorage.setItem("access_token", token);
          localStorage.setItem("aces_access_token", token);
        }

        if (refreshToken) {
          document.cookie = `refresh_token=${refreshToken}; path=/; max-age=604800; samesite=strict`;
          localStorage.setItem("refresh_token", refreshToken);
          localStorage.setItem("aces_refresh_token", refreshToken);
        }

        let syncedOrgId = false;

        // Platform roles don't need organization_id sync
        const isPlatformRole = [
          "admin",
          "subadmin",
          "reviewer",
          "auditor",
        ].includes(userRole);

        if (!isPlatformRole) {
          try {
            const orgResponse = await axiosInstance.get(
              "/organization/profile",
              {
                // @ts-expect-error internal flag
                _skipAuthRedirect: true,
              },
            );
            const orgData = orgResponse?.data?.data || orgResponse?.data;
            const orgIdCandidate =
              orgData?.organization_id ??
              orgData?.organizationId ??
              orgData?.id;
            if (typeof window !== "undefined" && orgIdCandidate != null) {
              persistOrganizationId(orgIdCandidate);
              localStorage.setItem("profile_type", "organization");
              syncedOrgId = true;
            }
          } catch (orgErr: unknown) {
            if (
              orgErr &&
              typeof orgErr === "object" &&
              ("status" in orgErr ||
                ("response" in orgErr &&
                  orgErr.response &&
                  typeof orgErr.response === "object" &&
                  "status" in orgErr.response))
            ) {
              const status =
                (orgErr as { status?: number }).status ||
                (orgErr as { response?: { status?: number } }).response?.status;

              if (status === 404) {
                try {
                  const empResponse = await axiosInstance.get(
                    "/employee/my-profile",
                    {
                      // @ts-expect-error internal flag
                      _skipAuthRedirect: true,
                    },
                  );
                  const empData = empResponse?.data?.data || empResponse?.data;
                  const orgIdCandidate = empData?.organization_id;
                  if (typeof window !== "undefined" && orgIdCandidate != null) {
                    persistOrganizationId(orgIdCandidate);
                    localStorage.setItem("profile_type", "employee");
                    syncedOrgId = true;
                  }
                } catch (empErr) {
                  console.warn(
                    "Failed to sync employee profile after login",
                    empErr,
                  );
                }
              } else if (status === 403) {
                // For 403, we just accept that this user doesn't have org/employee profile access
                console.warn(
                  "User does not have access to organization/employee profiles during sync",
                );
              } else {
                console.warn(
                  "Failed to sync organization_id after login",
                  orgErr,
                );
              }
            } else {
              console.warn(
                "Failed to sync organization_id after login",
                orgErr,
              );
            }
          }
        }

        if (syncedOrgId) {
          try {
            const contextRefreshToken =
              localStorage.getItem("aces_refresh_token") ||
              localStorage.getItem("refresh_token");
            const contextOrgId = localStorage.getItem("organization_id");

            if (!contextRefreshToken) {
              throw new Error("Missing refresh_token for post-login refresh");
            }

            const refreshRes = await axios.post(
              "/api/auth/refresh",
              {
                refresh_token: contextRefreshToken,
                ...(contextOrgId &&
                contextOrgId !== "undefined" &&
                contextOrgId !== "null"
                  ? { organization_id: contextOrgId }
                  : {}),
              },
              {
                headers: { "Content-Type": "application/json" },
                withCredentials: true,
              },
            );

            const rawRefreshedData = refreshRes?.data?.data || refreshRes?.data;
            const refreshedTokens =
              rawRefreshedData?.tokens || rawRefreshedData || undefined;

            const refreshedAccess =
              refreshedTokens?.access_token ||
              refreshedTokens?.accessToken ||
              refreshedTokens?.token;
            const refreshedRefresh =
              refreshedTokens?.refresh_token || refreshedTokens?.refreshToken;

            if (typeof window !== "undefined") {
              if (refreshedAccess) {
                finalAccessToken = refreshedAccess;
                window.localStorage.setItem("access_token", refreshedAccess);
                window.localStorage.setItem(
                  "aces_access_token",
                  refreshedAccess,
                );
                document.cookie = `auth_token=${refreshedAccess}; path=/; max-age=86400; samesite=strict`;
              }
              if (refreshedRefresh) {
                finalRefreshToken = refreshedRefresh;
                window.localStorage.setItem("refresh_token", refreshedRefresh);
                window.localStorage.setItem(
                  "aces_refresh_token",
                  refreshedRefresh,
                );
                document.cookie = `refresh_token=${refreshedRefresh}; path=/; max-age=604800; samesite=strict`;
              }
            }
          } catch (refreshErr) {
            console.warn("Post-login token refresh failed", refreshErr);
          }
        }

        const tokensData = rawData?.tokens || {};
        const effectiveTokens = {
          ...tokensData,
          ...(finalAccessToken ? { access_token: finalAccessToken } : {}),
          ...(finalRefreshToken ? { refresh_token: finalRefreshToken } : {}),
        };

        if (userData && effectiveTokens) {
          setAuthData({
            user: userData,
            tokens: effectiveTokens as {
              access_token: string;
              refresh_token: string;
            },
          });
        }

        const storedProfileType =
          typeof window !== "undefined"
            ? localStorage.getItem("profile_type")
            : null;
        const redirectPath =
          storedProfileType === "employee"
            ? "/employee"
            : getRoleRedirectPath(userRole);
        setIsRedirecting(true);
        router.replace(redirectPath);
      } catch (error: unknown) {
        console.error("Login failed:", error);

        const fallbackMessage = "Invalid email or password";
        let message = getApiErrorMessage(error, fallbackMessage);

        if (
          message.includes("Please verify your email with OTP before login")
        ) {
          message = "Please verify your email with OTP before login.";
        }
        let isLockedFromServer = false;

        if (axios.isAxiosError(error)) {
          const normalized = message.toLowerCase();
          if (
            error.response?.status === 429 ||
            normalized.includes("locked") ||
            normalized.includes("too many failed")
          ) {
            isLockedFromServer = true;
          }
        }

        if (isLockedFromServer) {
          const lockoutUntil = Date.now() + LOCKOUT_TIME;
          localStorage.setItem(
            getLockoutKey(values.email),
            lockoutUntil.toString(),
          );
          setGlobalError(message);
        } else {
          handleFailedAttempt(values.email);
          const currentAttempts = parseInt(
            localStorage.getItem(getAttemptsKey(values.email)) || "0",
          );
          if (currentAttempts < MAX_ATTEMPTS) {
            setGlobalError(message);
          }
        }

        setIsRedirecting(false);
        setSubmitting(false);
        resetForm();
      }
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (formik.values.email && checkLockout(formik.values.email)) {
        updateLockoutError(formik.values.email);
      } else if (globalError.includes("locked")) {
        setGlobalError("");
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [formik.values.email, globalError, checkLockout, updateLockoutError]);

  const handleSendVerificationOtp = async () => {
    if (!formik.values.email) {
      setGlobalError("Please enter your email address first.");
      return;
    }

    try {
      setIsSendingOtp(true);
      await axiosInstance.post("/auth/send-otp", {
        email: formik.values.email,
        purpose: "email_verification",
      });
      router.push(
        `/login/verify-email?email=${encodeURIComponent(formik.values.email)}`,
      );
    } catch (err) {
      console.error("Failed to send OTP:", err);
      setGlobalError(
        getApiErrorMessage(err, "Failed to send verification code."),
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  const isVerifyEmailError = globalError.includes("verify your email");

  return (
    <div className="w-full max-w-[95vw] sm:max-w-[80vw] md:max-w-[65vw] lg:max-w-[min(32rem,45vw)] max-h-[90vh] overflow-y-auto scrollbar-hide mx-auto bg-zinc-50 rounded-[clamp(1.5rem,4vw,3.125rem)] px-[clamp(1rem,3vw,1.5rem)] py-[clamp(1.5rem,4vh,2.5rem)] md:px-[clamp(2rem,4vw,3.5rem)] md:py-[clamp(2rem,5vh,3.5rem)] shadow-2xl flex flex-col items-center">
      <Modal
        isOpen={isVerifiedModalOpen}
        onClose={() => setIsVerifiedModalOpen(false)}
        title="Email Verified"
        message="Your email has been successfully verified. You can now log in."
        type="success"
      />
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

      <h1 className="text-[clamp(1.5rem,4vw,1.875rem)] font-semibold text-secondary mb-0">
        Welcome back
      </h1>
      <p className="text-gray text-center mb-[clamp(1.5rem,4vh,2.5rem)] text-[clamp(0.875rem,2vw,1rem)]">
        Sign in to continue your certification journey
      </p>

      {globalError && (
        <div className="w-full mb-4 p-3 bg-red/10 border border-red/20 rounded-lg text-center">
          <p className="text-sm font-semibold text-red">{globalError}</p>
          {isVerifyEmailError && (
            <button
              type="button"
              onClick={handleSendVerificationOtp}
              disabled={isSendingOtp}
              className="mt-2 text-xs font-bold text-secondary underline decoration-2 underline-offset-4 hover:opacity-80 disabled:opacity-50"
            >
              {isSendingOtp ? "Sending code..." : "Verify Email Now"}
            </button>
          )}
        </div>
      )}

      <form onSubmit={formik.handleSubmit} className="w-full flex flex-col">
        <div className="mb-[clamp(1rem,3vh,1.5rem)]">
          <div className="flex justify-between items-center mb-[clamp(0.25rem,1vh,0.5rem)]">
            <label className="block text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary">
              Email Address
            </label>
            {formik.touched.email && formik.errors.email && (
              <span className="text-[clamp(0.625rem,1.5vw,0.75rem)] font-semibold text-red">
                {formik.errors.email}
              </span>
            )}
          </div>
          <Input
            type="email"
            placeholder="user@acescertification.com"
            icon={<AiOutlineMail />}
            {...formik.getFieldProps("email")}
            error={!!(formik.touched.email && formik.errors.email)}
            onChange={(e) => {
              const email = e.target.value;
              formik.handleChange(e);
              if (checkLockout(email)) {
                updateLockoutError(email);
              } else if (globalError && globalError.includes("locked")) {
                setGlobalError("");
              }
            }}
          />
        </div>

        <div className="mb-[clamp(0.25rem,1vh,0.5rem)]">
          <div className="flex justify-between items-center mb-[clamp(0.25rem,1vh,0.5rem)]">
            <label className="block text-[clamp(0.75rem,1.8vw,0.875rem)] font-semibold text-secondary">
              Password
            </label>
            {formik.touched.password && formik.errors.password && (
              <span className="text-[clamp(0.625rem,1.5vw,0.75rem)] font-semibold text-red">
                {formik.errors.password}
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Enter Your Password"
              icon={<MdOutlineLock />}
              {...formik.getFieldProps("password")}
              error={!!(formik.touched.password && formik.errors.password)}
              className="pr-12"
              onChange={(e) => {
                formik.handleChange(e);
                if (globalError && globalError.includes("locked")) {
                  setGlobalError("");
                }
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-[clamp(0.75rem,2vw,1rem)] top-1/2 cursor-pointer -translate-y-1/2 text-gray hover:text-secondary p-1 z-10"
            >
              {showPassword ? (
                <FiEyeOff className="text-[clamp(1rem,2.5vw,1.25rem)]" />
              ) : (
                <FiEye className="text-[clamp(1rem,2.5vw,1.25rem)]" />
              )}
            </button>
          </div>
        </div>

        <Link
          href="/login/forgot-password"
          className="text-[clamp(0.75rem,1.8vw,0.875rem)] font-medium text-secondary hover:underline self-end mb-[clamp(1.5rem,4vh,2rem)]"
        >
          Forgot password?
        </Link>

        <Button
          type="submit"
          isLoading={formik.isSubmitting || isRedirecting}
          loadingText="Logging in..."
          disabled={
            formik.isSubmitting ||
            isRedirecting ||
            (checkLockout(formik.values.email) &&
              globalError.includes("locked"))
          }
        >
          Continue
        </Button>
      </form>

      <div className="text-center text-secondary font-medium mt-[clamp(1.5rem,4vh,2.5rem)] text-[clamp(0.875rem,2vw,1rem)]">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup/create?fresh=true"
          className="font-semibold underline"
          onClick={() => {
            localStorage.removeItem("register_user");
            localStorage.removeItem("signup_draft");
            localStorage.removeItem("email_verified_at");
          }}
        >
          Create Account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}

