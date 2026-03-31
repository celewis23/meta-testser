import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { builtInTests } from "@/lib/meta/builtInTests";

export async function syncBuiltInTests() {
  for (const test of builtInTests) {
    await prisma.testDefinition.upsert({
      where: { key: test.key },
      create: {
        ...test,
        requiredPermissions: test.requiredPermissions,
        queryParams: (test.queryParams ?? undefined) as Prisma.InputJsonValue | undefined,
        requestBody: (test.requestBody ?? undefined) as Prisma.InputJsonValue | undefined,
        dependencies: test.dependencies as Prisma.InputJsonValue,
        expectedRules: test.expectedRules as Prisma.InputJsonValue,
        sampleSuccessShape: (test.sampleSuccessShape ?? undefined) as Prisma.InputJsonValue | undefined,
        packKeys: test.packKeys,
        isBuiltIn: true,
        isActive: test.isActive ?? true
      },
      update: {
        displayName: test.displayName,
        category: test.category,
        description: test.description,
        requiredPermissions: test.requiredPermissions,
        tokenType: test.tokenType,
        method: test.method,
        endpointTemplate: test.endpointTemplate,
        queryParams: (test.queryParams ?? undefined) as Prisma.InputJsonValue | undefined,
        requestBody: (test.requestBody ?? undefined) as Prisma.InputJsonValue | undefined,
        dependencies: test.dependencies as Prisma.InputJsonValue,
        expectedRules: test.expectedRules as Prisma.InputJsonValue,
        safeToAutoRun: test.safeToAutoRun,
        appearsInReviewPack: test.appearsInReviewPack,
        sampleSuccessShape: (test.sampleSuccessShape ?? undefined) as Prisma.InputJsonValue | undefined,
        troubleshootingNotes: test.troubleshootingNotes,
        packKeys: test.packKeys,
        isBuiltIn: true,
        isActive: test.isActive ?? true
      }
    });
  }
}
