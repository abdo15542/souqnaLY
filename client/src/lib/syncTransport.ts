import type { SyncOperation, SyncPushResult, SyncTransport } from "./syncEngine";

type TrpcEnvelope = {
  result?: {
    data?: {
      json?: SyncPushResult;
    };
  };
  error?: {
    message?: string;
  };
};

/**
 * Transport for the authenticated tRPC sync.push procedure.
 * Same-origin cookies are used by default; configure VITE_API_BASE_URL for a
 * separately hosted API. No operation is acknowledged on HTTP/API failure.
 */
export const createAuthenticatedSyncTransport = (): SyncTransport => async (operations: SyncOperation[]) => {
  const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "");
  const endpoint = configuredBase
    ? `${configuredBase}/api/trpc/sync.push`
    : "/api/trpc/sync.push";

  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: { operations } }),
  });

  let envelope: TrpcEnvelope;
  try {
    envelope = await response.json() as TrpcEnvelope;
  } catch {
    throw new Error(`Sync server returned an unreadable response (HTTP ${response.status}).`);
  }

  if (!response.ok || envelope.error) {
    throw new Error(envelope.error?.message || `Sync request failed (HTTP ${response.status}).`);
  }

  const result = envelope.result?.data?.json;
  if (!result || !Array.isArray(result.acknowledgedIds)) {
    throw new Error("Sync server response did not contain durable acknowledgements.");
  }

  return result;
};
