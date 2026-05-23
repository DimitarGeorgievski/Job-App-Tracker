import { Injectable } from '@nestjs/common';
import { Education, Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class EducationService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.EducationCreateInput): Promise<Education> {
    return this.prisma.education.create({
      data,
    });
  }
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.EducationWhereInput;
    orderBy?: Prisma.EducationOrderByWithRelationInput;
  } = {}): Promise<Education[]> {
    const { skip, take, where, orderBy } = params;
    return this.prisma.education.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }
  findById(id: number): Promise<Education | null> {
    return this.prisma.education.findUnique({
      where: { id },
    });
  }
  async update(
    id: number,
    data: Prisma.EducationUpdateInput,
  ): Promise<Education> {
    return this.prisma.education.update({
      data,
      where: { id },
    });
  }
  async remove(id: number): Promise<Education> {
    return this.prisma.education.delete({
      where: { id },
    });
  }
}