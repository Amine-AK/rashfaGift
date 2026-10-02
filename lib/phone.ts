/**
 * Normalise a phone number to E.164. Moroccan local formats are accepted:
 * 06XXXXXXXX, 07XXXXXXXX, 05XXXXXXXX, 2126…, 00212 6…, +212 6…
 * Other countries must be typed with their + prefix.
 */
export function normalizePhone(input: string): string | null {
  const raw = input.replace(/[\s.\-()]/g, "");
  let digits: string;
  if (raw.startsWith("+")) digits = raw.slice(1);
  else if (raw.startsWith("00")) digits = raw.slice(2);
  else if (/^0[5-7]\d{8}$/.test(raw)) digits = `212${raw.slice(1)}`;
  else if (/^212[5-7]\d{8}$/.test(raw)) digits = raw;
  else if (/^[5-7]\d{8}$/.test(raw)) digits = `212${raw}`;
  else return null;

  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith("212")) {
    // Moroccan numbers: 212 + 9 digits; drop a trunk 0 typed after the country code.
    if (/^2120[5-7]\d{8}$/.test(digits)) digits = `212${digits.slice(4)}`;
    return /^212[5-7]\d{8}$/.test(digits) ? `+${digits}` : null;
  }
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
}

/** "+212612345678" → "+212 6•• •• 56 78" for display without revealing the full number. */
export function maskPhone(e164: string): string {
  const tail = e164.slice(-4);
  return `${e164.slice(0, 5)}•• •• ${tail.slice(0, 2)} ${tail.slice(2)}`;
}
