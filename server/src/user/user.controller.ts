import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role, User } from 'generated/prisma/client';
import {
  UserOrderByWithRelationInput,
  UserWhereUniqueInput,
} from 'generated/prisma/models';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([Role.ADMIN,Role.COMPANY,Role.USER])
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
  @Roles([Role.ADMIN,Role.COMPANY,Role.USER])
  @Get(':id')
  async getById(@Param('id') id: string): Promise<User | null> {
    return this.userService.findById(Number(id));
  }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([Role.ADMIN,Role.COMPANY,Role.USER])
  @Get('/email/:email')
  async getByEmail(@Param('email') email: string): Promise<User | null> {
    return this.userService.findByEmail(email);
  }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([Role.ADMIN,Role.COMPANY,Role.USER])
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(Number(id), updateUserDto);
  }  
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([Role.ADMIN,Role.COMPANY,Role.USER])
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(Number(id));
  }
}
