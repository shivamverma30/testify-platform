"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  Medal,
  LogOut,
  ShoppingBag,
  UserCircle2,
  ClipboardCheck,
  FileText,
} from "lucide-react";
import { clearAuthToken } from "@/lib/api";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/tests", label: "Available Tests", icon: ClipboardCheck },
  { href: "/dashboard/upcoming", label: "Scheduled Tests", icon: CalendarClock },
  { href: "/dashboard/purchased", label: "Purchased Tests", icon: ShoppingBag },
  { href: "/dashboard/history", label: "Test History", icon: ClipboardList },
  { href: "/dashboard/results", label: "Results", icon: FileText },
  { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Medal },
  { href: "/dashboard/analytics", label: "Performance Analytics", icon: BarChart3 },
  { href: "/dashboard/profile", label: "Profile", icon: UserCircle2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearAuthToken();
    router.push("/login");
  };

  return (
    <aside className="sticky top-0 h-screen w-full border-r border-white/10 bg-slate-950/70 p-4 backdrop-blur-xl md:w-72 md:p-6">
      <div className="glass-card mb-8 flex items-center gap-3 rounded-2xl p-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-cyan-500 text-white">
          <LayoutDashboard size={20} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Testify
          </p>
          <p className="font-display text-sm font-semibold text-slate-100">Student Panel</p>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-linear-to-r from-indigo-500/90 to-cyan-500/90 text-white shadow-md shadow-cyan-500/20"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-300/60 hover:text-white"
      >
        <LogOut size={16} />
        Logout
      </button>
    </aside>
  );
}
