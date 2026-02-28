"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { getAuthSessionUserId } from "@/lib/auth-session";
import {
  consumePendingRegistration,
  getUserPreferences,
  setUserPreferences,
} from "@/lib/user-preferences";

export default function DashboardResolverPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const getUserIdFromSession = async () => {
        const session = await authClient.getSession();
        return getAuthSessionUserId(session);
      };

      let userId: string | undefined;
      for (let attempt = 0; attempt < 8; attempt++) {
        userId = await getUserIdFromSession();
        if (userId) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      if (!userId) {
        router.replace("/login");
        return;
      }

      const existingPreference = getUserPreferences(userId);
      const pendingPreference = existingPreference ? null : consumePendingRegistration();
      const resolvedPreference = existingPreference ?? pendingPreference;

      if (pendingPreference) {
        setUserPreferences(userId, pendingPreference);
      }

      if (resolvedPreference?.role === "shop_owner") {
        router.replace("/dashboard/owner");
        return;
      }

      router.replace("/dashboard/customer");
    })();
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-10">
      <p className="text-sm text-muted-foreground">Preparing your dashboard...</p>
    </main>
  );
}
