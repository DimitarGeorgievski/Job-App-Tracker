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
import { CreateUserDto } from 'src/user/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async registerUser(userData: CreateUserDto) {
    const userExists = await this.usersService.findByEmail(userData.email);
    if (userExists) throw new BadRequestException('User already exists');
    const hashedPassword = await hash(userData.password, 8);
    userData.password = hashedPassword;
    await this.usersService.create(userData);
  }
  async loginUser(credentials: CredentialsDto) {
    const foundUser = await this.usersService.findByEmail(credentials.email);

    console.log(foundUser);

    if (!foundUser) throw new UnauthorizedException('invalid credentials');

    const isPasswordValid = await compare(
      credentials.password,
      foundUser.password,
    );

    if (!isPasswordValid)
      throw new UnauthorizedException('invalid credentials');

    console.log(foundUser);

    const token = await this.jwtService.signAsync({ userId: foundUser.id });
    const refreshToken = await this.jwtService.signAsync(
      { userId: foundUser.id },
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