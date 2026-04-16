import { Injectable } from '@nestjs/common';
import { Job, Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JobService {
  constructor(private prisma: PrismaService) {}
  async create(data: Prisma.JobCreateInput): Promise<Job> {
    return await this.prisma.job.create({
      data
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.JobWhereInput;
    orderBy?: Prisma.JobOrderByWithRelationInput;
  }): Promise<Job[]> {
    const { skip, orderBy, take, where } = params;
    return await this.prisma.job.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }

  async findOne(id: number): Promise<Job | null> {
    return await this.prisma.job.findUnique({
      where: { id },
    });
  }

  async update(id: number, data: Prisma.JobUpdateInput): Promise<Job> {
    return await this.prisma.job.update({
      data,
      where: { id },
    });
  }

  async remove(id: number): Promise<Job> {
    return await this.prisma.job.delete({
      where: { id },
    });
  }
}
