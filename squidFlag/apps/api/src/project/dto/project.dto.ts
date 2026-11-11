import { z } from 'zod';

export const createProjectDtoSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .max(63),
});

export const renameProjectDtoSchema = z
  .object({
    name: z.string().optional(),
    slug: z.string().optional(),
  })
  .refine((dto) => dto.name !== undefined || dto.slug !== undefined, {
    message: 'At least one of name or slug must be provided',
  });

export type CreateProjectDto = z.infer<typeof createProjectDtoSchema>;
export type RenameProjectDto = z.infer<typeof renameProjectDtoSchema>;
