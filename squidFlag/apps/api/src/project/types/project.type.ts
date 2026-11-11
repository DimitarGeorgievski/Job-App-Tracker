import type { MembershipRole } from 'generated/prisma/client';

export interface ProjectResponse {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  createdAt: Date;
  archivedAt?: Date | null;
}

export interface ProjectCreationResponse {
  project: ProjectResponse;
  membership: {
    id: string;
    role: MembershipRole;
    createdAt: Date;
  };
}
