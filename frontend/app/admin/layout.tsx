"use client";

import { type ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentAuthRole, hasAuthToken } from "@/lib/api";
import { AdminPanelLayout } from "@/components/admin/AdminPanelLayout";

type Props = {
  children: ReactNode;
};

export default function AdminLayout({ children }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!hasAuthToken() || getCurrentAuthRole() !== "coaching_admin") {
      router.replace("/login");
    }
  }, [router]);

  return <AdminPanelLayout>{children}</AdminPanelLayout>;
}
