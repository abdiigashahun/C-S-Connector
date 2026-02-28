import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/admin";

type SessionLike = {
  user?: {
    email?: string;
  };
};

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

async function isCustomerEmail(email: string) {
  if (!email || isAdminEmail(email)) {
    return false;
  }

  const { data: ownerRow } = await supabaseServer
    .from("owner_emails")
    .select("owner_email")
    .eq("owner_email", email)
    .maybeSingle<{ owner_email: string }>();

  return !ownerRow;
}

async function getCounts(productId: number) {
  const { count: views } = await supabaseServer
    .from("product_views")
    .select("product_id", { count: "exact", head: true })
    .eq("product_id", productId);

  const { count: likes } = await supabaseServer
    .from("product_likes")
    .select("product_id", { count: "exact", head: true })
    .eq("product_id", productId);

  return {
    views: views ?? 0,
    likes: likes ?? 0,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ error: "invalid product id" }, { status: 400 });
  }

  const email = await getSessionEmail(request);
  const isCustomer = await isCustomerEmail(email);

  const counts = await getCounts(productId);

  if (!email || !isCustomer) {
    return NextResponse.json({ data: { counted: false, liked: false, ...counts } });
  }

  const { data: likedRow } = await supabaseServer
    .from("product_likes")
    .select("product_id")
    .eq("product_id", productId)
    .eq("user_email", email)
    .maybeSingle<{ product_id: number }>();

  return NextResponse.json({
    data: {
      counted: true,
      liked: Boolean(likedRow),
      ...counts,
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ error: "invalid product id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | { action?: "view" | "toggle_like" }
    | null;

  const action = body?.action;
  if (!action || (action !== "view" && action !== "toggle_like")) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  const email = await getSessionEmail(request);
  const isCustomer = await isCustomerEmail(email);

  if (!email || !isCustomer) {
    const counts = await getCounts(productId);
    return NextResponse.json({
      data: {
        counted: false,
        liked: false,
        ...counts,
      },
    });
  }

  if (action === "view") {
    await supabaseServer
      .from("product_views")
      .upsert(
        {
          product_id: productId,
          user_email: email,
          viewed_at: new Date().toISOString(),
        },
        { onConflict: "product_id,user_email" }
      );
  }

  if (action === "toggle_like") {
    const { data: existingLike } = await supabaseServer
      .from("product_likes")
      .select("product_id")
      .eq("product_id", productId)
      .eq("user_email", email)
      .maybeSingle<{ product_id: number }>();

    if (existingLike) {
      await supabaseServer
        .from("product_likes")
        .delete()
        .eq("product_id", productId)
        .eq("user_email", email);
    } else {
      await supabaseServer
        .from("product_likes")
        .insert({
          product_id: productId,
          user_email: email,
          liked_at: new Date().toISOString(),
        });
    }
  }

  const { data: likedRow } = await supabaseServer
    .from("product_likes")
    .select("product_id")
    .eq("product_id", productId)
    .eq("user_email", email)
    .maybeSingle<{ product_id: number }>();

  const counts = await getCounts(productId);

  return NextResponse.json({
    data: {
      counted: true,
      liked: Boolean(likedRow),
      ...counts,
    },
  });
}
