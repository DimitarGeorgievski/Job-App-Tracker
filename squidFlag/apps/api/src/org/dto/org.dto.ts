import { z } from 'zod';

export const createOrganizationDtoSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .max(63),
});

export const renameOrganizationDtoSchema = z
  .object({
    name: z.string().optional(),
    slug: z.string().optional(),
  })
  .refine((dto) => dto.name !== undefined || dto.slug !== undefined, {
    message: 'At least one of name or slug must be provided',
  });

export type CreateOrganizationDto = z.infer<typeof createOrganizationDtoSchema>;
export type RenameOrganizationDto = z.infer<typeof renameOrganizationDtoSchema>;
