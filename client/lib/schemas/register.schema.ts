import z from "zod";

export const userSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.email("Email is not valid").min(1, "Enter valid email"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Enter strong password"),
});

export const companySchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  industry: z.string().min(1, "Industry is required"),
  website: z.url("Enter valid url"),
  location: z.string().min(1, "Location is required"),
  description: z.string().min(1, "Description is required").max(400, "Description is too Long"),
  email: z.email("Enter valid email").min(1, "Email is required"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Enter strong password"),
});

export type UserSchema = z.infer<typeof userSchema>;
export type CompanySchema = z.infer<typeof companySchema>;
