import type { ReactNode } from "react";
import { StudentSidebar } from "./StudentSidebar";

type StudentPanelLayoutProps = {
  children: ReactNode;
};

export function StudentPanelLayout({ children }: StudentPanelLayoutProps) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-400 flex-col md:flex-row">
        <StudentSidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="page-enter rounded-3xl border border-white/10 bg-slate-950/35 p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
