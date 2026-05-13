import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const token = req.cookies.get("access-token")?.value;
  const isAuthPage =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/forget-password") ||
    req.nextUrl.pathname.startsWith("/register");
  if (!token && !isAuthPage)
    return NextResponse.redirect(new URL("/login", req.url));
  if (token && isAuthPage) return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}
export const config = {
  matcher: [
    "/",
    "/jobs/:path*",
    "/login",
    "/register",
    "/register/company",
    "/forget-password",
    "/in-work",
  ],
};
