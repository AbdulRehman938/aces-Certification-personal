import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getUserRoleFromToken, getRoleRedirectPath } from '@/lib/auth-utils';

const protectedRoutes = ['/admin', '/applicant', '/employee', '/reviewer', '/auditor', '/dashboard'];
const authRoutes = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get('auth_token')?.value;
  const userRole = authToken ? getUserRoleFromToken(authToken) : null;

  
  if (pathname === '/') {
    if (authToken) {
      return NextResponse.redirect(
        new URL(getRoleRedirectPath(userRole), request.url),
      );
    }

    return NextResponse.next();
  }

  
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  if (isProtectedRoute && !authToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const isAuthRoute = authRoutes.some(
    route => pathname === route || pathname.startsWith(`${route}/`),
  );
  const allowSignupOnboarding = pathname === '/signup/personal-info';
  if (isAuthRoute && authToken && !allowSignupOnboarding) {
    return NextResponse.redirect(
      new URL(getRoleRedirectPath(userRole), request.url),
    );
  }

  
  if (pathname === '/login/verify-code') {
    if (!request.cookies.get('reset_session_id')?.value) {
      return NextResponse.redirect(new URL('/login/forgot-password', request.url));
    }
  }

  if (pathname === '/login/reset-password') {
    if (!request.cookies.get('reset_auth_token')?.value) {
      return NextResponse.redirect(new URL('/login/forgot-password', request.url));
    }
  }

  if (authToken && userRole) {
    const redirectPathPrefix = getRoleRedirectPath(userRole);
    
    if (redirectPathPrefix === '/employee' && pathname.startsWith('/applicant')) {
      const newPathname = pathname.replace('/applicant', '/employee');
      return NextResponse.redirect(new URL(newPathname, request.url));
    }
    
    if (redirectPathPrefix === '/applicant' && pathname.startsWith('/employee')) {
      const newPathname = pathname.replace('/employee', '/applicant');
      return NextResponse.redirect(new URL(newPathname, request.url));
    }
  }

  
  if (pathname === '/signup/account' || pathname === '/signup/verify-email') {
    if (!request.cookies.get('signup_session')?.value) {
      return NextResponse.redirect(new URL('/signup/organisation-info', request.url));
    }
  }

  if (pathname === '/signup/personal-info') {
    if (!request.cookies.get('signup_verified')?.value && !authToken) {
      return NextResponse.redirect(new URL('/signup/organisation-info', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|assets).*)',
  ],
};
