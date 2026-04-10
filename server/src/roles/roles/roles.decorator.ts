import { Reflector } from '@nestjs/core';
import { Role } from 'generated/prisma/enums';

export const Roles = Reflector.createDecorator<Role>();