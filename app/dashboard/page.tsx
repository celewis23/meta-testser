import Link from "next/link";
import { getAppSummary } from "@/lib/db/queries";
import { formatDateTime } from "@/lib/utils/format";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ environmentId?: string }>;
}) {
  const { environmentId } = await searchParams;
  const summary = await getAppSummary(environmentId);

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Overview"
        title="Permission and review readiness dashboard"
        description="Track the latest environment health, recent executions, common failure reasons, and whether your current token set is ready for App Review evidence generation."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard title="Total tests" value={summary.tests} description="Active test definitions currently available in the registry." />
        <SummaryCard title="Passed" value={summary.counts.passedCount ?? 0} description="Successful run items recorded across visible runs." />
        <SummaryCard title="Failed" value={summary.counts.failedCount ?? 0} description="Run items that finished with a hard failure." />
        <SummaryCard title="Skipped / blocked" value={(summary.counts.skippedCount ?? 0) + (summary.counts.blockedCount ?? 0)} description="Runs stopped cleanly because prerequisites were missing or the test was skipped." />
        <SummaryCard title="Last run time" value={formatDateTime(summary.latestRun?.startedAt)} description="Most recent execution timestamp for the selected environment." />
        <SummaryCard title="Current app / env" value={summary.latestRun?.environment.label ?? "No run yet"} description={summary.latestRun?.environment.appId ?? "Create an environment to start testing."} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent runs</CardTitle>
            <CardDescription>Jump straight into the latest suite runs and inspect evidence-worthy results.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.latestRun ? (
              <div className="rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold">{summary.latestRun.environment.label}</p>
                    <p className="text-sm text-muted-foreground">
                      Trigger: {summary.latestRun.triggerType} • Started {formatDateTime(summary.latestRun.startedAt)}
                    </p>
                  </div>
                  <StatusBadge status={summary.latestRun.summaryStatus} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/runs?runId=${summary.latestRun.id}`} className="rounded-xl border border-border px-3 py-2 text-sm font-medium">
                    View run details
                  </Link>
                  <Link href="/review-pack" className="rounded-xl border border-border px-3 py-2 text-sm font-medium">
                    Build review evidence
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No runs yet. Create an environment, discover assets, then run the recommended starter pack.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Token and asset health</CardTitle>
            <CardDescription>Quick server-side view of which token classes are configured for the latest environment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.tokenHealth.length > 0 ? (
              summary.tokenHealth.map((token) => (
                <div key={token.tokenType} className="flex items-center justify-between rounded-xl border border-border px-3 py-3">
                  <span className="text-sm font-medium">{token.tokenType}</span>
                  <span className={`text-sm ${token.configured ? "text-success" : "text-warning"}`}>
                    {token.configured ? "Configured" : "Missing"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Token health will appear after the first environment or run is available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Most common failure reasons</CardTitle>
          <CardDescription>Patterns mined from recent failed, blocked, and error responses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary.commonFailures.length > 0 ? (
            summary.commonFailures.map((failure) => (
              <div key={`${failure.status}-${failure.summary}`} className="flex items-start justify-between gap-3 rounded-xl border border-border px-4 py-3">
                <div>
                  <p className="font-medium">{failure.summary}</p>
                  <p className="text-sm text-muted-foreground">{failure.status}</p>
                </div>
                <span className="text-sm font-semibold">{failure.count}x</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No failure patterns yet. A clean slate is a nice problem to have.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
