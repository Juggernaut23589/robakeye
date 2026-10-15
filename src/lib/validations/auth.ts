import { z } from "zod";

// E.164-ish Nigerian mobile check: 11-digit local (0801...) or +234 international.
const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(100),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    phone: z
      .string()
      .trim()
      .regex(phoneRegex, "Enter a valid Nigerian phone number"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password needs at least one uppercase letter")
      .regex(/[0-9]/, "Password needs at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  totp: z.string().trim().optional(),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    email: z.string().email(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password needs at least one uppercase letter")
      .regex(/[0-9]/, "Password needs at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const totpVerifySchema = z.object({
  code: z.string().trim().length(6, "Enter the 6-digit code"),
});
