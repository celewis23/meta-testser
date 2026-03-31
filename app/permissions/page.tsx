import { HttpMethod } from "@prisma/client";
import { getEnvironmentContext } from "@/lib/db/context";
import { prisma } from "@/lib/db/prisma";
import { MetaGraphClient } from "@/lib/meta/client";
import { getEffectiveEnvironmentValues } from "@/lib/security/env";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";

export default async function PermissionsPage({
  searchParams
}: {
  searchParams: Promise<{ environmentId?: string }>;
}) {
  const { environmentId } = await searchParams;
  const { environments, selectedEnvironment } = await getEnvironmentContext(environmentId);
  const tests = await prisma.testDefinition.findMany({ where: { isActive: true }, orderBy: { displayName: "asc" } });

  let permissions: Array<{ permission: string; status: string }> = [];
  let error: string | null = null;
  const effective = getEffectiveEnvironmentValues(selectedEnvironment);

  if (effective.userAccessToken) {
    const client = new MetaGraphClient();
    const result = await client.request<{ data?: Array<{ permission: string; status: string }> }>({
      apiVersion: effective.graphApiVersion,
      accessToken: effective.userAccessToken,
      endpoint: "me/permissions",
      method: HttpMethod.GET,
      params: { fields: "permission,status" }
    });

    permissions = result.data?.data ?? [];
    error = result.error?.message ?? null;
  }

  const granted = permissions.filter((permission) => permission.status === "granted").map((permission) => permission.permission);
  const declined = permissions.filter((permission) => permission.status !== "granted");
  const required = [...new Set(tests.flatMap((test) => (test.requiredPermissions as string[]) ?? []))];
  const missing = required.filter((permission) => !granted.includes(permission));
  const readinessScore = required.length === 0 ? 100 : Math.round(((required.length - missing.length) / required.length) * 100);

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Inspector"
        title="Permission and scope readiness"
        description="Compare granted scopes against the requirements of your selected test catalog. Expired tokens and permission gaps surface immediately."
      />

      <div className="flex flex-wrap gap-3">
        {environments.map((environment) => (
          <a
            key={environment.id}
            href={`/permissions?environmentId=${environment.id}`}
            className={`rounded-xl border px-3 py-2 text-sm ${selectedEnvironment?.id === environment.id ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
          >
            {environment.label}
          </a>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Readiness score</CardTitle>
            <CardDescription>Calculated from required test permissions versus current granted scopes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-3xl bg-muted p-6">
              <p className="text-5xl font-semibold">{readinessScore}%</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {missing.length === 0 ? "All required permissions are currently granted." : `${missing.length} required permissions still need attention.`}
              </p>
            </div>
            {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mismatch analysis</CardTitle>
            <CardDescription>Missing scopes are highlighted against the test registry.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-semibold">Granted</p>
              <div className="space-y-2">
                {granted.length > 0 ? granted.map((permission) => <div key={permission} className="rounded-xl bg-success/10 px-3 py-2 text-sm text-success">{permission}</div>) : <p className="text-sm text-muted-foreground">No granted permissions found yet.</p>}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold">Missing for active tests</p>
              <div className="space-y-2">
                {missing.length > 0 ? missing.map((permission) => <div key={permission} className="rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">{permission}</div>) : <p className="text-sm text-success">No missing permissions for the current catalog.</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Declined or unavailable permissions</CardTitle>
          <CardDescription>Useful when App Review flows are blocked by the wrong token or stale auth.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {declined.length > 0 ? declined.map((permission) => (
            <div key={permission.permission} className="rounded-xl border border-border px-4 py-3">
              <p className="font-medium">{permission.permission}</p>
              <p className="text-sm text-muted-foreground">{permission.status}</p>
            </div>
          )) : <p className="text-sm text-muted-foreground">Nothing declined in the current response.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
