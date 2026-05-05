/*
  Warnings:

  - A unique constraint covering the columns `[coverLetterId]` on the table `Analytics` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `coverLetterId` to the `Analytics` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'COMPANY';

-- AlterTable
ALTER TABLE "Analytics" ADD COLUMN     "coverLetterId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Analytics_coverLetterId_key" ON "Analytics"("coverLetterId");

-- AddForeignKey
ALTER TABLE "Analytics" ADD CONSTRAINT "Analytics_coverLetterId_fkey" FOREIGN KEY ("coverLetterId") REFERENCES "CoverLetter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
