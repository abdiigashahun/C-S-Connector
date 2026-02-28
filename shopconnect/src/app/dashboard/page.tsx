"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { supabaseBrowser } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Product = {
  id: number;
  name: string;
  price: number;
  category: string;
};

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const session = await authClient.getSession();
      const userId: string | undefined =
        (session as { data?: { session?: { user?: { id?: string } } } })?.data?.session?.user?.id ??
        (session as { user?: { id?: string } })?.user?.id;
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
            Manage your products.
          </p>
        </div>
        <Button asChild>
          <Link href="/products/new">Add product</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You have not posted any products yet.
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
    </main>
  );
}

