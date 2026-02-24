import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { handleApiError } from './api-error';
import { decryptPayloadToJson, encryptJsonToPayload } from './payload-crypto';

export const axiosInstance: AxiosInstance = axios.create({
  baseURL: 'https://aces-test.vercel.app/api',
  timeout: 10000,
});

const PAYLOAD_ENCRYPTION_KEY =
  process.env.NEXT_PUBLIC_API_PAYLOAD_ENCRYPTION_KEY ||
  process.env.API_PAYLOAD_ENCRYPTION_KEY ||
  '';

const PAYLOAD_ENCRYPTION_ENABLED =
  process.env.NEXT_PUBLIC_API_PAYLOAD_ENCRYPTION_ENABLED === 'true' ||
  process.env.API_PAYLOAD_ENCRYPTION_ENABLED === 'true';

function hasEncryptedPayload(data: unknown): data is { payload: string } {
  return (
    !!data &&
    typeof data === 'object' &&
    'payload' in data &&
    typeof (data as { payload: unknown }).payload === 'string'
  );
}

export function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
}


export function setCookie(name: string, value: string, maxAge: number) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; samesite=strict`;
}

function getLatestAccessToken(): string | null {
  if (typeof window === 'undefined') return null;

  const localAccess =
    window.localStorage.getItem('aces_access_token') ||
    window.localStorage.getItem('access_token');

  if (localAccess && localAccess !== 'undefined' && localAccess !== 'null') {
    return localAccess;
  }

  const cookieAccess = getCookie('auth_token');
  return cookieAccess && cookieAccess !== 'undefined' && cookieAccess !== 'null'
    ? cookieAccess
    : null;
}

function getLatestRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;

  const localRefresh =
    window.localStorage.getItem('aces_refresh_token') ||
    window.localStorage.getItem('refresh_token');

  if (localRefresh && localRefresh !== 'undefined' && localRefresh !== 'null') {
    return localRefresh;
  }

  const cookieRefresh = getCookie('refresh_token');
  return cookieRefresh &&
    cookieRefresh !== 'undefined' &&
    cookieRefresh !== 'null'
    ? cookieRefresh
    : null;
}

function persistAccessToken(token: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('access_token', token);
    window.localStorage.setItem('aces_access_token', token);
    const tokensDataRaw = window.localStorage.getItem('tokens_data');
    let tokensData: Record<string, unknown> = {};
    if (tokensDataRaw) {
      try {
        tokensData = JSON.parse(tokensDataRaw) as Record<string, unknown>;
      } catch {
        tokensData = {};
      }
    }
    window.localStorage.setItem(
      'tokens_data',
      JSON.stringify({ ...tokensData, access_token: token }),
    );
  }
  setCookie('auth_token', token, 86400);
}

function persistRefreshToken(token: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('refresh_token', token);
    window.localStorage.setItem('aces_refresh_token', token);
    const tokensDataRaw = window.localStorage.getItem('tokens_data');
    let tokensData: Record<string, unknown> = {};
    if (tokensDataRaw) {
      try {
        tokensData = JSON.parse(tokensDataRaw) as Record<string, unknown>;
      } catch {
        tokensData = {};
      }
    }
    window.localStorage.setItem(
      'tokens_data',
      JSON.stringify({ ...tokensData, refresh_token: token }),
    );
  }
  setCookie('refresh_token', token, 604800);
}

function clearPersistedTokens() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('access_token');
    window.localStorage.removeItem('aces_access_token');
    window.localStorage.removeItem('refresh_token');
    window.localStorage.removeItem('aces_refresh_token');
    window.localStorage.removeItem('tokens_data');
  }
  setCookie('auth_token', '', 0);
  setCookie('refresh_token', '', 0);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);

    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');

    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function tokenHasOrganizationId(token: string | null): boolean {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  const orgId = payload?.organization_id;
  return typeof orgId === 'string' && orgId.trim() !== '';
}

interface TokenResponseData {
  access_token?: string;
  token?: string;
  accessToken?: string;
  refresh_token?: string;
  refreshToken?: string;
}

interface AuthResponse {
  data?: TokenResponseData & { tokens?: TokenResponseData };
  tokens?: TokenResponseData;
  access_token?: string;
  token?: string;
  accessToken?: string;
  refresh_token?: string;
  refreshToken?: string;
}

function extractTokenPair(data: unknown): { access?: string; refresh?: string } {
  const d = data as AuthResponse;
  const refreshData = d?.data || d;
  const refreshTokens = refreshData?.tokens || refreshData || {};
  
  return {
    access:
      refreshTokens?.access_token ||
      refreshTokens?.token ||
      refreshTokens?.accessToken ||
      (refreshData && 'access_token' in refreshData ? (refreshData as {access_token: string}).access_token : undefined),
    refresh:
      refreshTokens?.refresh_token ||
      refreshTokens?.refreshToken ||
      (refreshData && 'refresh_token' in refreshData ? (refreshData as {refresh_token: string}).refresh_token : undefined),
  };
}


axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (!config.headers) {
      config.headers = new axios.AxiosHeaders();
    }

    const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;

    if (isFormData && config.headers) {
      // Axios handles Content-Type automatically for FormData
      config.headers.delete('Content-Type');
      config.headers.delete('content-type');
    }

    if (typeof window !== 'undefined') {
      let token = getLatestAccessToken();
      const isBranchRequest =
        typeof config.url === 'string' &&
        /(^|\/)branches(\/|$|\?)/i.test(config.url) &&
        !config.url.includes('/api/auth/refresh');

      if (isBranchRequest && !tokenHasOrganizationId(token)) {
        const refreshToken = getLatestRefreshToken();
        let orgId = window.localStorage.getItem('organization_id');

        if (!orgId || orgId === 'undefined' || orgId === 'null') {
          try {
            const storedType = window.localStorage.getItem('profile_type');
            if (storedType === 'employee') {
              const empResponse = await axiosInstance.get('/employee/my-profile', {
                // @ts-expect-error - Custom property for interceptor
                _skipAuthRedirect: true,
              });
              const empData = (empResponse?.data as { data?: { organization_id?: string | number } })?.data || (empResponse?.data as { organization_id?: string | number });
              const orgIdCandidate = empData?.organization_id;
              if (orgIdCandidate != null) {
                orgId = String(orgIdCandidate).trim();
              }
            } else {
              try {
                const orgResponse = await axiosInstance.get('/organization/profile', {
                  // @ts-expect-error - Custom property for interceptor
                  _skipAuthRedirect: true,
                });
                const orgData = (orgResponse?.data as { data?: Record<string, unknown> })?.data || (orgResponse?.data as Record<string, unknown>);
                const orgIdCandidate = (orgData?.organization_id ?? orgData?.organizationId ?? orgData?.id) as string | number | undefined;
                if (orgIdCandidate != null) {
                  orgId = String(orgIdCandidate).trim();
                }
              } catch (orgErr: unknown) {
                const status = (orgErr as { status?: number; response?: { status?: number } }).status || (orgErr as { response?: { status?: number } }).response?.status;
                if (status === 404) {
                  const empResponse = await axiosInstance.get('/employee/my-profile', {
                    // @ts-expect-error - Custom property for interceptor
                    _skipAuthRedirect: true,
                  });
                  const empData = (empResponse?.data as { data?: { organization_id?: string | number } })?.data || (empResponse?.data as { organization_id?: string | number });
                  const orgIdCandidate = empData?.organization_id;
                  if (orgIdCandidate != null) {
                    orgId = String(orgIdCandidate).trim();
                  }
                } else {
                  throw orgErr;
                }
              }
            }

            if (orgId) {
              window.localStorage.setItem('organization_id', orgId);
              document.cookie = `organization_id=${encodeURIComponent(orgId)}; path=/; max-age=604800; samesite=strict`;
            }
          } catch (err) {
            console.warn('Failed to resolve organization_id before branch request', err);
          }
        }

        if (refreshToken) {
          try {
            const { data } = await axios.post(
              '/api/auth/refresh',
              {
                refresh_token: refreshToken,
                ...(orgId && orgId !== 'undefined' && orgId !== 'null'
                  ? { organization_id: orgId }
                  : {}),
              },
              {
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true,
              },
            );

            const { access, refresh } = extractTokenPair(data);
            if (access) {
              persistAccessToken(access);
              token = access;
            }
            if (refresh) {
              persistRefreshToken(refresh);
            }
          } catch (e) {
            console.warn('Failed to auto-refresh org-scoped access token', e);
          }
        }

      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    try {
      const method = (config.method || 'get').toLowerCase();
      const hasBody = config.data !== undefined && config.data !== null;

      const shouldEncrypt =
        hasBody &&
        (method === 'post' || method === 'put' || method === 'patch' || (method === 'get' && hasBody));

      const isFormData =
        typeof FormData !== 'undefined' && config.data instanceof FormData;

      if (shouldEncrypt && !isFormData && PAYLOAD_ENCRYPTION_ENABLED && PAYLOAD_ENCRYPTION_KEY) {
        if (!hasEncryptedPayload(config.data)) {
          const payload = await encryptJsonToPayload(config.data, PAYLOAD_ENCRYPTION_KEY);
          config.data = { payload };

          if (config.headers && !config.headers['Content-Type']) {
            config.headers['Content-Type'] = 'application/json';
          }
        }
      }
    } catch (encryptionError) {
      console.error('Request encryption failed', encryptionError);
      return Promise.reject(encryptionError);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _skipAuthRedirect?: boolean;
}

interface FailedRequest {
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};


axiosInstance.interceptors.response.use(
  async (response: AxiosResponse) => {
    try {
      if (PAYLOAD_ENCRYPTION_ENABLED && PAYLOAD_ENCRYPTION_KEY && hasEncryptedPayload(response.data)) {
        const decrypted = await decryptPayloadToJson(response.data.payload, PAYLOAD_ENCRYPTION_KEY);
        response.data = decrypted;
      }
    } catch (decryptionError) {
      console.error('Response decryption failed', decryptionError);
      return Promise.reject(decryptionError);
    }

    return response;
  },
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    try {
      if (PAYLOAD_ENCRYPTION_ENABLED && PAYLOAD_ENCRYPTION_KEY && hasEncryptedPayload(error.response?.data)) {
        const payloadData = error.response.data as { payload: string };
        error.response.data = await decryptPayloadToJson(
          payloadData.payload,
          PAYLOAD_ENCRYPTION_KEY,
        );
      }
    } catch (decryptionError) {
      console.error('Error response decryption failed', decryptionError);
    }

    const originalRequest = error.config as CustomAxiosRequestConfig;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/")
    ) {
      if (isRefreshing) {
        return new Promise<string | null>(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getLatestRefreshToken();

      try {
        const orgId =
          typeof window !== "undefined"
            ? window.localStorage.getItem("organization_id")
            : null;
        const refreshPayload: Record<string, string> = {};
        if (refreshToken) refreshPayload.refresh_token = refreshToken;
        if (orgId && orgId !== "undefined" && orgId !== "null") {
          refreshPayload.organization_id = orgId;
        }

        const { data } = await axios.post("/api/auth/refresh", refreshPayload, {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        });
        const { access: newAccessToken, refresh: newRefreshToken } =
          extractTokenPair(data);

        if (newAccessToken) persistAccessToken(newAccessToken);
        if (newRefreshToken) persistRefreshToken(newRefreshToken);

        if (newAccessToken) {
          axiosInstance.defaults.headers.common["Authorization"] =
            `Bearer ${newAccessToken}`;
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
        }

        processQueue(null, newAccessToken);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearPersistedTokens();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(handleApiError(error));
  },
);
