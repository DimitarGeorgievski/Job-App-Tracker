import z from "zod";

export const skillSchema = z.object({
  skills: z.string().min(1, "Skill is required"),
});
export type SkillSchema = z.infer<typeof skillSchema>
