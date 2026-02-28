"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  DollarSign,
  Eye,
  Filter,
  ImagePlus,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  MessageSquare,
  Package,
  PencilLine,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Video,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { supabaseBrowser } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type MarketProduct = {
  id: number;
  name: string;
  price: number;
  category: string;
  image_url?: string | null;
  owner_email?: string | null;
  created_at?: string | null;
};

type OwnerProduct = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string | null;
  mediaUrls: string[];
  videoUrl: string;
  location: string;
  phone: string;
  socialLinks: string;
  createdAt: string;
  ageDays: number;
  status: "active" | "pending";
  views: number;
  likes: number;
  sales: number;
};

type ProductDraft = {
  name: string;
  description: string;
  price: string;
  category: string;
  mediaUrls: string[];
  videoUrl: string;
  location: string;
  phone: string;
  socialLinks: string;
};

type MediaRequirement = "one_of_them" | "both_image_video";

const dummyImage =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f7f7f7"/><stop offset="100%" stop-color="#ececec"/></linearGradient></defs><rect width="1200" height="700" fill="url(#g)"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#9ca3af" font-size="40" font-family="Arial, sans-serif">Owner Dashboard</text></svg>'
  );

const categoryOptions = [
  "electronics",
  "fashion",
  "groceries",
  "home",
  "beauty",
  "sports",
  "books",
  "other",
];

const emptyDraft: ProductDraft = {
  name: "",
  description: "",
  price: "",
  category: "electronics",
  mediaUrls: [""],
  videoUrl: "",
  location: "Addis Ababa",
  phone: "+251 9XX XXX XXX",
  socialLinks: "",
};

export default function OwnerDashboardPage() {
  const router = useRouter();

  const [products, setProducts] = useState<OwnerProduct[]>([]);
  const [marketProducts, setMarketProducts] = useState<MarketProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);

  const [userInitial, setUserInitial] = useState("O");
  const [userName, setUserName] = useState("Owner");
  const [userEmail, setUserEmail] = useState("owner@example.com");
  const [phone, setPhone] = useState("+251 9XX XXX XXX");
  const [preferredLocation, setPreferredLocation] = useState("Addis Ababa");
  const [shopAddress, setShopAddress] = useState("Bole, Addis Ababa");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [profileSaveMessage, setProfileSaveMessage] = useState<string | null>(null);

  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [productActionMessage, setProductActionMessage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isDeletingProductId, setIsDeletingProductId] = useState<number | null>(null);
  const [mediaRequirement, setMediaRequirement] = useState<MediaRequirement>("one_of_them");
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      const session = await authClient.getSession();
      const sessionUser = getAuthSessionUser(session);
      const userId = sessionUser?.id;
      const sessionUserName =
        (session as { data?: { user?: { name?: string } } })?.data?.user?.name ??
        (session as { data?: { session?: { user?: { name?: string } } } })?.data?.session?.user?.name ??
        (session as { user?: { name?: string } })?.user?.name ??
        "Owner";
      const sessionEmail =
        (session as { data?: { user?: { email?: string } } })?.data?.user?.email ??
        (session as { data?: { session?: { user?: { email?: string } } } })?.data?.session?.user?.email ??
        (session as { user?: { email?: string } })?.user?.email ??
        "owner@example.com";

      setUserName(sessionUserName);
      setUserEmail(sessionEmail);
      setUserInitial(sessionUserName.slice(0, 1).toUpperCase());

      if (isAdminEmail(sessionEmail)) {
        router.replace("/dashboard/admin");
        return;
      }

      if (!userId) {
        router.replace("/login");
        return;
      }

      setOwnerUserId(userId);

      const isOwner = await isOwnerEmail(sessionEmail);
      if (!isOwner) {
        router.replace("/dashboard/customer");
        return;
      }

      if (sessionEmail) {
        const savedProfile = await getProfileSettingsByEmail(sessionEmail);
        if (savedProfile) {
          setUserName(savedProfile.name || sessionUserName);
          setUserInitial((savedProfile.name || sessionUserName).slice(0, 1).toUpperCase() || "O");
          setPhone(savedProfile.phone || "+251 9XX XXX XXX");
          setPreferredLocation(savedProfile.preferredLocation || "Addis Ababa");
          setShopAddress(savedProfile.address || "Bole, Addis Ababa");
          setNotifyEmail(savedProfile.notifyEmail);
          setNotifyPush(savedProfile.notifyPush);
        }
      }

      const acceptedAt = new Date().toISOString();
      setUserPreferences(userId, {
        role: "shop_owner",
        termsAcceptedAt: acceptedAt,
      });
      if (sessionEmail) {
        await setUserRoleByEmail({
          email: sessionEmail,
          role: "shop_owner",
          termsAcceptedAt: acceptedAt,
          userId,
        });
      }

      const { data: ownData } = await supabaseBrowser
        .from("products")
        .select("id,name,price,category,image_url,owner_email,created_at")
        .eq("owner_email", sessionEmail)
        .order("created_at", { ascending: false });

      setProducts(
        (ownData ?? []).map((item: unknown, index: number) => {
          const product = item as MarketProduct;
          const createdDate = product.created_at ? new Date(product.created_at) : new Date();
          const daysAgo = Math.max(
            0,
            Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
          );

          return {
            id: product.id,
            name: product.name,
            description: `High-quality ${product.name.toLowerCase()} with trusted local delivery and fast support.`,
            price: product.price,
            category: product.category,
            image_url: product.image_url ?? null,
            mediaUrls: [product.image_url ?? ""].filter(Boolean),
            videoUrl: "",
            location: "Addis Ababa",
            phone: "+251 9XX XXX XXX",
            socialLinks: "https://instagram.com/your-shop",
            createdAt: createdDate.toISOString(),
            ageDays: daysAgo,
            status: index % 5 === 0 ? "pending" : "active",
            views: 180 + index * 23,
            likes: 25 + index * 4,
            sales: 6 + index * 2,
          };
        })
      );

      const { data: marketData } = await supabaseBrowser
        .from("products")
        .select("id,name,price,category,image_url")
        .order("created_at", { ascending: false })
        .limit(8);

      setMarketProducts(
        (marketData ?? []).map((item: unknown) => {
          const product = item as MarketProduct;
          return {
            id: product.id,
            name: product.name,
            price: product.price,
            category: product.category,
            image_url: product.image_url ?? null,
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
      role: "shop_owner",
      name: userName,
      phone,
      preferredLocation,
      address: shopAddress,
      notifyEmail,
      notifyPush,
      showPhone: true,
    });

    if (!saved) {
      setProfileSaveMessage("Unable to save profile right now.");
      return;
    }

    setUserInitial(userName.slice(0, 1).toUpperCase() || "O");
    setProfileSaveMessage("Profile changes saved.");
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const keyword = searchText.trim().toLowerCase();
      const matchesKeyword =
        keyword.length === 0 ||
        product.name.toLowerCase().includes(keyword) ||
        product.description.toLowerCase().includes(keyword);

      const matchesCategory =
        categoryFilter === "all" || product.category === categoryFilter;

      const matchesPrice =
        priceFilter === "all" ||
        (priceFilter === "under-25" && product.price < 25) ||
        (priceFilter === "25-100" && product.price >= 25 && product.price <= 100) ||
        (priceFilter === "over-100" && product.price > 100);

      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "7-days" && product.ageDays <= 7) ||
        (dateFilter === "30-days" && product.ageDays <= 30);

      return matchesKeyword && matchesCategory && matchesPrice && matchesDate;
    });
  }, [products, searchText, categoryFilter, priceFilter, dateFilter]);

  const analytics = useMemo(() => {
    const totalProducts = products.length;
    const totalViews = products.reduce((sum, product) => sum + product.views, 0);
    const totalLikes = products.reduce((sum, product) => sum + product.likes, 0);
    const totalSales = products.reduce((sum, product) => sum + product.sales, 0);
    const revenue = products.reduce((sum, product) => sum + product.sales * product.price, 0);
    const pendingApprovals = products.filter((product) => product.status === "pending").length;

    return {
      totalProducts,
      totalViews,
      totalLikes,
      totalSales,
      revenue,
      pendingApprovals,
    };
  }, [products]);

  const updateDraft = (key: keyof ProductDraft, value: string | string[]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateMediaUrl = (index: number, value: string) => {
    setDraft((current) => {
      const nextMedia = [...current.mediaUrls];
      nextMedia[index] = value;
      return { ...current, mediaUrls: nextMedia };
    });
  };

  const addMediaField = () => {
    setDraft((current) => ({ ...current, mediaUrls: [...current.mediaUrls, ""] }));
  };

  const removeMediaField = (index: number) => {
    setDraft((current) => {
      if (current.mediaUrls.length === 1) {
        return current;
      }

      return {
        ...current,
        mediaUrls: current.mediaUrls.filter((_, mediaIndex) => mediaIndex !== index),
      };
    });
  };

  const uploadProductMedia = async (file: File, mediaType: "image" | "video") => {
    const ownerEmail = userEmail.trim().toLowerCase();
    if (!ownerEmail) {
      setProductActionMessage("Unable to upload media. Please login again.");
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("ownerEmail", ownerEmail);
    formData.append("mediaType", mediaType);

    const response = await fetch("/api/uploads/product-media", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setProductActionMessage(payload?.error ?? "Upload failed.");
      return null;
    }

    const payload = (await response.json()) as {
      data?: { publicUrl?: string; mediaType?: "image" | "video" };
    };

    return payload.data?.publicUrl ?? null;
  };

  const handleImageFileSelected = async (file: File) => {
    setIsUploadingImage(true);
    setProductActionMessage(null);

    const uploadedUrl = await uploadProductMedia(file, "image");

    if (uploadedUrl) {
      setDraft((current) => {
        const nextMedia = [...current.mediaUrls];
        const firstEmptyIndex = nextMedia.findIndex((url) => url.trim().length === 0);
        if (firstEmptyIndex >= 0) {
          nextMedia[firstEmptyIndex] = uploadedUrl;
        } else {
          nextMedia.push(uploadedUrl);
        }
        return { ...current, mediaUrls: nextMedia };
      });
      setProductActionMessage("Image uploaded successfully.");
    }

    setIsUploadingImage(false);
  };

  const handleVideoFileSelected = async (file: File) => {
    setIsUploadingVideo(true);
    setProductActionMessage(null);

    const uploadedUrl = await uploadProductMedia(file, "video");
    if (uploadedUrl) {
      setDraft((current) => ({ ...current, videoUrl: uploadedUrl }));
      setProductActionMessage("Video uploaded successfully.");
    }

    setIsUploadingVideo(false);
  };

  const handleSubmitProduct = async () => {
    const parsedPrice = Number(draft.price);

    if (!draft.name.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setProductActionMessage("Please add a valid product name and price.");
      return;
    }

    setIsSavingProduct(true);
    setProductActionMessage(null);

    const cleanedMedia = draft.mediaUrls.map((url) => url.trim()).filter(Boolean);
    const cleanedVideo = draft.videoUrl.trim();

    if (mediaRequirement === "both_image_video") {
      if (cleanedMedia.length === 0 || cleanedVideo.length === 0) {
        setProductActionMessage("Please upload both image and video for this product.");
        setIsSavingProduct(false);
        return;
      }
    } else if (cleanedMedia.length === 0 && cleanedVideo.length === 0) {
      setProductActionMessage("Please upload at least one media: image or video.");
      setIsSavingProduct(false);
      return;
    }

    let persistedId = editingProductId ?? Date.now();

    if (editingProductId) {
      const updateResponse = await fetch("/api/owner-products", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingProductId,
          name: draft.name.trim(),
          description: draft.description.trim() || "No description provided.",
          price: parsedPrice,
          category: draft.category,
          imageUrl: cleanedMedia[0] ?? null,
        }),
      });

      const updatePayload = (await updateResponse.json().catch(() => null)) as
        | { error?: string; data?: { id?: number | null } }
        | null;

      if (!updateResponse.ok) {
        setProductActionMessage(updatePayload?.error ?? "Unable to update product.");
        setIsSavingProduct(false);
        return;
      }

      persistedId = updatePayload?.data?.id ?? editingProductId;
    } else {
      const createResponse = await fetch("/api/owner-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: draft.name.trim(),
          description: draft.description.trim() || "No description provided.",
          price: parsedPrice,
          category: draft.category,
          imageUrl: cleanedMedia[0] ?? null,
        }),
      });

      const createPayload = (await createResponse.json().catch(() => null)) as
        | { error?: string; data?: { id?: number | null } }
        | null;

      if (!createResponse.ok) {
        setProductActionMessage(createPayload?.error ?? "Unable to create product.");
        setIsSavingProduct(false);
        return;
      }

      if (createPayload?.data?.id) {
        persistedId = createPayload.data.id;
      }
    }

    const nextProduct: OwnerProduct = {
      id: persistedId,
      name: draft.name.trim(),
      description: draft.description.trim() || "No description provided.",
      price: parsedPrice,
      category: draft.category,
      image_url: cleanedMedia[0] ?? null,
      mediaUrls: cleanedMedia,
      videoUrl: cleanedVideo,
      location: draft.location.trim() || "Addis Ababa",
      phone: draft.phone.trim() || "+251 9XX XXX XXX",
      socialLinks: draft.socialLinks.trim(),
      createdAt: new Date().toISOString(),
      ageDays: 0,
      status: "pending",
      views: 0,
      likes: 0,
      sales: 0,
    };

    if (editingProductId) {
      setProducts((current) =>
        current.map((product) =>
          product.id === editingProductId ? { ...product, ...nextProduct, id: persistedId } : product
        )
      );
    } else {
      setProducts((current) => [nextProduct, ...current]);
    }

    setDraft(emptyDraft);
    setEditingProductId(null);
    setProductActionMessage("Product saved to Supabase successfully.");
    setIsSavingProduct(false);
  };

  const editProduct = (product: OwnerProduct) => {
    setEditingProductId(product.id);
    setDraft({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category,
      mediaUrls: product.mediaUrls.length > 0 ? product.mediaUrls : [product.image_url ?? ""],
      videoUrl: product.videoUrl,
      location: product.location,
      phone: product.phone,
      socialLinks: product.socialLinks,
    });
  };

  const deleteProduct = async (productId: number) => {
    setIsDeletingProductId(productId);
    setProductActionMessage(null);

    const deleteResponse = await fetch("/api/owner-products", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: productId }),
    });

    const deletePayload = (await deleteResponse.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!deleteResponse.ok) {
      setProductActionMessage(deletePayload?.error ?? "Unable to delete product.");
      setIsDeletingProductId(null);
      return;
    }

    setProducts((current) => current.filter((product) => product.id !== productId));
    setProductActionMessage("Product deleted successfully.");
    setIsDeletingProductId(null);
  };

  const moveProduct = (productId: number, direction: "up" | "down") => {
    setProducts((current) => {
      const index = current.findIndex((product) => product.id === productId);
      if (index < 0) {
        return current;
      }

      if (direction === "up" && index === 0) {
        return current;
      }

      if (direction === "down" && index === current.length - 1) {
        return current;
      }

      const next = [...current];
      const swapWith = direction === "up" ? index - 1 : index + 1;
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return next;
    });
  };

  return (
    <main className="relative mx-auto min-h-screen max-w-6xl px-4 pt-24 pb-10">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 right-4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-0 top-1/3 h-60 w-60 rounded-full bg-accent blur-3xl" />
      </div>

      <header className="fixed inset-x-0 top-0 z-40">
        <div className="mx-auto w-full max-w-6xl px-4">
          <Card className="border-border/70 bg-background/80 py-2 shadow-md backdrop-blur supports-backdrop-filter:bg-background/70">
            <CardContent className="flex items-center justify-between px-3 sm:px-4">
              <div className="flex items-center gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" className="size-9 p-0" aria-label="Open owner menu">
                      <Menu className="size-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0">
                    <SheetHeader className="border-b px-5 py-4">
                      <SheetTitle>Owner Menu</SheetTitle>
                      <SheetDescription>Quick links for your shop management.</SheetDescription>
                    </SheetHeader>

                    <div className="space-y-2 p-4">
                      <SheetClose asChild>
                        <Button asChild variant="outline" className="w-full justify-start">
                          <Link href="/dashboard/owner">Dashboard Home</Link>
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button asChild variant="outline" className="w-full justify-start">
                          <Link href="/products/new">Add product</Link>
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button asChild variant="outline" className="w-full justify-start">
                          <Link href="/profile">Profile</Link>
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button asChild variant="outline" className="w-full justify-start">
                          <Link href="/dashboard/admin">Admin controls</Link>
                        </Button>
                      </SheetClose>
                    </div>
                  </SheetContent>
                </Sheet>

                <div>
                  
                  <p className="text-sm font-semibold">Owner Dashboard</p>
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
                        <AvatarFallback>{userInitial}</AvatarFallback>
                      </Avatar>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="right" className="overflow-y-auto p-0">
                    <SheetHeader className="border-b px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar size="lg">
                          <AvatarFallback>{userInitial}</AvatarFallback>
                        </Avatar>
                        <div>
                          <SheetTitle>Account & Profile</SheetTitle>
                          <SheetDescription>{userEmail}</SheetDescription>
                        </div>
                      </div>
                    </SheetHeader>

                    <div className="space-y-4 p-5">
                      <div className="space-y-2">
                        <Label htmlFor="owner-name">Owner name</Label>
                        <Input
                          id="owner-name"
                          value={userName}
                          onChange={(event) => setUserName(event.target.value)}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="owner-phone">Phone number</Label>
                          <Input
                            id="owner-phone"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="owner-location">Business location</Label>
                          <div className="relative">
                            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="owner-location"
                              className="pl-9"
                              value={preferredLocation}
                              onChange={(event) => setPreferredLocation(event.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="owner-address">Shop address</Label>
                          <Input
                            id="owner-address"
                            value={shopAddress}
                            onChange={(event) => setShopAddress(event.target.value)}
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

      <Card className="mb-6 border-primary/30 bg-linear-to-r from-primary/15 via-primary/5 to-transparent py-3">
        <CardContent className="px-5">
          <p className="inline-flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-primary" /> You are Owner
          </p>
        </CardContent>
      </Card>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="transition hover:shadow-md">
          <CardContent className="flex items-center justify-between px-5 py-5">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Products</p>
              <p className="text-2xl font-semibold">{analytics.totalProducts}</p>
            </div>
            <Package className="size-5 text-primary" />
          </CardContent>
        </Card>
        <Card className="transition hover:shadow-md">
          <CardContent className="flex items-center justify-between px-5 py-5">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Revenue</p>
              <p className="text-2xl font-semibold">${analytics.revenue.toFixed(0)}</p>
            </div>
            <DollarSign className="size-5 text-primary" />
          </CardContent>
        </Card>
        <Card className="transition hover:shadow-md">
          <CardContent className="flex items-center justify-between px-5 py-5">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Views</p>
              <p className="text-2xl font-semibold">{analytics.totalViews}</p>
            </div>
            <Eye className="size-5 text-primary" />
          </CardContent>
        </Card>
        <Card className="transition hover:shadow-md">
          <CardContent className="flex items-center justify-between px-5 py-5">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Likes</p>
              <p className="text-2xl font-semibold">{analytics.totalLikes}</p>
            </div>
            <TrendingUp className="size-5 text-primary" />
          </CardContent>
        </Card>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notifications & Tasks</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              <p className="font-semibold">Pending approvals</p>
              <p className="mt-1 text-2xl font-semibold">{analytics.pendingApprovals}</p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-semibold">Unread messages</p>
              <p className="mt-1 text-2xl font-semibold">4</p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-semibold">Active promotions</p>
              <p className="mt-1 text-2xl font-semibold">2</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="inline-flex items-center gap-2 text-foreground">
              <ShieldCheck className="size-4 text-primary" /> Owner-safe editing enabled
            </p>
            <p>
              You only manage products loaded under your authenticated owner scope.
            </p>
            <p className="text-xs">Owner ID: {ownerUserId ?? "Not available"}</p>
          </CardContent>
        </Card>
      </section>

      <section className="mb-6">
        <details open className="group rounded-2xl border bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-semibold">Product Studio</p>
              <p className="text-xs text-muted-foreground">
                Add, update, and prepare products with media before publishing.
              </p>
            </div>
            <Plus className="size-4 transition group-open:rotate-45" />
          </summary>

          <div className="border-t px-5 py-5">
            <div className="mb-4 flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/products/new">Post via full product page</Link>
              </Button>
              <Button variant="outline" onClick={handleSubmitProduct} disabled={isSavingProduct}>
                {isSavingProduct
                  ? "Saving..."
                  : editingProductId
                    ? "Update product"
                    : "Upload product"}
              </Button>
              {editingProductId ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditingProductId(null);
                    setDraft(emptyDraft);
                  }}
                >
                  Cancel edit
                </Button>
              ) : null}
            </div>
            {productActionMessage ? (
              <p className="mb-4 text-sm text-muted-foreground">{productActionMessage}</p>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="product-name">Product name</Label>
                <Input
                  id="product-name"
                  value={draft.name}
                  onChange={(event) => updateDraft("name", event.target.value)}
                  placeholder="Premium Sneakers"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="product-description">Description</Label>
                <Textarea
                  id="product-description"
                  value={draft.description}
                  onChange={(event) => updateDraft("description", event.target.value)}
                  placeholder="Describe quality, delivery, and why customers should buy it."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-price">Price</Label>
                <Input
                  id="product-price"
                  value={draft.price}
                  onChange={(event) => updateDraft("price", event.target.value)}
                  placeholder="49.99"
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={draft.category} onValueChange={(value) => updateDraft("category", value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-location">Location</Label>
                <Input
                  id="product-location"
                  value={draft.location}
                  onChange={(event) => updateDraft("location", event.target.value)}
                  placeholder="Addis Ababa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-phone">Phone</Label>
                <Input
                  id="product-phone"
                  value={draft.phone}
                  onChange={(event) => updateDraft("phone", event.target.value)}
                  placeholder="+251 9XX XXX XXX"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="product-social">Social media links</Label>
                <Input
                  id="product-social"
                  value={draft.socialLinks}
                  onChange={(event) => updateDraft("socialLinks", event.target.value)}
                  placeholder="https://instagram.com/your-shop, https://tiktok.com/@yourshop"
                />
              </div>

              <div className="space-y-3 md:col-span-2 rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Product media upload</p>
                  <p className="text-xs text-muted-foreground">
                    Upload an image or video, or paste media links manually.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Media requirement</Label>
                  <Select
                    value={mediaRequirement}
                    onValueChange={(value) =>
                      setMediaRequirement(value as MediaRequirement)
                    }
                  >
                    <SelectTrigger className="w-full md:w-80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_of_them">One of them (image or video)</SelectItem>
                      <SelectItem value="both_image_video">Both image and video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    ref={imageFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleImageFileSelected(file);
                      }
                      event.currentTarget.value = "";
                    }}
                  />
                  <input
                    ref={videoFileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleVideoFileSelected(file);
                      }
                      event.currentTarget.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingImage}
                    onClick={() => imageFileInputRef.current?.click()}
                  >
                    <ImagePlus className="mr-1 size-4" />
                    {isUploadingImage ? "Uploading image..." : "Upload image"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingVideo}
                    onClick={() => videoFileInputRef.current?.click()}
                  >
                    <Video className="mr-1 size-4" />
                    {isUploadingVideo ? "Uploading video..." : "Upload video"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={addMediaField}>
                    Add image URL
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Image URLs</Label>
                  {draft.mediaUrls.map((url, index) => (
                    <div key={`${index}-${url}`} className="flex items-center gap-2">
                      <Input
                        value={url}
                        onChange={(event) => updateMediaUrl(index, event.target.value)}
                        placeholder="https://..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMediaField(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product-video">Video URL</Label>
                  <Input
                    id="product-video"
                    value={draft.videoUrl}
                    onChange={(event) => updateDraft("videoUrl", event.target.value)}
                    placeholder="https://..."
                  />
                </div>

                {draft.mediaUrls.some((url) => url.trim().length > 0) ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {draft.mediaUrls
                      .map((url) => url.trim())
                      .filter(Boolean)
                      .map((url) => (
                        <div key={url} className="relative aspect-video overflow-hidden rounded-md border bg-muted/40">
                          <Image
                            src={url}
                            alt="Product preview"
                            fill
                            sizes="(max-width: 1024px) 100vw, 33vw"
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                      ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </details>
      </section>

      <section className="mb-6 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Your Products</h2>
            <p className="text-sm text-muted-foreground">
              Search, filter, reorder, and manage products quickly.
            </p>
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1 lg:col-span-2">
            <Label htmlFor="search-products" className="text-xs text-muted-foreground">
              Search
            </Label>
            <Input
              id="search-products"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search by name or description"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categoryOptions.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Price</Label>
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All prices</SelectItem>
                <SelectItem value="under-25">Under $25</SelectItem>
                <SelectItem value="25-100">$25 - $100</SelectItem>
                <SelectItem value="over-100">Over $100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Date added</Label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="7-days">Last 7 days</SelectItem>
                <SelectItem value="30-days">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSearchText("");
                setCategoryFilter("all");
                setPriceFilter("all");
                setDateFilter("all");
              }}
            >
              <Filter className="mr-1 size-4" /> Clear filters
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading owner dashboard...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products match current filters.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="group overflow-hidden border-border/70 py-0 transition hover:shadow-md">
                <div className="relative aspect-video border-b bg-muted/30">
                  <Image
                    src={product.image_url ?? dummyImage}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    unoptimized
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{product.name}</CardTitle>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
                    </div>
                    <span className="rounded-full border px-2 py-0.5 text-[11px] uppercase text-muted-foreground">
                      {product.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-md border px-2 py-1">{product.category}</span>
                    <span className="rounded-md border px-2 py-1">${product.price.toFixed(2)}</span>
                    <span className="rounded-md border px-2 py-1">{new Date(product.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md border py-2">
                      <p className="font-semibold">{product.views}</p>
                      <p className="text-muted-foreground">Views</p>
                    </div>
                    <div className="rounded-md border py-2">
                      <p className="font-semibold">{product.likes}</p>
                      <p className="text-muted-foreground">Likes</p>
                    </div>
                    <div className="rounded-md border py-2">
                      <p className="font-semibold">{product.sales}</p>
                      <p className="text-muted-foreground">Sales</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/products/${product.id}`}>
                        <Eye className="mr-1 size-3" /> View
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/products/${product.id}/edit`}>
                        <PencilLine className="mr-1 size-3" /> Edit page
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => editProduct(product)}>
                      <PencilLine className="mr-1 size-3" /> Quick edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => moveProduct(product.id, "up")}>
                      <ArrowUp className="mr-1 size-3" /> Up
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => moveProduct(product.id, "down")}>
                      <ArrowDown className="mr-1 size-3" /> Down
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteProduct(product.id)}
                      disabled={isDeletingProductId === product.id}
                    >
                      <Trash2 className="mr-1 size-3" />
                      {isDeletingProductId === product.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">4 new customer messages waiting for reply.</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                <MessageSquare className="mr-1 size-4" /> Open inbox
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Average rating: 4.6 / 5 from the latest 20 reviews.</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                <Star className="mr-1 size-4" /> View reviews
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Promotions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">2 promotions can be boosted for more reach.</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                <Megaphone className="mr-1 size-4" /> Manage campaigns
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {marketProducts.length > 0 ? (
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Marketplace feed</h2>
            <Link href="/" className="text-xs text-primary hover:underline">
              View all listings
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {marketProducts.map((product) => (
              <Card key={`market-${product.id}`} className="overflow-hidden py-0">
                <div className="relative aspect-video border-b bg-muted/30">
                  <Image
                    src={product.image_url ?? dummyImage}
                    alt={product.name}
                    fill
                    sizes="(max-width: 1280px) 50vw, 25vw"
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-1 text-base">{product.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 pb-4">
                  <p className="text-sm font-semibold">${product.price.toFixed(2)}</p>
                  <p className="text-xs uppercase text-muted-foreground">{product.category}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-dashed bg-card/70 p-4 text-xs text-muted-foreground">
        <p className="inline-flex items-center gap-2">
          <BarChart3 className="size-4 text-primary" />
          This dashboard uses lightweight local state for drafts and metrics in this page. Connect save/edit/delete actions to secured server APIs with owner checks for production scale.
        </p>
      </section>
    </main>
  );
}
