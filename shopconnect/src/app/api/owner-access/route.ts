import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type OwnerEmailRow = {
  owner_email: string;
};

type OwnerControlRow = {
  owner_email: string;
  is_active: boolean;
};

type PostgrestErrorLike = {
  code?: string;
  message?: string;
};

function isMissingRelationError(error: PostgrestErrorLike | null | undefined) {
  if (!error) {
    return false;
  }

  const message = (error.message ?? "").toLowerCase();

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find the table")
  );
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ isOwner: false });
  }

  const { data: ownerRow, error: ownerError } = await supabaseServer
    .from("owner_emails")
    .select("owner_email")
    .eq("owner_email", email)
    .maybeSingle<OwnerEmailRow>();

  if (ownerError) {
    return NextResponse.json({ error: ownerError.message }, { status: 500 });
  }

  if (!ownerRow) {
    return NextResponse.json({ isOwner: false });
  }

  const { data: controlRow, error: controlError } = await supabaseServer
    .from("owner_controls")
    .select("owner_email, is_active")
    .eq("owner_email", email)
    .maybeSingle<OwnerControlRow>();

  if (controlError && !isMissingRelationError(controlError)) {
    return NextResponse.json({ error: controlError.message }, { status: 500 });
  }

  if (controlRow && !controlRow.is_active) {
    return NextResponse.json({ isOwner: false });
  }

  return NextResponse.json({ isOwner: true });
}
