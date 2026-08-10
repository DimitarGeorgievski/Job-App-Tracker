import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Company, Role, User } from 'generated/prisma/client';
import {
  UserOrderByWithRelationInput,
  UserWhereUniqueInput,
} from 'generated/prisma/models';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import type { FastifyRequest } from 'fastify';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }
  @Get('me')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([Role.ADMIN, Role.COMPANY, Role.USER])
  getMe(@Req() req: FastifyRequest & { user: { userId: number } }) {
    return this.userService.findById(req.user.userId);
  }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([Role.ADMIN, Role.COMPANY, Role.USER])
  @Get()
  findAll(
    @Param('params')
    params: {
      skip?: number;
      take?: number;
      where?: UserWhereUniqueInput;
      orderBy?: UserOrderByWithRelationInput;
    },
  ): Promise<User[] | null> {
    return this.userService.findAll(params);
  }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([Role.ADMIN, Role.COMPANY, Role.USER])
  @Get('/companies')
  findCompaniesByName(@Query('name') name: string): Promise<Company[] | null> {
    return this.userService.findAllCompaniesByName(name);
  }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([Role.ADMIN, Role.COMPANY, Role.USER])
  @Get(':id')
  async getById(@Param('id') id: string): Promise<Omit<User, "role"> | null> {
    return this.userService.findById(Number(id));
  }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([Role.ADMIN, Role.COMPANY, Role.USER])
  @Get('/email/:email')
  async getByEmail(@Param('email') email: string): Promise<User | null> {
    return this.userService.findByEmail(email);
  }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([Role.ADMIN, Role.COMPANY, Role.USER])
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(Number(id), updateUserDto);
  }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([Role.ADMIN, Role.COMPANY, Role.USER])
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(Number(id));
  }
}
