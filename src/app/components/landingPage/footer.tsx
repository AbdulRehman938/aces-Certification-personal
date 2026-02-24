import Link from "next/link";

export default function Footer() {
  return (
    <div className="mx-auto w-full max-w-xl pt-6 text-center text-xs text-slate-500 sm:max-w-xl sm:text-sm">
      Review our{" "}
      <Link
        href="/policy"
        className="text-dull-gray font-medium underline decoration-dull-gray underline-offset-2"
      >
        Terms &amp; Conditions
      </Link>{" "}
      and{" "}
      <Link
        href="/policy"
        className="text-dull-gray font-medium underline decoration-dull-gray underline-offset-2"
      >
        Privacy Policy
      </Link>{" "}
      to understand how we operate, your responsibilities, and how your data is
      protected.
    </div>
  );
}
