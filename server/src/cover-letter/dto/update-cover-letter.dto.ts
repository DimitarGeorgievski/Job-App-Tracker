import { PartialType } from '@nestjs/mapped-types';
import { CreateCoverLetterDto } from './create-cover-letter.dto';
import { IsBoolean } from 'class-validator';

export class UpdateCoverLetterDto extends PartialType(CreateCoverLetterDto) {
    @IsBoolean()
    processed: boolean;
}
