import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ProductRow = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  shop_name: string;
};

async function getProducts(search?: string, category?: string) {
  const query = supabaseServer
    .from("products")
    .select("id,name,description,price,category,image_url,shops(shop_name)")
    .order("created_at", { ascending: false });

  if (search) {
    query.ilike("name", `%${search}%`);
  }

  if (category && category !== "all") {
    query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    return [];
  }

  return (
    data?.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      category: p.category,
      image_url: p.image_url,
      shop_name: (p as any).shops?.shop_name ?? "Unknown shop",
    })) ?? []
  );
}

export default async function Home() {
  const products = await getProducts();

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              ShopConnect
            </h1>
            <p className="text-sm text-muted-foreground">
              Discover products from local shops near you.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/login"
              className="rounded-md border px-4 py-2 text-sm font-medium"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Get started
            </Link>
          </div>
        </header>

        <section className="flex flex-col gap-4 rounded-lg border bg-card p-4">
          <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
            <Input placeholder="Search products..." />
            <Input placeholder="Filter by category..." />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Latest products</h2>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No products yet. Check back soon.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product: ProductRow) => (
                <Link key={product.id} href={`/products/${product.id}`}>
                  <Card className="h-full transition hover:border-primary">
                    <CardHeader>
                      <CardTitle className="line-clamp-1">
                        {product.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {product.shop_name}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {product.description}
                      </p>
                      <p className="text-sm font-semibold">
                        ${product.price.toFixed(2)}
                      </p>
                      <p className="text-xs uppercase text-muted-foreground">
                        {product.category}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

