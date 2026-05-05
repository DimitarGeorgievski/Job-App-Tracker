import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Analytics, Prisma } from 'generated/prisma/client';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}
  async create(data: CreateAnalyticsDto): Promise<Analytics> {
    const existingAnalytic = await this.prisma.analytics.findUnique({
      where: {
        coverLetterId: Number(data.coverLetterId),
      },
    });
    if (existingAnalytic)
      throw new BadRequestException(
        'There is existing analytic for this cover letter',
      );
    return await this.prisma.analytics.create({
      data: {
        companyId: data.companyId,
        score: data.score,
        keywords: data.keywords,
        coverLetter: {
          connect: { id: Number(data.coverLetterId) },
        },
        application: {
          connect: { id: Number(data.applicationId) },
        },
      },
    });
  }

  async findAll(
    params: {
      skip?: number;
      take?: number;
      where?: Prisma.AnalyticsWhereInput;
      orderBy?: Prisma.AnalyticsOrderByWithRelationInput;
    } = {},
  ): Promise<Analytics[]> {
    const { skip, take, where, orderBy } = params;
    return await this.prisma.analytics.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }
  async findAllForCompany(companyId: string): Promise<Analytics[]> {
    return await this.prisma.analytics.findMany({
      where: {
        companyId: Number(companyId),
      },
    });
  }

  async findOne(id: number): Promise<Analytics | null> {
    return await this.prisma.analytics.findUnique({
      where: { id },
    });
  }

  async update(
    id: number,
    data: Prisma.AnalyticsUpdateInput,
  ): Promise<Analytics> {
    return await this.prisma.analytics.update({
      data,
      where: { id },
    });
  }

  async remove(id: number) {
    return await this.prisma.analytics.delete({
      where: { id },
    });
  }
}
