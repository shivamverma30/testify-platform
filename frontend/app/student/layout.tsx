"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getCurrentAuthRole, hasAuthToken } from "@/lib/api";
import { StudentPanelLayout } from "@/components/student/StudentPanelLayout";

type Props = {
  children: ReactNode;
};

export default function StudentLayout({ children }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!hasAuthToken() || getCurrentAuthRole() !== "student") {
      router.replace("/login");
    }
  }, [router]);

  return <StudentPanelLayout>{children}</StudentPanelLayout>;
}
