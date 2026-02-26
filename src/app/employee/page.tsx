"use client";

import { Suspense, useEffect } from "react";
import axios from "axios";
import { EmployeeDashboardPage } from "./modules/dashboard";
import { useUser } from "@/contexts/UserContext";
import { axiosInstance } from "@/lib/axios";
import { persistOrganizationId } from "@/lib/auth-utils";

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const payloadJson = atob(padded);
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

function shouldRefreshAccessToken(accessToken: string | null): boolean {
  if (!accessToken) return true;
  const payload = decodeJwtPayload(accessToken);
  if (!payload?.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  const secondsRemaining = payload.exp - now;
  return secondsRemaining <= 5 * 60;
}

function TokenRefresher() {
  const { setTokens } = useUser();

  useEffect(() => {
    const refreshAuth = async () => {
      try {
        const currentAccessToken =
          localStorage.getItem("aces_access_token") ||
          localStorage.getItem("access_token");

        if (!shouldRefreshAccessToken(currentAccessToken)) return;

        let refreshToken =
          localStorage.getItem("aces_refresh_token") ||
          localStorage.getItem("refresh_token");

        if (!refreshToken) {
          const tokensData = localStorage.getItem("tokens_data");
          if (tokensData) {
            try {
              const parsed = JSON.parse(tokensData);
              refreshToken = parsed.refresh_token;
            } catch (e) {
              console.error("Error parsing tokens_data", e);
            }
          }
        }

        if (!refreshToken) return;

        let organizationId = localStorage.getItem("organization_id");
        if (!organizationId) {
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
            if (orgIdCandidate != null) {
              organizationId = String(orgIdCandidate);
              persistOrganizationId(organizationId);
            }
          } catch (orgErr) {
            console.warn(
              "Failed to load organization_id before refresh",
              orgErr,
            );
          }
        }

        const response = await axios.post(
          "/api/auth/refresh",
          {
            refresh_token: refreshToken,
            ...(organizationId &&
            organizationId !== "undefined" &&
            organizationId !== "null"
              ? { organization_id: organizationId }
              : {}),
          },
          {
            headers: { "Content-Type": "application/json" },
            withCredentials: true,
          },
        );

        const data = response.data?.data || response.data;
        const tokens = data?.tokens || data;

        if (tokens && tokens.access_token && tokens.refresh_token) {
          setTokens(tokens);
          localStorage.setItem("access_token", tokens.access_token);
          localStorage.setItem("aces_access_token", tokens.access_token);
          localStorage.setItem("refresh_token", tokens.refresh_token);
          localStorage.setItem("aces_refresh_token", tokens.refresh_token);

          document.cookie = `auth_token=${tokens.access_token}; path=/; max-age=86400; samesite=strict`;
          document.cookie = `refresh_token=${tokens.refresh_token}; path=/; max-age=604800; samesite=strict`;
        }
      } catch (error) {
        console.error("Token refresh failed", error);
      }
    };

    const interval = setInterval(refreshAuth, 60 * 1000);

    return () => clearInterval(interval);
  }, [setTokens]);

  return null;
}

export default function EmployeePage() {
  return (
    <Suspense>
      <TokenRefresher />
      <EmployeeDashboardPage />
    </Suspense>
  );
}
