import { describe, expect, it, beforeEach } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import type { CreateProjectDto, RenameProjectDto } from './dto/project.dto';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { type PrismaService } from 'src/platform/database/prisma.service';

describe('ProjectController', () => {
  let controller: ProjectController;
  let mockPrismaService: DeepMockProxy<PrismaService>;
  let service: ProjectService;
  const organizationId = '0197f8c0-1234-7abc-8def-0123456789ab';
  const projectId = '0197f8c0-1234-7abc-8def-0123456789ac';
  const mockProject = {
    id: projectId,
    name: 'Test Project',
    slug: 'test-project',
    organizationId,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  beforeEach(() => {
    mockPrismaService = mockDeep<PrismaService>();
    mockPrismaService.$transaction.mockImplementation(async (callback) =>
      callback(mockPrismaService),
    );
    service = new ProjectService(mockPrismaService);
    controller = new ProjectController(service);
  });

  describe('ProjectController — createProject', () => {
    it('should create a project and return the response', async () => {
      const dto: CreateProjectDto = {
        name: 'Test Project',
        slug: 'test-project',
      };
      const organizationId = '0197f8c0-1234-7abc-8def-0123456789ab';
      const actorUserId = '0197f8c0-1234-7abc-8def-012345678900';

      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: organizationId,
        name: 'Test Org',
        slug: 'test-org',
        archivedAt: null,
        updatedAt: new Date(),
        createdAt: new Date(),
      });
      mockPrismaService.project.create.mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        slug: 'test-project',
        organizationId,
        updatedAt: new Date(),
        createdAt: new Date(),
        archivedAt: null,
      });

      const result = await controller.create(organizationId, dto, {
        sub: actorUserId,
      });

      expect(result.id).toBe('proj-1');
      expect(result.name).toBe('Test Project');
      expect(result.organizationId).toBe(organizationId);
      expect(result.slug).toBe('test-project');
    });

    it('should throw NotFoundException when organization not found', async () => {
      const dto: CreateProjectDto = { name: 'Test', slug: 'test' };

      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(
        controller.create('nonexistent', dto, { sub: 'user-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when organization is archived', async () => {
      const dto: CreateProjectDto = { name: 'Test', slug: 'test' };

      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'Archived',
        slug: 'archived',
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: new Date(),
      });

      await expect(
        controller.create('org-1', dto, { sub: 'user-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ProjectController — getProjects', () => {
    it('should return projects for an organization', async () => {
      const organizationId = '0197f8c0-1234-7abc-8def-0123456789ab';

      mockPrismaService.project.findMany.mockResolvedValue([
        {
          id: 'proj-1',
          name: 'Project 1',
          slug: 'project-1',
          organizationId,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
        },
      ]);

      const result = await controller.list(organizationId);

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('Project 1');
    });
  });

  describe('ProjectController — getProject', () => {
    it('should return a project when found', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
      const result = await controller.retrieve(organizationId, projectId);
      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException when project not found', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);
      await expect(
        controller.retrieve(organizationId, projectId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('ProjectController — renameProject', () => {
    it('should rename a project', async () => {
      const organizationId = '0197f8c0-1234-7abc-8def-0123456789ab';
      const projectId = '0197f8c0-1234-7abc-8def-0123456789ac';
      const dto: RenameProjectDto = { name: 'Renamed' };
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: organizationId,
        name: 'Test Org',
        slug: 'test-org',
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.project.findFirst.mockResolvedValue({
        id: projectId,
        name: 'Old',
        slug: 'old',
        organizationId,
        updatedAt: new Date(),
        createdAt: new Date(),
        archivedAt: null,
      });
      mockPrismaService.project.update.mockResolvedValue({
        id: projectId,
        name: 'Renamed',
        slug: 'old',
        organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      });
      const result = await controller.rename(organizationId, projectId, dto, {
        sub: 'user-1',
      });

      expect(result.name).toBe('Renamed');
    });

    it('should throw BadRequestException when no name or slug provided', async () => {
      const organizationId = '0197f8c0-1234-7abc-8def-0123456789ab';
      const projectId = 'proj-1';

      mockPrismaService.project.findFirst.mockResolvedValue({
        id: projectId,
        name: 'Test',
        slug: 'test',
        organizationId,
        updatedAt: new Date(),
        createdAt: new Date(),
        archivedAt: null,
      });

      await expect(
        controller.rename(
          organizationId,
          projectId,
          {},
          {
            sub: 'user-1',
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ProjectController — archiveProject', () => {
    it('should archive a project', async () => {
      const organizationId = '0197f8c0-1234-7abc-8def-0123456789ab';
      const projectId = 'proj-1';
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: organizationId,
        name: 'Test Org',
        slug: 'test-org',
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.project.findFirst.mockResolvedValue({
        id: projectId,
        name: 'Test',
        slug: 'test',
        organizationId,
        updatedAt: new Date(),
        createdAt: new Date(),
        archivedAt: null,
      });
      mockPrismaService.project.update.mockResolvedValue({
        id: projectId,
        name: 'Test',
        slug: 'test',
        organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: new Date(),
      });

      const result = await controller.archive(organizationId, projectId, {
        sub: 'user-1',
      });

      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException when organization not found', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(
        controller.archive('nonexistent', 'proj-1', { sub: 'user-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when archiving an already archived project', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'Test',
        slug: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: new Date(),
      });

      await expect(
        controller.archive('org-1', 'proj-1', { sub: 'user-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
