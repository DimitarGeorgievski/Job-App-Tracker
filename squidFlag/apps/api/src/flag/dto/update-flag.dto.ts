import { z } from 'zod';

export const UpdateFlagDto = z.object({
  name: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional(),
  defaultValue: z.boolean().optional(),
});

export type UpdateFlagDto = z.infer<typeof UpdateFlagDto>;
