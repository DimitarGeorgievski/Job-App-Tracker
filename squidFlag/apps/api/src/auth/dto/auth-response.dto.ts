import { z } from 'zod';

export const authResponseDtoSchema = z.object({
  user: z.object({
    id: z.uuid(),
    email: z.email(),
  }),
});

export type AuthResponseDto = z.infer<typeof authResponseDtoSchema>;
