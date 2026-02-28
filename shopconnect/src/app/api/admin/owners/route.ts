import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/admin";

type OwnerEmailRow = {
  owner_email: string;
  created_at: string | null;
  updated_at: string | null;
};

type OwnerControlRow = {
  owner_email: string;
  payment_status: "pending" | "paid" | "overdue";
  payment_note: string | null;
  is_active: boolean;
  updated_at: string | null;
};

type PostgrestErrorLike = {
  code?: string;
  message?: string;
};

function isAdmin(email: string) {
  return isAdminEmail(email);
}

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
  const adminEmail =
    request.nextUrl.searchParams.get("adminEmail")?.trim().toLowerCase() ?? "";

  if (!adminEmail || !isAdmin(adminEmail)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: ownerRows, error: ownerError } = await supabaseServer
    .from("owner_emails")
    .select("owner_email, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (ownerError) {
    return NextResponse.json({ error: ownerError.message }, { status: 500 });
  }

  const { data: controlRows, error: controlError } = await supabaseServer
    .from("owner_controls")
    .select("owner_email, payment_status, payment_note, is_active, updated_at");

  if (controlError && !isMissingRelationError(controlError)) {
    return NextResponse.json({ error: controlError.message }, { status: 500 });
  }

  const controlMap = new Map<string, OwnerControlRow>();
  for (const row of ((controlRows as OwnerControlRow[] | null) ?? []) as OwnerControlRow[]) {
    controlMap.set(row.owner_email.toLowerCase(), row);
  }

  const owners = ((ownerRows ?? []) as OwnerEmailRow[]).map((row) => {
    const email = row.owner_email.toLowerCase();
    const control = controlMap.get(email);
    return {
      email,
      addedAt: row.created_at,
      ownerUpdatedAt: row.updated_at,
      paymentStatus: control?.payment_status ?? "pending",
      paymentNote: control?.payment_note ?? "",
      isActive: control?.is_active ?? true,
      controlUpdatedAt: control?.updated_at ?? null,
    };
  });

  return NextResponse.json({ data: owners });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    adminEmail?: string;
    ownerEmail?: string;
    paymentStatus?: "pending" | "paid" | "overdue";
    paymentNote?: string;
    isActive?: boolean;
  };

  const adminEmail = body.adminEmail?.trim().toLowerCase() ?? "";
  if (!adminEmail || !isAdmin(adminEmail)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ownerEmail = body.ownerEmail?.trim().toLowerCase() ?? "";
  if (!ownerEmail) {
    return NextResponse.json({ error: "ownerEmail is required" }, { status: 400 });
  }

  const paymentStatus = body.paymentStatus ?? "pending";
  const ownerEmailPayload = {
    owner_email: ownerEmail,
    updated_at: new Date().toISOString(),
  };

  const { error: ownerUpsertError } = await supabaseServer
    .from("owner_emails")
    .upsert(ownerEmailPayload, { onConflict: "owner_email" });

  if (ownerUpsertError) {
    return NextResponse.json({ error: ownerUpsertError.message }, { status: 500 });
  }

  const payload = {
    owner_email: ownerEmail,
    payment_status: paymentStatus,
    payment_note: body.paymentNote?.trim() ?? "",
    is_active: body.isActive ?? true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseServer
    .from("owner_controls")
    .upsert(payload, { onConflict: "owner_email" })
    .select("owner_email, payment_status, payment_note, is_active, updated_at")
    .maybeSingle<OwnerControlRow>();

  if (error && !isMissingRelationError(error)) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data:
      data ??
      payload ?? {
        owner_email: ownerEmail,
        payment_status: "pending",
        payment_note: "",
        is_active: true,
        updated_at: new Date().toISOString(),
      },
  });
}

export async function DELETE(request: NextRequest) {
  const body = (await request.json()) as {
    adminEmail?: string;
    ownerEmail?: string;
  };

  const adminEmail = body.adminEmail?.trim().toLowerCase() ?? "";
  if (!adminEmail || !isAdmin(adminEmail)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ownerEmail = body.ownerEmail?.trim().toLowerCase() ?? "";
  if (!ownerEmail) {
    return NextResponse.json({ error: "ownerEmail is required" }, { status: 400 });
  }

  const { error: controlDeleteError } = await supabaseServer
    .from("owner_controls")
    .delete()
    .eq("owner_email", ownerEmail);

  if (controlDeleteError && !isMissingRelationError(controlDeleteError)) {
    return NextResponse.json({ error: controlDeleteError.message }, { status: 500 });
  }

  const { error: ownerDeleteError } = await supabaseServer
    .from("owner_emails")
    .delete()
    .eq("owner_email", ownerEmail);

  if (ownerDeleteError) {
    return NextResponse.json({ error: ownerDeleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
