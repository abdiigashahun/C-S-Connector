import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/admin";

type SessionLike = {
  user?: {
    email?: string;
  };
};

type CommentRow = {
  id: number;
  product_id: number;
  user_email: string;
  comment: string;
  created_at: string;
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

async function isOwnerEmail(email: string) {
  if (!email) {
    return false;
  }

  const { data: ownerRow } = await supabaseServer
    .from("owner_emails")
    .select("owner_email")
    .eq("owner_email", email)
    .maybeSingle<{ owner_email: string }>();

  return Boolean(ownerRow);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ error: "invalid product id" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("product_comments")
    .select("id,product_id,user_email,comment,created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: (data ?? []) as CommentRow[] });
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

  const email = await getSessionEmail(request);
  const isCustomer = await isCustomerEmail(email);

  if (!email || !isCustomer) {
    return NextResponse.json(
      { error: "Only signed-in customers can comment." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as { comment?: string } | null;
  const comment = body?.comment?.trim() ?? "";

  if (!comment) {
    return NextResponse.json({ error: "comment is required" }, { status: 400 });
  }

  if (comment.length > 1000) {
    return NextResponse.json({ error: "comment is too long" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("product_comments")
    .insert({
      product_id: productId,
      user_email: email,
      comment,
      created_at: new Date().toISOString(),
    })
    .select("id,product_id,user_email,comment,created_at")
    .maybeSingle<CommentRow>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ error: "invalid product id" }, { status: 400 });
  }

  const email = await getSessionEmail(request);
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { id?: number; comment?: string }
    | null;

  const commentId = Number(body?.id);
  const commentText = body?.comment?.trim() ?? "";

  if (!Number.isFinite(commentId) || commentId <= 0) {
    return NextResponse.json({ error: "invalid comment id" }, { status: 400 });
  }

  if (!commentText) {
    return NextResponse.json({ error: "comment is required" }, { status: 400 });
  }

  if (commentText.length > 1000) {
    return NextResponse.json({ error: "comment is too long" }, { status: 400 });
  }

  const { data: existingComment } = await supabaseServer
    .from("product_comments")
    .select("id,product_id,user_email")
    .eq("id", commentId)
    .eq("product_id", productId)
    .maybeSingle<{ id: number; product_id: number; user_email: string }>();

  if (!existingComment) {
    return NextResponse.json({ error: "comment not found" }, { status: 404 });
  }

  if (normalizeEmail(existingComment.user_email) !== email) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseServer
    .from("product_comments")
    .update({ comment: commentText })
    .eq("id", commentId)
    .eq("product_id", productId)
    .select("id,product_id,user_email,comment,created_at")
    .maybeSingle<CommentRow>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ error: "invalid product id" }, { status: 400 });
  }

  const email = await getSessionEmail(request);
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { id?: number } | null;
  const commentId = Number(body?.id);

  if (!Number.isFinite(commentId) || commentId <= 0) {
    return NextResponse.json({ error: "invalid comment id" }, { status: 400 });
  }

  const { data: existingComment } = await supabaseServer
    .from("product_comments")
    .select("id,product_id,user_email")
    .eq("id", commentId)
    .eq("product_id", productId)
    .maybeSingle<{ id: number; product_id: number; user_email: string }>();

  if (!existingComment) {
    return NextResponse.json({ error: "comment not found" }, { status: 404 });
  }

  const owner = await isOwnerEmail(email);
  const admin = isAdminEmail(email);
  const isAuthor = normalizeEmail(existingComment.user_email) === email;

  if (!isAuthor && !owner && !admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { error } = await supabaseServer
    .from("product_comments")
    .delete()
    .eq("id", commentId)
    .eq("product_id", productId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
