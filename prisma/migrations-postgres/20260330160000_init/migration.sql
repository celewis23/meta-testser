CREATE TABLE "Environment" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "graphApiVersion" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "encryptedAppSecret" TEXT,
  "encryptedUserAccessToken" TEXT,
  "encryptedPageAccessToken" TEXT,
  "encryptedSystemUserToken" TEXT,
  "defaultBusinessId" TEXT,
  "defaultPageId" TEXT,
  "defaultInstagramUserId" TEXT,
  "notes" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Environment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetValue" (
  "id" TEXT NOT NULL,
  "environmentId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "label" TEXT,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "metadata" JSONB,
  "lastVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssetValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestDefinition" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "requiredPermissions" JSONB NOT NULL,
  "tokenType" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "endpointTemplate" TEXT NOT NULL,
  "queryParams" JSONB,
  "requestBody" JSONB,
  "dependencies" JSONB NOT NULL,
  "expectedRules" JSONB NOT NULL,
  "safeToAutoRun" BOOLEAN NOT NULL DEFAULT true,
  "appearsInReviewPack" BOOLEAN NOT NULL DEFAULT true,
  "sampleSuccessShape" JSONB,
  "troubleshootingNotes" TEXT,
  "packKeys" JSONB NOT NULL,
  "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestRun" (
  "id" TEXT NOT NULL,
  "environmentId" TEXT NOT NULL,
  "triggerType" TEXT NOT NULL,
  "summaryStatus" TEXT NOT NULL,
  "totalCount" INTEGER NOT NULL DEFAULT 0,
  "passedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "blockedCount" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "pacingMs" INTEGER,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestRunItem" (
  "id" TEXT NOT NULL,
  "testRunId" TEXT NOT NULL,
  "testDefinitionId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "resolvedParams" JSONB,
  "tokenType" TEXT NOT NULL,
  "responseCode" INTEGER,
  "responseHeaders" JSONB,
  "responseJson" JSONB,
  "normalizedError" JSONB,
  "executionTimeMs" INTEGER,
  "relevantIds" JSONB,
  "curlCommand" TEXT,
  "explorerRequest" TEXT,
  "suggestions" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "TestRunItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FavoritePack" (
  "id" TEXT NOT NULL,
  "environmentId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "testKeys" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FavoritePack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "environmentId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "summary" TEXT NOT NULL,
  "diff" JSONB,
  "actor" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Environment_slug_key" ON "Environment"("slug");
CREATE UNIQUE INDEX "AssetValue_environmentId_type_value_key" ON "AssetValue"("environmentId", "type", "value");
CREATE UNIQUE INDEX "TestDefinition_key_key" ON "TestDefinition"("key");

ALTER TABLE "AssetValue" ADD CONSTRAINT "AssetValue_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestRunItem" ADD CONSTRAINT "TestRunItem_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestRunItem" ADD CONSTRAINT "TestRunItem_testDefinitionId_fkey" FOREIGN KEY ("testDefinitionId") REFERENCES "TestDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FavoritePack" ADD CONSTRAINT "FavoritePack_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
