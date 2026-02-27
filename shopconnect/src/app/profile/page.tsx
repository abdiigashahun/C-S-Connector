"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const session: any = await authClient.getSession();
      const user = session?.data?.session?.user ?? session?.user;
      setName((user as any)?.name ?? null);
      setEmail(user?.email ?? null);
    })();
  }, []);

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
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
          <Button className="mt-4 w-full" variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

