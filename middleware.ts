import { NextResponse, NextRequest } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || process.env.API_BASE_URL || "http://localhost:3001";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the login route and public assets
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;

  if (!token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Validate token by calling backend /auth/profile
  try {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      // Ensure no caching issues on edge
      cache: "no-store",
    });

    if (res.ok) {
      return NextResponse.next();
    }
  } catch (e) {
    // fall through to redirect
  }

  const url = new URL("/login", request.url);
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Protect everything except login, API routes, and static assets
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|api/).*)",
  ],
};
