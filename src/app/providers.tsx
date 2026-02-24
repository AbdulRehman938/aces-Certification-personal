"use client";

import React, { useEffect, useMemo } from "react";
import { Provider } from "react-redux";
import { UserProvider } from "@/contexts/UserContext";
import { makeStore } from "@/store/store";
import { hydrateSignup } from "@/store/signupSlice";

const SIGNUP_SESSION_KEY = "aces_signup_state_v1";

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [store] = React.useState(() => makeStore());

  const initialHydration = useMemo(() => {
    if (typeof window === "undefined") return null;
    const parsed = safeJsonParse<{ signup?: unknown }>(
      window.sessionStorage.getItem(SIGNUP_SESSION_KEY),
    );
    return parsed?.signup ?? null;
  }, []);

  useEffect(() => {
    if (!initialHydration) return;
    store.dispatch(hydrateSignup(initialHydration));
  }, [store, initialHydration]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeout: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = store.subscribe(() => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        const state = store.getState();
        window.sessionStorage.setItem(
          SIGNUP_SESSION_KEY,
          JSON.stringify({ signup: state.signup }),
        );
      }, 150);
    });

    return () => {
      unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
  }, [store]);

  return (
    <Provider store={store}>
      <UserProvider>{children}</UserProvider>
    </Provider>
  );
}

export function clearSignupSessionStorage() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SIGNUP_SESSION_KEY);
}
