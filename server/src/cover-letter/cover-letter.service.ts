import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CoverLetter, Prisma } from 'generated/prisma/client';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CreateCoverLetterDto } from './dto/create-cover-letter.dto';
import { UpdateCoverLetterDto } from './dto/update-cover-letter.dto';

@Injectable()
export class CoverLetterService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}
  async create(
    data: CreateCoverLetterDto,
    userId: number,
    file?: Express.Multer.File,
  ) {
    if (!data.content && !file) {
      throw new BadRequestException('Either content or file must be provided');
    }
    if (data.content && file) {
      throw new BadRequestException('Cannot send both content and file');
    }
    let fileURL: string | null = null;
    let filePublicId: string | null = null;
    if (file) {
      const uploadedFile = await this.cloudinaryService.uploadFile(file);
      fileURL = uploadedFile.secure_url;
      filePublicId = uploadedFile.public_id;
    }
    return await this.prisma.coverLetter.create({
      data: {
        processed: data.processed,
        result: data.result,
        content: data.content,
        fileURL: fileURL,
        filePublicId: filePublicId,
        user: {
          connect: {
            id: Number(userId),
          },
        },
        application: {
          connect: { id: Number(data.applicationId) },
        },
      },
    });
  }
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.CoverLetterWhereInput;
    orderBy?: Prisma.CoverLetterOrderByWithRelationInput;
  } = {}): Promise<CoverLetter[]> {
    const { skip, orderBy, take, where } = params;
    return await this.prisma.coverLetter.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }

  async findOne(id: number): Promise<CoverLetter | null> {
    return await this.prisma.coverLetter.findUnique({
      where: { id },
    });
  }

  async update(
    id: number,
    data: UpdateCoverLetterDto,
    file?: Express.Multer.File,
  ) {
    if (!data.content && !file) {
      throw new BadRequestException('Either content or file must be provided');
    }
    if (data.content && file) {
      throw new BadRequestException('Cannot send both content and file');
    }
    let fileURL: string | null = null;
    let filePublicId: string | null = null;
    if (file) {
      const uploadedFile = await this.cloudinaryService.uploadFile(file);
      fileURL = uploadedFile.secure_url;
      filePublicId = uploadedFile.public_id;
    }
    return await this.prisma.coverLetter.update({
      data: {
        processed: data.processed,
        result: data.result,
        content: data.content,
        fileURL: fileURL,
        filePublicId: filePublicId,
        user: {
          connect: {
            id: data.userId,
          },
        },
        application: {
          connect: { id: data.applicationId },
        },
      },
      where: { id },
    });
  }

  async remove(id: number) {
    const foundLetter = await this.prisma.coverLetter.findUnique({
      where: { id },
    });
    if (!foundLetter) throw new NotFoundException('Cover Letter not found');
    if (foundLetter.filePublicId) {
      await this.cloudinaryService.deleteFile(foundLetter.filePublicId);
    }
    return await this.prisma.coverLetter.delete({
      where: { id },
    });
  }
}
