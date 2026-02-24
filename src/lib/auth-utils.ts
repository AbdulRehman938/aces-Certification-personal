/**
 * Authentication utilities for server-side and client-side use
 * 
 * This file contains utilities that can be used in middleware and API routes
 * to access user data from tokens/cookies.
 * 
 * For client-side React components, use the UserContext (useUser hook) instead.
 */

import { NextRequest } from 'next/server';

/**
 * Token payload structure
 */
export interface DecodedToken {
  role?: string;
  sub?: {
    role?: string;
  };
  [key: string]: unknown;
}

/**
 * Decode JWT token (client-side only, for basic info)
 * Note: In production, verify tokens on the server side
 */
export function decodeToken(token: string): DecodedToken | null {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}

/**
 * Get user data from request cookies (for middleware/API routes)
 * 
 * Future integration: When API endpoint is available, you can fetch user data like this:
 * 
 * ```typescript
 * export async function getUserFromRequest(request: NextRequest) {
 *   const token = request.cookies.get('auth_token')?.value;
 *   if (!token) return null;
 * 
 *   try {
 *     const response = await fetch(`${process.env.API_URL}/auth/me`, {
 *       headers: {
 *         Authorization: `Bearer ${token}`,
 *       },
 *     });
 *     
 *     if (response.ok) {
 *       const data = await response.json();
 *       return data.user;
 *     }
 *   } catch (error) {
 *     console.error('Error fetching user:', error);
 *   }
 *   
 *   return null;
 * }
 * ```
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get('auth_token')?.value || null;
}

/**
 * Get user role from token (basic extraction, not verified)
 * For production, verify token signature on server
 */
export function getUserRoleFromToken(token: string): string | null {
  const decoded = decodeToken(token);
  return decoded?.role || decoded?.sub?.role || null;
}
/**
 * Get the redirect path for a given user role
 */
export function getRoleRedirectPath(role: string | null | undefined): string {
  const normalizedRole = (role || '').toLowerCase().trim();
  
  switch (normalizedRole) {
    case 'admin':
    case 'subadmin':
      return '/admin';
    case 'organization_member':
    case 'employee':
    case 'member':
      return '/employee';
    case 'organization':
    case 'applicant':
      return '/applicant';
    case 'reviewer':
      return '/reviewer';
    case 'auditor':
      return '/auditor';
    default:
      return '/applicant';
  }
}

export function persistOrganizationId(orgId: string | number | null | undefined) {
  if (typeof window === 'undefined') {
    return;
  }

  const resolved = orgId == null ? null : String(orgId).trim();

  if (!resolved) {
    window.localStorage.removeItem('organization_id');
    document.cookie = 'organization_id=; path=/; max-age=0; samesite=strict';
    window.dispatchEvent(new Event('organization-id-updated'));
    window.dispatchEvent(new Event('profile-updated'));
    return;
  }

  window.localStorage.setItem('organization_id', resolved);
  document.cookie = `organization_id=${encodeURIComponent(resolved)}; path=/; max-age=604800; samesite=strict`;
  window.dispatchEvent(new Event('organization-id-updated'));
  window.dispatchEvent(new Event('profile-updated'));
}
