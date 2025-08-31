import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.API_BASE_URL ||
  "http://localhost:3001";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: "Missing credentials" },
        { status: 400 }
      );
    }

    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      console.log("Login failed:", res.status, res.statusText);
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          message: "Invalid username or password",
          detail: text?.slice(0, 200),
        },
        { status: 401 }
      );
    }

    const data = await res.json();
    const token: string | undefined = data?.access_token;

    if (!token) {
      return NextResponse.json(
        { message: "No access token returned" },
        { status: 502 }
      );
    }

    // Set HTTP-only cookie; only mark Secure on HTTPS/prod so localhost over http works
    const response = NextResponse.json({ success: true });
    const url = new URL(request.url);
    const isHttps = url.protocol === "https:";
    const isProd = process.env.NODE_ENV === "production";
    response.cookies.set("access_token", token, {
      httpOnly: true,
      secure: isProd || isHttps,
      sameSite: "lax",
      path: "/",
      // Optionally align with backend JWT expiry if known; default 1 hour
      maxAge: 60 * 60,
    });
    return response;
  } catch (err) {
    return NextResponse.json({ message: "Failed to login" }, { status: 500 });
  }
}
