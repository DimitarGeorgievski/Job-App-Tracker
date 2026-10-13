import { z } from 'zod';

const dashboardEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url('NEXT_PUBLIC_API_URL must be a valid URL'),
});
export const dashboardEnv = dashboardEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

export type DashboardEnv = z.infer<typeof dashboardEnvSchema>;
