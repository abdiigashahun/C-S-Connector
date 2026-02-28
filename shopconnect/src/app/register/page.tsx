"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Chrome } from "lucide-react";
import { registerSchema, type RegisterInput } from "@/lib/validation";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { getAuthSessionUserId } from "@/lib/auth-session";
import {
  setPendingRegistration,
  setUserPreferences,
} from "@/lib/user-preferences";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    trigger,
    formState: { isSubmitting, errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterInput) => {
    setError(null);

    const result = await authClient.signUp.email({
      email: values.email,
      password: values.password,
      name: values.name,
    } as never);

    if (result.error) {
      setError(result.error.message ?? "Unable to register");
      return;
    }

    const session = await authClient.getSession();
    const userId = getAuthSessionUserId(session);

    if (userId) {
      setUserPreferences(userId, {
        role: values.role,
        termsAcceptedAt: new Date().toISOString(),
      });
    }

    router.push("/dashboard");
  };

  const handleGoogleSignUp = async () => {
    setError(null);

    const valid = await trigger(["role", "termsAccepted"]);
    if (!valid) {
      return;
    }

    const role = getValues("role");
    const termsAccepted = getValues("termsAccepted");

    if (!role || !termsAccepted) {
      setError("Please select your role and accept the terms");
      return;
    }

    setPendingRegistration({
      role,
      termsAcceptedAt: new Date().toISOString(),
    });

    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });

    if (result?.error) {
      setError(result.error.message ?? "Unable to continue with Google");
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-background pt-16">
      <SiteNavbar />
      <div className="flex flex-1 items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Create your ShopConnect account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                onValueChange={(value) =>
                  setValue("role", value as RegisterInput["role"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="I am a..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shop_owner">Shop owner</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-xs text-destructive">{errors.role.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  {...register("termsAccepted")}
                />
                <span>
                  I agree to the app terms, platform policy, and responsible
                  marketplace use.
                </span>
              </label>
              {errors.termsAccepted && (
                <p className="text-xs text-destructive">
                  {errors.termsAccepted.message}
                </p>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
            <Button
              type="button"
              className="w-full"
              variant="outline"
              onClick={handleGoogleSignUp}
              disabled={isSubmitting}
            >
              <Chrome className="mr-2 size-4" />
              Sign up with Google
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
      </div>
      <SiteFooter />
    </main>
  );
}

