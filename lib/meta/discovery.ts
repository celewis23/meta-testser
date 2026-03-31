import { AssetSource, AssetType, HttpMethod, TokenType, type Environment, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { MetaGraphClient } from "@/lib/meta/client";
import { getEffectiveEnvironmentValues } from "@/lib/security/env";

const client = new MetaGraphClient();

export async function discoverAssets(environmentId: string) {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
    include: { assets: true }
  });

  if (!environment) {
    throw new Error("Environment not found");
  }
  const effective = getEffectiveEnvironmentValues(environment);

  const discoveries: Array<{
    type: AssetType;
    value: string;
    label?: string;
    metadata?: Record<string, unknown>;
  }> = [];

  const userToken = effective.userAccessToken;
  const pageToken = effective.pageAccessToken;
  const systemUserToken = effective.systemUserToken;

  if (userToken) {
    const me = await client.request<Record<string, unknown>>({
      apiVersion: effective.graphApiVersion,
      accessToken: userToken,
      endpoint: "me",
      method: HttpMethod.GET,
      params: {
        fields: "id,name"
      }
    });

    if (me.data?.id) {
      discoveries.push({
        type: AssetType.FACEBOOK_USER_ID,
        value: String(me.data.id),
        label: String(me.data.name ?? "Current User"),
        metadata: me.data
      });
    }
  }

  if (userToken) {
    const pages = await client.request<{ data?: Array<Record<string, unknown>> }>({
      apiVersion: effective.graphApiVersion,
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

  const pageId = effective.defaultPageId || environment.assets.find((asset) => asset.type === AssetType.PAGE_ID)?.value;

  if (pageId && pageToken) {
    const pageDetails = await client.request<Record<string, unknown>>({
      apiVersion: effective.graphApiVersion,
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

    const conversations = await client.request<{ data?: Array<Record<string, unknown>> }>({
      apiVersion: effective.graphApiVersion,
      accessToken: pageToken,
      endpoint: `${pageId}/conversations`,
      method: HttpMethod.GET,
      params: {
        platform: "instagram",
        fields: "id,updated_time",
        limit: "10"
      }
    });

    for (const conversation of conversations.data?.data ?? []) {
      if (conversation.id) {
        discoveries.push({
          type: AssetType.CONVERSATION_ID,
          value: String(conversation.id),
          label: "Instagram conversation",
          metadata: conversation
        });
      }
    }
  }

  const businessId = effective.defaultBusinessId || environment.assets.find((asset) => asset.type === AssetType.BUSINESS_ID)?.value;

  if (businessId && systemUserToken) {
    const businessPages = await client.request<{ data?: Array<Record<string, unknown>> }>({
      apiVersion: effective.graphApiVersion,
      accessToken: systemUserToken,
      endpoint: `${businessId}/client_pages`,
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

  const igUserId =
    effective.defaultInstagramUserId ??
    discoveries.find((asset) => asset.type === AssetType.INSTAGRAM_USER_ID)?.value ??
    environment.assets.find((asset) => asset.type === AssetType.INSTAGRAM_USER_ID)?.value;

  if (igUserId && pageToken) {
    const media = await client.request<{ data?: Array<Record<string, unknown>> }>({
      apiVersion: effective.graphApiVersion,
      accessToken: pageToken,
      endpoint: `${igUserId}/media`,
      method: HttpMethod.GET,
      params: {
        fields: "id,caption,media_type,timestamp,permalink",
        limit: "10"
      }
    });

    for (const item of media.data?.data ?? []) {
      if (item.id) {
        discoveries.push({
          type: AssetType.MEDIA_ID,
          value: String(item.id),
          label: String(item.media_type ?? "Media"),
          metadata: item
        });
      }
    }

    const mediaIds = media.data?.data?.map((item) => String(item.id)).filter(Boolean) ?? [];
    for (const mediaId of mediaIds.slice(0, 3)) {
      const comments = await client.request<{ data?: Array<Record<string, unknown>> }>({
        apiVersion: effective.graphApiVersion,
        accessToken: pageToken,
        endpoint: `${mediaId}/comments`,
        method: HttpMethod.GET,
        params: {
          fields: "id,timestamp",
          limit: "10"
        }
      });

      for (const comment of comments.data?.data ?? []) {
        if (comment.id) {
          discoveries.push({
            type: AssetType.COMMENT_ID,
            value: String(comment.id),
            label: "Comment",
            metadata: comment
          });
        }
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
  const effective = getEffectiveEnvironmentValues(environment);
  return [
    {
      tokenType: TokenType.USER,
      configured: Boolean(effective.userAccessToken)
    },
    {
      tokenType: TokenType.PAGE,
      configured: Boolean(effective.pageAccessToken)
    },
    {
      tokenType: TokenType.SYSTEM_USER,
      configured: Boolean(effective.systemUserToken)
    }
  ];
}
