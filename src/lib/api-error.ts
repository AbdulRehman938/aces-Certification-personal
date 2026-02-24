import axios, { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  errors?: Record<string, string[]>;
}

export const handleApiError = (error: AxiosError<{ message?: string; code?: string; errors?: Record<string, string[]> } | undefined>): ApiError => {
  const status = error.response?.status;
  const data = error.response?.data;

  const normalizedError: ApiError = {
    message: data?.message || error.message || 'An unexpected error occurred',
    status,
    code: data?.code || 'UNKNOWN_ERROR',
    errors: data?.errors,
  };

  if (status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('auth_token');
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('[API Error]:', normalizedError.message, normalizedError);
  }

  return normalizedError;
};

export const getApiErrorMessage = (error: unknown, fallback = 'An unexpected error occurred'): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === 'string' && data.trim()) {
      return data;
    }

    if (data && typeof data === 'object') {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }
  } else if (error instanceof Error && typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  } else if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string' &&
    (error as { message: string }).message.trim()
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
};
