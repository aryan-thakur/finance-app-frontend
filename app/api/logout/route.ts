import { createClient } from "@/app/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/login", request.url));
  const supabase = createClient();
  const { error } = await (await supabase).auth.signOut();
  return res;
}
