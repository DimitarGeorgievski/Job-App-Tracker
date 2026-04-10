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
import { User } from 'generated/prisma/client';
import {
  UserOrderByWithRelationInput,
  UserWhereUniqueInput,
} from 'generated/prisma/models';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }
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

  @Get(':id')
  async getById(@Param('id') id: string): Promise<User | null> {
    return this.userService.findById(Number(id));
  }
  @Get('/email/:email')
  async getByEmail(@Param('email') email: string): Promise<User | null> {
    return this.userService.findByEmail(email);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(Number(id), updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(Number(id));
  }
}
