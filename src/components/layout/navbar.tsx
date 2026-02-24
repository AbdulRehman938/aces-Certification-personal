import Link from "next/link";

export function Navbar() {
  return (
    <header className="h-16 border-b flex items-center justify-between px-8 bg-white dark:bg-black sticky top-0 z-10">
      <Link href="/" className="font-semibold text-xl flex items-center gap-2">
        <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center text-white font-black text-sm">
          A
        </div>
        <span>ACES</span>
      </Link>
      <div className="flex items-center gap-4">
        <Link href="/login" className="text-sm font-medium hover:text-blue-600">
          Sign In
        </Link>
        <Link
          href="/register"
          className="bg-black text-white px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 dark:bg-white dark:text-black"
        >
          Register
        </Link>
      </div>
    </header>
  );
}
