import { Injectable } from '@nestjs/common';
import { UpdateJobDto } from './dto/update-job.dto';
import { Job, Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JobService {
  constructor(private prisma: PrismaService) {}
  async create(data: Prisma.JobCreateInput): Promise<Job> {
    return this.prisma.job.create({
      data,
    });
  }

  findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.JobWhereInput;
    orderBy?: Prisma.JobOrderByWithRelationInput;
  }): Promise<Job[]> {
    const { skip, orderBy, take, where } = params;
    return this.prisma.job.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }

  findOne(id: number): Promise<Job | null> {
    return this.prisma.job.findUnique({
      where: { id },
    });
  }

  update(id: number, data: Prisma.JobUpdateInput): Promise<Job> {
    return this.prisma.job.update({
      data,
      where: { id },
    });
  }

  remove(id: number): Promise<Job> {
    return this.prisma.job.delete({
      where: { id },
    });
  }
}
