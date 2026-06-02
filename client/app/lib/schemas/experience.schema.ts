import z from "zod";

export const experienceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  companyId: z.number({ error: "Company is required" }),
  companyName: z.string().min(1, "Company is required"),
  location: z.string().optional(),
  isCurrent: z.boolean(),
  startMonth: z.string().min(1, "Start month is required"),
  startYear: z.string().min(1, "Start year is required"),
  endMonth: z.string().optional(),
  endYear: z.string().optional(),
  description: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.isCurrent && (!data.endMonth || !data.endYear)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "End date is required", path: ["endMonth"] });
  }
});
export type ExperienceSchema = z.infer<typeof experienceSchema>