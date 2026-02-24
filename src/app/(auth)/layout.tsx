"use client";

import Image from "next/image";
import AuthTransition from "./transition";
import { usePathname } from "next/navigation";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPolicyPage = pathname?.startsWith("/signup/account/policy");

  if (isPolicyPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center py-[clamp(1rem,3vh,3rem)] px-[clamp(0.5rem,2vw,2rem)] relative md:overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image
          src="/assets/imgs/login/authbg.png"
          alt="Auth Background"
          fill
          className="object-cover object-center"
          loading="lazy"
          placeholder="blur"
          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/+F9PQAI8wNPvd7POQAAAABJRU5ErkJggg=="
        />
      </div>
      <AuthTransition>{children}</AuthTransition>
    </div>
  );
}
