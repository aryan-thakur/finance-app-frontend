import { NextResponse, NextRequest } from "next/server";
import { updateSession } from "./app/utils/supabase/middleware";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.API_BASE_URL ||
  "http://localhost:3001";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Protect everything except login, API routes, and static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|api/).*)"],
};
