"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export const Tooltip = ({
  content,
  children,
  disabled = false,
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [side, setSide] = useState<"top" | "bottom">("top");
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipElement = tooltipRef.current;
    
    const tooltipHeight = tooltipElement ? tooltipElement.offsetHeight : 40;
    const tooltipWidth = tooltipElement ? tooltipElement.offsetWidth : 160;
    
    const left = rect.left + rect.width / 2;
    const offset = 8;

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    if (spaceAbove < tooltipHeight + offset + 10 && spaceBelow > spaceAbove) {
      setSide("bottom");
      setPosition({ top: rect.bottom + offset, left });
    } else {
      setSide("top");
      setPosition({ top: rect.top - offset, left });
    }
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      
      const handleEvents = () => updatePosition();
      window.addEventListener("scroll", handleEvents, true);
      window.addEventListener("resize", handleEvents);
      const observer = new ResizeObserver(() => {
        updatePosition();
      });

      if (triggerRef.current) {
        observer.observe(triggerRef.current);
      }
      if (tooltipRef.current) {
        observer.observe(tooltipRef.current);
      }

      const timer = setTimeout(updatePosition, 10);
      
      return () => {
        window.removeEventListener("scroll", handleEvents, true);
        window.removeEventListener("resize", handleEvents);
        clearTimeout(timer);
        observer.disconnect();
      };
    }
  }, [isVisible, content]);

  if (disabled) return <>{children}</>;

  return (
    <div
      ref={triggerRef}
      className="relative flex items-center h-full"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ 
              opacity: 0, 
              scale: 0.95,
              x: "-50%",
              y: side === "top" ? 5 : -5
            }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              x: "-50%",
              y: 0
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.95,
              x: "-50%",
              y: side === "top" ? 5 : -5
            }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              zIndex: 9999,
              pointerEvents: "none",
              transformOrigin: side === "top" ? "bottom" : "top",
              transform: side === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
            }}
          >
            <div 
              className={`relative bg-zinc-900 text-white text-[11px] font-medium px-4 py-2 rounded-xl shadow-2xl border border-white/10 max-w-[180px] w-max text-center wrap-break-word whitespace-normal leading-tight ${
                side === "top" ? "mb-2" : "mt-2"
              }`}
            >
              {content}
              <div 
                className={`absolute left-1/2 -translate-x-1/2 ${
                  side === "top" ? "top-full -mt-1" : "bottom-full -mb-1 rotate-180"
                }`}
              >
                <div className="border-[5px] border-transparent border-t-zinc-900" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
