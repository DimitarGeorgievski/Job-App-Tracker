import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { hash, compare } from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CredentialsDto } from './dto/Credentials.dto';
import { UserService } from 'src/user/user.service';
import { Prisma, Role } from 'generated/prisma/client';
import { createCompanyDto } from './dto/create-company.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { MultipartFile } from '@fastify/multipart';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async registerUser(
    userData: Prisma.UserCreateInput,
    file: MultipartFile | null,
  ) {
    const userExists = await this.usersService.findByEmail(userData.email);
    if (userExists) throw new BadRequestException('User already exists');
    if (userData.role === Role.ADMIN)
      throw new ForbiddenException('admin user cannot be created 😉😘');
    const hashedPassword = await hash(userData.password, 8);
    userData.password = hashedPassword;
    let logoURL: string | null = null;
    let logoPublicId: string | null = null;
    if (file) {
      const uploaded = await this.cloudinaryService.uploadFile(file);
      logoURL = uploaded.secure_url;
      logoPublicId = uploaded.public_id;
    }
    return await this.usersService.create({
      ...userData,
      logoURL,
      logoPublicId,
    });
  }
  async registerCompany(data: createCompanyDto, file: MultipartFile | null) {
    return await this.prisma.$transaction(async (transaction) => {
      const user = await this.registerUser(
        {
          email: data.email,
          password: data.password,
          phoneNumber: data.phoneNumber,
          role: Role.COMPANY,
        },
        file,
      );
      const company = await transaction.company.create({
        data: {
          companyName: data.companyName,
          industry: data.industry,
          description: data.description,
          location: data.location,
          website: data.website,
          user: {
            connect: { id: user.id },
          },
        },
      });
      return { user, company };
    });
  }
  async loginUser(credentials: CredentialsDto) {
    const foundUser = await this.usersService.findByEmail(credentials.email);
    if (!foundUser) throw new UnauthorizedException('invalid credentials');
    const isPasswordValid = await compare(
      credentials.password,
      foundUser.password,
    );
    if (!isPasswordValid)
      throw new UnauthorizedException('invalid credentials');
    const token = await this.jwtService.signAsync(
      {
        userId: foundUser.id,
        role: foundUser.role,
      },
      {
        secret: this.configService.get('ACCESS_TOKEN_SECRET'),
        expiresIn: '15m',
      },
    );
    const jti = randomUUID();
    const familyId = randomUUID();
    const refreshToken = await this.jwtService.signAsync(
      { userId: foundUser.id, role: foundUser.role, jti, familyId },
      {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
        expiresIn: '7d',
      },
    );
    await this.usersService.saveRefreshToken(
      foundUser.id,
      refreshToken,
      jti,
      familyId,
    );
    foundUser.password = '';
    return {
      user: foundUser,
      token,
      refreshToken,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      });
      const { userId, jti, familyId, role } = payload;
      const token = await this.prisma.refreshToken.findUnique({
        where: {
          jti,
        },
      });
      if (!token) throw new ForbiddenException('Invalid refresh token');
      if (token.revokedAt) {
        await this.prisma.refreshToken.updateMany({
          where: { familyId },
          data: {
            revokedAt: new Date(),
          },
        });
        throw new ForbiddenException('Refresh token is beind reused');
      }
      const isTokenValid = await compare(refreshToken, token.tokenHash);
      if (!isTokenValid) throw new ForbiddenException('Invalid refresh token');
      await this.prisma.refreshToken.update({
        where: { jti },
        data: {
          revokedAt: new Date(),
        },
      });
      const newJti = randomUUID();
      const accessToken = await this.jwtService.signAsync(
        {
          userId,
          role,
        },
        {
          secret: this.configService.get('ACCESS_TOKEN_SECRET'),
          expiresIn: '15m',
        },
      );
      const newRefreshToken = await this.jwtService.signAsync(
        {
          userId,
          role,
          jti: newJti,
          familyId,
        },
        {
          secret: this.configService.get('REFRESH_TOKEN_SECRET'),
          expiresIn: '7d',
        },
      );
      await this.usersService.saveRefreshToken(
        userId,
        newRefreshToken,
        newJti,
        familyId,
      );
      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      console.log(error);
      throw new ForbiddenException('Invalid refresh token');
    }
  }

  async logoutUser(refreshToken: string) {
    const { jti } = await this.jwtService.verifyAsync(refreshToken, {
      secret: this.configService.get('REFRESH_TOKEN_SECRET'),
    });
    await this.usersService.revokeRefreshToken(jti);
  }
}
