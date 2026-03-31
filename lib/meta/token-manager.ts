import { AssetSource, AssetType, HttpMethod, type Environment, type AssetValue } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { MetaGraphClient } from "@/lib/meta/client";
import { encryptSecret } from "@/lib/security/crypto";
import { getEffectiveEnvironmentValues } from "@/lib/security/env";

const client = new MetaGraphClient();

type EnvironmentWithAssets = Environment & { assets: AssetValue[] };

export type TokenStatus = {
  tokenType: "user" | "page" | "system_user";
  configured: boolean;
  valid: boolean | null;
  message: string;
  metadata?: Record<string, unknown>;
};

export async function extendUserAccessToken(environmentId: string) {
  const environment = await getEnvironment(environmentId);
  const effective = getEffectiveEnvironmentValues(environment);

  if (!effective.appId || !effective.appSecret) {
    throw new Error("App ID and app secret are required to extend the user token.");
  }

  if (!effective.userAccessToken) {
    throw new Error("A user access token is required before it can be extended.");
  }

  const url = new URL("https://graph.facebook.com/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", effective.appId);
  url.searchParams.set("client_secret", effective.appSecret);
  url.searchParams.set("fb_exchange_token", effective.userAccessToken);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload?.error?.message ?? "Meta did not return an extended user token.");
  }

  await prisma.environment.update({
    where: { id: environmentId },
    data: {
      encryptedUserAccessToken: encryptSecret(String(payload.access_token))
    }
  });

  return {
    expiresIn: payload.expires_in ?? null
  };
}

export async function regeneratePageAccessToken(environmentId: string) {
  const environment = await getEnvironment(environmentId);
  const effective = getEffectiveEnvironmentValues(environment);

  if (!effective.userAccessToken) {
    throw new Error("A valid user access token is required to regenerate the page token.");
  }

  const result = await client.request<{ data?: Array<Record<string, unknown>> }>({
    apiVersion: effective.graphApiVersion,
    accessToken: effective.userAccessToken,
    endpoint: "me/accounts",
    method: HttpMethod.GET,
    params: {
      fields: "id,name,access_token,instagram_business_account{id,username}"
    }
  });

  if (!result.ok || !result.data?.data) {
    throw new Error(result.error?.message ?? "Unable to fetch pages from /me/accounts.");
  }

  const preferredPageId =
    effective.defaultPageId || environment.assets.find((asset) => asset.type === AssetType.PAGE_ID)?.value;

  const page =
    result.data.data.find((entry) => String(entry.id) === preferredPageId) ??
    result.data.data[0];

  if (!page?.access_token) {
    throw new Error("No page access token was returned. Check page permissions and page access.");
  }

  await prisma.environment.update({
    where: { id: environmentId },
    data: {
      encryptedPageAccessToken: encryptSecret(String(page.access_token)),
      defaultPageId: effective.defaultPageId || String(page.id)
    }
  });

  await upsertDiscoveredAsset(environmentId, AssetType.PAGE_ID, String(page.id), String(page.name ?? "Discovered Page"));

  const ig = page.instagram_business_account as Record<string, unknown> | undefined;
  if (ig?.id) {
    await prisma.environment.update({
      where: { id: environmentId },
      data: {
        defaultInstagramUserId: effective.defaultInstagramUserId || String(ig.id)
      }
    });
    await upsertDiscoveredAsset(
      environmentId,
      AssetType.INSTAGRAM_USER_ID,
      String(ig.id),
      String(ig.username ?? "Linked IG Account")
    );
  }

  return {
    pageId: String(page.id),
    pageName: String(page.name ?? "Page")
  };
}

export async function getEnvironmentTokenStatuses(environmentId: string): Promise<TokenStatus[]> {
  const environment = await getEnvironment(environmentId);
  const effective = getEffectiveEnvironmentValues(environment);

  const appToken =
    effective.appId && effective.appSecret ? `${effective.appId}|${effective.appSecret}` : null;

  const statuses: TokenStatus[] = [];

  statuses.push(await inspectToken("user", effective.userAccessToken, effective.graphApiVersion, appToken));
  statuses.push(await inspectToken("page", effective.pageAccessToken, effective.graphApiVersion, appToken));
  statuses.push(await inspectToken("system_user", effective.systemUserToken, effective.graphApiVersion, appToken));

  return statuses;
}

async function inspectToken(
  tokenType: TokenStatus["tokenType"],
  token: string,
  graphApiVersion: string,
  appToken: string | null
): Promise<TokenStatus> {
  if (!token) {
    return {
      tokenType,
      configured: false,
      valid: null,
      message: "Not configured"
    };
  }

  if (tokenType === "system_user" && /^\d+$/.test(token)) {
    return {
      tokenType,
      configured: true,
      valid: false,
      message: "This looks like an ID, not a system user access token."
    };
  }

  if (!appToken) {
    return {
      tokenType,
      configured: true,
      valid: null,
      message: "Set app secret to validate this token from inside the app."
    };
  }

  const result = await client.request<{ data?: Record<string, unknown> }>({
    apiVersion: graphApiVersion,
    accessToken: appToken,
    endpoint: "debug_token",
    method: HttpMethod.GET,
    params: {
      input_token: token
    }
  });

  if (!result.ok || !result.data?.data) {
    return {
      tokenType,
      configured: true,
      valid: false,
      message: result.error?.message ?? "Unable to validate token.",
      metadata: result.error ? { error: result.error } : undefined
    };
  }

  const data = result.data.data;
  const valid = Boolean(data.is_valid);
  const expiresAt = typeof data.expires_at === "number" ? new Date(data.expires_at * 1000) : null;
  const scopes = Array.isArray(data.scopes) ? data.scopes : [];

  return {
    tokenType,
    configured: true,
    valid,
    message: valid
      ? expiresAt
        ? `Valid${Number.isFinite(expiresAt.getTime()) ? ` until ${expiresAt.toLocaleString("en-US")}` : ""}`
        : "Valid"
      : "Invalid or expired",
    metadata: {
      appId: data.app_id,
      type: data.type,
      expiresAt: expiresAt?.toISOString(),
      scopes
    }
  };
}

async function getEnvironment(environmentId: string) {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
    include: { assets: true }
  });

  if (!environment) {
    throw new Error("Environment not found");
  }

  return environment;
}

async function upsertDiscoveredAsset(
  environmentId: string,
  type: AssetType,
  value: string,
  label?: string
) {
  await prisma.assetValue.upsert({
    where: {
      environmentId_type_value: {
        environmentId,
        type,
        value
      }
    },
    update: {
      label,
      source: AssetSource.DISCOVERED,
      lastVerifiedAt: new Date()
    },
    create: {
      environmentId,
      type,
      value,
      label,
      source: AssetSource.DISCOVERED,
      lastVerifiedAt: new Date()
    }
  });
}
