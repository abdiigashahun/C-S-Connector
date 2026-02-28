import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { ProductDetailView } from "@/components/product-detail-view";

type ProductRow = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  shop_id: number | null;
  created_at: string | null;
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isFinite(productId) || productId <= 0) {
    notFound();
  }

  const { data, error } = await supabaseServer
    .from("products")
    .select("id,name,description,price,category,image_url,shop_id,created_at")
    .eq("id", productId)
    .maybeSingle<ProductRow>();

  if (error || !data) {
    notFound();
  }

  let shopName = "Unknown shop";

  if (typeof data.shop_id === "number") {
    const { data: shopData } = await supabaseServer
      .from("shops")
      .select("shop_name")
      .eq("id", data.shop_id)
      .maybeSingle<{ shop_name: string }>();

    if (shopData?.shop_name) {
      shopName = shopData.shop_name;
    }
  }

  const { count: initialViews } = await supabaseServer
    .from("product_views")
    .select("product_id", { count: "exact", head: true })
    .eq("product_id", data.id);

  const { count: initialLikes } = await supabaseServer
    .from("product_likes")
    .select("product_id", { count: "exact", head: true })
    .eq("product_id", data.id);

  return (
    <ProductDetailView
      product={{
        id: data.id,
        name: data.name,
        description: data.description,
        price: data.price,
        category: data.category,
        image_url: data.image_url,
        shop_name: shopName,
        created_at: data.created_at,
      }}
      initialViews={initialViews ?? 0}
      initialLikes={initialLikes ?? 0}
    />
  );
}
