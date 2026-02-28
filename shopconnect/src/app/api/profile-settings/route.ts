import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type ProfileSettingsRow = {
  email: string;
  role: "customer" | "shop_owner";
  name: string | null;
  phone: string | null;
  preferred_location: string | null;
  address: string | null;
  notify_email: boolean | null;
  notify_push: boolean | null;
  show_phone: boolean | null;
  updated_at: string | null;
};

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("profile_settings")
    .select(
      "email, role, name, phone, preferred_location, address, notify_email, notify_push, show_phone, updated_at"
    )
    .eq("email", email)
    .maybeSingle<ProfileSettingsRow>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? null });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    email?: string;
    role?: "customer" | "shop_owner";
    name?: string;
    phone?: string;
    preferredLocation?: string;
    address?: string;
    notifyEmail?: boolean;
    notifyPush?: boolean;
    showPhone?: boolean;
  };

  const email = body.email?.trim().toLowerCase();
  const role = body.role;

  if (!email || !role) {
    return NextResponse.json({ error: "email and role are required" }, { status: 400 });
  }

  const payload = {
    email,
    role,
    name: body.name?.trim() ?? null,
    phone: body.phone?.trim() ?? null,
    preferred_location: body.preferredLocation?.trim() ?? null,
    address: body.address?.trim() ?? null,
    notify_email: body.notifyEmail ?? true,
    notify_push: body.notifyPush ?? true,
    show_phone: body.showPhone ?? false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseServer
    .from("profile_settings")
    .upsert(payload, { onConflict: "email" })
    .select(
      "email, role, name, phone, preferred_location, address, notify_email, notify_push, show_phone, updated_at"
    )
    .maybeSingle<ProfileSettingsRow>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? payload });
}
