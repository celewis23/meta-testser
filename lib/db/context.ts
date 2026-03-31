import { prisma } from "@/lib/db/prisma";

export async function getEnvironmentContext(environmentId?: string) {
  const environments = await prisma.environment.findMany({
    orderBy: [{ isDefault: "desc" }, { label: "asc" }],
    include: { assets: true }
  });

  const selectedEnvironment =
    environments.find((environment) => environment.id === environmentId) ??
    environments.find((environment) => environment.isDefault) ??
    environments[0] ??
    null;

  return { environments, selectedEnvironment };
}
