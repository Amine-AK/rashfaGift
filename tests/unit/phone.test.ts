import { describe, expect, it } from "vitest";
import { maskPhone, normalizePhone } from "@/lib/phone";

describe("phone numbers", () => {
  it.each([
    ["0612345678", "+212612345678"],
    ["06 12 34 56 78", "+212612345678"],
    ["07-12-34-56-78", "+212712345678"],
    ["+212 6 12 34 56 78", "+212612345678"],
    ["00212612345678", "+212612345678"],
    ["212612345678", "+212612345678"],
    ["+2120612345678", "+212612345678"],
    ["0522123456", "+212522123456"],
    ["+33612345678", "+33612345678"],
  ])("normalises %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "123", "0812345678", "+212912345678", "06123", "abc"])("rejects %s", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });

  it("masks for display", () => {
    expect(maskPhone("+212612345678")).toBe("+2126•• •• 56 78");
  });
});
