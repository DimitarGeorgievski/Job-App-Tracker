import { BadRequestException, Injectable } from '@nestjs/common';
import { v2 as cloudinary, DeleteApiResponse } from 'cloudinary';
import streamifier from 'streamifier';
import { CloudinaryUploadResponse } from './types/cloudinary.types';

@Injectable()
export class CloudinaryService {
  uploadFile(file: Express.Multer.File): Promise<CloudinaryUploadResponse> {
    return new Promise<CloudinaryUploadResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new BadRequestException('Upload failed'));
          resolve(result);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
  deleteFile(publicId: string): Promise<DeleteApiResponse> {
    return new Promise<DeleteApiResponse>((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new BadRequestException('Delete failed'));
        resolve(result);
      });
    });
  }
}
