"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Button from "@/app/(dashboards)/admin/common/button";

type LandingHeaderProps = {
  showSearch?: boolean;
};

function LandingHeaderContent({ showSearch = true }: LandingHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(queryParam);

  useEffect(() => {
    setQuery(queryParam);
  }, [queryParam]);

  const handleSearch = () => {
    const trimmed = query.trim();
    const target = trimmed
      ? `/search?q=${encodeURIComponent(trimmed)}`
      : "/search";
    router.push(target);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 lg:flex-nowrap">
      <div className="flex items-center gap-3">
        <img
          src="/assets/imgs/admin/dashboard/logo.svg"
          alt="ACES Certification"
          className="h-10 w-auto max-w-[140px] sm:h-14 sm:max-w-none"
        />
      </div>
      {showSearch && (
        <div className="order-last flex w-full justify-center px-2 lg:order-none lg:flex-1">
          <div className="flex w-full max-w-lg items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-md lg:max-w-xl">
            <span className="flex h-7 w-7 items-center justify-center text-slate-500">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M9.51562 3C10.6719 3 11.75 3.28906 12.75 3.86719C13.75 4.44531 14.5391 5.23438 15.1172 6.23438C15.6953 7.23438 15.9844 8.32812 15.9844 9.51562C15.9844 11.1094 15.4688 12.5156 14.4375 13.7344L14.7188 14.0156H15.5156L20.4844 18.9844L18.9844 20.4844L14.0156 15.5156V14.7188L13.7344 14.4375C12.5156 15.4688 11.1094 15.9844 9.51562 15.9844C8.32812 15.9844 7.23438 15.6953 6.23438 15.1172C5.23438 14.5391 4.44531 13.75 3.86719 12.75C3.28906 11.75 3 10.6641 3 9.49219C3 8.32031 3.28906 7.23438 3.86719 6.23438C4.44531 5.23438 5.23438 4.44531 6.23438 3.86719C7.23438 3.28906 8.32812 3 9.51562 3ZM9.51562 5.01562C8.26562 5.01562 7.20312 5.45312 6.32812 6.32812C5.45312 7.20312 5.01562 8.26562 5.01562 9.51562C5.01562 10.7656 5.45312 11.8281 6.32812 12.7031C7.20312 13.5781 8.26562 14.0156 9.51562 14.0156C10.7656 14.0156 11.8281 13.5781 12.7031 12.7031C13.5781 11.8281 14.0156 10.7656 14.0156 9.51562C14.0156 8.26562 13.5781 7.20312 12.7031 6.32812C11.8281 5.45312 10.7656 5.01562 9.51562 5.01562Z"
                  fill="#4A5A6B"
                  fillOpacity="0.75"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search an organization or certificate"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSearch();
                }
              }}
              className="w-full flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
            <Button
              variant="primary"
              className="w-20 text-xs sm:w-24"
              onClick={handleSearch}
            >
              Search
            </Button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant="secondary"
          className="w-24 text-xs sm:w-32 sm:text-sm md:w-40 md:text-base"
          onClick={() => router.push("/login")}
        >
          Login
        </Button>
        <Button
          variant="primary"
          className="w-24 py-2.25 text-xs sm:w-32 sm:text-sm md:w-40 md:text-base"
          onClick={() => router.push("/signup/create?fresh=true")}
        >
          Register
        </Button>
      </div>
    </div>
  );
}

export default function LandingHeader(props: LandingHeaderProps) {
  return (
    <Suspense fallback={null}>
      <LandingHeaderContent {...props} />
    </Suspense>
  );
}
