import type { AssetType, HttpMethod, TestStatus, TokenType } from "@prisma/client";

export type JsonRecord = Record<string, unknown>;

export type GraphError = {
  message: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
  is_transient?: boolean;
};

export type GraphResult<T = unknown> = {
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  data: T | null;
  error: GraphError | null;
  url: string;
  durationMs: number;
};

export type DependencyDescriptor = {
  key: string;
  label: string;
  type?: AssetType;
  required: boolean;
  remediation?: string;
};

export type ExpectedRule =
  | { type: "status"; equals: number }
  | { type: "field_exists"; field: string }
  | { type: "array_nonempty"; field?: string }
  | { type: "error_absent" };

export type ResolvedTest = {
  endpoint: string;
  queryParams: Record<string, string>;
  requestBody?: JsonRecord;
  values: Record<string, string>;
};

export type NormalizedDiagnostic = {
  code: string;
  summary: string;
  likelyFix: string;
  severity: "info" | "warning" | "error";
};

export type BuiltInTestDefinition = {
  key: string;
  displayName: string;
  category: string;
  description: string;
  requiredPermissions: string[];
  tokenType: TokenType;
  method: HttpMethod;
  endpointTemplate: string;
  queryParams?: Record<string, string>;
  requestBody?: JsonRecord;
  dependencies: DependencyDescriptor[];
  expectedRules: ExpectedRule[];
  safeToAutoRun: boolean;
  appearsInReviewPack: boolean;
  isActive?: boolean;
  sampleSuccessShape?: JsonRecord;
  troubleshootingNotes?: string;
  packKeys: string[];
};

export type ExecutionClassification = {
  status: TestStatus;
  diagnostics: NormalizedDiagnostic[];
};
