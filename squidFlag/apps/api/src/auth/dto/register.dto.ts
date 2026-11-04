import { z } from 'zod';

export const registerDtoSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export type RegisterDto = z.infer<typeof registerDtoSchema>;
