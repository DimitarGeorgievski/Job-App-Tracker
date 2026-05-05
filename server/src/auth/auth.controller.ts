import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { type Response } from 'express';
import { CredentialsDto } from './dto/Credentials.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  registerUser(@Body() userData: CreateUserDto) {
    return this.authService.registerUser(userData);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async loginUser(@Body() credentials: CredentialsDto, @Res() res: Response) {
    const { user, token, refreshToken } =
      await this.authService.loginUser(credentials);
    res.header('access-token', token);
    res.header('refresh-token', refreshToken);
    res.send(user);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('refresh-token')
  async refreshAccessToken(
    @Res() res: Response,
    @Headers('refresh-token') refreshToken: string,
  ) {
    const { token } = await this.authService.refreshAccessToken(refreshToken);
    res.header('access-token', token);
    res.sendStatus(HttpStatus.NO_CONTENT);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  logoutUser(@Headers('refresh-token') refreshToken: string) {
    return this.authService.logoutUser(refreshToken);
  }
}
