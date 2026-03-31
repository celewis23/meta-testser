import { HttpMethod, TokenType } from "@prisma/client";
import { getEnvironmentContext } from "@/lib/db/context";
import { prisma } from "@/lib/db/prisma";
import { runTestsAction, saveTestDefinitionAction, syncCatalogAction } from "@/lib/actions";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { JsonInspector } from "@/components/ui/json-inspector";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RunSuiteSubmit } from "@/components/tests/run-suite-submit";

export default async function TestsPage({
  searchParams
}: {
  searchParams: Promise<{ environmentId?: string; error?: string }>;
}) {
  const { environmentId, error } = await searchParams;
  const { environments, selectedEnvironment } = await getEnvironmentContext(environmentId);
  const tests = await prisma.testDefinition.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { displayName: "asc" }]
  });
  const favoritePacks = await prisma.favoritePack.findMany({
    orderBy: { name: "asc" }
  });
  const categories = [...new Set(tests.map((test) => test.category))];
  const packKeys = [...new Set(tests.flatMap((test) => (test.packKeys as string[]) ?? []))].sort();
  const defaultMode = favoritePacks.length > 0 ? "favorite" : packKeys.length > 0 ? "pack" : "all";
  const defaultValue =
    favoritePacks[0]?.id ??
    packKeys[0] ??
    categories[0] ??
    tests[0]?.key ??
    "";

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Registry"
        title="Test definitions and execution controls"
        description="Run one test, a category, a permission pack, or the full environment suite. Dependencies, token type expectations, and review suitability are all stored in the database."
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Run tests</CardTitle>
            <CardDescription>Server-side execution with retries, pacing, normalized diagnostics, and saved evidence records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {environments.map((environment) => (
                <a key={environment.id} href={`/tests?environmentId=${environment.id}`} className={`rounded-xl border px-3 py-2 text-sm ${selectedEnvironment?.id === environment.id ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                  {environment.label}
                </a>
              ))}
            </div>
            {error ? (
              <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
                {error}
              </div>
            ) : null}
            {selectedEnvironment ? (
              <form action={runTestsAction} className="space-y-4">
                <input type="hidden" name="environmentId" value={selectedEnvironment.id} />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="mode">Run mode</Label>
                    <Select id="mode" name="mode" defaultValue={defaultMode}>
                      <option value="favorite">Favorite pack</option>
                      <option value="single">Single test</option>
                      <option value="category">Category</option>
                      <option value="pack">Pack</option>
                      <option value="all">All available tests</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="value">Selection</Label>
                    <Select id="value" name="value" defaultValue={defaultValue}>
                      {favoritePacks.length > 0 ? (
                        <optgroup label="Favorite packs">
                          {favoritePacks.map((pack) => (
                            <option key={pack.id} value={pack.id}>
                              {pack.name}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      {packKeys.length > 0 ? (
                        <optgroup label="Pack keys">
                          {packKeys.map((packKey) => (
                            <option key={packKey} value={packKey}>
                              {packKey}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      {categories.length > 0 ? (
                        <optgroup label="Categories">
                          {categories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      {tests.length > 0 ? (
                        <optgroup label="Individual tests">
                          {tests.map((test) => (
                            <option key={test.id} value={test.key}>
                              {test.displayName}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pacingMs">Pacing (ms)</Label>
                    <Input id="pacingMs" name="pacingMs" type="number" defaultValue="300" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retryCount">Retry count</Label>
                    <Input id="retryCount" name="retryCount" type="number" defaultValue="1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Run notes</Label>
                  <Textarea id="notes" name="notes" placeholder="Optional context for this run..." />
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
                  Recommended path: use `Favorite pack` to run the seeded starter suite. If a selection resolves to zero tests, the lab now stops the run and tells you exactly why instead of recording an empty pass.
                </div>
                <RunSuiteSubmit />
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Create an environment first so the runner knows which tokens and defaults to use.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catalog utilities</CardTitle>
            <CardDescription>Refresh built-in tests or add custom ones for future permissions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={syncCatalogAction}>
              <Button type="submit" variant="outline">Resync built-in catalog</Button>
            </form>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <p className="font-semibold">Pack keys</p>
                <p className="mt-2 text-sm text-muted-foreground">{packKeys.join(", ") || "No pack keys yet."}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="font-semibold">Categories</p>
                <p className="mt-2 text-sm text-muted-foreground">{categories.join(", ") || "No categories yet."}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add or update a test definition</CardTitle>
          <CardDescription>Database-driven registry entries can be expanded without changing runner internals.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveTestDefinitionAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input id="key" name="key" placeholder="get_ig_comments" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input id="displayName" name="displayName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endpointTemplate">Endpoint template</Label>
              <Input id="endpointTemplate" name="endpointTemplate" placeholder="{igUserId}/media" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tokenType">Token type</Label>
              <Select id="tokenType" name="tokenType" defaultValue={TokenType.USER}>
                {Object.values(TokenType).map((value) => <option key={value} value={value}>{value}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">HTTP method</Label>
              <Select id="method" name="method" defaultValue={HttpMethod.GET}>
                {Object.values(HttpMethod).map((value) => <option key={value} value={value}>{value}</option>)}
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requiredPermissions">Required permissions (CSV)</Label>
              <Input id="requiredPermissions" name="requiredPermissions" placeholder="instagram_basic,pages_show_list" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="packKeys">Pack keys (CSV)</Label>
              <Input id="packKeys" name="packKeys" placeholder="instagram_basic,discovery" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="queryParams">Query params JSON</Label>
              <Textarea id="queryParams" name="queryParams" defaultValue='{"fields":"id,username"}' />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestBody">Request body JSON</Label>
              <Textarea id="requestBody" name="requestBody" defaultValue="{}" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dependencies">Dependencies JSON</Label>
              <Textarea id="dependencies" name="dependencies" defaultValue='[{"key":"igUserId","label":"Instagram User ID","required":true}]' />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedRules">Expected rules JSON</Label>
              <Textarea id="expectedRules" name="expectedRules" defaultValue='[{"type":"field_exists","field":"id"}]' />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="troubleshootingNotes">Troubleshooting notes</Label>
              <Textarea id="troubleshootingNotes" name="troubleshootingNotes" />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2"><input type="checkbox" name="safeToAutoRun" defaultChecked /> Safe to auto-run</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" name="appearsInReviewPack" defaultChecked /> Include in App Review pack</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked /> Active</label>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Save definition</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dependency graph view</CardTitle>
          <CardDescription>Quick view of which IDs need to exist before downstream tests can run.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tests.map((test) => (
            <div key={test.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{test.displayName}</p>
                  <p className="text-sm text-muted-foreground">{test.key} • {test.category}</p>
                </div>
                <StatusBadge status={test.isActive ? "ACTIVE" : "DISABLED"} />
              </div>
              <p className="mt-3 text-sm">{test.description}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <JsonInspector title="Dependencies" value={test.dependencies} />
                <JsonInspector title="Expected rules" value={test.expectedRules} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
