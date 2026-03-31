import Link from "next/link";
import { getRunDetails } from "@/lib/db/queries";
import { formatDateTime, formatDuration } from "@/lib/utils/format";
import { JsonInspector } from "@/components/ui/json-inspector";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";

export default async function RunsPage({
  searchParams
}: {
  searchParams: Promise<{ runId?: string; compareA?: string; compareB?: string }>;
}) {
  const { runId, compareA, compareB } = await searchParams;
  const runs = await getRunDetails();
  const selectedRun = runId ? await getRunDetails(runId) : null;
  const compareRunA = compareA ? await getRunDetails(compareA) : null;
  const compareRunB = compareB ? await getRunDetails(compareB) : null;

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Results"
        title="Run history and diagnostics"
        description="Inspect endpoint usage, resolved parameters, response codes, execution time, normalized errors, and copyable requests without exposing tokens to the browser."
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent runs</CardTitle>
          <CardDescription>Choose a run to inspect or compare two runs side by side.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.isArray(runs) && runs.map((run) => (
            <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
              <div>
                <p className="font-semibold">{run.environment.label}</p>
                <p className="text-sm text-muted-foreground">{run.triggerType} • {formatDateTime(run.startedAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={run.summaryStatus} />
                <Link href={`/runs?runId=${run.id}`} className="rounded-xl border border-border px-3 py-2 text-sm">Inspect</Link>
                <Link href={`/runs?compareA=${run.id}${runs[1] ? `&compareB=${runs[1].id}` : ""}`} className="rounded-xl border border-border px-3 py-2 text-sm">Compare</Link>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {selectedRun && !Array.isArray(selectedRun) ? (
        <Card>
          <CardHeader>
            <CardTitle>Run detail</CardTitle>
            <CardDescription>{selectedRun.environment.label} • {formatDateTime(selectedRun.startedAt)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedRun.items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.testDefinition.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.endpoint} • {item.tokenType} • {item.responseCode ?? "n/a"} • {formatDuration(item.executionTimeMs)}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <JsonInspector title="Resolved parameters" value={item.resolvedParams ?? {}} />
                  <JsonInspector title="Normalized error / diagnostics" value={{ normalizedError: item.normalizedError, suggestions: item.suggestions }} />
                  <JsonInspector title="Relevant IDs" value={item.relevantIds ?? {}} />
                  <JsonInspector title="Formatted response JSON" value={item.responseJson ?? {}} />
                </div>
                <div className="mt-3 rounded-xl bg-muted/40 p-4 text-xs">
                  <p>cURL</p>
                  <pre className="mt-2">{item.curlCommand ?? "Unavailable for blocked runs."}</pre>
                  <p className="mt-4">Graph API Explorer equivalent</p>
                  <pre className="mt-2">{item.explorerRequest ?? "Unavailable for blocked runs."}</pre>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {compareRunA && compareRunB && !Array.isArray(compareRunA) && !Array.isArray(compareRunB) ? (
        <div className="grid gap-6 xl:grid-cols-2">
          {[compareRunA, compareRunB].map((run) => (
            <Card key={run.id}>
              <CardHeader>
                <CardTitle>{run.environment.label}</CardTitle>
                <CardDescription>{formatDateTime(run.startedAt)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {run.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-3">
                    <div>
                      <p className="font-medium">{item.testDefinition.displayName}</p>
                      <p className="text-sm text-muted-foreground">{item.responseCode ?? "n/a"} • {formatDuration(item.executionTimeMs)}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
