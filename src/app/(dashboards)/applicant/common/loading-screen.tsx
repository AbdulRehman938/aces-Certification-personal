"use client";

import { motion, AnimatePresence } from "framer-motion";

interface LoadingScreenProps {
  isLoading: boolean;
  progress?: number;
  size?: "sm" | "md" | "lg";
}

export function LoadingScreen({
  isLoading,
  progress = 0,
  size = "md",
}: LoadingScreenProps) {
  const displayProgress = Math.min(Math.max(progress, 0), 100);

  const dimensions = {
    sm: 100,
    md: 140,
    lg: 180,
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
          className="flex flex-col items-center justify-center gap-6 p-8"
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex items-center gap-4 mb-2 scale-110 origin-center"
          >
          </motion.div>

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

            <div className="absolute inset-0 flex flex-col items-center justify-center scale-[0.8]">
              <span className="text-4xl font-black text-[#1A1A1A] tracking-tight leading-none">
                ACES
              </span>
              <span className="text-2xl font-normal text-[#1A1A1A] leading-none tracking-tight">
                Certification
              </span>
                <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-[#525252] text-[15px] font-medium tracking-wide translate-y-2"
          >
            Please wait
          </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
