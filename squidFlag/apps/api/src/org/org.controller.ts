import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { OrgService } from './org.service';
import { CreateOrganizationDto } from './dto/org.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('organizations')
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Post()
  @HttpCode(201)
  async create(
    @Body() body: CreateOrganizationDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.orgService.createOrganization(body, user.sub);
  }
}
