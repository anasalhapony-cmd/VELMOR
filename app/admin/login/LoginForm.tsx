'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { signIn } from './actions';
import { initialFormState } from '@/lib/admin/form-state';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full justify-center">
      {pending ? <Loader2 size={16} className="animate-spin" /> : null}
      تسجيل الدخول
    </button>
  );
}

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState(signIn, initialFormState);
  return (
    <form action={formAction} className="space-y-4">
      <h1 className="text-center font-display-ar text-h3 font-semibold text-ink">تسجيل الدخول</h1>

      {!state.ok && state.error && (
        <div className="flex items-center gap-2 rounded border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          <AlertCircle size={16} /> {state.error}
        </div>
      )}

      <input type="hidden" name="redirect" value={redirectTo ?? ''} />

      <div>
        <label htmlFor="email" className="admin-label">البريد الإلكتروني</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          dir="ltr"
          className="admin-input text-left"
          placeholder="owner@velmor.ly"
        />
      </div>

      <div>
        <label htmlFor="password" className="admin-label">كلمة المرور</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
          className="admin-input text-left"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
