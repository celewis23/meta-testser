import type { HttpMethod } from "@prisma/client";
import type { GraphError, GraphResult, JsonRecord } from "@/types/meta";

type RequestOptions = {
  apiVersion: string;
  accessToken: string;
  endpoint: string;
  method: HttpMethod;
  params?: Record<string, string>;
  body?: JsonRecord;
};

export class MetaGraphClient {
  async request<T = unknown>({
    apiVersion,
    accessToken,
    endpoint,
    method,
    params,
    body
  }: RequestOptions): Promise<GraphResult<T>> {
    const startedAt = Date.now();
    const url = new URL(`https://graph.facebook.com/${apiVersion}/${endpoint.replace(/^\/+/, "")}`);
    const finalParams = new URLSearchParams(params);
    finalParams.set("access_token", accessToken);

    const init: RequestInit = {
      method,
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    };

    if (method === "GET") {
      url.search = finalParams.toString();
    } else {
      const formData = new URLSearchParams(finalParams);
      Object.entries(body ?? {}).forEach(([key, value]) => {
        formData.set(key, typeof value === "string" ? value : JSON.stringify(value));
      });
      init.headers = {
        ...init.headers,
        "Content-Type": "application/x-www-form-urlencoded"
      };
      init.body = formData.toString();
    }

    const response = await fetch(url.toString(), init);
    const text = await response.text();
    const durationMs = Date.now() - startedAt;

    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text };
    }

    const headers = Object.fromEntries(
      ["x-app-usage", "x-business-use-case-usage", "www-authenticate", "content-type"]
        .map((header) => [header, response.headers.get(header)])
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
    );

    const error = normalizeGraphError(parsed);

    return {
      ok: response.ok && !error,
      status: response.status,
      headers,
      data: error ? null : (parsed as T),
      error,
      url: url.toString(),
      durationMs
    };
  }
}

function normalizeGraphError(payload: unknown): GraphError | null {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return null;
  }
  const error = (payload as { error: GraphError }).error;
  return {
    message: error.message,
    type: error.type,
    code: error.code,
    error_subcode: error.error_subcode,
    fbtrace_id: error.fbtrace_id,
    is_transient: error.is_transient
  };
}
