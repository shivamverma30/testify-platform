"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { clearAuthToken, getCurrentAuthRole, hasAuthToken } from "@/lib/api";

type Props = {
  children: ReactNode;
};

const navItems = [
  { href: "/super-admin", label: "Dashboard" },
  { href: "/super-admin/coaching-approvals", label: "Coaching Approvals" },
  { href: "/super-admin/coaching-management", label: "Coaching Management" },
  { href: "/super-admin/marketplace", label: "Marketplace" },
];

export default function SuperAdminLayout({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!hasAuthToken() || getCurrentAuthRole() !== "super_admin") {
      router.replace("/login");
    }
  }, [router]);

  const handleLogout = () => {
    clearAuthToken();
    router.push("/login");
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <header className="glass-card flex flex-col gap-4 rounded-2xl p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-fuchsia-200">Super Admin</p>
          <h1 className="font-display mt-1 text-2xl text-white">Platform Command Center</h1>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
        >
          Logout
        </button>
      </header>

      <nav className="mt-4 flex flex-wrap gap-2">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/super-admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl px-4 py-2 text-sm transition ${
                active
                  ? "bg-fuchsia-500 text-white"
                  : "border border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="mt-6 rounded-3xl border border-white/10 bg-slate-950/35 p-5 md:p-6">{children}</main>
    </div>
  );
}
