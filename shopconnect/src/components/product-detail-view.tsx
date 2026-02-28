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

  useEffect(() => {
    const trackView = async () => {
      const session = await authClient.getSession();
      const email =
        (session as { data?: { user?: { email?: string } } })?.data?.user?.email ??
        (session as { data?: { session?: { user?: { email?: string } } } })?.data?.session?.user?.email ??
        (session as { user?: { email?: string } })?.user?.email;

      if (!email) {
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
    </main>
  );
}
