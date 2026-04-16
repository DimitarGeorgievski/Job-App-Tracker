import { IsEnum } from "class-validator";
import { AppStatus } from "generated/prisma/enums";

export class UpdateStatusDto {
    @IsEnum(AppStatus)
    status: AppStatus
}
