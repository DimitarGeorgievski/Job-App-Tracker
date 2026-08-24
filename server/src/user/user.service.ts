import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Company, Prisma, User } from 'generated/prisma/client';
import { hash } from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }
  async findAll(
    params: {
      skip?: number;
      take?: number;
      where?: Prisma.UserWhereInput;
      orderBy?: Prisma.UserOrderByWithRelationInput;
    } = {},
  ): Promise<User[]> {
    const { skip, take, where, orderBy } = params;
    return this.prisma.user.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }
  findById(id: number): Promise<Omit<User, 'role'> | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        refreshTokens: true,
      },
      omit: {
        role: true,
      },
    });
  }
  async findAllCompaniesByName(name: string): Promise<Company[] | null> {
    return this.prisma.company.findMany({
      where: {
        companyName: {
          contains: name,
          mode: 'insensitive',
        },
      },
      include: {
        user: {
          select: {
            logoURL: true,
          },
        },
      },
    });
  }
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }
  async update(id: number, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      data,
      where: { id },
    });
  }
  async remove(id: number): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }
  async saveRefreshToken(
    userId: number,
    refreshToken: string,
    jti: string,
    familyId: string,
  ) {
    const tokenHash = await hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return this.prisma.refreshToken.create({
      data: {
        userId: userId,
        jti,
        familyId,
        tokenHash,
        expiresAt,
      },
    });
  }
  async revokeRefreshToken(jti: string) {
  return this.prisma.refreshToken.update({
    where: { jti },
    data: {
      revokedAt: new Date(),
    },
  });
}
}
