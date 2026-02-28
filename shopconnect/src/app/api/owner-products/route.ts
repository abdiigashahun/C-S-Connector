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

type ShopIdRow = {
  id: string | number;
};

type ProductShopRow = {
  shop_id: string | number | null;
};

type UserIdRow = {
  id: string;
};

type AuthUserRow = {
  id: string;
  name?: string | null;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

async function getSessionEmail(request: NextRequest) {
  const authWithApi = auth as unknown as {
    api?: {
      getSession?: (input: { headers: Headers }) => Promise<unknown>;
    };
  };

  const getSession = authWithApi.api?.getSession;

  if (!getSession) {
    return "";
  }

  const session = (await getSession({ headers: request.headers })) as SessionLike | null;
  return normalizeEmail(session?.user?.email);
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

  if (controlError) {
    return true;
  }

  if (!ownerControl) {
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

async function resolveOwnerShopId(ownerEmail: string, ownerId: string) {
  const { data: existingOwnerProduct } = await supabaseServer
    .from("products")
    .select("shop_id")
    .eq("owner_email", ownerEmail)
    .not("shop_id", "is", null)
    .limit(1)
    .maybeSingle<ProductShopRow>();

  if (existingOwnerProduct?.shop_id) {
    return existingOwnerProduct.shop_id;
  }

  const { data: anyProduct } = await supabaseServer
    .from("products")
    .select("shop_id")
    .not("shop_id", "is", null)
    .limit(1)
    .maybeSingle<ProductShopRow>();

  if (anyProduct?.shop_id) {
    return anyProduct.shop_id;
  }

  if (ownerId) {
    const { data: ownShop } = await supabaseServer
      .from("shops")
      .select("id")
      .eq("owner_id", ownerId)
      .limit(1)
      .maybeSingle<ShopIdRow>();

    if (ownShop?.id !== undefined && ownShop?.id !== null) {
      return ownShop.id;
    }
  }

  const { data: firstShop } = await supabaseServer
    .from("shops")
    .select("id")
    .limit(1)
    .maybeSingle<ShopIdRow>();

  if (firstShop?.id !== undefined && firstShop?.id !== null) {
    return firstShop.id;
  }

  if (!ownerId) {
    return null;
  }

  const shopNameBase = ownerEmail.split("@")[0]?.replace(/[._-]+/g, " ") || "Owner";
  const defaultShopName = `${shopNameBase} Shop`;

  const { data: createdShop } = await supabaseServer
    .from("shops")
    .insert({
      owner_id: ownerId,
      shop_name: defaultShopName,
      phone: "+251 9XX XXX XXX",
      latitude: 0,
      longitude: 0,
    })
    .select("id")
    .maybeSingle<ShopIdRow>();

  if (createdShop?.id !== undefined && createdShop?.id !== null) {
    return createdShop.id;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  const ownerEmail = sessionUser.email;
  if (!ownerEmail) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const canManage = await hasOwnerAccess(ownerEmail);
  if (!canManage) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    imageUrl?: string | null;
  };

  const name = body.name?.trim() ?? "";
  const description = body.description?.trim() ?? "No description provided.";
  const price = Number(body.price);
  const category = body.category?.trim() ?? "other";
  const imageUrl = body.imageUrl?.trim() || null;

  if (!name || !description || Number.isNaN(price) || price <= 0) {
    return NextResponse.json({ error: "Invalid product payload" }, { status: 400 });
  }

  const ownerId = await resolveOwnerId(ownerEmail, sessionUser.id);
  const shopId = await resolveOwnerShopId(ownerEmail, ownerId);
  if (shopId === null) {
    return NextResponse.json(
      {
        error:
          "Unable to resolve shop for this owner.",
      },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseServer
    .from("products")
    .insert({
      name,
      description,
      price,
      category,
      image_url: imageUrl,
      owner_email: ownerEmail,
      shop_id: shopId,
    })
    .select("id")
    .maybeSingle<{ id: number }>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { id: data?.id ?? null } });
}

export async function PATCH(request: NextRequest) {
  const ownerEmail = await getSessionEmail(request);
  if (!ownerEmail) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const canManage = await hasOwnerAccess(ownerEmail);
  if (!canManage) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    id?: number;
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    imageUrl?: string | null;
  };

  const id = Number(body.id);
  const name = body.name?.trim() ?? "";
  const description = body.description?.trim() ?? "No description provided.";
  const price = Number(body.price);
  const category = body.category?.trim() ?? "other";
  const imageUrl = body.imageUrl?.trim() || null;

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Product id is required" }, { status: 400 });
  }

  if (!name || !description || Number.isNaN(price) || price <= 0) {
    return NextResponse.json({ error: "Invalid product payload" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("products")
    .update({
      name,
      description,
      price,
      category,
      image_url: imageUrl,
      owner_email: ownerEmail,
    })
    .eq("id", id)
    .eq("owner_email", ownerEmail)
    .select("id")
    .maybeSingle<{ id: number }>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.id) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ data: { id: data.id } });
}

export async function DELETE(request: NextRequest) {
  const ownerEmail = await getSessionEmail(request);
  if (!ownerEmail) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const canManage = await hasOwnerAccess(ownerEmail);
  if (!canManage) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    id?: number;
  };

  const id = Number(body.id);

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Product id is required" }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("products")
    .delete()
    .eq("id", id)
    .eq("owner_email", ownerEmail);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
