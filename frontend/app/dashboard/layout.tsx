"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getCurrentAuthRole, hasAuthToken } from "@/lib/api";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

type Props = {
  children: ReactNode;
};

export default function StudentDashboardLayout({ children }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!hasAuthToken() || getCurrentAuthRole() !== "student") {
      router.replace("/login");
    }
  }, [router]);

  return <DashboardLayout>{children}</DashboardLayout>;
}
