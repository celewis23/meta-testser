import { getEnvironmentContext } from "@/lib/db/context";
import { prisma } from "@/lib/db/prisma";
import {
  cloneEnvironmentAction,
  extendUserTokenAction,
  getDecryptedEnvironmentValues,
  loadEnvDefaultsAction,
  regeneratePageTokenAction,
  saveEnvironmentAction
} from "@/lib/actions";
import { getEnvironmentTokenStatuses } from "@/lib/meta/token-manager";
import { formatDateTime, maskSecret } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/components/ui/section-header";
import { Textarea } from "@/components/ui/textarea";

export default async function EnvironmentsPage({
  searchParams
}: {
  searchParams: Promise<{ environmentId?: string; tokenError?: string; tokenUpdated?: string }>;
}) {
  const { environmentId, tokenError, tokenUpdated } = await searchParams;
  const { environments, selectedEnvironment } = await getEnvironmentContext(environmentId);
  const selectedValues = selectedEnvironment ? await getDecryptedEnvironmentValues(selectedEnvironment.id) : null;
  const tokenStatuses = selectedEnvironment ? await getEnvironmentTokenStatuses(selectedEnvironment.id) : [];
  const auditLogs = selectedEnvironment
    ? await prisma.auditLog.findMany({
        where: { environmentId: selectedEnvironment.id },
        orderBy: { createdAt: "desc" },
        take: 8
      })
    : [];

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Settings"
        title="Environment management"
        description="Create separate Dev, Review, and Production Test configurations with a calmer layout for credentials, defaults, token maintenance, and audit history."
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Saved environments</CardTitle>
              <CardDescription>Switch context, clone an environment, or load one as your active workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {environments.map((environment) => (
                <div
                  key={environment.id}
                  className={`rounded-2xl border p-4 ${
                    selectedEnvironment?.id === environment.id
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="space-y-2">
                    <div>
                      <p className="font-semibold">{environment.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {environment.graphApiVersion} • App {environment.appId}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      User {maskSecret(environment.encryptedUserAccessToken)} • Page{" "}
                      {maskSecret(environment.encryptedPageAccessToken)}
                    </p>
                    <div className="flex gap-2">
                      <a
                        href={`/environments?environmentId=${environment.id}`}
                        className="rounded-xl border border-border px-3 py-2 text-sm"
                      >
                        Open
                      </a>
                      <form action={cloneEnvironmentAction}>
                        <input type="hidden" name="environmentId" value={environment.id} />
                        <Button type="submit" variant="outline">
                          Clone
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
              <form action={loadEnvDefaultsAction}>
                <Button type="submit" variant="outline" className="w-full">
                  Load from env defaults
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit log</CardTitle>
              <CardDescription>Recent configuration and token changes for this environment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-border px-4 py-3">
                    <p className="font-medium">{log.summary}</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(log.createdAt)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Environment changes will appear here after the first save.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{selectedEnvironment ? "Edit environment" : "Create your first environment"}</CardTitle>
              <CardDescription>
                The form is split into practical sections so credentials, default IDs, and notes are easier to scan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {tokenUpdated ? (
                <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
                  {tokenUpdated === "user"
                    ? "User token updated successfully."
                    : tokenUpdated === "page"
                      ? "Page token regenerated successfully."
                      : "Token updated successfully."}
                </div>
              ) : null}
              {tokenError ? (
                <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
                  {tokenError}
                </div>
              ) : null}

              <form action={saveEnvironmentAction} className="space-y-6">
                <input type="hidden" name="id" defaultValue={selectedEnvironment?.id} />

                <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                  <section className="space-y-4 rounded-2xl border border-border p-5">
                    <div>
                      <h3 className="text-lg font-semibold">Core config</h3>
                      <p className="text-sm text-muted-foreground">
                        Label, Graph version, and app credentials used across test execution.
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Label" htmlFor="label">
                        <Input id="label" name="label" defaultValue={selectedValues?.label ?? ""} required />
                      </Field>
                      <Field label="Graph API version" htmlFor="graphApiVersion">
                        <Input
                          id="graphApiVersion"
                          name="graphApiVersion"
                          defaultValue={selectedValues?.graphApiVersion ?? "v25.0"}
                          required
                        />
                      </Field>
                      <Field label="App ID" htmlFor="appId">
                        <Input id="appId" name="appId" defaultValue={selectedValues?.appId ?? ""} required />
                      </Field>
                      <Field label="App secret" htmlFor="appSecret">
                        <Input
                          id="appSecret"
                          name="appSecret"
                          defaultValue={selectedValues?.appSecret ?? ""}
                          type="password"
                        />
                      </Field>
                    </div>
                  </section>

                  <section className="space-y-4 rounded-2xl border border-border p-5">
                    <div>
                      <h3 className="text-lg font-semibold">Default IDs</h3>
                      <p className="text-sm text-muted-foreground">
                        Give the app a strong starting point. Business ID, page ID, and IG user ID unlock most discovery.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <Field label="Default business ID" htmlFor="defaultBusinessId">
                        <Input
                          id="defaultBusinessId"
                          name="defaultBusinessId"
                          defaultValue={selectedValues?.defaultBusinessId ?? ""}
                        />
                      </Field>
                      <Field label="Default page ID" htmlFor="defaultPageId">
                        <Input
                          id="defaultPageId"
                          name="defaultPageId"
                          defaultValue={selectedValues?.defaultPageId ?? ""}
                        />
                      </Field>
                      <Field label="Default Instagram user ID" htmlFor="defaultInstagramUserId">
                        <Input
                          id="defaultInstagramUserId"
                          name="defaultInstagramUserId"
                          defaultValue={selectedValues?.defaultInstagramUserId ?? ""}
                        />
                      </Field>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" name="isDefault" defaultChecked={selectedValues?.isDefault ?? false} />
                        Make default environment
                      </label>
                    </div>
                  </section>
                </div>

                <section className="space-y-4 rounded-2xl border border-border p-5">
                  <div>
                    <h3 className="text-lg font-semibold">Tokens</h3>
                    <p className="text-sm text-muted-foreground">
                      Tokens remain encrypted server-side. This section is optimized for updating and rotating them without leaving the app.
                    </p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Field label="User access token" htmlFor="userAccessToken">
                      <Textarea
                        id="userAccessToken"
                        name="userAccessToken"
                        defaultValue={selectedValues?.userAccessToken ?? ""}
                        className="min-h-[160px]"
                      />
                    </Field>
                    <Field label="Page access token" htmlFor="pageAccessToken">
                      <Textarea
                        id="pageAccessToken"
                        name="pageAccessToken"
                        defaultValue={selectedValues?.pageAccessToken ?? ""}
                        className="min-h-[160px]"
                      />
                    </Field>
                    <Field label="System user token" htmlFor="systemUserToken">
                      <Textarea
                        id="systemUserToken"
                        name="systemUserToken"
                        defaultValue={selectedValues?.systemUserToken ?? ""}
                        className="min-h-[160px]"
                      />
                    </Field>
                  </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-border p-5">
                  <div>
                    <h3 className="text-lg font-semibold">Notes</h3>
                    <p className="text-sm text-muted-foreground">
                      Capture anything useful for reviewers or internal setup, like which account the tokens came from.
                    </p>
                  </div>
                  <Textarea id="notes" name="notes" defaultValue={selectedValues?.notes ?? ""} className="min-h-[120px]" />
                </section>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit">Save environment</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {selectedEnvironment ? (
            <Card>
              <CardHeader>
                <CardTitle>Token management</CardTitle>
                <CardDescription>
                  Extend the user token, regenerate the page token from `/me/accounts`, and validate what this environment can actually use right now.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {tokenStatuses.map((status) => (
                    <div key={status.tokenType} className="rounded-2xl border border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold capitalize">{status.tokenType.replaceAll("_", " ")}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{status.message}</p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            status.valid === true
                              ? "bg-success/15 text-success"
                              : status.valid === false
                                ? "bg-destructive/15 text-destructive"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {status.valid === true ? "Valid" : status.valid === false ? "Needs attention" : "Unknown"}
                        </span>
                      </div>
                      {status.metadata ? (
                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                          {"type" in status.metadata && status.metadata.type ? <p>Type: {String(status.metadata.type)}</p> : null}
                          {"expiresAt" in status.metadata && status.metadata.expiresAt ? (
                            <p>Expires: {String(status.metadata.expiresAt)}</p>
                          ) : null}
                          {"scopes" in status.metadata && Array.isArray(status.metadata.scopes) && status.metadata.scopes.length > 0 ? (
                            <p>Scopes: {(status.metadata.scopes as string[]).join(", ")}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <form action={extendUserTokenAction}>
                    <input type="hidden" name="environmentId" value={selectedEnvironment.id} />
                    <Button type="submit">Extend user token</Button>
                  </form>
                  <form action={regeneratePageTokenAction}>
                    <input type="hidden" name="environmentId" value={selectedEnvironment.id} />
                    <Button type="submit" variant="outline">
                      Regenerate page token
                    </Button>
                  </form>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  Automatic from here: user-token extension and page-token regeneration from the current user token.
                  Still manual: system user token creation and any Meta login flow that requires interactive consent.
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
