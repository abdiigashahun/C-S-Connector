 "use client";

 import { useState } from "react";
 import { useRouter } from "next/navigation";
 import { useForm } from "react-hook-form";
 import { zodResolver } from "@hookform/resolvers/zod";
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

 export default function LoginPage() {
   const router = useRouter();
   const [error, setError] = useState<string | null>(null);
   const {
     register,
     handleSubmit,
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

     router.push("/");
   };

   return (
     <main className="flex min-h-screen items-center justify-center bg-background px-4">
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
             {error && <p className="text-sm text-destructive">{error}</p>}
             <Button type="submit" className="w-full" disabled={isSubmitting}>
               {isSubmitting ? "Logging in..." : "Login"}
             </Button>
           </form>
         </CardContent>
       </Card>
     </main>
   );
 }
