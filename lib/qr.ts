import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Rotating QR tokens.
 *
 *   R1.<kind>.<id>.<window>.<signature>
 *
 * kind   c = a customer's personal code, g = a specific gift to claim
 * window floor(unix seconds / 60): the code changes every minute
 * sig    HMAC-SHA256 over everything before it, base64url, truncated to 128 bits
 *
 * A token is accepted for its own window and the one right after it (to absorb
 * clock skew and the time it takes to scan). A screenshot therefore stops
 * working after at most two minutes, and the visit cooldown blocks any replay
 * inside that window anyway.
 */

export const QR_WINDOW_SECONDS = 60;
const VERSION = "R1";

export type QrKind = "c" | "g";
export type QrPayload = { kind: QrKind; id: string; window: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url").slice(0, 22);
}

export function currentWindow(nowMs: number): number {
  return Math.floor(nowMs / 1000 / QR_WINDOW_SECONDS);
}

export function createQrToken(kind: QrKind, id: string, secret: string, nowMs = Date.now()): { token: string; expiresAt: number } {
  const window = currentWindow(nowMs);
  const body = `${VERSION}.${kind}.${id}.${window}`;
  return { token: `${body}.${sign(body, secret)}`, expiresAt: (window + 1) * QR_WINDOW_SECONDS * 1000 };
}

export type QrVerifyResult = { ok: true; payload: QrPayload } | { ok: false; reason: "malformed" | "signature" | "expired" };

export function verifyQrToken(token: string, secret: string, nowMs = Date.now(), graceWindows = 1): QrVerifyResult {
  const parts = token.trim().split(".");
  if (parts.length !== 5 || parts[0] !== VERSION) return { ok: false, reason: "malformed" };
  const [, kind, id, windowStr, sig] = parts;
  if ((kind !== "c" && kind !== "g") || !UUID.test(id) || !/^\d+$/.test(windowStr)) return { ok: false, reason: "malformed" };

  const expected = sign(parts.slice(0, 4).join("."), secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "signature" };

  const window = Number(windowStr);
  const now = currentWindow(nowMs);
  // Not from the future (beyond one window of skew), not older than the grace period.
  if (window > now + 1 || now - window > graceWindows) return { ok: false, reason: "expired" };

  return { ok: true, payload: { kind, id: id.toLowerCase(), window } };
}
