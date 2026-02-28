"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  AppRole,
  setUserRoleByEmail,
  setUserPreferences,
} from "@/lib/user-preferences";
import { isOwnerEmail } from "@/lib/owner-access";
import { isAdminEmail } from "@/lib/admin";
import { getProfileSettingsByEmail } from "@/lib/profile-settings";

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [termsAcceptedAt, setTermsAcceptedAt] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [showPhone, setShowPhone] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await authClient.getSession();
      const user =
        (session as { data?: { session?: { user?: { id?: string; name?: string; email?: string } } } })
          ?.data?.session?.user ??
        (session as { user?: { id?: string; name?: string; email?: string } })
          ?.user;
      const currentUserId = user?.id ?? null;

      setUserId(currentUserId);
      setName(user?.name ?? null);
      setEmail(user?.email ?? null);

      if (!currentUserId) {
        return;
      }

      const acceptedAt = new Date().toISOString();

      const savedProfile = user?.email
        ? await getProfileSettingsByEmail(user.email)
        : null;

      if (savedProfile?.name) {
        setName(savedProfile.name);
      }
      setPhone(savedProfile?.phone ?? null);
      setShowPhone(savedProfile?.showPhone ?? false);

      if (isAdminEmail(user?.email)) {
        setRole("shop_owner");
        setTermsAcceptedAt(acceptedAt);
        return;
      }

      const owner = await isOwnerEmail(user?.email);
      const resolvedRole: AppRole = owner ? "shop_owner" : "customer";
      setRole(resolvedRole);
      setTermsAcceptedAt(acceptedAt);

      setUserPreferences(currentUserId, {
        role: resolvedRole,
        termsAcceptedAt: acceptedAt,
      });

      if (user?.email) {
        await setUserRoleByEmail({
          email: user.email,
          role: resolvedRole,
          termsAcceptedAt: acceptedAt,
          userId: currentUserId,
        });
      }
    })();
  }, []);

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Name:</span> {name ?? "—"}
            </p>
            <p className="text-sm">
              <span className="font-medium">Email:</span> {email ?? "—"}
            </p>
            <p className="text-sm">
              <span className="font-medium">Role:</span>{" "}
              {role === "shop_owner"
                ? "Shop owner"
                : role === "customer"
                  ? "Customer"
                  : "Not set"}
            </p>
            <p className="text-sm">
              <span className="font-medium">Phone:</span>{" "}
              {role === "customer" && !showPhone
                ? "Hidden by your preference"
                : phone ?? "—"}
            </p>
            <p className="text-sm">
              <span className="font-medium">Terms accepted:</span>{" "}
              {termsAcceptedAt
                ? new Date(termsAcceptedAt).toLocaleString()
                : "Not recorded"}
            </p>
            <Button className="mt-4 w-full" variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </CardContent>
        </Card>

        {role === "shop_owner" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Owner tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You can browse marketplace listings and manage your own shop
                posts from your dashboard.
              </p>
              <Button asChild className="w-full">
                <Link href="/dashboard">Open shop dashboard</Link>
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link href="/">Browse all listings</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Customer actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Browse products, compare offers, and negotiate with shop owners
                from listing details.
              </p>
              <Button asChild className="w-full">
                <Link href="/">Browse products</Link>
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link href="mailto:support@shopconnect.local?subject=Negotiation%20help">
                  Request negotiation support
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {!userId ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Please login to view full profile actions.
        </p>
      ) : null}
    </main>
  );
}

