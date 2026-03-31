import { TestStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { tokenHealth } from "@/lib/meta/discovery";

export async function getAppSummary(environmentId?: string) {
  const whereRun = environmentId ? { environmentId } : {};

  const [tests, latestRun, counts, environments, failureItems] = await Promise.all([
    prisma.testDefinition.count({ where: { isActive: true } }),
    prisma.testRun.findFirst({
      where: whereRun,
      orderBy: { startedAt: "desc" },
      include: { environment: true }
    }),
    prisma.testRun.aggregate({
      where: whereRun,
      _sum: {
        passedCount: true,
        failedCount: true,
        skippedCount: true,
        blockedCount: true
      }
    }),
    prisma.environment.findMany({
      orderBy: { label: "asc" }
    }),
    prisma.testRunItem.findMany({
      where: {
        testRun: whereRun,
        status: { in: [TestStatus.FAILED, TestStatus.ERROR, TestStatus.BLOCKED] }
      },
      select: {
        status: true,
        normalizedError: true
      },
      take: 100,
      orderBy: { createdAt: "desc" }
    })
  ]);

  const groupedFailures = Object.values(
    failureItems.reduce<Record<string, { count: number; status: string; summary: string }>>((acc, item) => {
      const summary =
        typeof item.normalizedError === "object" &&
        item.normalizedError &&
        "message" in item.normalizedError
          ? String((item.normalizedError as Record<string, unknown>).message)
          : "Needs inspection";
      const key = `${item.status}:${summary}`;
      acc[key] ??= { count: 0, status: item.status, summary };
      acc[key].count += 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    tests,
    latestRun,
    counts: counts._sum,
    environments,
    commonFailures: groupedFailures,
    tokenHealth:
      latestRun?.environment ? tokenHealth(latestRun.environment) : []
  };
}

export async function getRunDetails(runId?: string) {
  if (!runId) {
    return prisma.testRun.findMany({
      include: {
        environment: true,
        items: {
          include: {
            testDefinition: true
          },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { startedAt: "desc" },
      take: 12
    });
  }

  return prisma.testRun.findUnique({
    where: { id: runId },
    include: {
      environment: true,
      items: {
        include: {
          testDefinition: true
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });
}
