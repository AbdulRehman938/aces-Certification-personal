"use client";

import React from "react";

type AlertPopProps = {
  isOpen: boolean;
  title: string;
  subText: string;
  buttonTitle: string;
  onPress: () => void;
  onClose: () => void;
};

export default function AlertPop({
  isOpen,
  title,
  subText,
  buttonTitle,
  onPress,
  onClose,
}: AlertPopProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl mx-2 md:mx-4">
        <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2
                className="text-[16px] md:text-[18px] font-semibold text-secondary mb-1 leading-[21.6px] align-middle"
                style={{ letterSpacing: "0%" }}
              >
                {title}
              </h2>
              <p
                className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px] align-middle"
                style={{ letterSpacing: "0%" }}
              >
                {subText}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.46995 5.47001C5.61058 5.32956 5.8012 5.25067 5.99995 5.25067C6.1987 5.25067 6.38933 5.32956 6.52995 5.47001L18.53 17.47C18.6036 17.5387 18.6627 17.6215 18.7037 17.7135C18.7447 17.8055 18.7668 17.9048 18.7685 18.0055C18.7703 18.1062 18.7518 18.2062 18.7141 18.2996C18.6764 18.393 18.6202 18.4778 18.549 18.549C18.4778 18.6203 18.3929 18.6764 18.2995 18.7141C18.2062 18.7519 18.1061 18.7704 18.0054 18.7686C17.9047 18.7668 17.8054 18.7448 17.7134 18.7038C17.6214 18.6628 17.5386 18.6037 17.4699 18.53L5.46995 6.53001C5.3295 6.38939 5.25061 6.19876 5.25061 6.00001C5.25061 5.80126 5.3295 5.61064 5.46995 5.47001Z"
                  fill="#262626"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M18.53 5.47001C18.6704 5.61064 18.7493 5.80126 18.7493 6.00001C18.7493 6.19876 18.6704 6.38939 18.53 6.53001L6.52997 18.53C6.38779 18.6625 6.19975 18.7346 6.00545 18.7312C5.81114 18.7278 5.62576 18.649 5.48835 18.5116C5.35093 18.3742 5.27222 18.1888 5.26879 17.9945C5.26537 17.8002 5.33749 17.6122 5.46997 17.47L17.47 5.47001C17.6106 5.32956 17.8012 5.25067 18 5.25067C18.1987 5.25067 18.3893 5.32956 18.53 5.47001Z"
                  fill="#262626"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="border-t border-zinc-100" />

        <div className="px-4 md:px-6 pb-4 md:pb-6 pt-4 flex items-center justify-end">
          <button
            onClick={onPress}
            className="px-8 md:px-[52px] py-2 md:py-2.5 bg-secondary text-white rounded-lg text-xs md:text-sm font-medium hover:bg-secondary/90 transition-colors"
          >
            {buttonTitle}
          </button>
        </div>
      </div>
    </div>
  );
}
