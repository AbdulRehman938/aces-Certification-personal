"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, rightElement, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray text-xl pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full h-14 pl-4 pr-4 rounded-xl border border-zinc-200 text-secondary placeholder:text-gray/50 focus:outline-none focus:ring-2 focus:ring-secondary/5 transition-all text-sm font-medium",
            icon && "pl-12",
            rightElement && "pr-12",
            error && "border-red focus:ring-red/5",
            className,
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  isLoading?: boolean;
  loadingText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "secondary",
      isLoading,
      loadingText,
      children,
      ...props
    },
    ref,
  ) => {
    const variants = {
      primary: "bg-primary text-secondary border border-zinc-200",
      secondary:
        "bg-secondary text-primary shadow-[inset_0_0_20px_6px_rgba(255,255,255,0.40),0_10px_20px_rgba(0,0,0,0.2)]",
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={cn(
          "w-full h-14 cursor-pointer hover:scale-[1.02] hover:bg-secondary/90 active:scale-[0.98] rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            {loadingText || "Processing..."}
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = "Button";

import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle, AlertCircle } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  type?: "default" | "error" | "success";
  children?: React.ReactNode;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  message,
  type = "default",
  children,
}: ModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-999 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-4xl bg-white p-6 shadow-2xl md:p-8"
          >
            <button
              onClick={onClose}
              className="absolute right-6 top-6 rounded-full bg-zinc-100 p-2 text-zinc-500 hover:bg-zinc-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              {type === "success" && (
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <CheckCircle className="h-8 w-8" />
                </div>
              )}
              {type === "error" && (
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red/10 text-red">
                  <AlertCircle className="h-8 w-8" />
                </div>
              )}

              <h3 className="mb-2 text-2xl font-semibold text-secondary">
                {title}
              </h3>
              {message && (
                <p className="mb-8 text-base font-medium text-zinc-400">
                  {message}
                </p>
              )}
              {children}

              <button
                onClick={onClose}
                className="w-full rounded-2xl bg-secondary py-4 text-lg font-semibold text-primary hover:bg-secondary/90 transition-all"
              >
                Okay
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

