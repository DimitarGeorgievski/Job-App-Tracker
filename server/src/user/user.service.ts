import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, User } from 'generated/prisma/client';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  } = {}): Promise<User[]> {
    const { skip, take, where, orderBy } = params;
    return this.prisma.user.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }
  findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
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
  async saveRefreshToken(id: number, refreshToken: string) {
    const user = await this.findById(id);
    user?.refreshTokens.push(refreshToken);
  }
  async deleteRefreshToken(id: number, refreshToken: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const updatedTokens = user.refreshTokens.filter(
      (token) => token !== refreshToken,
    );
    return this.prisma.user.update({
      where: { id },
      data: {
        refreshTokens: updatedTokens,
      },
    });
  }
}
