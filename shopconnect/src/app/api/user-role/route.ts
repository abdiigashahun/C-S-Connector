import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import type { AppRole } from "@/lib/user-preferences";

type UserRoleRow = {
  email: string;
  role: AppRole;
  terms_accepted_at: string | null;
  updated_at: string | null;
  user_id: string | null;
};

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("user_roles")
    .select("email, role, terms_accepted_at, updated_at, user_id")
    .eq("email", email)
    .maybeSingle<UserRoleRow>();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: data ?? null });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    email?: string;
    role?: AppRole;
    termsAcceptedAt?: string;
    userId?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const role = body.role;

  if (!email || !role) {
    return NextResponse.json(
      { error: "email and role are required" },
      { status: 400 }
    );
  }

  const payload = {
    email,
    role,
    terms_accepted_at: body.termsAcceptedAt ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: body.userId ?? null,
  };

  const { data, error } = await supabaseServer
    .from("user_roles")
    .upsert(payload, { onConflict: "email" })
    .select("email, role, terms_accepted_at, updated_at, user_id")
    .maybeSingle<UserRoleRow>();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: data ?? payload });
}
