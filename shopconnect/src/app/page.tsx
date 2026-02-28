import Link from "next/link";
import Image from "next/image";
import { Search, ShieldCheck, Sparkles, Store } from "lucide-react";
import { supabaseServer } from "@/lib/supabase-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { formatETB } from "@/lib/currency";

type ProductRow = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  shop_name: string;
  owner_email?: string | null;
  shop_id?: number | null;
};

type HomeSearchParams = {
  search?: string;
  category?: string;
};

type HomeProps = {
  searchParams?: Promise<HomeSearchParams>;
};

const fallbackImage =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f5f5f5"/><stop offset="100%" stop-color="#e9e9e9"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#9ca3af" font-size="44" font-family="Arial, sans-serif">ShopConnect</text></svg>'
  );

function buildHomeHref(search?: string, category?: string) {
  const params = new URLSearchParams();

  if (search && search.trim()) {
    params.set("search", search.trim());
  }

  if (category && category !== "all") {
    params.set("category", category);
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

async function getProducts(search?: string, category?: string) {
  const query = supabaseServer
    .from("products")
    .select("id,name,description,price,category,image_url,shop_id,owner_email")
    .order("created_at", { ascending: false });

  if (search) {
    query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (category && category !== "all") {
    query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    return [];
  }

  type ProductQueryRow = {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
    image_url: string | null;
    shop_id?: number | null;
    owner_email?: string | null;
  };

  const rows = (data as unknown as ProductQueryRow[]) ?? [];

  const uniqueOwnerRows: ProductQueryRow[] = [];
  const ownerKeys = new Set<string>();
  for (const row of rows) {
    const ownerKey =
      row.owner_email?.trim().toLowerCase() ||
      (typeof row.shop_id === "number" ? `shop-${row.shop_id}` : `product-${row.id}`);

    if (ownerKeys.has(ownerKey)) {
      continue;
    }

    ownerKeys.add(ownerKey);
    uniqueOwnerRows.push(row);

    if (uniqueOwnerRows.length >= 6) {
      break;
    }
  }

  const shopIds = Array.from(
    new Set(
      uniqueOwnerRows
        .map((row) => row.shop_id)
        .filter((shopId): shopId is number => typeof shopId === "number")
    )
  );

  const shopNames = new Map<number, string>();

  if (shopIds.length > 0) {
    const { data: shopData, error: shopError } = await supabaseServer
      .from("shops")
      .select("id,shop_name")
      .in("id", shopIds);

    if (shopError) {
      console.error(shopError);
    } else {
      for (const row of (shopData ?? []) as Array<{ id: number; shop_name: string }>) {
        shopNames.set(row.id, row.shop_name);
      }
    }
  }

  return (
    uniqueOwnerRows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      category: p.category,
      image_url: p.image_url,
      owner_email: p.owner_email,
      shop_id: p.shop_id,
      shop_name:
        (typeof p.shop_id === "number" ? shopNames.get(p.shop_id) : undefined) ??
        "Unknown shop",
    }))
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const activeSearch = resolvedSearchParams.search?.trim() ?? "";
  const activeCategory = resolvedSearchParams.category?.trim() ?? "all";

  const products = await getProducts(activeSearch, activeCategory);
  const featuredProducts = products.slice(0, 3);
  const latestProducts = products.slice(3, 6);
  const categories = Array.from(
    new Set(products.map((product) => product.category))
  ).slice(0, 8);
  const uniqueCategoryCount = categories.length;
  const hasActiveFilters = Boolean(activeSearch || activeCategory !== "all");

  const trustItems = [
    {
      title: "Verified listings",
      description: "All posts are reviewed for quality and trust.",
      Icon: ShieldCheck,
    },
    {
      title: "Trusted local shops",
      description: "Connect with real neighborhood businesses.",
      Icon: Store,
    },
    {
      title: "Fresh arrivals",
      description: "New products are added and updated daily.",
      Icon: Sparkles,
    },
  ];

  return (
    <main className="relative min-h-screen overflow-x-clip bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-20 right-0 h-72 w-72 rounded-full bg-accent blur-3xl" />
        <div className="absolute left-0 top-[35%] h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <header className="fixed inset-x-0 top-0 z-30 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="text-sm font-semibold tracking-wide md:text-base">
              ShopConnect
            </Link>
            <div className="hidden items-center gap-2 md:flex">
              <Button asChild size="sm" variant="ghost">
                <Link href="#discover">Discover</Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href="#featured">Featured</Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href="#latest-products">Products</Link>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Get started</Link>
              </Button>
            </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-8 pt-24 md:pb-12 md:pt-28">

        <section className="relative overflow-hidden rounded-2xl border bg-card/80 p-6 shadow-sm backdrop-blur supports-backdrop-filter:bg-card/70 md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

          <div className="mb-8 grid gap-6 md:grid-cols-[1.4fr,0.9fr] md:items-center">
            <div className="space-y-3">
             
              <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                Discover amazing products from trusted neighborhood shops.
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                ShopConnect helps you find verified listings, compare top picks,
                and buy with confidence from businesses near you across{" "}
                {uniqueCategoryCount} categories.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild size="lg">
                  <Link href="#latest-products">Explore products</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/register">Start free</Link>
                </Button>
              </div>
            </div>

            <Card className="border-border/70 bg-background/70 py-5">
              <CardHeader className="space-y-2 pb-2">
                <CardTitle className="text-lg">Why customers choose us</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  One place to discover quality local products, compare value,
                  and connect with trusted shops fast.
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border bg-card p-2">
                    <p className="text-lg font-semibold">{products.length}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">Products</p>
                  </div>
                  <div className="rounded-lg border bg-card p-2">
                    <p className="text-lg font-semibold">{Math.max(products.length, 12)}+</p>
                    <p className="text-[10px] uppercase text-muted-foreground">Shops</p>
                  </div>
                  <div className="rounded-lg border bg-card p-2">
                    <p className="text-lg font-semibold">100%</p>
                    <p className="text-[10px] uppercase text-muted-foreground">Verified</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {trustItems.map(({ title, description, Icon }) => (
              <Card key={title} className="gap-3 border-border/70 bg-background/70 py-4">
                <CardContent className="space-y-2 px-5">
                  <Icon className="size-4 text-primary" />
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="discover" className="rounded-2xl border bg-card p-4 shadow-sm md:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              Find what you need
            </h2>
            {hasActiveFilters ? (
              <Button asChild variant="ghost" size="sm">
                <Link href="/">Clear all</Link>
              </Button>
            ) : null}
          </div>

          <form className="grid gap-3 md:grid-cols-[2fr,1fr,auto]" method="get">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                defaultValue={activeSearch}
                placeholder="Search products..."
                className="h-11 bg-background/80 pl-9"
              />
            </div>
            <Input
              name="category"
              defaultValue={activeCategory === "all" ? "" : activeCategory}
              placeholder="Filter by category..."
              className="h-11 bg-background/80"
            />
            <Button type="submit" className="h-11 px-6">
              Search
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              asChild
              variant={activeCategory === "all" ? "default" : "outline"}
              size="sm"
            >
              <Link href={buildHomeHref(activeSearch, "all")}>All</Link>
            </Button>
            {categories.map((category) => {
              const isActive = activeCategory === category;

              return (
                <Button
                  key={category}
                  asChild
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className="capitalize"
                >
                  <Link href={buildHomeHref(activeSearch, category)}>
                    {category}
                  </Link>
                </Button>
              );
            })}
          </div>
        </section>

        {featuredProducts.length > 0 ? (
          <section id="featured">
            <div className="mb-4 flex items-end justify-between gap-2">
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                Featured products
              </h2>
              <p className="text-xs text-muted-foreground md:text-sm">
                Newest picks from trusted shops
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {featuredProducts.map((product) => (
                <Link key={product.id} href={`/login?next=${encodeURIComponent(`/products/${product.id}`)}`}>
                  <Card className="group h-full gap-0 overflow-hidden border-primary/20 py-0 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg">
                    <div className="relative aspect-16/10 overflow-hidden border-b bg-muted/40">
                      <Image
                        src={product.image_url ?? fallbackImage}
                        alt={product.name}
                        fill
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        unoptimized
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <CardHeader className="space-y-2 pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {product.category}
                        </p>
                        <p className="text-sm font-semibold">
                          {formatETB(product.price)}
                        </p>
                      </div>
                      <CardTitle className="line-clamp-1 text-lg">
                        {product.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {product.shop_name}
                      </p>
                    </CardHeader>
                    <CardContent className="pb-6">
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {product.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section id="latest-products">
          <div className="mb-4 flex items-end justify-between gap-2">
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
              Latest products
            </h2>
            <p className="text-xs text-muted-foreground md:text-sm">
              Updated from local shops
            </p>
          </div>

          {latestProducts.length === 0 ? (
            <Card className="items-center py-12 text-center">
              <CardContent className="space-y-3">
                <p className="text-lg font-medium">No products found yet</p>
                <p className="text-sm text-muted-foreground">
                  Try a different search term, remove filters, or explore all
                  categories to discover listings.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button asChild variant="outline">
                    <Link href="/">View all products</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/register">Create an account</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {latestProducts.map((product: ProductRow) => (
                <Link key={product.id} href={`/login?next=${encodeURIComponent(`/products/${product.id}`)}`}>
                  <Card className="group h-full gap-4 overflow-hidden border-border/70 py-0 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-md">
                    <div className="relative aspect-video overflow-hidden border-b bg-muted/30">
                      <Image
                        src={product.image_url ?? fallbackImage}
                        alt={product.name}
                        fill
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        unoptimized
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <CardHeader className="space-y-3 border-b bg-muted/30 pb-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {product.category}
                        </p>
                        <p className="text-sm font-semibold">
                          {formatETB(product.price)}
                        </p>
                      </div>
                      <CardTitle className="line-clamp-1 text-lg">
                        {product.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground md:text-sm">
                        {product.shop_name}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-6">
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {product.description}
                      </p>
                      <p className="text-sm font-medium text-primary">
                        View details
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-sm md:p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Join ShopConnect
              </p>
              <h3 className="text-2xl font-semibold tracking-tight">
                Ready to discover your next favorite product?
              </h3>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Create your account to save products, track new arrivals, and
                connect with top-rated local shops.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg">
                <Link href="/register">Get started now</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
