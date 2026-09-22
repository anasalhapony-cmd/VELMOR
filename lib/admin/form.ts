import 'server-only';
import type { ZodError } from 'zod';

export type { FormState } from '@/lib/admin/form-state';
export { initialFormState, ok, fail } from '@/lib/admin/form-state';

/** Flatten a ZodError into { field: firstMessage }. */
export function zodFieldErrors(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

// --- FormData readers (everything arrives as strings) -----------------------

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

export function optStr(fd: FormData, key: string): string | undefined {
  const v = str(fd, key);
  return v === '' ? undefined : v;
}

export function num(fd: FormData, key: string): number | undefined {
  const v = str(fd, key);
  if (v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** HTML checkboxes submit "on" (or nothing). Also accepts true/1/yes. */
export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  if (typeof v !== 'string') return false;
  return ['on', 'true', '1', 'yes'].includes(v.toLowerCase());
}

/** Multi-value field (repeated inputs / multi-select) → string[]. */
export function strList(fd: FormData, key: string): string[] {
  return fd
    .getAll(key)
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);
}
