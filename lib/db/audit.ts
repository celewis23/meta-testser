import { prisma } from "@/lib/db/prisma";

export async function logAudit(params: {
  action: string;
  entityType: string;
  entityId?: string;
  environmentId?: string;
  summary: string;
  diff?: unknown;
  actor?: string;
}) {
  await prisma.auditLog.create({
    data: {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      environmentId: params.environmentId ?? null,
      summary: params.summary,
      diff: params.diff ?? undefined,
      actor: params.actor ?? null
    }
  });
}
