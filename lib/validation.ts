import { AssetType, HttpMethod, TokenType } from "@prisma/client";
import { z } from "zod";

export const environmentSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(2),
  graphApiVersion: z.string().min(2),
  appId: z.string().min(2),
  appSecret: z.string().optional().or(z.literal("")),
  userAccessToken: z.string().optional().or(z.literal("")),
  pageAccessToken: z.string().optional().or(z.literal("")),
  systemUserToken: z.string().optional().or(z.literal("")),
  defaultBusinessId: z.string().optional().or(z.literal("")),
  defaultPageId: z.string().optional().or(z.literal("")),
  defaultInstagramUserId: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  isDefault: z.boolean().optional()
});

export const assetSchema = z.object({
  environmentId: z.string(),
  type: z.nativeEnum(AssetType),
  value: z.string().min(1),
  label: z.string().optional().or(z.literal(""))
});

export const testDefinitionSchema = z.object({
  id: z.string().optional(),
  key: z.string().min(3),
  displayName: z.string().min(3),
  category: z.string().min(2),
  description: z.string().min(3),
  requiredPermissions: z.string().min(0),
  tokenType: z.nativeEnum(TokenType),
  method: z.nativeEnum(HttpMethod),
  endpointTemplate: z.string().min(1),
  queryParams: z.string().optional().or(z.literal("")),
  requestBody: z.string().optional().or(z.literal("")),
  dependencies: z.string().min(2),
  expectedRules: z.string().min(2),
  safeToAutoRun: z.boolean().optional(),
  appearsInReviewPack: z.boolean().optional(),
  troubleshootingNotes: z.string().optional().or(z.literal("")),
  packKeys: z.string().min(0),
  isActive: z.boolean().optional()
});
