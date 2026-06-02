import z from "zod";

export const educationSchema = z.object({
  title: z.string().min(1, "Institution is required"),
  department: z.string().optional(),
  startMonth: z.string().min(1, "Start month is required"),
  startYear: z.string().min(1, "Start year is required"),
  endMonth: z.string().optional(),
  endYear: z.string().optional(),
});
export type EducationSchema = z.infer<typeof educationSchema>