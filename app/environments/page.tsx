import { getEnvironmentContext } from "@/lib/db/context";
import { prisma } from "@/lib/db/prisma";
import { cloneEnvironmentAction, extendUserTokenAction, getDecryptedEnvironmentValues, loadEnvDefaultsAction, regeneratePageTokenAction, saveEnvironmentAction } from "@/lib/actions";
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
        description="Create separate Dev, Review, and Production Test configurations. Tokens stay encrypted server-side and can be loaded from env defaults for quick bootstrap."
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>{selectedEnvironment ? "Edit environment" : "Create your first environment"}</CardTitle>
            <CardDescription>Use this form to securely store your Graph version, app credentials, tokens, IDs, and notes.</CardDescription>
          </CardHeader>
          <CardContent>
            {tokenUpdated ? (
              <div className="mb-4 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
                {tokenUpdated === "user"
                  ? "User token updated successfully."
                  : tokenUpdated === "page"
                    ? "Page token regenerated successfully."
                    : "Token updated successfully."}
              </div>
            ) : null}
            {tokenError ? (
              <div className="mb-4 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
                {tokenError}
              </div>
            ) : null}
            <form action={saveEnvironmentAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="id" defaultValue={selectedEnvironment?.id} />
              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input id="label" name="label" defaultValue={selectedValues?.label ?? ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="graphApiVersion">Graph API version</Label>
                <Input id="graphApiVersion" name="graphApiVersion" defaultValue={selectedValues?.graphApiVersion ?? "v25.0"} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appId">App ID</Label>
                <Input id="appId" name="appId" defaultValue={selectedValues?.appId ?? ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appSecret">App secret</Label>
                <Input id="appSecret" name="appSecret" defaultValue={selectedValues?.appSecret ?? ""} type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userAccessToken">User access token</Label>
                <Textarea id="userAccessToken" name="userAccessToken" defaultValue={selectedValues?.userAccessToken ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pageAccessToken">Page access token</Label>
                <Textarea id="pageAccessToken" name="pageAccessToken" defaultValue={selectedValues?.pageAccessToken ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="systemUserToken">System user token</Label>
                <Textarea id="systemUserToken" name="systemUserToken" defaultValue={selectedValues?.systemUserToken ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" defaultValue={selectedValues?.notes ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultBusinessId">Default business ID</Label>
                <Input id="defaultBusinessId" name="defaultBusinessId" defaultValue={selectedValues?.defaultBusinessId ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultPageId">Default page ID</Label>
                <Input id="defaultPageId" name="defaultPageId" defaultValue={selectedValues?.defaultPageId ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultInstagramUserId">Default Instagram user ID</Label>
                <Input id="defaultInstagramUserId" name="defaultInstagramUserId" defaultValue={selectedValues?.defaultInstagramUserId ?? ""} />
              </div>
              <div className="flex items-end gap-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" name="isDefault" defaultChecked={selectedValues?.isDefault ?? false} />
                  Make default environment
                </label>
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-3">
                <Button type="submit">Save environment</Button>
              </div>
            </form>
            <form action={loadEnvDefaultsAction} className="mt-3">
              <Button type="submit" variant="outline">Load from env defaults</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {selectedEnvironment ? (
            <Card>
              <CardHeader>
                <CardTitle>Token management</CardTitle>
                <CardDescription>
                  Extend the user token inside the app, regenerate the page token from `/me/accounts`, and validate what the app can actually use right now.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {tokenStatuses.map((status) => (
                    <div key={status.tokenType} className="rounded-xl border border-border p-4">
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
                        <p className="mt-2 text-xs text-muted-foreground">
                          {JSON.stringify(status.metadata)}
                        </p>
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
                    <Button type="submit" variant="outline">Regenerate page token</Button>
                  </form>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  Automatic from here:
                  user-token extension and page-token regeneration from the current user token.
                  Still manual:
                  system user token creation or any full re-auth flow that requires Meta login consent.
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Saved environments</CardTitle>
              <CardDescription>Pick an environment to edit, clone, or use as the current testing context.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {environments.map((environment) => (
                <div key={environment.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{environment.label}</p>
                      <p className="text-sm text-muted-foreground">{environment.graphApiVersion} • App {environment.appId}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        User {maskSecret(environment.encryptedUserAccessToken)} • Page {maskSecret(environment.encryptedPageAccessToken)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <a href={`/environments?environmentId=${environment.id}`} className="rounded-xl border border-border px-3 py-2 text-sm">
                        Open
                      </a>
                      <form action={cloneEnvironmentAction}>
                        <input type="hidden" name="environmentId" value={environment.id} />
                        <Button type="submit" variant="outline">Clone</Button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit log</CardTitle>
              <CardDescription>Track configuration changes for internal accountability.</CardDescription>
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
                <p className="text-sm text-muted-foreground">Environment changes will appear here after the first save.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
