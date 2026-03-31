import type { AssetValue, Environment } from "@prisma/client";
import { decryptSecret } from "@/lib/security/crypto";

export function getDefaultEnvironmentValues() {
  return {
    label: process.env.DEFAULT_ENV_LABEL ?? "Default",
    graphApiVersion: process.env.META_GRAPH_API_VERSION ?? "v25.0",
    appId: process.env.META_APP_ID ?? "",
    appSecret: process.env.META_APP_SECRET ?? "",
    userAccessToken: process.env.META_USER_ACCESS_TOKEN ?? "",
    pageAccessToken: process.env.META_PAGE_ACCESS_TOKEN ?? "",
    systemUserToken: process.env.META_SYSTEM_USER_TOKEN ?? "",
    defaultBusinessId: process.env.META_DEFAULT_BUSINESS_ID ?? "",
    defaultPageId: process.env.META_DEFAULT_PAGE_ID ?? "",
    defaultInstagramUserId: process.env.META_DEFAULT_IG_USER_ID ?? ""
  };
}

export function getEffectiveEnvironmentValues(
  environment?: (Environment & { assets?: AssetValue[] }) | null
) {
  const defaults = getDefaultEnvironmentValues();

  return {
    id: environment?.id ?? "env-defaults",
    label: environment?.label || defaults.label,
    slug: environment?.slug ?? "env-defaults",
    graphApiVersion: environment?.graphApiVersion || defaults.graphApiVersion,
    appId: environment?.appId || defaults.appId,
    appSecret: decryptSecret(environment?.encryptedAppSecret) || defaults.appSecret || "",
    userAccessToken: decryptSecret(environment?.encryptedUserAccessToken) || defaults.userAccessToken || "",
    pageAccessToken: decryptSecret(environment?.encryptedPageAccessToken) || defaults.pageAccessToken || "",
    systemUserToken: decryptSecret(environment?.encryptedSystemUserToken) || defaults.systemUserToken || "",
    defaultBusinessId: environment?.defaultBusinessId || defaults.defaultBusinessId || "",
    defaultPageId: environment?.defaultPageId || defaults.defaultPageId || "",
    defaultInstagramUserId: environment?.defaultInstagramUserId || defaults.defaultInstagramUserId || "",
    notes: environment?.notes ?? "",
    isDefault: environment?.isDefault ?? false,
    assets: environment?.assets ?? []
  };
}
