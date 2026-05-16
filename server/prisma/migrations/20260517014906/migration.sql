/*
  Warnings:

  - You are about to drop the column `logoPublicId` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `logoURL` on the `Company` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Company" DROP COLUMN "logoPublicId",
DROP COLUMN "logoURL";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "logoPublicId" TEXT,
ADD COLUMN     "logoURL" TEXT;
