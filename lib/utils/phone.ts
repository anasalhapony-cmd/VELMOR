/**
 * Libyan phone number validation & normalisation.
 *
 * Accepts common local/international spellings of a Libyan MOBILE number and
 * normalises to E.164 digits without '+': 218 9XXXXXXXX (12 digits).
 * Libyan mobile prefixes are 09[1-5]XXXXXXX locally.
 *
 * Used by both the client (react-hook-form + zod) and the server. The server
 * ALWAYS re-normalises — client validation is never trusted.
 */

export interface NormalizedPhone {
  ok: boolean;
  /** Normalised digits, e.g. "218913456789". Empty when invalid. */
  e164: string;
  /** Local form, e.g. "0913456789". Empty when invalid. */
  local: string;
  error?: string;
}

const MOBILE_RE = /^2189[1-5]\d{7}$/;

export function normalizeLibyanPhone(input: string | null | undefined): NormalizedPhone {
  const fail = (error: string): NormalizedPhone => ({ ok: false, e164: '', local: '', error });
  if (!input) return fail('EMPTY');

  let digits = String(input).replace(/[^\d]/g, '');
  if (!digits) return fail('EMPTY');

  // Strip international prefixes: 00218…, 218…, or a leading 0 on a local number.
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('218')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  // Now `digits` should be the 9-digit national number starting with 9.
  const e164 = '218' + digits;
  if (!MOBILE_RE.test(e164)) return fail('INVALID_LIBYAN_MOBILE');

  return { ok: true, e164, local: '0' + digits };
}

export function isValidLibyanPhone(input: string | null | undefined): boolean {
  return normalizeLibyanPhone(input).ok;
}
