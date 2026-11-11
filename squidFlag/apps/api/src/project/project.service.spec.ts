import { describe, expect, it, beforeEach } from '@jest/globals';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { type PrismaService } from 'src/platform/database/prisma.service';
import { ProjectService } from './project.service';

let service: ProjectService;
let mockPrismaService: DeepMockProxy<PrismaService>;

beforeEach(() => {
  mockPrismaService = mockDeep<PrismaService>();
  mockPrismaService.$transaction.mockImplementation(async (callback) =>
    callback(mockPrismaService),
  );
  service = new ProjectService(mockPrismaService);
});

describe('ProjectService — createProject', () => {
  it('should create a project and an audit log', async () => {
    const dto = { name: 'Test Project', slug: 'test-project' };
    const organizationId = '0197f8c0-1234-7abc-8def-0123456789ab';
    const actorUserId = '0197f8c0-1234-7abc-8def-012345678900';

    mockPrismaService.organization.findUnique.mockResolvedValue({
      id: organizationId,
      name: 'Test Org',
      updatedAt: new Date(),
      createdAt: new Date(),
      slug: 'test-org',
      archivedAt: null,
    });
    mockPrismaService.project.create.mockResolvedValue({
      id: 'proj-1',
      name: 'Test Project',
      slug: 'test-project',
      updatedAt: new Date(),
      organizationId,
      createdAt: new Date(),
      archivedAt: null,
    });
    mockPrismaService.auditLog.create.mockResolvedValue({
      id: 'audit-1',
      organizationId,
      actorUserId,
      requestId: 'test-123',
      createdAt: new Date(),
      actorLabel: actorUserId,
      action: 'project.created',
      targetType: 'project',
      targetId: 'proj-1',
      metadata: {},
    });

    const result = await service.createProject(
      dto,
      organizationId,
      actorUserId,
    );

    expect(result.id).toBe('proj-1');
    expect(result.name).toBe('Test Project');
    expect(result.organizationId).toBe(organizationId);
    expect(result.slug).toBe('test-project');
    expect(result.createdAt).toBeInstanceOf(Date);

    expect(mockPrismaService.organization.findUnique.mock.calls).toContainEqual(
      [
        expect.objectContaining({
          where: { id: organizationId },
        }),
      ],
    );
    expect(mockPrismaService.auditLog.create.mock.calls).toContainEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'project.created',
          targetType: 'project',
          targetId: 'proj-1',
        }),
      }),
    ]);
  });

  it('should throw NotFoundException when organization not found', async () => {
    const dto = { name: 'Test Project', slug: 'test-project' };

    mockPrismaService.organization.findUnique.mockResolvedValue(null);

    await expect(
      service.createProject(dto, 'nonexistent-id', 'user-1'),
    ).rejects.toThrow('Organization not found');
  });

  it('should throw BadRequestException when organization is archived', async () => {
    const dto = { name: 'Test Project', slug: 'test-project' };

    mockPrismaService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Archived Org',
      slug: 'archived-org',
      updatedAt: new Date(),
      createdAt: new Date(),
      archivedAt: new Date(),
    });

    await expect(service.createProject(dto, 'org-1', 'user-1')).rejects.toThrow(
      'Cannot create project in an archived organization',
    );
  });
});

describe('ProjectService — getProjects', () => {
  it('should return projects for an organization', async () => {
    const organizationId = '0197f8c0-1234-7abc-8def-0123456789ab';

    mockPrismaService.project.findMany.mockResolvedValue([
      {
        id: 'proj-1',
        name: 'Project 1',
        slug: 'project-1',
        organizationId,
        updatedAt: new Date(),
        createdAt: new Date(),
        archivedAt: null,
      },
      {
        id: 'proj-2',
        name: 'Project 2',
        slug: 'project-2',
        organizationId,
        updatedAt: new Date(),
        createdAt: new Date(),
        archivedAt: null,
      },
    ]);

    const result = await service.getProjects(organizationId);

    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe('Project 1');
    expect(result[1]?.slug).toBe('project-2');

    expect(mockPrismaService.project.findMany.mock.calls).toContainEqual([
      expect.objectContaining({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
  });
});

describe('ProjectService — getProject', () => {
  it('should return a project when found', async () => {
    const organizationId = '0197f8c0-1234-7abc-8def-0123456789ab';
    const projectId = 'proj-1';

    mockPrismaService.project.findFirst.mockResolvedValue({
      id: projectId,
      name: 'Test Project',
      slug: 'test-project',
      organizationId,
      updatedAt: new Date(),
      createdAt: new Date(),
      archivedAt: null,
    });

    const result = await service.getProject(organizationId, projectId);

    expect(result.id).toBe(projectId);
    expect(result.name).toBe('Test Project');
    expect(result.slug).toBe('test-project');

    expect(mockPrismaService.project.findFirst.mock.calls).toContainEqual([
      expect.objectContaining({
        where: expect.objectContaining({
          id: projectId,
          organizationId,
        }),
      }),
    ]);
  });

  it('should throw NotFoundException when project not found', async () => {
    mockPrismaService.project.findFirst.mockResolvedValue(null);

    await expect(
      service.getProject('org-1', 'nonexistent-project'),
    ).rejects.toThrow('Project not found');
  });
});

describe('ProjectService — renameProject', () => {
  it('should rename a project', async () => {
    const organizationId = '0197f8c0-1234-7abc-8def-0123456789ab';
    const projectId = 'proj-1';
    const dto = { name: 'Renamed Project' };

    const existingProject = {
      id: projectId,
      name: 'Old Name',
      slug: 'old-slug',
      organizationId,
      updatedAt: new Date(),
      createdAt: new Date(),
      archivedAt: null,
    };

    const updatedProject = {
      id: projectId,
      name: 'Renamed Project',
      slug: 'old-slug',
      organizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
    };

    mockPrismaService.organization.findUnique.mockResolvedValue({
      id: organizationId,
      name: 'Test Org',
      slug: 'test-org',
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
    });
    mockPrismaService.project.findFirst.mockResolvedValue(existingProject);
    mockPrismaService.project.update.mockResolvedValue(updatedProject);

    const result = await service.renameProject(
      organizationId,
      projectId,
      dto,
      'user-1',
    );

    expect(result.name).toBe('Renamed Project');
    expect(result.slug).toBe('old-slug');

    expect(mockPrismaService.project.update.mock.calls).toContainEqual([
      expect.objectContaining({
        where: { id: projectId },
        data: expect.objectContaining({
          name: 'Renamed Project',
        }),
      }),
    ]);
  });

  it('should throw BadRequestException when no name or slug provided', async () => {
    const organizationId = '0197f8c0-1234-7abc-8def-0123456789ab';
    const projectId = 'proj-1';

    mockPrismaService.project.findFirst.mockResolvedValue({
      id: projectId,
      name: 'Test',
      slug: 'test',
      updatedAt: new Date(),
      organizationId,
      createdAt: new Date(),
      archivedAt: null,
    });

    await expect(
      service.renameProject(organizationId, projectId, {}, 'user-1'),
    ).rejects.toThrow('At least one of name or slug must be provided');
  });

  it('should throw BadRequestException when slug is not unique', async () => {
    const organizationId = '0197f8c0-1234-7abc-8def-0123456789ab';
    const projectId = 'proj-1';
    const dto = { slug: 'existing-slug' };
    mockPrismaService.organization.findUnique.mockResolvedValue({
      id: organizationId,
      name: 'Test Org',
      slug: 'test-org',
      updatedAt: new Date(),
      createdAt: new Date(),
      archivedAt: null,
    });
    mockPrismaService.project.findFirst
      .mockResolvedValueOnce({
        id: projectId,
        name: 'Current Project',
        slug: 'current-project',
        organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      })
      .mockResolvedValueOnce({
        id: '0197f8c0-1234-7abc-8def-0123456789cd',
        name: 'Existing Project',
        slug: dto.slug,
        organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      });
    await expect(
      service.renameProject(organizationId, projectId, dto, 'user-1'),
    ).rejects.toThrow(
      'Slug must be unique among projects in the same organization',
    );
    expect(mockPrismaService.project.update.mock.calls).toHaveLength(0);
  });
});

describe('ProjectService — archiveProject', () => {
  it('should archive a project', async () => {
    const organizationId = '0197f8c0-1234-7abc-8def-0123456789ab';
    const projectId = 'proj-1';

    const existingProject = {
      id: projectId,
      name: 'Test Project',
      slug: 'test-project',
      organizationId,
      updatedAt: new Date(),
      createdAt: new Date(),
      archivedAt: null,
    };

    const updatedProject = {
      id: projectId,
      name: 'Test Project',
      slug: 'test-project',
      organizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: new Date(),
    };

    mockPrismaService.organization.findUnique.mockResolvedValue({
      id: organizationId,
      name: 'Test Org',
      slug: 'test-org',
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
    });
    mockPrismaService.project.findFirst.mockResolvedValue(existingProject);
    mockPrismaService.project.update.mockResolvedValue(updatedProject);

    const result = await service.archiveProject(
      organizationId,
      projectId,
      'user-1',
    );

    expect(result).toEqual({ success: true });

    expect(mockPrismaService.project.update.mock.calls).toContainEqual([
      expect.objectContaining({
        where: { id: projectId },
        data: expect.objectContaining({
          archivedAt: expect.any(Date),
        }),
      }),
    ]);
  });

  it('should throw NotFoundException when organization not found', async () => {
    mockPrismaService.organization.findUnique.mockResolvedValue(null);

    await expect(
      service.archiveProject('nonexistent-org', 'proj-1', 'user-1'),
    ).rejects.toThrow('Organization not found');
  });

  it('should throw BadRequestException when archiving an already archived project', async () => {
    mockPrismaService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Test',
      slug: 'test',
      updatedAt: new Date(),
      createdAt: new Date(),
      archivedAt: new Date(),
    });

    await expect(
      service.archiveProject('org-1', 'proj-1', 'user-1'),
    ).rejects.toThrow('Cannot archive a project in an archived organization');
  });
});
