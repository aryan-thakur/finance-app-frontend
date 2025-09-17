import { createClient } from "@/app/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.API_BASE_URL ||
  "http://localhost:3001";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await (await supabase).auth.getSession();
    const token = session?.access_token ?? null;
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const res = await fetch(`${API_BASE_URL}/transaction/${params.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          message: "Failed to update transaction",
          detail: text?.slice(0, 500),
        },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await (await supabase).auth.getSession();
    const token = session?.access_token ?? null;
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const res = await fetch(`${API_BASE_URL}/transaction/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { message: "Failed to fetch transaction", detail: text?.slice(0, 500) },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await (await supabase).auth.getSession();
    const token = session?.access_token ?? null;
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const res = await fetch(`${API_BASE_URL}/transaction/${params.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          message: "Failed to delete transaction",
          detail: text?.slice(0, 500),
        },
        { status: res.status }
      );
    }
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
