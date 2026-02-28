"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { getAuthSessionUser } from "@/lib/auth-session";
import { isAdminEmail } from "@/lib/admin";
import { isOwnerEmail } from "@/lib/owner-access";

export default function DashboardResolverPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const getUserFromSession = async () => {
        const session = await authClient.getSession();
        return getAuthSessionUser(session);
      };

      let userId: string | undefined;
      let userEmail: string | undefined;
      for (let attempt = 0; attempt < 8; attempt++) {
        const user = await getUserFromSession();
        userId = user?.id;
        userEmail = user?.email;
        if (userId) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      if (!userId) {
        router.replace("/login");
        return;
      }

      if (isAdminEmail(userEmail)) {
        router.replace("/dashboard/admin");
        return;
      }

      const isOwner = await isOwnerEmail(userEmail);

      if (isOwner) {
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
