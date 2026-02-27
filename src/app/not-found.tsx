"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { useUser } from "@/contexts/UserContext";
import { getRoleRedirectPath } from "@/lib/auth-utils";

export default function NotFound() {
  const { user, profile, isAuthenticated } = useUser();
  const role = user?.role || profile?.role || null;

  const dashboardPath = isAuthenticated ? getRoleRedirectPath(role) : "/login";

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#FDFDFD] px-6 text-center">
      <div className="relative flex flex-col items-center">
        <div className="absolute -inset-20 -z-10 bg-zinc-50 rounded-full blur-[80px] opacity-60" />

        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[120px] font-black leading-none tracking-tighter text-secondary md:text-[180px]"
        >
          404
        </motion.h1>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-2xl font-semibold text-secondary md:text-4xl"
        >
          Ooops! Page not found
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 max-w-md text-sm font-medium text-zinc-400 md:text-base"
        >
          The page you&apos;re looking for doesn&apos;t exist or may have been
          moved.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 w-full max-w-[340px]"
        >
          <Link href={dashboardPath}>
            <Button className="h-16 w-full text-base tracking-wide">
              {isAuthenticated ? "Go back to Dashboard" : "Back to Login"}
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

