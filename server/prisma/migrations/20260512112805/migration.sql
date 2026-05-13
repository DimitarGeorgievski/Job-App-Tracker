/*
  Warnings:

  - A unique constraint covering the columns `[companyId]` on the table `Job` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `companyId` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobType` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('REMOTE', 'ONSITE', 'HYBRID');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "companyId" INTEGER NOT NULL,
ADD COLUMN     "jobType" "JobType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Job_companyId_key" ON "Job"("companyId");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
