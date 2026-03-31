"use server";

import { AssetSource, type Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/db/audit";
import { syncBuiltInTests } from "@/lib/meta/catalog";
import { discoverAssets } from "@/lib/meta/discovery";
import { runTestsForEnvironment } from "@/lib/meta/runner";
import { createSessionCookie, verifyAdminPassword, clearSessionCookie } from "@/lib/security/auth";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";
import { getDefaultEnvironmentValues } from "@/lib/security/env";
import { slugify } from "@/lib/utils/format";
import { assetSchema, environmentSchema, testDefinitionSchema } from "@/lib/validation";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!verifyAdminPassword(password)) {
    redirect("/login?error=invalid");
  }

  await createSessionCookie();
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function saveEnvironmentAction(formData: FormData) {
  const parsed = environmentSchema.parse({
    id: optionalString(formData.get("id")),
    label: formData.get("label"),
    graphApiVersion: formData.get("graphApiVersion"),
    appId: formData.get("appId"),
    appSecret: optionalString(formData.get("appSecret")),
    userAccessToken: optionalString(formData.get("userAccessToken")),
    pageAccessToken: optionalString(formData.get("pageAccessToken")),
    systemUserToken: optionalString(formData.get("systemUserToken")),
    defaultBusinessId: optionalString(formData.get("defaultBusinessId")),
    defaultPageId: optionalString(formData.get("defaultPageId")),
    defaultInstagramUserId: optionalString(formData.get("defaultInstagramUserId")),
    notes: optionalString(formData.get("notes")),
    isDefault: formData.get("isDefault") === "on"
  });

  if (parsed.isDefault) {
    await prisma.environment.updateMany({
      data: { isDefault: false }
    });
  }

  const data: Prisma.EnvironmentUncheckedCreateInput = {
    label: parsed.label,
    slug: slugify(parsed.label),
    graphApiVersion: parsed.graphApiVersion,
    appId: parsed.appId,
    encryptedAppSecret: encryptSecret(parsed.appSecret),
    encryptedUserAccessToken: encryptSecret(parsed.userAccessToken),
    encryptedPageAccessToken: encryptSecret(parsed.pageAccessToken),
    encryptedSystemUserToken: encryptSecret(parsed.systemUserToken),
    defaultBusinessId: parsed.defaultBusinessId || null,
    defaultPageId: parsed.defaultPageId || null,
    defaultInstagramUserId: parsed.defaultInstagramUserId || null,
    notes: parsed.notes || null,
    isDefault: parsed.isDefault ?? false
  };

  const environment = parsed.id
    ? await prisma.environment.update({
        where: { id: parsed.id },
        data
      })
    : await prisma.environment.create({
        data
      });

  await logAudit({
    action: parsed.id ? "update_environment" : "create_environment",
    entityType: "Environment",
    entityId: environment.id,
    environmentId: environment.id,
    summary: `${parsed.id ? "Updated" : "Created"} environment ${environment.label}`
  });

  revalidatePath("/dashboard");
  revalidatePath("/environments");
  redirect(`/environments?environmentId=${environment.id}`);
}

export async function cloneEnvironmentAction(formData: FormData) {
  const environmentId = String(formData.get("environmentId"));
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
    include: { assets: true }
  });
  if (!environment) throw new Error("Environment not found");

  const clone = await prisma.environment.create({
    data: {
      label: `${environment.label} Copy`,
      slug: slugify(`${environment.label}-copy-${Date.now()}`),
      graphApiVersion: environment.graphApiVersion,
      appId: environment.appId,
      encryptedAppSecret: environment.encryptedAppSecret,
      encryptedUserAccessToken: environment.encryptedUserAccessToken,
      encryptedPageAccessToken: environment.encryptedPageAccessToken,
      encryptedSystemUserToken: environment.encryptedSystemUserToken,
      defaultBusinessId: environment.defaultBusinessId,
      defaultPageId: environment.defaultPageId,
      defaultInstagramUserId: environment.defaultInstagramUserId,
      notes: environment.notes
    }
  });

  for (const asset of environment.assets) {
    await prisma.assetValue.create({
      data: {
        environmentId: clone.id,
        type: asset.type,
        value: asset.value,
        label: asset.label,
        source: asset.source,
        metadata: asset.metadata ?? undefined
      }
    });
  }

  await logAudit({
    action: "clone_environment",
    entityType: "Environment",
    entityId: clone.id,
    environmentId: clone.id,
    summary: `Cloned ${environment.label} into ${clone.label}`
  });

  revalidatePath("/environments");
  redirect(`/environments?environmentId=${clone.id}`);
}

export async function saveAssetAction(formData: FormData) {
  const parsed = assetSchema.parse({
    environmentId: formData.get("environmentId"),
    type: formData.get("type"),
    value: formData.get("value"),
    label: optionalString(formData.get("label"))
  });

  await prisma.assetValue.create({
    data: {
      environmentId: parsed.environmentId,
      type: parsed.type,
      value: parsed.value,
      label: parsed.label || null,
      source: AssetSource.MANUAL
    }
  });

  await logAudit({
    action: "save_asset",
    entityType: "AssetValue",
    environmentId: parsed.environmentId,
    summary: `Saved ${parsed.type} value`
  });

  revalidatePath("/assets");
  redirect(`/assets?environmentId=${parsed.environmentId}`);
}

export async function runDiscoveryAction(formData: FormData) {
  const environmentId = String(formData.get("environmentId"));
  await discoverAssets(environmentId);
  await logAudit({
    action: "discover_assets",
    entityType: "AssetDiscovery",
    environmentId,
    summary: "Ran Graph-based asset discovery"
  });
  revalidatePath("/assets");
  revalidatePath("/dashboard");
  redirect(`/assets?environmentId=${environmentId}&discovered=1`);
}

export async function runTestsAction(formData: FormData) {
  const environmentId = String(formData.get("environmentId"));
  const mode = String(formData.get("mode")) as "single" | "category" | "pack" | "all";
  const value = optionalString(formData.get("value"));
  const pacingMs = Number(formData.get("pacingMs") || 0);
  const retryCount = Number(formData.get("retryCount") || 0);
  const notes = optionalString(formData.get("notes"));

  const runId = await runTestsForEnvironment({
    environmentId,
    selection:
      mode === "single"
        ? { mode, testKey: value ?? "" }
        : mode === "category"
          ? { mode, category: value ?? "" }
          : mode === "pack"
            ? { mode, packKey: value ?? "" }
            : { mode: "all" },
    pacingMs,
    retryCount,
    notes: notes ?? undefined
  });

  await logAudit({
    action: "run_tests",
    entityType: "TestRun",
    entityId: runId,
    environmentId,
    summary: `Started ${mode} run`
  });

  revalidatePath("/dashboard");
  revalidatePath("/runs");
  revalidatePath("/review-pack");
  redirect(`/runs?runId=${runId}`);
}

export async function saveTestDefinitionAction(formData: FormData) {
  const parsed = testDefinitionSchema.parse({
    id: optionalString(formData.get("id")),
    key: formData.get("key"),
    displayName: formData.get("displayName"),
    category: formData.get("category"),
    description: formData.get("description"),
    requiredPermissions: String(formData.get("requiredPermissions") ?? ""),
    tokenType: formData.get("tokenType"),
    method: formData.get("method"),
    endpointTemplate: formData.get("endpointTemplate"),
    queryParams: optionalString(formData.get("queryParams")),
    requestBody: optionalString(formData.get("requestBody")),
    dependencies: formData.get("dependencies"),
    expectedRules: formData.get("expectedRules"),
    safeToAutoRun: formData.get("safeToAutoRun") === "on",
    appearsInReviewPack: formData.get("appearsInReviewPack") === "on",
    troubleshootingNotes: optionalString(formData.get("troubleshootingNotes")),
    packKeys: String(formData.get("packKeys") ?? ""),
    isActive: formData.get("isActive") === "on"
  });

  const payload = {
    key: parsed.key,
    displayName: parsed.displayName,
    category: parsed.category,
    description: parsed.description,
    requiredPermissions: csvToArray(parsed.requiredPermissions),
    tokenType: parsed.tokenType,
    method: parsed.method,
    endpointTemplate: parsed.endpointTemplate,
    queryParams: parseJsonOrNull(parsed.queryParams),
    requestBody: parseJsonOrNull(parsed.requestBody),
    dependencies: JSON.parse(parsed.dependencies),
    expectedRules: JSON.parse(parsed.expectedRules),
    safeToAutoRun: parsed.safeToAutoRun ?? false,
    appearsInReviewPack: parsed.appearsInReviewPack ?? false,
    troubleshootingNotes: parsed.troubleshootingNotes || null,
    packKeys: csvToArray(parsed.packKeys),
    isActive: parsed.isActive ?? false
  };

  await prisma.testDefinition.upsert({
    where: { key: parsed.key },
    create: payload,
    update: payload
  });

  revalidatePath("/tests");
  redirect("/tests?saved=1");
}

export async function syncCatalogAction() {
  await syncBuiltInTests();
  revalidatePath("/tests");
  redirect("/tests?catalog=1");
}

export async function loadEnvDefaultsAction() {
  const defaults = getDefaultEnvironmentValues();
  const existing = await prisma.environment.findFirst({
    where: { isDefault: true }
  });

  if (existing) {
    redirect(`/environments?environmentId=${existing.id}`);
  }

  const environment = await prisma.environment.create({
    data: {
      label: defaults.label,
      slug: slugify(defaults.label),
      graphApiVersion: defaults.graphApiVersion,
      appId: defaults.appId,
      encryptedAppSecret: encryptSecret(defaults.appSecret),
      encryptedUserAccessToken: encryptSecret(defaults.userAccessToken),
      encryptedPageAccessToken: encryptSecret(defaults.pageAccessToken),
      encryptedSystemUserToken: encryptSecret(defaults.systemUserToken),
      defaultBusinessId: defaults.defaultBusinessId || null,
      defaultPageId: defaults.defaultPageId || null,
      defaultInstagramUserId: defaults.defaultInstagramUserId || null,
      isDefault: true
    }
  });

  revalidatePath("/environments");
  redirect(`/environments?environmentId=${environment.id}`);
}

export async function getDecryptedEnvironmentValues(environmentId: string) {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId }
  });
  if (!environment) return null;
  return {
    ...environment,
    appSecret: decryptSecret(environment.encryptedAppSecret),
    userAccessToken: decryptSecret(environment.encryptedUserAccessToken),
    pageAccessToken: decryptSecret(environment.encryptedPageAccessToken),
    systemUserToken: decryptSecret(environment.encryptedSystemUserToken)
  };
}

function optionalString(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function csvToArray(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseJsonOrNull(value?: string) {
  if (!value) return null;
  return JSON.parse(value);
}
