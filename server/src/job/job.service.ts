import { Injectable } from '@nestjs/common';
import { Job, Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';

@Injectable()
export class JobService {
  constructor(private prisma: PrismaService) {}
  async create(data: CreateJobDto): Promise<Job> {
    return await this.prisma.job.create({
      data: {
        description: data.description,
        jobType: data.jobType,
        title: data.title,
        location: data.location,
        company: {
          connect: {
            id: data.companyId,
          },
        },
      },
    });
  }

  async findAll(
    params: {
      skip?: number;
      take?: number;
      where?: Prisma.JobWhereInput;
      orderBy?: Prisma.JobOrderByWithRelationInput;
    } = {},
  ): Promise<{ jobs: Job[]; total: number; totalPages: number }> {
    const { skip, orderBy, take, where } = params;
    const [jobs, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        skip,
        take,
        where,
        orderBy,
        include: {
          company: {
            include: {
              user: {
                select: {
                  logoURL: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.job.count({ where }),
    ]);
    return {
      jobs,
      total,
      totalPages: Math.ceil(total / (take ?? 10)),
    };
  }

  async findOne(id: number): Promise<Job | null> {
    return await this.prisma.job.findUnique({
      where: { id },
      include: { company: true },
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
