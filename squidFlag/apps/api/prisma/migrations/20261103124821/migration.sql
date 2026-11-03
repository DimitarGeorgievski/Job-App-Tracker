-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Environment" DROP CONSTRAINT "Environment_organizationId_projectId_fkey";

-- DropForeignKey
ALTER TABLE "FeatureFlag" DROP CONSTRAINT "FeatureFlag_organizationId_projectId_fkey";

-- DropForeignKey
ALTER TABLE "FlagEnvironmentConfig" DROP CONSTRAINT "FlagEnvironmentConfig_organizationId_projectId_environment_fkey";

-- DropForeignKey
ALTER TABLE "FlagEnvironmentConfig" DROP CONSTRAINT "FlagEnvironmentConfig_organizationId_projectId_flagId_fkey";

-- DropForeignKey
ALTER TABLE "FlagRule" DROP CONSTRAINT "FlagRule_organizationId_flagEnvironmentConfigId_fkey";

-- DropForeignKey
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_userId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "PublishedSnapshot" DROP CONSTRAINT "PublishedSnapshot_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "PublishedSnapshot" DROP CONSTRAINT "PublishedSnapshot_organizationId_projectId_environmentId_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_replacedByTokenId_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "SdkKey" DROP CONSTRAINT "SdkKey_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "SdkKey" DROP CONSTRAINT "SdkKey_organizationId_environmentId_fkey";

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_organizationId_projectId_fkey" FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_organizationId_projectId_fkey" FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "FlagEnvironmentConfig" ADD CONSTRAINT "FlagEnvironmentConfig_organizationId_projectId_environment_fkey" FOREIGN KEY ("organizationId", "projectId", "environmentId") REFERENCES "Environment"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "FlagEnvironmentConfig" ADD CONSTRAINT "FlagEnvironmentConfig_organizationId_projectId_flagId_fkey" FOREIGN KEY ("organizationId", "projectId", "flagId") REFERENCES "FeatureFlag"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "FlagRule" ADD CONSTRAINT "FlagRule_organizationId_flagEnvironmentConfigId_fkey" FOREIGN KEY ("organizationId", "flagEnvironmentConfigId") REFERENCES "FlagEnvironmentConfig"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SdkKey" ADD CONSTRAINT "SdkKey_organizationId_environmentId_fkey" FOREIGN KEY ("organizationId", "environmentId") REFERENCES "Environment"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SdkKey" ADD CONSTRAINT "SdkKey_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PublishedSnapshot" ADD CONSTRAINT "PublishedSnapshot_organizationId_projectId_environmentId_fkey" FOREIGN KEY ("organizationId", "projectId", "environmentId") REFERENCES "Environment"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PublishedSnapshot" ADD CONSTRAINT "PublishedSnapshot_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_replacedByTokenId_fkey" FOREIGN KEY ("replacedByTokenId") REFERENCES "RefreshToken"("id") ON DELETE SET NULL ON UPDATE RESTRICT;
