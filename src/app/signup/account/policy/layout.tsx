"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";

export default function PolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isPrivacyActive = pathname?.includes("/privacy");
  const isTermsActive = !isPrivacyActive;

  const handleTermsClick = () => {
    router.push("/signup/account/policy/terms");
  };

  const handlePrivacyClick = () => {
    router.push("/signup/account/policy/privacy");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="sticky top-0 z-30 w-full bg-white shadow-sm">
        <div className="border-b border-gray-100">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1A1A1A] text-white">
                <span className="text-xl font-semibold">C</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-semibold leading-none text-[#1A1A1A]">
                  ACES
                </span>
                <span className="text-sm text-gray/60">Certification</span>
              </div>
            </Link>

           
            <div className="hidden max-w-lg flex-1 lg:flex lg:px-12">
              <div className="relative flex w-full items-center rounded-xl border border-gray-200 bg-white p-1 pl-4 shadow-sm transition-all focus-within:ring-2 focus-within:ring-secondary/10 hover:border-gray-300">
                <input
                  type="text"
                  placeholder="Search an organization or certificate"
                  className="flex-1 bg-transparent text-sm text-secondary placeholder:text-gray/40 focus:outline-none"
                />
                <button className="ml-2 rounded-lg bg-[#2F2F2F] px-5 py-2 text-xs font-semibold text-white shadow-lg transition-transform active:scale-95">
                  Search
                </button>
              </div>
            </div>

           {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button
                  variant="secondary"
                  className="h-10 rounded-lg border border-gray-200 px-6 font-semibold bg-white text-secondary hover:bg-gray-50"
                >
                  Login
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  variant="primary"
                  className="h-10 rounded-lg bg-[#2F2F2F] px-6 font-semibold text-white shadow-lg hover:bg-black"
                >
                  Register
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Subheader */}
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={handleTermsClick}
              className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-all ${
                isTermsActive
                  ? "bg-[#2F2F2F] text-white shadow-md"
                  : "bg-transparent text-secondary hover:bg-gray-50"
              }`}
            >
              Terms of Service
            </button>
            <button
              onClick={handlePrivacyClick}
              className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-all ${
                isPrivacyActive
                  ? "bg-[#2F2F2F] text-white shadow-md"
                  : "bg-transparent text-secondary hover:bg-gray-50"
              }`}
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:pt-3">
        {/* Content Area */}
        <div className="mb-12 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5 md:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}

