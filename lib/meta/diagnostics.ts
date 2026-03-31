import { TestStatus } from "@prisma/client";
import type { ExecutionClassification, GraphError, NormalizedDiagnostic } from "@/types/meta";

export function classifyExecution(params: {
  statusCode?: number | null;
  error?: GraphError | null;
  dependencyError?: boolean;
  expectedSatisfied: boolean;
}): ExecutionClassification {
  const diagnostics: NormalizedDiagnostic[] = [];

  if (params.dependencyError) {
    diagnostics.push({
      code: "missing_dependency",
      summary: "Required IDs or placeholders were not available.",
      likelyFix: "Fill in the missing IDs or run the discovery flow first.",
      severity: "warning"
    });
    return { status: TestStatus.BLOCKED, diagnostics };
  }

  if (!params.error && params.expectedSatisfied) {
    return { status: TestStatus.PASSED, diagnostics };
  }

  if (params.error) {
    diagnostics.push(...diagnoseGraphError(params.error));
    const status =
      params.error.is_transient || (params.statusCode && params.statusCode >= 500)
        ? TestStatus.ERROR
        : TestStatus.FAILED;
    return { status, diagnostics };
  }

  diagnostics.push({
    code: "unexpected_response",
    summary: "The API call completed but the response did not match the expected success shape.",
    likelyFix: "Inspect the JSON payload and adjust IDs, token type, or permissions.",
    severity: "warning"
  });

  return { status: TestStatus.FAILED, diagnostics };
}

export function diagnoseGraphError(error: GraphError): NormalizedDiagnostic[] {
  const message = error.message.toLowerCase();

  if (message.includes("permission")) {
    return [
      {
        code: "missing_permission",
        summary: "The token is missing a required permission.",
        likelyFix: "Grant the permission to the token and rerun the readiness check.",
        severity: "error"
      }
    ];
  }

  if (message.includes("invalid oauth") || message.includes("session")) {
    return [
      {
        code: "invalid_token",
        summary: "The access token is invalid, expired, or no longer authorized.",
        likelyFix: "Generate a fresh token and update the environment secrets.",
        severity: "error"
      }
    ];
  }

  if (message.includes("instagram business account")) {
    return [
      {
        code: "missing_linked_ig",
        summary: "No linked Instagram professional account was found.",
        likelyFix: "Link an Instagram professional account to the Facebook Page, then rediscover assets.",
        severity: "warning"
      }
    ];
  }

  if (message.includes("unsupported get request")) {
    return [
      {
        code: "wrong_id_or_token",
        summary: "The selected ID or token type cannot access this edge.",
        likelyFix: "Check that the right Page, Business, or Instagram ID is being used with the correct token.",
        severity: "error"
      }
    ];
  }

  return [
    {
      code: "graph_error",
      summary: error.message,
      likelyFix: "Review the endpoint, permissions, and token type for this request.",
      severity: "error"
    }
  ];
}

export function evaluateExpectedRules(payload: unknown, expectedRules: Array<Record<string, unknown>>) {
  for (const rule of expectedRules) {
    if (rule.type === "status") continue;
    if (rule.type === "field_exists") {
      if (!getByPath(payload, String(rule.field))) {
        return false;
      }
    }
    if (rule.type === "array_nonempty") {
      const value = rule.field ? getByPath(payload, String(rule.field)) : payload;
      if (!Array.isArray(value) || value.length === 0) {
        return false;
      }
    }
  }

  return true;
}

function getByPath(input: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, input);
}
