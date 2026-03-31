import { AssetType } from "@prisma/client";
import { getEnvironmentContext } from "@/lib/db/context";
import { runDiscoveryAction, saveAssetAction } from "@/lib/actions";
import { formatDateTime } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";

const assetOrder: Array<{ type: AssetType; label: string; hint: string }> = [
  { type: AssetType.BUSINESS_ID, label: "Business ID", hint: "Used for business_management discovery." },
  { type: AssetType.FACEBOOK_USER_ID, label: "Facebook User ID", hint: "Helpful for user-scoped debugging." },
  { type: AssetType.PAGE_ID, label: "Facebook Page ID", hint: "Unlocks page and Instagram discovery." },
  { type: AssetType.INSTAGRAM_USER_ID, label: "Instagram User ID", hint: "Can often be derived from the Page ID." },
  { type: AssetType.CONVERSATION_ID, label: "Conversation ID", hint: "Needed for message-related tests." },
  { type: AssetType.MEDIA_ID, label: "Media ID", hint: "Needed for deeper Instagram media flows." },
  { type: AssetType.COMMENT_ID, label: "Comment ID", hint: "Needed for instagram_manage_comments evidence." }
];

export default async function AssetsPage({
  searchParams
}: {
  searchParams: Promise<{ environmentId?: string }>;
}) {
  const { environmentId } = await searchParams;
  const { environments, selectedEnvironment } = await getEnvironmentContext(environmentId);

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Assets"
        title="Manual inputs and Graph-powered discovery"
        description="Start with the IDs you already know, then let the lab derive linked Pages and Instagram users where possible. Missing prerequisites stay explicit instead of failing vaguely."
      />

      <Card>
        <CardHeader>
          <CardTitle>Current environment</CardTitle>
          <CardDescription>Discovery and saved assets are scoped to one environment at a time.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {environments.map((environment) => (
            <a
              key={environment.id}
              href={`/assets?environmentId=${environment.id}`}
              className={`rounded-xl border px-3 py-2 text-sm ${selectedEnvironment?.id === environment.id ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
            >
              {environment.label}
            </a>
          ))}
        </CardContent>
      </Card>

      {selectedEnvironment ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Add asset value</CardTitle>
              <CardDescription>Paste IDs manually when you already know them.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={saveAssetAction} className="space-y-4">
                <input type="hidden" name="environmentId" value={selectedEnvironment.id} />
                <div className="space-y-2">
                  <Label htmlFor="type">Asset type</Label>
                  <Select id="type" name="type" defaultValue={AssetType.PAGE_ID}>
                    {assetOrder.map((asset) => (
                      <option key={asset.type} value={asset.type}>
                        {asset.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">Value</Label>
                  <Input id="value" name="value" placeholder="1784..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="label">Label</Label>
                  <Input id="label" name="label" placeholder="Primary review page" />
                </div>
                <Button type="submit">Save asset</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Discovery actions</CardTitle>
              <CardDescription>One-click flows resolve linked IDs server-side using the current environment tokens.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                If Page ID exists, the lab fetches `instagram_business_account`. If a user token exists, it fetches `me/accounts`. If Business ID exists, it tries business-owned Pages and Instagram accounts.
              </div>
              <form action={runDiscoveryAction}>
                <input type="hidden" name="environmentId" value={selectedEnvironment.id} />
                <Button type="submit">Discover assets</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Create an environment before adding or discovering assets.</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Structured asset panel</CardTitle>
          <CardDescription>Required-first ordering makes it clearer which IDs unlock downstream discovery.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assetOrder.map((asset) => {
            const matches = selectedEnvironment?.assets.filter((value) => value.type === asset.type) ?? [];
            return (
              <div key={asset.type} className="rounded-2xl border border-border p-4">
                <p className="font-semibold">{asset.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{asset.hint}</p>
                <div className="mt-4 space-y-3">
                  {matches.length > 0 ? (
                    matches.map((value) => (
                      <div key={value.id} className="rounded-xl bg-muted/50 p-3">
                        <p className="font-mono text-xs">{value.value}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {value.label || value.source} • {formatDateTime(value.lastVerifiedAt ?? value.updatedAt)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-warning">Missing. Dependent tests will be marked blocked with remediation guidance.</p>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
