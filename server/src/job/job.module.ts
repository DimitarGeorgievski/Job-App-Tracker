import { Module } from '@nestjs/common';
import { JobService } from './job.service';
import { JobController } from './job.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';

@Module({
  controllers: [JobController],
  providers: [JobService],
  imports: [PrismaModule, UserModule],
})
export class JobModule {}
