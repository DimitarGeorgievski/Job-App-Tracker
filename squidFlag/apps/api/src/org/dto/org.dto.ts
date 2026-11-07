import { z } from 'zod';

export const createOrganizationDtoSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .max(63),
});

export type CreateOrganizationDto = z.infer<typeof createOrganizationDtoSchema>;
