import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";

type SessionLike = {
  user?: {
    email?: string;
  };
};

type ProductIdRow = {
  id: number;
};

type InteractionRow = {
  product_id: number;
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

export async function GET(request: NextRequest) {
  const ownerEmail = await getSessionEmail(request);
  if (!ownerEmail) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: productRows } = await supabaseServer
    .from("products")
    .select("id")
    .eq("owner_email", ownerEmail);

  const productIds = ((productRows ?? []) as ProductIdRow[]).map((item) => item.id);

  if (productIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const { data: viewRows } = await supabaseServer
    .from("product_views")
    .select("product_id")
    .in("product_id", productIds);

  const { data: likeRows } = await supabaseServer
    .from("product_likes")
    .select("product_id")
    .in("product_id", productIds);

  const viewCounts = new Map<number, number>();
  for (const row of ((viewRows ?? []) as InteractionRow[])) {
    viewCounts.set(row.product_id, (viewCounts.get(row.product_id) ?? 0) + 1);
  }

  const likeCounts = new Map<number, number>();
  for (const row of ((likeRows ?? []) as InteractionRow[])) {
    likeCounts.set(row.product_id, (likeCounts.get(row.product_id) ?? 0) + 1);
  }

  const data = productIds.map((productId) => ({
    productId,
    views: viewCounts.get(productId) ?? 0,
    likes: likeCounts.get(productId) ?? 0,
  }));

  return NextResponse.json({ data });
}
