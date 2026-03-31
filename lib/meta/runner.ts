import { HttpMethod, TestStatus, TokenType, type AssetValue, type Environment, type Prisma, type TestDefinition } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { MetaGraphClient } from "@/lib/meta/client";
import { classifyExecution, evaluateExpectedRules } from "@/lib/meta/diagnostics";
import { DependencyError, resolveTestPlaceholders } from "@/lib/meta/resolver";
import { getEffectiveEnvironmentValues } from "@/lib/security/env";

const client = new MetaGraphClient();

type RunSelection =
  | { mode: "single"; testKey: string }
  | { mode: "category"; category: string }
  | { mode: "pack"; packKey: string }
  | { mode: "favorite"; favoritePackId: string }
  | { mode: "all" };

export async function runTestsForEnvironment(params: {
  environmentId: string;
  selection: RunSelection;
  pacingMs?: number;
  retryCount?: number;
  notes?: string;
}) {
  const environment = await prisma.environment.findUnique({
    where: { id: params.environmentId },
    include: { assets: true }
  });

  if (!environment) {
    throw new Error("Environment not found");
  }

  const tests = await loadTests(params.selection);
  if (tests.length === 0) {
    throw new Error(getEmptySelectionMessage(params.selection));
  }
  const run = await prisma.testRun.create({
    data: {
      environmentId: params.environmentId,
      triggerType: params.selection.mode,
      summaryStatus: TestStatus.PASSED,
      notes: params.notes,
      pacingMs: params.pacingMs,
      retryCount: params.retryCount ?? 0
    }
  });

  const items = [];

  for (const test of tests) {
    const result = await executeOne({
      runId: run.id,
      environment,
      test,
      retryCount: params.retryCount ?? 0
    });
    items.push(result);
    if (params.pacingMs) {
      await sleep(params.pacingMs);
    }
  }

  const summary = summarizeItems(items.map((item) => item.status));

  await prisma.testRun.update({
    where: { id: run.id },
    data: {
      ...summary,
      totalCount: items.length,
      summaryStatus: deriveSummaryStatus(summary),
      finishedAt: new Date()
    }
  });

  return run.id;
}

async function executeOne(params: {
  runId: string;
  environment: Environment & { assets: AssetValue[] };
  test: TestDefinition;
  retryCount: number;
}) {
  try {
    const effective = getEffectiveEnvironmentValues(params.environment);
    const resolved = resolveTestPlaceholders({
      environment: params.environment,
      endpointTemplate: params.test.endpointTemplate,
      dependencies: params.test.dependencies as never[],
      queryParams: (params.test.queryParams as Record<string, string> | null) ?? undefined,
      requestBody: (params.test.requestBody as Record<string, unknown> | null) ?? undefined
    });

    const token = getTokenValue(effective, params.test.tokenType);
    if (!token) {
      throw new DependencyError("Missing token", [
        {
          key: `${params.test.tokenType.toLowerCase()}Token`,
          label: `${params.test.tokenType} token`,
          required: true
        }
      ]);
    }

    let response = await client.request({
      apiVersion: effective.graphApiVersion,
      accessToken: token,
      endpoint: resolved.endpoint,
      method: params.test.method,
      params: resolved.queryParams,
      body: resolved.requestBody
    });

    let attempts = 0;
    while (!response.ok && response.error?.is_transient && attempts < params.retryCount) {
      attempts += 1;
      response = await client.request({
        apiVersion: effective.graphApiVersion,
        accessToken: token,
        endpoint: resolved.endpoint,
        method: params.test.method,
        params: resolved.queryParams,
        body: resolved.requestBody
      });
    }

    const expectedSatisfied = evaluateExpectedRules(response.data, params.test.expectedRules as never[]);
    const classification = classifyExecution({
      statusCode: response.status,
      error: response.error,
      expectedSatisfied
    });

    return prisma.testRunItem.create({
      data: {
        testRunId: params.runId,
        testDefinitionId: params.test.id,
        status: classification.status,
        endpoint: resolved.endpoint,
        method: params.test.method,
        resolvedParams: resolved.queryParams as Prisma.InputJsonValue,
        tokenType: params.test.tokenType,
        responseCode: response.status,
        responseHeaders: response.headers as Prisma.InputJsonValue,
        responseJson: (response.data ?? undefined) as Prisma.InputJsonValue | undefined,
        normalizedError: (response.error ?? undefined) as Prisma.InputJsonValue | undefined,
        executionTimeMs: response.durationMs,
        relevantIds: resolved.values as Prisma.InputJsonValue,
        curlCommand: buildCurl(effective.graphApiVersion, token, resolved.endpoint, params.test.method, resolved.queryParams),
        explorerRequest: `/${effective.graphApiVersion}/${resolved.endpoint}?${new URLSearchParams(resolved.queryParams).toString()}`,
        suggestions: classification.diagnostics as Prisma.InputJsonValue,
        finishedAt: new Date()
      }
    });
  } catch (error) {
    const dependencyError = error instanceof DependencyError;
    const diagnostics = classifyExecution({
      dependencyError,
      expectedSatisfied: false
    });

    return prisma.testRunItem.create({
      data: {
        testRunId: params.runId,
        testDefinitionId: params.test.id,
        status: diagnostics.status,
        endpoint: params.test.endpointTemplate,
        method: params.test.method,
        tokenType: params.test.tokenType,
        normalizedError: ({
          message: error instanceof Error ? error.message : "Unknown error",
          missing: dependencyError ? error.missing : undefined
        } satisfies Prisma.InputJsonValue),
        suggestions: diagnostics.diagnostics as Prisma.InputJsonValue,
        finishedAt: new Date()
      }
    });
  }
}

async function loadTests(selection: RunSelection) {
  if (selection.mode === "single") {
    return prisma.testDefinition.findMany({
      where: { key: selection.testKey, isActive: true }
    });
  }

  if (selection.mode === "category") {
    return prisma.testDefinition.findMany({
      where: { category: selection.category, isActive: true },
      orderBy: { displayName: "asc" }
    });
  }

  if (selection.mode === "pack") {
    const tests = await prisma.testDefinition.findMany({
      where: { isActive: true },
      orderBy: { displayName: "asc" }
    });
    return tests.filter((test) => Array.isArray(test.packKeys) && test.packKeys.includes(selection.packKey));
  }

  if (selection.mode === "favorite") {
    const favorite = await prisma.favoritePack.findUnique({
      where: { id: selection.favoritePackId }
    });

    if (!favorite || !Array.isArray(favorite.testKeys) || favorite.testKeys.length === 0) {
      return [];
    }

    return prisma.testDefinition.findMany({
      where: {
        isActive: true,
        key: {
          in: favorite.testKeys.filter((value): value is string => typeof value === "string")
        }
      },
      orderBy: [{ category: "asc" }, { displayName: "asc" }]
    });
  }

  return prisma.testDefinition.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { displayName: "asc" }]
  });
}

function summarizeItems(statuses: TestStatus[]) {
  return {
    passedCount: statuses.filter((status) => status === TestStatus.PASSED).length,
    failedCount: statuses.filter((status) => status === TestStatus.FAILED).length,
    skippedCount: statuses.filter((status) => status === TestStatus.SKIPPED).length,
    errorCount: statuses.filter((status) => status === TestStatus.ERROR).length,
    blockedCount: statuses.filter((status) => status === TestStatus.BLOCKED).length
  };
}

function deriveSummaryStatus(summary: ReturnType<typeof summarizeItems>) {
  if (summary.failedCount > 0) return TestStatus.FAILED;
  if (summary.errorCount > 0) return TestStatus.ERROR;
  if (summary.blockedCount > 0) return TestStatus.BLOCKED;
  return TestStatus.PASSED;
}

function buildCurl(
  apiVersion: string,
  token: string,
  endpoint: string,
  method: HttpMethod,
  params: Record<string, string>
) {
  const url = new URL(`https://graph.facebook.com/${apiVersion}/${endpoint.replace(/^\/+/, "")}`);
  const search = new URLSearchParams(params);
  search.set("access_token", token);
  url.search = search.toString();
  return `curl -X ${method} "${url.toString()}"`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTokenValue(
  effective: ReturnType<typeof getEffectiveEnvironmentValues>,
  tokenType: TestDefinition["tokenType"]
) {
  switch (tokenType) {
    case TokenType.PAGE:
      return effective.pageAccessToken;
    case TokenType.SYSTEM_USER:
      return effective.systemUserToken;
    default:
      return effective.userAccessToken;
  }
}

function getEmptySelectionMessage(selection: RunSelection) {
  if (selection.mode === "pack") {
    return selection.packKey
      ? `No active tests were found for the pack "${selection.packKey}".`
      : "Choose a pack before running a pack-based suite.";
  }

  if (selection.mode === "favorite") {
    return selection.favoritePackId
      ? "The selected favorite pack does not contain any active tests."
      : "Choose a favorite pack before running the recommended suite.";
  }

  if (selection.mode === "category") {
    return selection.category
      ? `No active tests were found in the category "${selection.category}".`
      : "Choose a category before running a category suite.";
  }

  if (selection.mode === "single") {
    return selection.testKey
      ? `No active test definition was found for "${selection.testKey}".`
      : "Choose a test before running a single-test check.";
  }

  return "No tests were available for this run.";
}
