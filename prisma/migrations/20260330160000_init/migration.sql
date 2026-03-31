CREATE TABLE "Environment" (
  "id" TEXT NOT NULL PRIMARY KEY,
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
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "AssetValue" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "environmentId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "label" TEXT,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "metadata" JSON,
  "lastVerifiedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "AssetValue_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TestDefinition" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "requiredPermissions" JSON NOT NULL,
  "tokenType" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "endpointTemplate" TEXT NOT NULL,
  "queryParams" JSON,
  "requestBody" JSON,
  "dependencies" JSON NOT NULL,
  "expectedRules" JSON NOT NULL,
  "safeToAutoRun" BOOLEAN NOT NULL DEFAULT true,
  "appearsInReviewPack" BOOLEAN NOT NULL DEFAULT true,
  "sampleSuccessShape" JSON,
  "troubleshootingNotes" TEXT,
  "packKeys" JSON NOT NULL,
  "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "TestRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
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
  "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TestRun_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TestRunItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "testRunId" TEXT NOT NULL,
  "testDefinitionId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "resolvedParams" JSON,
  "tokenType" TEXT NOT NULL,
  "responseCode" INTEGER,
  "responseHeaders" JSON,
  "responseJson" JSON,
  "normalizedError" JSON,
  "executionTimeMs" INTEGER,
  "relevantIds" JSON,
  "curlCommand" TEXT,
  "explorerRequest" TEXT,
  "suggestions" JSON,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" DATETIME,
  CONSTRAINT "TestRunItem_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TestRunItem_testDefinitionId_fkey" FOREIGN KEY ("testDefinitionId") REFERENCES "TestDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "FavoritePack" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "environmentId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "testKeys" JSON NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "FavoritePack_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "environmentId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "summary" TEXT NOT NULL,
  "diff" JSON,
  "actor" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Environment_slug_key" ON "Environment"("slug");
CREATE UNIQUE INDEX "AssetValue_environmentId_type_value_key" ON "AssetValue"("environmentId", "type", "value");
CREATE UNIQUE INDEX "TestDefinition_key_key" ON "TestDefinition"("key");
