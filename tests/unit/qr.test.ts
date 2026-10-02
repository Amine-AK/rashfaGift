import { describe, expect, it } from "vitest";
import { createQrToken, verifyQrToken, QR_WINDOW_SECONDS } from "@/lib/qr";

const SECRET = "test-secret-test-secret-test-secret-123";
const ID = "3f1c2b9a-5d6e-4f70-8a91-b2c3d4e5f607";
const T0 = Date.UTC(2026, 9, 2, 15, 0, 0);

describe("rotating QR tokens", () => {
  it("verifies a fresh token", () => {
    const { token } = createQrToken("c", ID, SECRET, T0);
    const res = verifyQrToken(token, SECRET, T0 + 5_000);
    expect(res).toEqual({ ok: true, payload: { kind: "c", id: ID, window: Math.floor(T0 / 1000 / 60) } });
  });

  it("accepts the next window (scan right after rotation) but not later", () => {
    const { token } = createQrToken("c", ID, SECRET, T0);
    expect(verifyQrToken(token, SECRET, T0 + QR_WINDOW_SECONDS * 1000 + 1).ok).toBe(true);
    expect(verifyQrToken(token, SECRET, T0 + 2 * QR_WINDOW_SECONDS * 1000 + 1)).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects screenshots replayed minutes later", () => {
    const { token } = createQrToken("g", ID, SECRET, T0);
    expect(verifyQrToken(token, SECRET, T0 + 10 * 60_000)).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects tampered ids, kinds and signatures", () => {
    const { token } = createQrToken("c", ID, SECRET, T0);
    const other = token.replace(ID, "00000000-0000-4000-8000-000000000000");
    expect(verifyQrToken(other, SECRET, T0)).toEqual({ ok: false, reason: "signature" });
    expect(verifyQrToken(token.replace(".c.", ".g."), SECRET, T0)).toEqual({ ok: false, reason: "signature" });
    expect(verifyQrToken(token, "another-secret-another-secret-12345", T0)).toEqual({ ok: false, reason: "signature" });
  });

  it("rejects malformed input", () => {
    expect(verifyQrToken("hello", SECRET, T0).ok).toBe(false);
    expect(verifyQrToken("R1.x.y.z.w", SECRET, T0)).toEqual({ ok: false, reason: "malformed" });
  });

  it("reports when the code will rotate", () => {
    const { expiresAt } = createQrToken("c", ID, SECRET, T0 + 15_000);
    expect(expiresAt).toBe(T0 + 60_000);
  });
});
