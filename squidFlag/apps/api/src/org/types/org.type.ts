import type { MembershipRole } from 'generated/prisma/client';

export interface OrgCreationResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
  };
  membership: {
    id: string;
    role: MembershipRole;
    createdAt: Date;
  };
}

export interface RenameOrganizationDto {
  name?: string;
  slug?: string;
}
