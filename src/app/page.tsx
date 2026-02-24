"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/app/(dashboards)/admin/common/button";
import LandingHeader from "./components/landingPage/header";
import Footer from "./components/landingPage/footer";

export default function Home() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");

  const handleSearch = () => {
    const trimmed = searchValue.trim();
    const target = trimmed
      ? `/search?q=${encodeURIComponent(trimmed)}`
      : "/search";
    router.push(target);
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] px-4 py-6 text-slate-900 flex flex-col">
      <LandingHeader showSearch={false} />

      <main className="flex-1 flex flex-col items-center justify-center">
        <div className="mx-auto mt-10 w-full max-w-4xl rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-md sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex w-full items-center gap-3 sm:flex-1">
              <span className="flex h-10 w-10 items-center justify-center text-slate-500">
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
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSearch();
                  }
                }}
                className="w-full flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none sm:text-base"
              />
            </div>
            <Button
              variant="primary"
              className="w-full text-xs sm:w-28 sm:text-sm"
              onClick={handleSearch}
            >
              Search
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-6 flex w-full max-w-4xl flex-col items-center gap-4 text-xs text-slate-500 sm:flex-row sm:flex-nowrap sm:justify-center sm:gap-10 sm:text-sm">
          <div className="flex items-center gap-3">
            <svg
              width="21"
              height="21"
              viewBox="0 0 21 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M10.4865 19.0287C10.4234 19.0518 10.3541 19.0518 10.2909 19.0287C9.45114 18.7344 3.46289 16.3969 3.46289 9.74121V3.72612C3.46271 3.64875 3.48844 3.57355 3.53599 3.51251C3.58353 3.45148 3.65015 3.40812 3.72521 3.38936L10.3047 1.74187C10.3599 1.72809 10.4176 1.72809 10.4727 1.74187L17.0522 3.38936C17.1273 3.40812 17.1939 3.45148 17.2415 3.51251C17.289 3.57355 17.3147 3.64875 17.3146 3.72612V9.74121C17.3146 16.4636 11.3272 18.7422 10.4865 19.0296V19.0287Z"
                stroke="#999999"
                strokeWidth="1.29859"
                strokeMiterlimit="10"
                strokeLinejoin="round"
              />
            </svg>
            <span>Verified certification data</span>
          </div>

          <div className="flex items-center gap-3">
            <svg
              width="21"
              height="21"
              viewBox="0 0 21 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M18.505 11.3627C17.8557 14.6092 15.408 17.6656 11.9722 18.349C8.53638 19.0324 5.04981 17.4343 3.3248 14.3853C1.59979 11.3364 2.02565 7.52473 4.38102 4.93167C6.7364 2.3386 10.7134 1.62323 13.9599 2.92182"
                stroke="#999999"
                strokeWidth="1.29859"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7.46704 10.0641L10.7135 13.3106L18.5051 4.86972"
                stroke="#999999"
                strokeWidth="1.29859"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Independently audited</span>
          </div>

          <div className="flex items-center gap-3">
            <svg
              width="21"
              height="21"
              viewBox="0 0 21 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <g clipPath="url(#clip0_669_545)">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M9.5057 0.0376275C11.2987 -0.115384 13.1007 0.19996 14.7351 0.952769C16.3696 1.70558 17.7805 2.87004 18.8296 4.33208V2.27251C18.8296 2.0142 18.9322 1.76647 19.1149 1.58382C19.2975 1.40117 19.5452 1.29856 19.8035 1.29856C20.0619 1.29856 20.3096 1.40117 20.4922 1.58382C20.6749 1.76647 20.7775 2.0142 20.7775 2.27251V7.79153H15.2585C15.0002 7.79153 14.7524 7.68892 14.5698 7.50627C14.3871 7.32362 14.2845 7.07589 14.2845 6.81758C14.2845 6.55928 14.3871 6.31155 14.5698 6.1289C14.7524 5.94625 15.0002 5.84364 15.2585 5.84364H17.5011C16.6131 4.45402 15.3373 3.355 13.8316 2.68233C12.3259 2.00966 10.6561 1.79282 9.02845 2.05858C7.40084 2.32435 5.88674 3.06108 4.67317 4.17777C3.45961 5.29447 2.59975 6.7422 2.19982 8.34213C2.17032 8.46781 2.11613 8.58637 2.04039 8.69092C1.96466 8.79547 1.8689 8.88392 1.75868 8.95113C1.64846 9.01834 1.52597 9.06296 1.39835 9.08241C1.27073 9.10185 1.14051 9.09573 1.01527 9.0644C0.890036 9.03307 0.772278 8.97715 0.668845 8.8999C0.565412 8.82265 0.478369 8.72561 0.412777 8.61442C0.347185 8.50323 0.304353 8.38011 0.286771 8.25222C0.26919 8.12432 0.277209 7.99421 0.310364 7.86944C0.835702 5.76887 2.00425 3.88494 3.65267 2.48099C5.3011 1.07704 7.347 0.223236 9.50441 0.0389261L9.5057 0.0376275ZM5.09049 19.3243C6.48256 20.1494 8.04814 20.6379 9.66242 20.7509C11.2767 20.8638 12.895 20.5981 14.3885 19.9749C15.8819 19.3516 17.209 18.3882 18.2642 17.1612C19.3193 15.9343 20.0732 14.4779 20.4658 12.908C20.5243 12.6589 20.4824 12.3968 20.3492 12.1784C20.216 11.96 20.0022 11.8027 19.754 11.7406C19.5058 11.6785 19.2432 11.7166 19.0228 11.8466C18.8024 11.9766 18.6421 12.188 18.5764 12.4353C18.1762 14.0349 17.3163 15.4823 16.1029 16.5987C14.8894 17.7151 13.3756 18.4516 11.7482 18.7174C10.1209 18.9831 8.45136 18.7664 6.9458 18.094C5.44024 17.4216 4.16458 16.323 3.27635 14.9338H5.51902C5.77733 14.9338 6.02505 14.8312 6.20771 14.6485C6.39036 14.4659 6.49297 14.2182 6.49297 13.9598C6.49297 13.7015 6.39036 13.4538 6.20771 13.2712C6.02505 13.0885 5.77733 12.9859 5.51902 12.9859H0V18.5049C0 18.7632 0.102612 19.011 0.285262 19.1936C0.467912 19.3763 0.715639 19.4789 0.973945 19.4789C1.23225 19.4789 1.47998 19.3763 1.66263 19.1936C1.84528 19.011 1.94789 18.7632 1.94789 18.5049V16.4454C2.7852 17.6119 3.85525 18.5922 5.09049 19.3243Z"
                  fill="#999999"
                />
              </g>
              <defs>
                <clipPath id="clip0_669_545">
                  <rect width="20.7775" height="20.7775" fill="white" />
                </clipPath>
              </defs>
            </svg>
            <span>Real-time status updates</span>
          </div>
        </div>

        <div className="mx-auto mt-10 flex w-full flex-col items-center gap-3 text-center sm:flex-row sm:justify-center sm:gap-10">
          <div className="space-y-0.5">
            <p className="text-2xl font-semibold text-dull-gray sm:text-3xl md:text-4xl">
              2,500+
            </p>
            <p
              className="text-sm text-slate-500 sm:text-base md:text-lg"
              style={{ color: "#999999" }}
            >
              Organizations
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-2xl font-semibold text-dull-gray sm:text-3xl md:text-4xl">
              5,000+
            </p>
            <p
              className="text-sm text-slate-500 sm:text-base md:text-lg"
              style={{ color: "#999999" }}
            >
              Certificates
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-2xl font-semibold text-dull-gray sm:text-3xl md:text-4xl">
              45+
            </p>
            <p
              className="text-sm text-slate-500 sm:text-base md:text-lg"
              style={{ color: "#999999" }}
            >
              Countries
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
