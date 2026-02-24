"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { usePathname } from "next/navigation";
import { axiosInstance } from "@/lib/axios";

export interface User {
  id: string;
  email: string;
  role: string;
  email_verified: boolean;
  is_active: boolean;
  is_deleted: boolean;
  is_verified: boolean;
  last_login: string;
  login_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
}

export interface Profile {
  id: string;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role: string;
  profile_picture?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  accountStatus?: boolean;
  accountstatus?: boolean;
  assigned_certificates?: string[];
  status?: string;
  tags?: string[];
  permissions?: string[];
  is_active?: boolean;
  is_verified?: boolean;
  email_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
}

export interface AuthData {
  user: User | null;
  tokens: Tokens | null;
}

interface UserContextType {
  user: User | null;
  tokens: Tokens | null;
  profile: Profile | null;
  setUser: (user: User | null) => void;
  setTokens: (tokens: Tokens | null) => void;
  setProfile: (profile: Profile | null) => void;
  setAuthData: (data: AuthData) => void;
  fetchProfile: () => Promise<void>;
  clearAuth: () => void;
  isAuthenticated: boolean;
  isLoadingProfile: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const hasFetchedProfileOnLoad = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user_data");
      const storedTokens = localStorage.getItem("tokens_data");
      const storedProfile = localStorage.getItem("profile_data");

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (error) {
          console.error("Error parsing stored user data:", error);
          localStorage.removeItem("user_data");
        }
      }

      if (storedTokens) {
        try {
          setTokens(JSON.parse(storedTokens));
        } catch (error) {
          console.error("Error parsing stored tokens:", error);
          localStorage.removeItem("tokens_data");
        }
      }

      if (storedProfile) {
        try {
          setProfile(JSON.parse(storedProfile));
        } catch (error) {
          console.error("Error parsing stored profile data:", error);
          localStorage.removeItem("profile_data");
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (user) {
        localStorage.setItem("user_data", JSON.stringify(user));
      } else {
        localStorage.removeItem("user_data");
      }
    }
  }, [user]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (tokens) {
        localStorage.setItem("tokens_data", JSON.stringify(tokens));
      } else {
        localStorage.removeItem("tokens_data");
      }
    }
  }, [tokens]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (profile) {
        localStorage.setItem("profile_data", JSON.stringify(profile));
      } else {
        localStorage.removeItem("profile_data");
      }
    }
  }, [profile]);

  const fetchProfile = useCallback(async () => {
    if (pathname === "/login") {
      return;
    }

    if (!tokens?.access_token && typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (!token) {
        return;
      }
    }

    setIsLoadingProfile(true);
    try {
      const response = await axiosInstance.get("/auth/me");
      const data = response.data?.data || response.data;

      if (data) {
        const profileData: Profile = {
          id: data.id || "",
          user_id: data.user_id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          role: data.role || "",
          profile_picture: data.profile_picture || null,
          country: data.country || null,
          state: data.state || null,
          city: data.city || null,
          accountStatus: data.accountStatus ?? data.accountstatus,
          accountstatus: data.accountstatus ?? data.accountStatus,
          assigned_certificates: data.assigned_certificates,
          status: data.status,
          tags: data.tags,
          permissions: data.permissions,
          is_active: data.is_active,
          is_verified: data.is_verified,
          email_verified: data.email_verified,
          created_at: data.created_at,
          updated_at: data.updated_at,
          last_login: data.last_login,
        };
        setProfile(profileData);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [pathname, tokens?.access_token]);

  useEffect(() => {
    const isAuth = !!user && !!tokens;
    if (
      !isAuth ||
      isLoadingProfile ||
      hasFetchedProfileOnLoad.current ||
      pathname === "/login"
    ) {
      return;
    }

    hasFetchedProfileOnLoad.current = true;
    fetchProfile();
  }, [user, tokens, isLoadingProfile, pathname, fetchProfile]);

  const setAuthData = useCallback((data: AuthData) => {
    hasFetchedProfileOnLoad.current = false;
    setUser(data.user);
    setTokens(data.tokens);
  }, []);

  const clearAuth = useCallback(() => {
    hasFetchedProfileOnLoad.current = false;
    setUser(null);
    setTokens(null);
    setProfile(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("user_data");
      localStorage.removeItem("tokens_data");
      localStorage.removeItem("profile_data");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("aces_access_token");
      localStorage.removeItem("aces_refresh_token");
      localStorage.removeItem("organization_profile");
      localStorage.removeItem("profile_type");
      localStorage.removeItem("organization_id");
      document.cookie = "auth_token=; path=/; max-age=0";
      document.cookie = "refresh_token=; path=/; max-age=0";
      document.cookie = "organization_id=; path=/; max-age=0";
    }
  }, []);

  const value: UserContextType = useMemo(
    () => ({
      user,
      tokens,
      profile,
      setUser,
      setTokens,
      setProfile,
      setAuthData,
      fetchProfile,
      clearAuth,
      isAuthenticated: !!user && !!tokens,
      isLoadingProfile,
    }),
    [
      user,
      tokens,
      profile,
      setAuthData,
      fetchProfile,
      clearAuth,
      isLoadingProfile,
    ],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
