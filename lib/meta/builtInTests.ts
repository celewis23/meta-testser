import { HttpMethod, TokenType } from "@prisma/client";
import type { BuiltInTestDefinition } from "@/types/meta";

export const builtInTests: BuiltInTestDefinition[] = [
  {
    key: "get_user_permissions",
    displayName: "Get user permissions",
    category: "permissions",
    description: "Reads the current user token permissions for readiness analysis.",
    requiredPermissions: [],
    tokenType: TokenType.USER,
    method: HttpMethod.GET,
    endpointTemplate: "me/permissions",
    queryParams: { fields: "permission,status" },
    dependencies: [],
    expectedRules: [{ type: "array_nonempty", field: "data" }],
    safeToAutoRun: true,
    appearsInReviewPack: true,
    packKeys: ["readiness", "pages_show_list"]
  },
  {
    key: "get_pages_via_me_accounts",
    displayName: "Get pages via /me/accounts",
    category: "discovery",
    description: "Discovers Facebook Pages available to the current user token.",
    requiredPermissions: ["pages_show_list"],
    tokenType: TokenType.USER,
    method: HttpMethod.GET,
    endpointTemplate: "me/accounts",
    queryParams: { fields: "id,name,access_token,instagram_business_account{id,username}" },
    dependencies: [],
    expectedRules: [{ type: "array_nonempty", field: "data" }],
    safeToAutoRun: true,
    appearsInReviewPack: true,
    packKeys: ["pages_show_list", "discovery"]
  },
  {
    key: "get_page_details",
    displayName: "Get page details",
    category: "pages",
    description: "Checks page access and pulls page metadata used by review evidence.",
    requiredPermissions: ["pages_show_list", "pages_read_engagement"],
    tokenType: TokenType.PAGE,
    method: HttpMethod.GET,
    endpointTemplate: "{pageId}",
    queryParams: { fields: "id,name,link,fan_count,followers_count" },
    dependencies: [
      {
        key: "pageId",
        label: "Facebook Page ID",
        required: true,
        remediation: "Paste a Page ID or discover one via /me/accounts first."
      }
    ],
    expectedRules: [{ type: "field_exists", field: "id" }],
    safeToAutoRun: true,
    appearsInReviewPack: true,
    packKeys: ["pages_read_engagement", "pages_show_list"]
  },
  {
    key: "get_page_instagram_business_account",
    displayName: "Get page instagram_business_account",
    category: "discovery",
    description: "Finds the linked Instagram professional account from a Facebook Page.",
    requiredPermissions: ["pages_show_list", "pages_read_engagement", "instagram_basic"],
    tokenType: TokenType.PAGE,
    method: HttpMethod.GET,
    endpointTemplate: "{pageId}",
    queryParams: { fields: "instagram_business_account{id,username,profile_picture_url}" },
    dependencies: [
      {
        key: "pageId",
        label: "Facebook Page ID",
        required: true,
        remediation: "Provide a Page ID so the lab can look for the linked Instagram professional account."
      }
    ],
    expectedRules: [{ type: "field_exists", field: "instagram_business_account.id" }],
    safeToAutoRun: true,
    appearsInReviewPack: true,
    packKeys: ["instagram_basic", "discovery"]
  },
  {
    key: "get_ig_user_basic_profile",
    displayName: "Get IG user basic profile",
    category: "instagram",
    description: "Reads Instagram Business account profile fields.",
    requiredPermissions: ["instagram_basic"],
    tokenType: TokenType.PAGE,
    method: HttpMethod.GET,
    endpointTemplate: "{igUserId}",
    queryParams: { fields: "id,username,biography,followers_count,follows_count,media_count,profile_picture_url" },
    dependencies: [
      {
        key: "igUserId",
        label: "Instagram User ID",
        required: true,
        remediation: "Discover the Instagram user from the linked Page first."
      }
    ],
    expectedRules: [{ type: "field_exists", field: "username" }],
    safeToAutoRun: true,
    appearsInReviewPack: true,
    packKeys: ["instagram_basic"]
  },
  {
    key: "get_ig_media_list",
    displayName: "Get IG media list",
    category: "instagram",
    description: "Reads Instagram media items to prove media read access.",
    requiredPermissions: ["instagram_basic"],
    tokenType: TokenType.PAGE,
    method: HttpMethod.GET,
    endpointTemplate: "{igUserId}/media",
    queryParams: { fields: "id,caption,media_type,media_url,permalink,timestamp" },
    dependencies: [
      {
        key: "igUserId",
        label: "Instagram User ID",
        required: true,
        remediation: "Discover or paste an Instagram professional account ID."
      }
    ],
    expectedRules: [{ type: "array_nonempty", field: "data" }],
    safeToAutoRun: true,
    appearsInReviewPack: true,
    packKeys: ["instagram_basic"]
  },
  {
    key: "get_page_conversations_instagram",
    displayName: "Get page conversations for Instagram",
    category: "messaging",
    description: "Reads Page conversations for Instagram messaging review flows.",
    requiredPermissions: ["instagram_manage_messages", "pages_manage_metadata"],
    tokenType: TokenType.PAGE,
    method: HttpMethod.GET,
    endpointTemplate: "{pageId}/conversations",
    queryParams: { platform: "instagram", fields: "id,updated_time,link" },
    dependencies: [
      {
        key: "pageId",
        label: "Facebook Page ID",
        required: true,
        remediation: "Use a Page that is linked to the Instagram professional account."
      }
    ],
    expectedRules: [{ type: "field_exists", field: "data" }],
    safeToAutoRun: false,
    appearsInReviewPack: true,
    packKeys: ["instagram_manage_messages"]
  },
  {
    key: "get_business_owned_pages",
    displayName: "Get business pages",
    category: "business",
    description: "Reads Pages connected to a business manager using the business pages edge.",
    requiredPermissions: ["business_management"],
    tokenType: TokenType.SYSTEM_USER,
    method: HttpMethod.GET,
    endpointTemplate: "{businessId}/client_pages",
    queryParams: { fields: "id,name,instagram_business_account{id,username}" },
    dependencies: [
      {
        key: "businessId",
        label: "Business ID",
        required: true,
        remediation: "Paste a Business ID before running business discovery tests."
      }
    ],
    expectedRules: [{ type: "field_exists", field: "data" }],
    safeToAutoRun: false,
    appearsInReviewPack: false,
    isActive: false,
    troubleshootingNotes:
      "Disabled by default until the current Meta business pages edge is re-verified against live documentation and a valid business-capable token.",
    packKeys: ["business_management", "discovery"]
  },
  {
    key: "get_business_instagram_accounts",
    displayName: "Get business linked Instagram accounts via business pages",
    category: "business",
    description: "Finds Instagram accounts linked to business pages using the business pages edge.",
    requiredPermissions: ["business_management"],
    tokenType: TokenType.SYSTEM_USER,
    method: HttpMethod.GET,
    endpointTemplate: "{businessId}/client_pages",
    queryParams: { fields: "id,name,instagram_business_account{id,username,profile_picture_url}" },
    dependencies: [
      {
        key: "businessId",
        label: "Business ID",
        required: true,
        remediation: "Paste a Business ID before testing business-linked Instagram assets."
      }
    ],
    expectedRules: [{ type: "array_nonempty", field: "data" }],
    safeToAutoRun: false,
    appearsInReviewPack: false,
    isActive: false,
    troubleshootingNotes:
      "Disabled by default until the current Meta business-linked Instagram discovery path is re-verified against live documentation and a valid business-capable token.",
    packKeys: ["business_management", "discovery"]
  },
  {
    key: "get_comment_details",
    displayName: "Get IG comment details",
    category: "comments",
    description: "Reads comment metadata for instagram_manage_comments evidence.",
    requiredPermissions: ["instagram_manage_comments"],
    tokenType: TokenType.PAGE,
    method: HttpMethod.GET,
    endpointTemplate: "{commentId}",
    queryParams: { fields: "id,timestamp" },
    dependencies: [
      {
        key: "commentId",
        label: "Comment ID",
        required: true,
        remediation: "Provide a Comment ID from an Instagram media item before running comment tests."
      }
    ],
    expectedRules: [{ type: "field_exists", field: "id" }],
    safeToAutoRun: false,
    appearsInReviewPack: true,
    packKeys: ["instagram_manage_comments"]
  }
];
