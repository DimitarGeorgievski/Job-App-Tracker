import z from "zod";

export const applySchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.email("Invalid email"),
  phone: z.string().min(1, "Phone is required"),
  coverLetter: z.string(),
  terms: z
    .boolean()
    .refine((v) => v === true, "You must agree to the terms"),
});
export type ApplySchema = z.infer<typeof applySchema>