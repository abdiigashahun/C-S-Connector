import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["shop_owner", "customer"]),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  price: z.coerce.number().positive(),
  category: z.string().min(1),
  phone: z.string().min(5),
  latitude: z.coerce.number().refine((v) => v >= -90 && v <= 90, {
    message: "Latitude must be between -90 and 90",
  }),
  longitude: z.coerce.number().refine((v) => v >= -180 && v <= 180, {
    message: "Longitude must be between -180 and 180",
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productSchema>;

