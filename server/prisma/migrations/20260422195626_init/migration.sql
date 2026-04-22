-- AlterTable
ALTER TABLE "CoverLetter" ADD COLUMN     "fileURL" TEXT,
ALTER COLUMN "content" DROP NOT NULL;
