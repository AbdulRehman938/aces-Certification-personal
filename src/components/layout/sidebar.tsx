import Link from "next/link";

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-primary/50 p-6 dark:bg-zinc-900/50">
      <div className="flex flex-col gap-4">
        <div className="text-sm font-semibold text-zinc-500  tracking-wider">
          Dashboard
        </div>
        <nav className="flex flex-col gap-1">
          <Link
            href="/admin"
            className="px-3 py-2 text-sm font-medium rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Admin Overview
          </Link>
          <Link
            href="/admin/users"
            className="px-3 py-2 text-sm font-medium rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Users
          </Link>
          <Link
            href="/user/profile"
            className="px-3 py-2 text-sm font-medium rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            My Profile
          </Link>
          <Link
            href="/vendor/products"
            className="px-3 py-2 text-sm font-medium rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Products
          </Link>
          <Link
            href="/analytics"
            className="px-3 py-2 text-sm font-medium rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Analytics
          </Link>
        </nav>
      </div>
    </aside>
  );
}
