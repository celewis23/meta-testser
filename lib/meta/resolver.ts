import { AssetType, type AssetValue, type Environment, TokenType } from "@prisma/client";
import type { DependencyDescriptor, ResolvedTest } from "@/types/meta";

type ResolverInput = {
  environment: Environment & { assets: AssetValue[] };
  endpointTemplate: string;
  dependencies: DependencyDescriptor[];
  queryParams?: Record<string, string> | null;
  requestBody?: Record<string, unknown> | null;
};

const assetTypeMap: Record<string, AssetType> = {
  businessId: AssetType.BUSINESS_ID,
  userId: AssetType.FACEBOOK_USER_ID,
  pageId: AssetType.PAGE_ID,
  igUserId: AssetType.INSTAGRAM_USER_ID,
  conversationId: AssetType.CONVERSATION_ID,
  mediaId: AssetType.MEDIA_ID,
  commentId: AssetType.COMMENT_ID
};

export class DependencyError extends Error {
  constructor(
    message: string,
    public missing: DependencyDescriptor[]
  ) {
    super(message);
  }
}

export function resolveTestPlaceholders(input: ResolverInput): ResolvedTest {
  const values = collectValues(input.environment);
  const missing = input.dependencies.filter((dependency) => dependency.required && !values[dependency.key]);
  if (missing.length > 0) {
    throw new DependencyError("Missing required placeholders", missing);
  }

  const resolveValue = (value: string) =>
    value.replace(/\{([a-zA-Z0-9]+)\}/g, (_, key) => {
      const resolved = values[key];
      if (!resolved) {
        throw new DependencyError("Unresolved placeholder", [
          { key, label: key, required: true, type: assetTypeMap[key] }
        ]);
      }
      return resolved;
    });

  return {
    endpoint: resolveValue(input.endpointTemplate),
    queryParams: Object.fromEntries(
      Object.entries(input.queryParams ?? {}).map(([key, value]) => [key, resolveValue(value)])
    ),
    requestBody: input.requestBody
      ? Object.fromEntries(
          Object.entries(input.requestBody).map(([key, value]) => [
            key,
            typeof value === "string" ? resolveValue(value) : value
          ])
        )
      : undefined,
    values
  };
}

export function getTokenField(environment: Environment, tokenType: TokenType) {
  switch (tokenType) {
    case TokenType.PAGE:
      return environment.encryptedPageAccessToken;
    case TokenType.SYSTEM_USER:
      return environment.encryptedSystemUserToken;
    default:
      return environment.encryptedUserAccessToken;
  }
}

function collectValues(environment: Environment & { assets: AssetValue[] }) {
  const values: Record<string, string> = {};
  if (environment.defaultBusinessId) values.businessId = environment.defaultBusinessId;
  if (environment.defaultPageId) values.pageId = environment.defaultPageId;
  if (environment.defaultInstagramUserId) values.igUserId = environment.defaultInstagramUserId;

  for (const asset of environment.assets) {
    if (asset.type === AssetType.BUSINESS_ID) values.businessId ??= asset.value;
    if (asset.type === AssetType.FACEBOOK_USER_ID) values.userId ??= asset.value;
    if (asset.type === AssetType.PAGE_ID) values.pageId ??= asset.value;
    if (asset.type === AssetType.INSTAGRAM_USER_ID) values.igUserId ??= asset.value;
    if (asset.type === AssetType.CONVERSATION_ID) values.conversationId ??= asset.value;
    if (asset.type === AssetType.MEDIA_ID) values.mediaId ??= asset.value;
    if (asset.type === AssetType.COMMENT_ID) values.commentId ??= asset.value;
  }

  return values;
}
