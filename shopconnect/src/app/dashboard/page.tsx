"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { supabaseBrowser } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppRole, getUserPreferences } from "@/lib/user-preferences";

type Product = {
  id: number;
  name: string;
  price: number;
  category: string;
};

export default function DashboardPage() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [marketProducts, setMarketProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const session = await authClient.getSession();
      const userId: string | undefined =
        (session as { data?: { session?: { user?: { id?: string } } } })?.data?.session?.user?.id ??
        (session as { user?: { id?: string } })?.user?.id;

      if (userId) {
        const preference = getUserPreferences(userId);
        if (preference) {
          setRole(preference.role);
        }
      }

      if (!userId) {
        setLoading(false);
        return;
      }

      const { data } = await supabaseBrowser
        .from("products")
        .select("id,name,price,category,shops(owner_id)")
        .eq("shops.owner_id", userId);

      setProducts(
        (data ?? []).map((p: unknown) => {
          const product = p as Product;
          return {
            id: product.id,
            name: product.name,
            price: product.price,
            category: product.category,
          };
        }),
      );

      const { data: marketData } = await supabaseBrowser
        .from("products")
        .select("id,name,price,category")
        .order("created_at", { ascending: false })
        .limit(8);

      setMarketProducts(
        (marketData ?? []).map((p: unknown) => {
          const product = p as Product;
          return {
            id: product.id,
            name: product.name,
            price: product.price,
            category: product.category,
          };
        })
      );

      setLoading(false);
    };

    fetchProducts();
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Shop dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {role === "shop_owner"
              ? "Manage your products and track market listings."
              : "Browse products and follow shop updates."}
          </p>
        </div>
        {role === "shop_owner" ? (
          <Button asChild>
            <Link href="/products/new">Add product</Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href="/">Browse marketplace</Link>
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {role === "shop_owner"
            ? "You have not posted any products yet."
            : "You can browse listings, compare options, and negotiate with shop owners from product pages."}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {products.map((product) => (
            <Card key={product.id}>
              <CardHeader>
                <CardTitle className="text-base">{product.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm font-semibold">
                  ${product.price.toFixed(2)}
                </p>
                <p className="text-xs uppercase text-muted-foreground">
                  {product.category}
                </p>
                <div className="flex gap-2 pt-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/products/${product.id}/edit`}>Edit</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {role === "shop_owner" && marketProducts.length > 0 ? (
        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-lg font-semibold">Marketplace feed</h2>
            <Link href="/" className="text-xs text-primary hover:underline">
              View all listings
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {marketProducts.map((product) => (
              <Card key={`market-${product.id}`}>
                <CardHeader>
                  <CardTitle className="text-base">{product.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm font-semibold">
                    ${product.price.toFixed(2)}
                  </p>
                  <p className="text-xs uppercase text-muted-foreground">
                    {product.category}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

