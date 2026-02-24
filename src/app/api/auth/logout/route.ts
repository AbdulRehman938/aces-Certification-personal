import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true }, { status: 200 });
  const cookieOptions = {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };

  res.cookies.set("auth_token", "", cookieOptions);
  res.cookies.set("refresh_token", "", cookieOptions);

  return res;
}
