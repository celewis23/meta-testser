import { prisma } from "@/lib/db/prisma";
import { getEnvironmentContext } from "@/lib/db/context";
import { formatDateTime } from "@/lib/utils/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";

const freshnessHours = Number(process.env.REVIEW_PACK_FRESHNESS_HOURS ?? 72);

export default async function ReviewPackPage({
  searchParams
}: {
  searchParams: Promise<{ environmentId?: string }>;
}) {
  const { environmentId } = await searchParams;
  const { environments, selectedEnvironment } = await getEnvironmentContext(environmentId);

  const latestSuccesses = selectedEnvironment
    ? await prisma.testRunItem.findMany({
        where: {
          status: "PASSED",
          testRun: { environmentId: selectedEnvironment.id },
          testDefinition: { appearsInReviewPack: true }
        },
        include: { testDefinition: true, testRun: true },
        orderBy: { createdAt: "desc" }
      })
    : [];

  const permissions = [...new Set(latestSuccesses.flatMap((item) => (item.testDefinition.requiredPermissions as string[]) ?? []))];
  const now = Date.now();

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Evidence"
        title="App Review Pack"
        description="Collect successful executions that prove your requested permissions, warn when evidence is stale, and export a clean report for reviewers."
      />

      <div className="flex flex-wrap gap-3">
        {environments.map((environment) => (
          <a key={environment.id} href={`/review-pack?environmentId=${environment.id}`} className={`rounded-xl border px-3 py-2 text-sm ${selectedEnvironment?.id === environment.id ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
            {environment.label}
          </a>
        ))}
        {selectedEnvironment ? (
          <>
            <a href={`/api/export/review-pack?environmentId=${selectedEnvironment.id}&format=json`} className="rounded-xl border border-border px-3 py-2 text-sm">Export JSON</a>
            <a href={`/api/export/review-pack?environmentId=${selectedEnvironment.id}&format=csv`} className="rounded-xl border border-border px-3 py-2 text-sm">Export CSV</a>
            <a href={`/api/export/review-pack?environmentId=${selectedEnvironment.id}&format=print`} className="rounded-xl border border-border px-3 py-2 text-sm">Printable summary</a>
          </>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evidence by permission</CardTitle>
          <CardDescription>Freshness window: {freshnessHours} hours.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {permissions.length > 0 ? permissions.map((permission) => {
            const evidence = latestSuccesses.filter((item) => ((item.testDefinition.requiredPermissions as string[]) ?? []).includes(permission));
            const freshest = evidence[0];
            const stale = freshest ? now - new Date(freshest.createdAt).getTime() > freshnessHours * 60 * 60 * 1000 : true;
            return (
              <div key={permission} className="rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{permission}</p>
                    <p className="text-sm text-muted-foreground">
                      Last successful run: {freshest ? formatDateTime(freshest.createdAt) : "Never"}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stale ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}`}>
                    {stale ? "Stale evidence" : "Fresh evidence"}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {evidence.map((item) => (
                    <div key={item.id} className="rounded-xl bg-muted/40 p-4">
                      <p className="font-medium">{item.testDefinition.displayName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.endpoint}</p>
                      <p className="mt-2 text-sm">Proves: {item.testDefinition.description}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Relevant IDs: {JSON.stringify(item.relevantIds ?? {})}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          }) : <p className="text-sm text-muted-foreground">No successful review-ready runs yet. Run the recommended pack first.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
