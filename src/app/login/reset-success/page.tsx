"use client";

import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";

export default function ResetSuccessPage() {
  const router = useRouter();

  return (
    <div className="w-full max-w-[95vw] sm:max-w-[80vw] md:max-w-[65vw] lg:max-w-[min(32rem,45vw)] mx-auto bg-primary rounded-[clamp(1.5rem,4vw,3.125rem)] px-[clamp(1rem,3vw,1.5rem)] py-[clamp(1.5rem,4vh,2.5rem)] md:px-[clamp(2rem,4vw,3.5rem)] md:py-[clamp(2rem,5vh,3.5rem)] shadow-2xl flex flex-col items-center min-h-[clamp(28rem,70vh,31.25rem)] justify-center text-center">
      <div className="relative mb-[clamp(1.5rem,4vh,2.5rem)] flex items-center justify-center">
        <div className="w-[clamp(8rem,22vw,10rem)] h-[clamp(8rem,22vw,10rem)] bg-zinc-100 rounded-full flex items-center justify-center">
          <div className="w-[clamp(6.5rem,18vw,8rem)] h-[clamp(6.5rem,18vw,8rem)] bg-zinc-200 rounded-full flex items-center justify-center">
            <div className="w-[clamp(5rem,14vw,6rem)] h-[clamp(5rem,14vw,6rem)] bg-secondary rounded-full flex items-center justify-center shadow-lg">
              <img
                src="/assets/imgs/icons/doubletick.svg"
                alt="Success"
                className="w-[clamp(2rem,6vw,2.5rem)] h-[clamp(2rem,6vw,2.5rem)]"
              />
            </div>
          </div>
        </div>
      </div>
      <h1 className="text-[clamp(1.5rem,4vw,1.875rem)] font-semibold text-secondary mb-[clamp(0.5rem,1.5vh,1rem)]">
        Updated Successfully
      </h1>
      <p className="text-gray text-[clamp(0.875rem,2vw,1.125rem)] mb-[clamp(1.5rem,4vh,2.5rem)] max-w-[80%] mx-auto">
        Your password has been updated successfully. You can now log in using
        your new password
      </p>
      <Button
        onClick={() => router.replace("/login")}
        className="max-w-[clamp(16rem,40vw,18.75rem)] h-[clamp(3rem,8vh,4rem)] text-[clamp(1rem,2.5vw,1.25rem)]"
      >
        Log In
      </Button>
    </div>
  );
}
