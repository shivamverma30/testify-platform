import type { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";

type AdminPanelLayoutProps = {
  children: ReactNode;
};

export function AdminPanelLayout({ children }: AdminPanelLayoutProps) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-400 flex-col md:flex-row">
        <AdminSidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="page-enter rounded-3xl border border-white/10 bg-slate-950/35 p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
