"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Bell,
  Clock3,
  Heart,
  Info,
  LogOut,
  MapPin,
  Menu,
  Search,
  Sparkles,
  Star,
  Tag,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { supabaseBrowser } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  setUserRoleByEmail,
  setUserPreferences,
} from "@/lib/user-preferences";
import { getAuthSessionUser } from "@/lib/auth-session";
import { isAdminEmail } from "@/lib/admin";
import { isOwnerEmail } from "@/lib/owner-access";
import {
  getProfileSettingsByEmail,
  saveProfileSettingsByEmail,
} from "@/lib/profile-settings";
import { formatETB } from "@/lib/currency";

type Product = {
  id: number;
  name: string;
  price: number;
  category: string;
  image_url?: string | null;
  shop_name?: string;
};

type NotificationItem = {
  id: number;
  title: string;
  description: string;
  href: string;
  type: "offer" | "info" | "update";
};

const dummyImage =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f7f7f7"/><stop offset="100%" stop-color="#ececec"/></linearGradient></defs><rect width="1200" height="700" fill="url(#g)"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#9ca3af" font-size="40" font-family="Arial, sans-serif">Customer Dashboard</text></svg>'
  );

const stats = [
  { label: "Total Shops followed", value: 3 },
  { label: "Total Favorites", value: 7 },
  { label: "Coupons / Offers available", value: 2 },
];

const defaultCategories = [
  "electronics",
  "fashion",
  "groceries",
  "home",
  "beauty",
  "sports",
  "books",
];

const dummyRecentlyViewed = [
  { id: 1, name: "Wireless Earbuds Pro", shopName: "Tech Corner", viewedAt: "2 hours ago", href: "/products/1" },
  { id: 2, name: "Premium Sneakers", shopName: "Urban Steps", viewedAt: "Yesterday", href: "/products/2" },
  { id: 3, name: "Organic Coffee Beans", shopName: "Green Basket", viewedAt: "2 days ago", href: "/products/3" },
  { id: 4, name: "Smart Fitness Watch", shopName: "Pulse Hub", viewedAt: "3 days ago", href: "/products/4" },
  { id: 5, name: "Ergonomic Chair", shopName: "Home Ease", viewedAt: "Last week", href: "/products/5" },
];

const dummyWishlist = [
  { id: 11, name: "Portable Blender", shopName: "Kitchen Point", price: 39.99 },
  { id: 12, name: "Bluetooth Speaker", shopName: "Sound Mart", price: 69.0 },
  { id: 13, name: "Skin Care Set", shopName: "Glow Store", price: 45.5 },
  { id: 14, name: "Running Shoes", shopName: "Fit City", price: 89.99 },
];

const dummyNotifications: NotificationItem[] = [
  {
    id: 1,
    title: "New shop opened in your area",
    description: "City Electronics just joined with launch discounts up to 20%.",
    href: "/",
    type: "update",
  },
  {
    id: 2,
    title: "Coupon available: SAVE10",
    description: "Use SAVE10 this week on selected home and kitchen products.",
    href: "/",
    type: "offer",
  },
  {
    id: 3,
    title: "Weekend social updates",
    description: "Your followed shops posted new stories and product drops.",
    href: "/",
    type: "info",
  },
];

export default function CustomerDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [marketProducts, setMarketProducts] = useState<Product[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("addis-ababa");
  const [selectedRadius, setSelectedRadius] = useState("10");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [selectedRating, setSelectedRating] = useState("all");
  const [selectedSort, setSelectedSort] = useState("latest");

  const [userName, setUserName] = useState("Abdi");
  const [userEmail, setUserEmail] = useState("abdi@example.com");
  const [phone, setPhone] = useState("+251 9XX XXX XXX");
  const [preferredLocation, setPreferredLocation] = useState("Addis Ababa");
  const [savedAddress, setSavedAddress] = useState("Bole, Addis Ababa");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [showPhoneNumber, setShowPhoneNumber] = useState(false);
  const [profileSaveMessage, setProfileSaveMessage] = useState<string | null>(null);
  const [productLikes, setProductLikes] = useState<Record<number, number>>({});
  const [likedProducts, setLikedProducts] = useState<Record<number, boolean>>({});
  const [likingProductId, setLikingProductId] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const session = await authClient.getSession();
      const user = getAuthSessionUser(session);

      if (!user?.id) {
        router.replace("/login");
        return;
      }

      if (user?.name) {
        setUserName(user.name);
      }
      if (user?.email) {
        setUserEmail(user.email);
      }

      if (isAdminEmail(user?.email)) {
        router.replace("/dashboard/admin");
        return;
      }

      const isOwner = await isOwnerEmail(user?.email);
      if (isOwner) {
        router.replace("/dashboard/owner");
        return;
      }

      if (user?.email) {
        const savedProfile = await getProfileSettingsByEmail(user.email);
        if (savedProfile) {
          setUserName(savedProfile.name || user.name || "Customer");
          setPhone(savedProfile.phone || "+251 9XX XXX XXX");
          setPreferredLocation(savedProfile.preferredLocation || "Addis Ababa");
          setSavedAddress(savedProfile.address || "Bole, Addis Ababa");
          setNotifyEmail(savedProfile.notifyEmail);
          setNotifyPush(savedProfile.notifyPush);
          setShowPhoneNumber(savedProfile.showPhone);
        }
      }

      if (user?.email) {
        const acceptedAt = new Date().toISOString();
        setUserPreferences(user.id, {
          role: "customer",
          termsAcceptedAt: acceptedAt,
        });
        await setUserRoleByEmail({
          email: user.email,
          role: "customer",
          termsAcceptedAt: acceptedAt,
          userId: user.id,
        });
      }

      const { data } = await supabaseBrowser
        .from("products")
        .select("id,name,price,category,image_url,shops(shop_name)")
        .order("created_at", { ascending: false })
        .limit(12);

      setMarketProducts(
        (data ?? []).map((row: unknown) => {
          const product = row as Product & { shops?: { shop_name?: string } | null };
          return {
            id: product.id,
            name: product.name,
            price: product.price,
            category: product.category,
            image_url: product.image_url ?? null,
            shop_name: product.shops?.shop_name ?? "Local Shop",
          };
        })
      );

      setLoading(false);
    };

    load();
  }, [router]);

  const handleLogout = async () => {
    await authClient.signOut();
    router.replace("/login");
  };

  const handleSaveProfileChanges = async () => {
    if (!userEmail) {
      setProfileSaveMessage("Unable to save profile right now.");
      return;
    }

    const saved = await saveProfileSettingsByEmail({
      email: userEmail,
      role: "customer",
      name: userName,
      phone,
      preferredLocation,
      address: savedAddress,
      notifyEmail,
      notifyPush,
      showPhone: showPhoneNumber,
    });

    if (!saved) {
      setProfileSaveMessage("Unable to save profile right now.");
      return;
    }

    setProfileSaveMessage("Profile changes saved.");
  };

  const mergedProducts = useMemo(() => {
    if (marketProducts.length > 0) {
      return marketProducts;
    }

    return [
      { id: 201, name: "Smart Lamp", price: 29.99, category: "home", image_url: null, shop_name: "Home Ease" },
      { id: 202, name: "Sport Hoodie", price: 49.5, category: "fashion", image_url: null, shop_name: "Fit City" },
      { id: 203, name: "Mini Air Fryer", price: 79.99, category: "home", image_url: null, shop_name: "Kitchen Point" },
      { id: 204, name: "Gaming Mouse", price: 35.0, category: "electronics", image_url: null, shop_name: "Tech Corner" },
      { id: 205, name: "Vitamin Pack", price: 18.0, category: "beauty", image_url: null, shop_name: "Health Hub" },
      { id: 206, name: "Yoga Mat", price: 25.0, category: "sports", image_url: null, shop_name: "Active Life" },
    ];
  }, [marketProducts]);

  const productCategories = useMemo(() => {
    const fromProducts = Array.from(new Set(mergedProducts.map((product) => product.category)));
    return Array.from(new Set([...defaultCategories, ...fromProducts]));
  }, [mergedProducts]);

  const recommendedProducts = useMemo(() => {
    let result = mergedProducts.filter((product) => {
      const keyword = searchText.trim().toLowerCase();
      const matchesKeyword =
        keyword.length === 0 ||
        product.name.toLowerCase().includes(keyword) ||
        product.category.toLowerCase().includes(keyword) ||
        (product.shop_name ?? "").toLowerCase().includes(keyword);

      const matchesCategory =
        selectedCategory === "all" || product.category === selectedCategory;

      return matchesKeyword && matchesCategory;
    });

    if (selectedPriceRange === "under-25") {
      result = result.filter((product) => product.price < 25);
    }

    if (selectedPriceRange === "25-75") {
      result = result.filter((product) => product.price >= 25 && product.price <= 75);
    }

    if (selectedPriceRange === "over-75") {
      result = result.filter((product) => product.price > 75);
    }

    if (selectedSort === "price-low") {
      result = [...result].sort((a, b) => a.price - b.price);
    }

    if (selectedSort === "rating-high") {
      result = [...result].sort((a, b) => (b.id % 5) - (a.id % 5));
    }

    if (selectedSort === "latest") {
      result = [...result].sort((a, b) => b.id - a.id);
    }

    return result;
  }, [
    mergedProducts,
    searchText,
    selectedCategory,
    selectedPriceRange,
    selectedSort,
  ]);

  useEffect(() => {
    const loadLikeState = async () => {
      if (recommendedProducts.length === 0) {
        return;
      }

      const results = await Promise.all(
        recommendedProducts.slice(0, 12).map(async (product) => {
          const response = await fetch(`/api/products/${product.id}/interactions`);
          if (!response.ok) {
            return null;
          }

          const payload = (await response.json().catch(() => null)) as
            | { data?: { likes?: number; liked?: boolean } }
            | null;

          return {
            productId: product.id,
            likes: payload?.data?.likes ?? 0,
            liked: payload?.data?.liked ?? false,
          };
        })
      );

      const nextLikes: Record<number, number> = {};
      const nextLiked: Record<number, boolean> = {};

      for (const item of results) {
        if (!item) {
          continue;
        }

        nextLikes[item.productId] = item.likes;
        nextLiked[item.productId] = item.liked;
      }

      setProductLikes((current) => ({ ...current, ...nextLikes }));
      setLikedProducts((current) => ({ ...current, ...nextLiked }));
    };

    void loadLikeState();
  }, [recommendedProducts]);

  const handleToggleLike = async (productId: number) => {
    setLikingProductId(productId);

    const previousLiked = likedProducts[productId] ?? false;
    const previousLikes = productLikes[productId] ?? 0;
    const optimisticLiked = !previousLiked;
    const optimisticLikes = Math.max(0, previousLikes + (optimisticLiked ? 1 : -1));

    setLikedProducts((current) => ({
      ...current,
      [productId]: optimisticLiked,
    }));
    setProductLikes((current) => ({
      ...current,
      [productId]: optimisticLikes,
    }));

    const response = await fetch(`/api/products/${productId}/interactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "toggle_like" }),
    });

    if (!response.ok) {
      setLikedProducts((current) => ({
        ...current,
        [productId]: previousLiked,
      }));
      setProductLikes((current) => ({
        ...current,
        [productId]: previousLikes,
      }));
      setLikingProductId(null);
      return;
    }

    const payload = (await response.json().catch(() => null)) as
      | { data?: { likes?: number; liked?: boolean } }
      | null;

    if (typeof payload?.data?.likes === "number") {
      setProductLikes((current) => ({
        ...current,
        [productId]: payload.data?.likes ?? optimisticLikes,
      }));
    }

    if (typeof payload?.data?.liked === "boolean") {
      setLikedProducts((current) => ({
        ...current,
        [productId]: payload.data?.liked ?? optimisticLiked,
      }));
    }

    setLikingProductId(null);
  };

  return (
    <main className="relative mx-auto min-h-screen max-w-6xl px-4 pt-24 pb-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-0 top-1/3 h-56 w-56 rounded-full bg-accent blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <header className="fixed inset-x-0 top-0 z-40">
        <div className="mx-auto w-full max-w-6xl px-4 pt-0">
        <Card className="border-border/70 bg-background/80 py-2 shadow-md backdrop-blur supports-backdrop-filter:bg-background/70">
          <CardContent className="flex items-center justify-between px-3 sm:px-4">
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    className="size-9 p-0"
                    aria-label="Open dashboard menu"
                  >
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0">
                  <SheetHeader className="border-b px-5 py-4">
                    <SheetTitle> Menu</SheetTitle>
                    <SheetDescription>
                      Quick links for your dashboard and account.
                    </SheetDescription>
                  </SheetHeader>

                  <div className="space-y-2 p-4">
                    <SheetClose asChild>
                      <Button asChild variant="outline" className="w-full justify-start">
                        <Link href="/dashboard/customer">Dashboard </Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button asChild variant="outline" className="w-full justify-start">
                        <Link href="/">Marketplace</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button asChild variant="outline" className="w-full justify-start">
                        <Link href="/profile">Profile</Link>
                      </Button>
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>

              <div>
           
             
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-1 size-4" /> Logout
              </Button>
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    aria-label="Open profile"
                    className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <Avatar className="ring-primary/30 ring-2" size="lg">
                      <AvatarFallback>{userName.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="overflow-y-auto p-0">
                  <SheetHeader className="border-b px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar size="lg">
                        <AvatarFallback>{userName.slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <SheetTitle>Account & Profile</SheetTitle>
                        <SheetDescription>{userEmail}</SheetDescription>
                      </div>
                    </div>
                  </SheetHeader>

                  <div className="space-y-4 p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone number</Label>
                        <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Preferred location</Label>
                        <div className="relative">
                          <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="location"
                            className="pl-9"
                            value={preferredLocation}
                            onChange={(event) => setPreferredLocation(event.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address">Saved address</Label>
                        <Input
                          id="address"
                          value={savedAddress}
                          onChange={(event) => setSavedAddress(event.target.value)}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <p className="text-sm font-medium">Notification preferences</p>
                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={notifyEmail}
                            onChange={(event) => setNotifyEmail(event.target.checked)}
                          />
                          Email notifications
                        </label>
                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={notifyPush}
                            onChange={(event) => setNotifyPush(event.target.checked)}
                          />
                          Push notifications
                        </label>
                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={showPhoneNumber}
                            onChange={(event) => setShowPhoneNumber(event.target.checked)}
                          />
                          Show my phone number on my customer profile
                        </label>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <p className="text-sm font-medium">Security</p>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm">Reset password</Button>
                          <Button variant="outline" size="sm">Linked social logins</Button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-1">
                      <Button className="w-full" onClick={handleSaveProfileChanges}>
                        Save profile changes
                      </Button>
                      {profileSaveMessage ? (
                        <p className="mt-2 text-xs text-muted-foreground">{profileSaveMessage}</p>
                      ) : null}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </CardContent>
        </Card>
        </div>
      </header>

     

      <section className="mb-8 rounded-2xl border bg-card/95 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Customer Dashboard
            </p>
            <h1 className="text-2xl font-semibold md:text-3xl">
              Hello, {userName}! Ready to explore your favorite shops?
            </h1>
            <p className="text-sm text-muted-foreground">
              Discover trending products, new offers, and personalized picks in one place.
            </p>
          </div>
          <Button asChild>
            <Link href="/">Browse marketplace</Link>
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-border/70 bg-background/70 py-4">
              <CardContent className="space-y-1 px-5">
                <p className="text-2xl font-semibold">{stat.value}</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Search & Filters</h2>
          <p className="text-xs text-muted-foreground">Tailored for your area</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="relative lg:col-span-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search by product, shop, or category..."
              className="pl-9"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Location (City)</Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="addis-ababa">Addis Ababa</SelectItem>
                <SelectItem value="adama">Adama</SelectItem>
                <SelectItem value="bahir-dar">Bahir Dar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Radius</Label>
            <Select value={selectedRadius} onValueChange={setSelectedRadius}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Within 5 km</SelectItem>
                <SelectItem value="10">Within 10 km</SelectItem>
                <SelectItem value="20">Within 20 km</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Price Range</Label>
            <Select value={selectedPriceRange} onValueChange={setSelectedPriceRange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All prices</SelectItem>
                <SelectItem value="under-25">Under $25</SelectItem>
                <SelectItem value="25-75">$25 - $75</SelectItem>
                <SelectItem value="over-75">Over $75</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {productCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rating</Label>
            <Select value={selectedRating} onValueChange={setSelectedRating}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ratings</SelectItem>
                <SelectItem value="4">4+ stars</SelectItem>
                <SelectItem value="3">3+ stars</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sort</Label>
            <Select value={selectedSort} onValueChange={setSelectedSort}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="price-low">Price Low → High</SelectItem>
                <SelectItem value="rating-high">Rating High → Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Recommended for you</h2>
            <p className="text-sm text-muted-foreground">
              Trending in your city · New arrivals near {preferredLocation}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/">See all</Link>
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading recommendations...</p>
        ) : recommendedProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No matching products found. Try adjusting filters.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recommendedProducts.slice(0, 12).map((product) => {
              const rating = ((product.id % 5) + 1).toFixed(1);

              return (
                <Card key={product.id} className="group overflow-hidden py-0 transition hover:shadow-md">
                  <div className="relative aspect-video border-b bg-muted/30">
                    <Image
                      src={product.image_url ?? dummyImage}
                      alt={product.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      unoptimized
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-1 text-base">{product.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{product.shop_name ?? "Local Shop"}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{formatETB(product.price)}</p>
                      <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="size-3 fill-current" /> {rating}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link href={`/products/${product.id}`}>View details</Link>
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        variant={likedProducts[product.id] ? "default" : "outline"}
                        onClick={() => void handleToggleLike(product.id)}
                        disabled={likingProductId === product.id}
                      >
                        <Heart className="mr-1 size-3" />
                        {productLikes[product.id] ?? 0} Like
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recently viewed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dummyRecentlyViewed.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.shopName}</p>
                  <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock3 className="size-3" /> {item.viewedAt}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={item.href}>View again</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Favorites / Wishlist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dummyWishlist.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.shopName}</p>
                  <p className="text-xs font-semibold">{formatETB(item.price)}</p>
                </div>
                <Button size="sm" variant="ghost">
                  <Heart className="mr-1 size-3 fill-current" /> Remove
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mb-8 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Notifications & Offers</h2>
          <Bell className="size-4 text-muted-foreground" />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {dummyNotifications.map((notification) => {
            const Icon =
              notification.type === "offer"
                ? Tag
                : notification.type === "update"
                  ? Info
                  : Bell;

            return (
              <Card key={notification.id} className="border-border/70 py-4">
                <CardContent className="space-y-2 px-5">
                  <Icon className="size-4 text-primary" />
                  <p className="text-sm font-semibold">{notification.title}</p>
                  <p className="text-xs text-muted-foreground">{notification.description}</p>
                  <Link href={notification.href} className="text-xs text-primary hover:underline">
                    View details
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

    </main>
  );
}
