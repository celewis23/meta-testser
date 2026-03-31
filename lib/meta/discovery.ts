import { AssetSource, AssetType, HttpMethod, TokenType, type Environment, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { MetaGraphClient } from "@/lib/meta/client";
import { decryptSecret } from "@/lib/security/crypto";

const client = new MetaGraphClient();

export async function discoverAssets(environmentId: string) {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
    include: { assets: true }
  });

  if (!environment) {
    throw new Error("Environment not found");
  }

  const discoveries: Array<{
    type: AssetType;
    value: string;
    label?: string;
    metadata?: Record<string, unknown>;
  }> = [];

  const userToken = decryptSecret(environment.encryptedUserAccessToken);
  const pageToken = decryptSecret(environment.encryptedPageAccessToken);
  const systemUserToken = decryptSecret(environment.encryptedSystemUserToken);

  if (userToken) {
    const pages = await client.request<{ data?: Array<Record<string, unknown>> }>({
      apiVersion: environment.graphApiVersion,
      accessToken: userToken,
      endpoint: "me/accounts",
      method: HttpMethod.GET,
      params: {
        fields: "id,name,instagram_business_account{id,username}"
      }
    });

    for (const page of pages.data?.data ?? []) {
      if (page.id) {
        discoveries.push({
          type: AssetType.PAGE_ID,
          value: String(page.id),
          label: String(page.name ?? "Discovered Page"),
          metadata: page
        });
      }
      const ig = page.instagram_business_account as Record<string, unknown> | undefined;
      if (ig?.id) {
        discoveries.push({
          type: AssetType.INSTAGRAM_USER_ID,
          value: String(ig.id),
          label: String(ig.username ?? "Linked IG Account"),
          metadata: ig
        });
      }
    }
  }

  const pageId =
    environment.defaultPageId ??
    environment.assets.find((asset) => asset.type === AssetType.PAGE_ID)?.value;

  if (pageId && pageToken) {
    const pageDetails = await client.request<Record<string, unknown>>({
      apiVersion: environment.graphApiVersion,
      accessToken: pageToken,
      endpoint: pageId,
      method: HttpMethod.GET,
      params: {
        fields: "instagram_business_account{id,username,profile_picture_url}"
      }
    });

    const ig = (pageDetails.data?.instagram_business_account ?? null) as
      | Record<string, unknown>
      | null;

    if (ig?.id) {
      discoveries.push({
        type: AssetType.INSTAGRAM_USER_ID,
        value: String(ig.id),
        label: String(ig.username ?? "Linked IG Account"),
        metadata: ig
      });
    }
  }

  const businessId =
    environment.defaultBusinessId ??
    environment.assets.find((asset) => asset.type === AssetType.BUSINESS_ID)?.value;

  if (businessId && systemUserToken) {
    const businessPages = await client.request<{ data?: Array<Record<string, unknown>> }>({
      apiVersion: environment.graphApiVersion,
      accessToken: systemUserToken,
      endpoint: `${businessId}/owned_pages`,
      method: HttpMethod.GET,
      params: {
        fields: "id,name,instagram_business_account{id,username}"
      }
    });

    for (const page of businessPages.data?.data ?? []) {
      if (page.id) {
        discoveries.push({
          type: AssetType.PAGE_ID,
          value: String(page.id),
          label: String(page.name ?? "Business Page"),
          metadata: page
        });
      }
      const ig = page.instagram_business_account as Record<string, unknown> | undefined;
      if (ig?.id) {
        discoveries.push({
          type: AssetType.INSTAGRAM_USER_ID,
          value: String(ig.id),
          label: String(ig.username ?? "Business IG Account"),
          metadata: ig
        });
      }
    }
  }

  for (const asset of discoveries) {
    await prisma.assetValue.upsert({
      where: {
        environmentId_type_value: {
          environmentId,
          type: asset.type,
          value: asset.value
        }
      },
      update: {
        label: asset.label,
        source: AssetSource.DISCOVERED,
        metadata: (asset.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        lastVerifiedAt: new Date()
      },
      create: {
        environmentId,
        type: asset.type,
        value: asset.value,
        label: asset.label,
        source: AssetSource.DISCOVERED,
        metadata: (asset.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        lastVerifiedAt: new Date()
      }
    });
  }

  return discoveries;
}

export function tokenHealth(environment: Environment) {
  return [
    {
      tokenType: TokenType.USER,
      configured: Boolean(environment.encryptedUserAccessToken)
    },
    {
      tokenType: TokenType.PAGE,
      configured: Boolean(environment.encryptedPageAccessToken)
    },
    {
      tokenType: TokenType.SYSTEM_USER,
      configured: Boolean(environment.encryptedSystemUserToken)
    }
  ];
}
