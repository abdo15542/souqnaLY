import { COOKIE_NAME } from "@shared/const";
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

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Match the app's tRPC auth fallback for Android WebViews where cookies are blocked.
  try {
    const raw = sessionStorage.getItem("manus-cookie");
    if (raw) {
      const prefix = `${COOKIE_NAME}=`;
      const token = raw.split(";").find(part => part.trim().startsWith(prefix))?.trim().slice(prefix.length);
      if (token) headers.Authorization = "Bearer " + token;
    }
  } catch {
    // Session storage may be unavailable; cookie authentication remains enabled.
  }

  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers,
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
