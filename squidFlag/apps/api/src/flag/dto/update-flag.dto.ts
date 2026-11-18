import { z } from 'zod';

export const UpdateFlagDto = z.object({
  name: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional(),
  defaultValue: z.boolean().optional(),
});

export type UpdateFlagDto = z.infer<typeof UpdateFlagDto>;

export const _SaveDraftDto = z.object({});

export type _SaveDraftDto = z.infer<typeof _SaveDraftDto>;

export const _DiscardDraftDto = z.object({});

export type _DiscardDraftDto = z.infer<typeof _DiscardDraftDto>;

export const RevertDraftDto = z.object({
  targetVersion: z.number().int().positive(),
});

export type RevertDraftDto = z.infer<typeof RevertDraftDto>;
