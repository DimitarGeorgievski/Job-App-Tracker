import z from "zod";

export const forgotPasswordSchema = z.object({
  email: z
    .email()
    .min(1, "Email is required")
});

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;