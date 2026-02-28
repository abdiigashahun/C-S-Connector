 "use client";

 import { useState } from "react";
 import { useRouter } from "next/navigation";
 import { useForm } from "react-hook-form";
 import { zodResolver } from "@hookform/resolvers/zod";
 import Link from "next/link";
 import { Chrome } from "lucide-react";
 import { loginSchema, type LoginInput } from "@/lib/validation";
 import { authClient } from "@/lib/auth-client";
 import {
   Card,
   CardContent,
   CardHeader,
   CardTitle,
 } from "@/components/ui/card";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Button } from "@/components/ui/button";
 import { SiteFooter } from "@/components/site-footer";
 import { SiteNavbar } from "@/components/site-navbar";

 export default function LoginPage() {
   const router = useRouter();
   const [error, setError] = useState<string | null>(null);
   const {
     register,
     handleSubmit,
     getValues,
     trigger,
     formState: { isSubmitting, errors },
   } = useForm<LoginInput>({
     resolver: zodResolver(loginSchema),
   });

   const onSubmit = async (values: LoginInput) => {
     setError(null);
     const result = await authClient.signIn.email(values);

     if (result.error) {
       setError(result.error.message ?? "Unable to login");
       return;
     }

      router.push("/dashboard");
   };

   const handleGoogleLogin = async () => {
     setError(null);

     const valid = await trigger("termsAccepted");
     if (!valid) {
       return;
     }

     if (!getValues("termsAccepted")) {
       setError("You must accept the terms to continue");
       return;
     }

     const result = await authClient.signIn.social({
       provider: "google",
       callbackURL: "/dashboard",
     });

     if (result?.error) {
       setError(result.error.message ?? "Unable to login with Google");
     }
   };

   return (
     <main className="flex min-h-screen flex-col bg-background pt-16">
       <SiteNavbar />
       <div className="flex flex-1 items-center justify-center px-4 py-8">
       <Card className="w-full max-w-md">
         <CardHeader>
           <CardTitle className="text-xl">Login to ShopConnect</CardTitle>
         </CardHeader>
         <CardContent>
           <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
               <Input
                 id="password"
                 type="password"
                 autoComplete="current-password"
                 {...register("password")}
               />
               {errors.password && (
                 <p className="text-xs text-destructive">
                   {errors.password.message}
                 </p>
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
                     I agree to the app terms and responsible use policy. <Link href="#" className="text-primary hover:underline">Terms and policy</Link>
                   </span>
                 </label>
                 {errors.termsAccepted && (
                   <p className="text-xs text-white">
                     {errors.termsAccepted.message}
                   </p>
                 )}
               </div>
             {error && <p className="text-sm text-destructive">{error}</p>}
             <Button type="submit" className="w-full" disabled={isSubmitting}>
               {isSubmitting ? "Logging in..." : "Login"}
             </Button>
               <Button
                 type="button"
                 className="w-full"
                 variant="outline"
                 onClick={handleGoogleLogin}
                 disabled={isSubmitting}
               >
                 <Chrome className="mr-2 size-4" />
                 Continue with Google
               </Button>
               <p className="text-center text-xs text-muted-foreground">
                 Don&apos;t have an account?{" "}
                 <Link href="/register" className="text-primary hover:underline">
                   Create one
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
