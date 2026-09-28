/**
 * Client-safe Server Action result contract (shared by server actions and the
 * client <EntityForm> wrapper via useActionState). No server-only imports.
 */
export interface FormState {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Optional id of a newly-created record (lets the client redirect). */
  createdId?: string;
}

export const initialFormState: FormState = { ok: false };

export function ok(message?: string, extra?: Partial<FormState>): FormState {
  return { ok: true, message, ...extra };
}

export function fail(error: string, fieldErrors?: Record<string, string>): FormState {
  return { ok: false, error, fieldErrors };
}
