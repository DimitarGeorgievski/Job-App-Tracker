import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Experience } from 'generated/prisma/client';
import { CreateExperienceDto } from './dto/create-experience.dto';

@Injectable()
export class ExperienceService {
  constructor(private prisma: PrismaService) {}
  async create(data: CreateExperienceDto, userId: number) {
    return this.prisma.experience.create({
      data: {
        start: new Date(data.start),
        end: new Date(data.end),
        title: data.title,
        description: data.description,
        location: data.location,
        user: {
          connect: { id: userId },
        },
        company: {
          connect: { id: data.companyId },
        },
      },
    });
  }
  async findAll(
    params: {
      skip?: number;
      take?: number;
      where?: Prisma.ExperienceWhereInput;
      orderBy?: Prisma.ExperienceOrderByWithRelationInput;
    } = {},
  ): Promise<Experience[]> {
    const { skip, take, where, orderBy } = params;
    return this.prisma.experience.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        company: true,
        user: true,
      },
    });
  }
  async findById(id: number): Promise<Experience | null> {
    return this.prisma.experience.findUnique({
      where: { id },
      include: {
        company: true,
        user: true,
      },
    });
  }
  async update(
    id: number,
    data: Prisma.ExperienceUpdateInput,
  ): Promise<Experience> {
    return this.prisma.experience.update({
      where: { id },
      data,
    });
  }
  async remove(id: number): Promise<Experience> {
    return this.prisma.experience.delete({
      where: { id },
    });
  }
}
