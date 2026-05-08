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

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async registerUser(userData: Prisma.UserCreateInput) {
    const userExists = await this.usersService.findByEmail(userData.email);
    if (userExists) throw new BadRequestException('User already exists');
    if (userData.role === Role.ADMIN)
      throw new ForbiddenException('admin user cannot be created 😉😘');
    const hashedPassword = await hash(userData.password, 8);
    userData.password = hashedPassword;
    await this.usersService.create(userData);
  }
  async registerCompany(data: createCompanyDto) {
    const userExists = await this.usersService.findByEmail(data.email);
    if (userExists) throw new BadRequestException('User already exists');
    const hashedPassword = await hash(data.password, 8);
    return await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          role: data.role,
        },
      });
      const company = await transaction.company.create({
        data: {
          companyName: data.companyName,
          industry: data.industry,
          description: data.description,
          location: data.location,
          website: data.website,
          user: {
            connect: {
              id: user.id,
            },
          },
        },
      });
      return {
        user,
        company,
      };
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
    const token = await this.jwtService.signAsync({
      userId: foundUser.id,
      role: foundUser.role,
    });
    const refreshToken = await this.jwtService.signAsync(
      { userId: foundUser.id, role: foundUser.role },
      {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
        expiresIn: '7d',
      },
    );
    await this.usersService.saveRefreshToken(foundUser.id, refreshToken);
    foundUser.password = '';
    return {
      user: foundUser,
      token,
      refreshToken,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const { userId } = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      });
      const foundUser = await this.usersService.findById(userId);
      const tokenExists = foundUser?.refreshTokens.some(
        (token) => token === refreshToken,
      );
      if (!tokenExists) throw new Error();
      const token = await this.jwtService.signAsync({ userId: foundUser?.id });
      return { token };
    } catch (error) {
      console.log(error);
      throw new ForbiddenException();
    }
  }

  async logoutUser(refreshToken: string) {
    try {
      const { userId } = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      });
      await this.usersService.deleteRefreshToken(userId, refreshToken);
    } catch (error) {
      console.log(error);
      throw new BadRequestException("couldn't logout user");
    }
  }
}
