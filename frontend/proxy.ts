import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type TokenPayload = {
  role?: "student" | "coaching_admin" | "super_admin";
};

const decodeTokenPayload = (token: string | undefined): TokenPayload | null => {
  if (!token) {
    return null;
  }

  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4;
    const padded = padding ? normalized + "=".repeat(4 - padding) : normalized;
    const parsed = JSON.parse(atob(padded)) as TokenPayload;

    return parsed;
  } catch {
    return null;
  }
};

export function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;
  const payload = decodeTokenPayload(token);
  const role = payload?.role;

  if (
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/super-admin")) &&
    !token
  ) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/dashboard") && role && role !== "student") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/admin") && role && role !== "coaching_admin") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/super-admin") && role && role !== "super_admin") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (
    (pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/shivamnitbhopal") &&
    token
  ) {
    if (role === "coaching_admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    if (role === "super_admin") {
      return NextResponse.redirect(new URL("/super-admin", request.url));
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/super-admin/:path*",
    "/login",
    "/register",
    "/shivamnitbhopal",
  ],
};
