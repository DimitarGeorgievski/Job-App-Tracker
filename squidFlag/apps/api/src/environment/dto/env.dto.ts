import { z } from 'zod';

export const createEnvironmentDtoSchema = z.object({
  name: z.string().min(1),
  key: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .max(63),
});

export type CreateEnvironmentDto = z.infer<typeof createEnvironmentDtoSchema>;

export const renameEnvironmentDtoSchema = z.object({
  name: z.string().min(1),
});

export type RenameEnvironmentDto = z.infer<typeof renameEnvironmentDtoSchema>;

export type EnvironmentResponse = {
  id: string;
  key: string;
  name: string;
  organizationId: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};
