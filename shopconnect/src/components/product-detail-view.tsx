"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Eye } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatETB } from "@/lib/currency";

type ProductDetail = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  shop_name: string;
  created_at: string | null;
};

type ProductDetailViewProps = {
  product: ProductDetail;
  initialViews: number;
  initialLikes: number;
};

type ProductComment = {
  id: number;
  product_id: number;
  user_email: string;
  comment: string;
  created_at: string;
};

const fallbackImage =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f5f5f5"/><stop offset="100%" stop-color="#e9e9e9"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#9ca3af" font-size="44" font-family="Arial, sans-serif">ShopConnect</text></svg>'
  );

export function ProductDetailView({ product, initialViews, initialLikes }: ProductDetailViewProps) {
  const [views, setViews] = useState(initialViews);
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [comments, setComments] = useState<ProductComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentMessage, setCommentMessage] = useState<string | null>(null);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [canComment, setCanComment] = useState(false);
  const [isOwnerViewer, setIsOwnerViewer] = useState(false);
  const [viewerEmail, setViewerEmail] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [isDeletingCommentId, setIsDeletingCommentId] = useState<number | null>(null);

  useEffect(() => {
    const loadComments = async () => {
      const response = await fetch(`/api/products/${product.id}/comments`);
      if (!response.ok) {
        return;
      }

      const payload = (await response.json().catch(() => null)) as
        | { data?: ProductComment[] }
        | null;

      setComments(payload?.data ?? []);
    };

    void loadComments();
  }, [product.id]);

  useEffect(() => {
    const trackView = async () => {
      const session = await authClient.getSession();
      const email =
        (session as { data?: { user?: { email?: string } } })?.data?.user?.email ??
        (session as { data?: { session?: { user?: { email?: string } } } })?.data?.session?.user?.email ??
        (session as { user?: { email?: string } })?.user?.email;

      if (email) {
        setViewerEmail(email.toLowerCase());
        const ownerCheck = await fetch(`/api/owner-access?email=${encodeURIComponent(email)}`);
        const ownerPayload = (await ownerCheck.json().catch(() => null)) as
          | { isOwner?: boolean }
          | null;
        const ownerViewer = Boolean(ownerPayload?.isOwner);
        setIsOwnerViewer(ownerViewer);
        setCanComment(!ownerViewer);
      }

      if (!email) {
        setCanComment(false);
        setIsOwnerViewer(false);
        setViewerEmail("");
        return;
      }

      const response = await fetch(`/api/products/${product.id}/interactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "view" }),
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json().catch(() => null)) as
        | { data?: { views?: number; likes?: number; liked?: boolean } }
        | null;

      if (typeof payload?.data?.views === "number") {
        setViews(payload.data.views);
      }
      if (typeof payload?.data?.likes === "number") {
        setLikes(payload.data.likes);
      }
      if (typeof payload?.data?.liked === "boolean") {
        setLiked(payload.data.liked);
      }
    };

    void trackView();
  }, [product.id]);

  const toggleLike = async () => {
    setIsLikeLoading(true);

    const response = await fetch(`/api/products/${product.id}/interactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "toggle_like" }),
    });

    if (response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { data?: { views?: number; likes?: number; liked?: boolean } }
        | null;

      if (typeof payload?.data?.views === "number") {
        setViews(payload.data.views);
      }
      if (typeof payload?.data?.likes === "number") {
        setLikes(payload.data.likes);
      }
      if (typeof payload?.data?.liked === "boolean") {
        setLiked(payload.data.liked);
      }
    }

    setIsLikeLoading(false);
  };

  const postComment = async () => {
    const comment = commentText.trim();
    if (!comment) {
      setCommentMessage("Please write a comment first.");
      return;
    }

    setIsPostingComment(true);
    setCommentMessage(null);

    const response = await fetch(`/api/products/${product.id}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; data?: ProductComment }
      | null;

    if (!response.ok) {
      setCommentMessage(payload?.error ?? "Unable to post comment.");
      setIsPostingComment(false);
      return;
    }

    if (payload?.data) {
      setComments((current) => [payload.data as ProductComment, ...current]);
    }
    setCommentText("");
    setCommentMessage("Comment posted.");
    setIsPostingComment(false);
  };

  const startEditComment = (comment: ProductComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.comment);
    setCommentMessage(null);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const saveEditedComment = async (commentId: number) => {
    const nextText = editingCommentText.trim();
    if (!nextText) {
      setCommentMessage("Comment cannot be empty.");
      return;
    }

    setIsSavingComment(true);
    const response = await fetch(`/api/products/${product.id}/comments`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: commentId, comment: nextText }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; data?: ProductComment }
      | null;

    if (!response.ok || !payload?.data) {
      setCommentMessage(payload?.error ?? "Unable to update comment.");
      setIsSavingComment(false);
      return;
    }

    setComments((current) =>
      current.map((item) => (item.id === commentId ? payload.data ?? item : item))
    );
    setEditingCommentId(null);
    setEditingCommentText("");
    setCommentMessage("Comment updated.");
    setIsSavingComment(false);
  };

  const deleteComment = async (commentId: number) => {
    setIsDeletingCommentId(commentId);
    const response = await fetch(`/api/products/${product.id}/comments`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: commentId }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!response.ok) {
      setCommentMessage(payload?.error ?? "Unable to delete comment.");
      setIsDeletingCommentId(null);
      return;
    }

    setComments((current) => current.filter((item) => item.id !== commentId));
    setCommentMessage("Comment deleted.");
    setIsDeletingCommentId(null);
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pt-24 pb-12">
      <div className="mb-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/">Back to products</Link>
        </Button>
      </div>

      <Card className="overflow-hidden py-0">
        <div className="relative aspect-video border-b bg-muted/30">
          <Image
            src={product.image_url ?? fallbackImage}
            alt={product.name}
            fill
            sizes="(max-width: 1024px) 100vw, 70vw"
            unoptimized
            className="object-cover"
          />
        </div>

        <CardHeader className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{product.category}</p>
          <CardTitle className="text-2xl md:text-3xl">{product.name}</CardTitle>
          <p className="text-sm text-muted-foreground">Shop: {product.shop_name}</p>
        </CardHeader>

        <CardContent className="space-y-4 pb-8">
          <p className="text-lg font-semibold text-primary">{formatETB(product.price)}</p>
          <p className="text-sm leading-6 text-muted-foreground">{product.description}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <p className="inline-flex items-center gap-1">
              <Eye className="size-4" /> {views} views
            </p>
            <Button size="sm" variant={liked ? "default" : "outline"} onClick={toggleLike} disabled={isLikeLoading}>
              <Heart className="mr-1 size-4" /> {likes} likes
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Posted: {product.created_at ? new Date(product.created_at).toLocaleDateString() : "N/A"}
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6 py-4">
        <CardHeader>
          <CardTitle className="text-lg">Comments ({comments.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canComment ? (
            <div className="space-y-2">
              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Write your comment..."
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={postComment} disabled={isPostingComment}>
                  {isPostingComment ? "Posting..." : "Post comment"}
                </Button>
                {commentMessage ? (
                  <p className="text-xs text-muted-foreground">{commentMessage}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Login as customer to add a comment.
            </p>
          )}

          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">{item.user_email}</p>
                  {editingCommentId === item.id ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={editingCommentText}
                        onChange={(event) => setEditingCommentText(event.target.value)}
                        rows={3}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => void saveEditedComment(item.id)}
                          disabled={isSavingComment}
                        >
                          {isSavingComment ? "Saving..." : "Save"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditComment}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm">{item.comment}</p>
                  )}
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </p>

                  {editingCommentId !== item.id ? (
                    <div className="mt-2 flex items-center gap-2">
                      {viewerEmail && viewerEmail === item.user_email.toLowerCase() ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditComment(item)}
                        >
                          Edit
                        </Button>
                      ) : null}

                      {viewerEmail &&
                      (viewerEmail === item.user_email.toLowerCase() || isOwnerViewer) ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void deleteComment(item.id)}
                          disabled={isDeletingCommentId === item.id}
                        >
                          {isDeletingCommentId === item.id ? "Deleting..." : "Delete"}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
