"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#FDFDFD] px-6 text-center">
      <div className="relative flex flex-col items-center">
        <div className="absolute -inset-20 -z-10 bg-zinc-50 rounded-full blur-[80px] opacity-60" />

        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-[120px] font-black leading-none tracking-tighter text-secondary md:text-[180px]"
        >
          500
        </motion.h1>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-2xl font-semibold text-secondary md:text-4xl"
        >
          Internal Server Error!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 max-w-md text-sm font-medium text-zinc-400 md:text-base"
        >
          We&apos;re experiencing a temporary issue on our end. Please bear with
          us while we resolve it.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 flex w-full max-w-[440px] flex-col items-center gap-4 md:flex-row"
        >
          <Button
            variant="primary"
            onClick={() => router.back()}
            className="h-16 flex-1 text-base border-2 hover:bg-zinc-50"
          >
            Go back
          </Button>
          <Button
            variant="secondary"
            onClick={() => reset()}
            className="h-16 flex-1 text-base"
          >
            Try again
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
