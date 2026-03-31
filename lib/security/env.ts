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
