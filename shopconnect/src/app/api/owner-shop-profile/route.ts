import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";

type SessionLike = {
  user?: {
    id?: string;
    email?: string;
  };
};

type OwnerControlRow = {
  is_active: boolean;
};

type UserIdRow = {
  id: string;
};

type AuthUserRow = {
  id: string;
  name?: string | null;
};

type ShopRow = {
  id: number;
  shop_name: string;
};

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getSessionUser(request: NextRequest) {
  const authWithApi = auth as unknown as {
    api?: {
      getSession?: (input: { headers: Headers }) => Promise<unknown>;
    };
  };

  const getSession = authWithApi.api?.getSession;

  if (!getSession) {
    return { email: "", id: "" };
  }

  const session = (await getSession({ headers: request.headers })) as SessionLike | null;

  return {
    email: normalizeEmail(session?.user?.email),
    id: session?.user?.id?.trim() ?? "",
  };
}

async function hasOwnerAccess(email: string) {
  const { data: ownerRow, error: ownerError } = await supabaseServer
    .from("owner_emails")
    .select("owner_email")
    .eq("owner_email", email)
    .maybeSingle<{ owner_email: string }>();

  if (ownerError || !ownerRow) {
    return false;
  }

  const { data: ownerControl, error: controlError } = await supabaseServer
    .from("owner_controls")
    .select("is_active")
    .eq("owner_email", email)
    .maybeSingle<OwnerControlRow>();

  if (controlError || !ownerControl) {
    return true;
  }

  return ownerControl.is_active;
}

async function resolveOwnerId(ownerEmail: string, sessionUserId: string) {
  const normalizedEmail = ownerEmail.trim().toLowerCase();

  const { data: usersRow } = await supabaseServer
    .from("users")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle<UserIdRow>();

  if (usersRow?.id) {
    return usersRow.id;
  }

  const { data: userRow } = await supabaseServer
    .from("user")
    .select("id,name")
    .eq("email", normalizedEmail)
    .maybeSingle<AuthUserRow>();

  const candidateId = [sessionUserId, userRow?.id ?? ""].find((id) => isUuid(id)) ?? randomUUID();
  const defaultName = normalizedEmail.split("@")[0]?.replace(/[._-]+/g, " ") || "Owner";
  const candidateName = userRow?.name?.trim() || defaultName;

  const { data: syncedUser } = await supabaseServer
    .from("users")
    .upsert(
      {
        id: candidateId,
        name: candidateName,
        email: normalizedEmail,
        role: "shop_owner",
      },
      { onConflict: "email" }
    )
    .select("id")
    .maybeSingle<UserIdRow>();

  return syncedUser?.id ?? "";
}

async function getOrCreateShop(ownerId: string, ownerEmail: string, preferredName?: string) {
  const { data: existingShop } = await supabaseServer
    .from("shops")
    .select("id,shop_name")
    .eq("owner_id", ownerId)
    .limit(1)
    .maybeSingle<ShopRow>();

  if (existingShop) {
    return existingShop;
  }

  const fallbackName = `${ownerEmail.split("@")[0]?.replace(/[._-]+/g, " ") || "Owner"} Shop`;

  const { data: createdShop } = await supabaseServer
    .from("shops")
    .insert({
      owner_id: ownerId,
      shop_name: preferredName?.trim() || fallbackName,
      phone: "+251 9XX XXX XXX",
      latitude: 0,
      longitude: 0,
    })
    .select("id,shop_name")
    .maybeSingle<ShopRow>();

  return createdShop ?? null;
}

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const isOwner = await hasOwnerAccess(sessionUser.email);
  if (!isOwner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ownerId = await resolveOwnerId(sessionUser.email, sessionUser.id);
  if (!ownerId) {
    return NextResponse.json({ error: "Unable to resolve owner account." }, { status: 500 });
  }

  const shop = await getOrCreateShop(ownerId, sessionUser.email);
  if (!shop) {
    return NextResponse.json({ error: "Unable to resolve shop." }, { status: 500 });
  }

  return NextResponse.json({ data: { shopName: shop.shop_name } });
}

export async function PATCH(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const isOwner = await hasOwnerAccess(sessionUser.email);
  if (!isOwner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    shopName?: string;
    phone?: string;
  };

  const shopName = body.shopName?.trim();
  if (!shopName) {
    return NextResponse.json({ error: "shopName is required" }, { status: 400 });
  }

  const ownerId = await resolveOwnerId(sessionUser.email, sessionUser.id);
  if (!ownerId) {
    return NextResponse.json({ error: "Unable to resolve owner account." }, { status: 500 });
  }

  const shop = await getOrCreateShop(ownerId, sessionUser.email, shopName);
  if (!shop) {
    return NextResponse.json({ error: "Unable to resolve shop." }, { status: 500 });
  }

  const { data: updatedShop, error: updateError } = await supabaseServer
    .from("shops")
    .update({
      shop_name: shopName,
      phone: body.phone?.trim() || "+251 9XX XXX XXX",
    })
    .eq("id", shop.id)
    .select("id,shop_name")
    .maybeSingle<ShopRow>();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { shopName: updatedShop?.shop_name ?? shopName } });
}
