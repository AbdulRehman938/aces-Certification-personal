"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface LoadingProps {
  isLoading?: boolean;
  progress?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Loading({
  isLoading = true,
  progress,
  size = "md",
  className = "",
}: LoadingProps) {
  const [autoProgress, setAutoProgress] = useState(0);
  const isAuto = progress === undefined;

  useEffect(() => {
    if (!isLoading || !isAuto) {
      setAutoProgress(0);
      return;
    }

    setAutoProgress(0);
    const timer = window.setInterval(() => {
      setAutoProgress((prev) => {
        if (prev >= 92) return prev;
        const next = prev + Math.random() * 8 + 2;
        return Math.min(next, 92);
      });
    }, 250);

    return () => window.clearInterval(timer);
  }, [isLoading, isAuto]);

  const rawProgress = isAuto ? autoProgress : progress ?? 0;
  const displayProgress = Math.min(Math.max(rawProgress, 0), 100);

  const dimensions = {
    sm: 120,
    md: 170,
    lg: 220,
  };

  const width = dimensions[size];
  const strokeWidth = 12;
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className={`flex flex-col items-center justify-center gap-6 p-8 ${className}`}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="relative flex items-center justify-center mt-2"
            style={{ width, height: width }}
          >
            <svg
              width={width}
              height={width}
              viewBox={`0 0 ${width} ${width}`}
              className="transform -rotate-90"
            >
              <circle
                cx={width / 2}
                cy={width / 2}
                r={radius}
                stroke="#E5E5E5"
                strokeWidth={strokeWidth}
                fill="none"
              />

              <motion.circle
                cx={width / 2}
                cy={width / 2}
                r={radius}
                stroke="#1A1A1A"
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                initial={{
                  strokeDasharray: circumference,
                  strokeDashoffset: circumference,
                }}
                animate={{
                  strokeDashoffset:
                    circumference - (displayProgress / 100) * circumference,
                }}
                transition={{ duration: 0.1, ease: "linear" }}
                style={{ strokeDasharray: circumference }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-0.5">
              <span className="text-lg font-bold text-[#1A1A1A] font-archivo">
                {Math.round(displayProgress)}%
              </span>
              <span className="text-[11px] font-medium text-[#737373]">
                Complete
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
