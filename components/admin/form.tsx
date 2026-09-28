'use client';

import { createContext, useContext, useId } from 'react';
import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { initialFormState, type FormState } from '@/lib/admin/form-state';

type ServerAction = (prev: FormState, fd: FormData) => Promise<FormState>;

const FieldErrorCtx = createContext<Record<string, string> | undefined>(undefined);

function useFieldError(name: string): string | undefined {
  return useContext(FieldErrorCtx)?.[name];
}

/** Form wrapper wired to a Server Action via useActionState. */
export function EntityForm({
  action,
  children,
  submitLabel = 'حفظ',
  className,
}: {
  action: ServerAction;
  children: React.ReactNode;
  submitLabel?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  return (
    <FieldErrorCtx.Provider value={state.fieldErrors}>
      <form action={formAction} className={cn('space-y-5', className)}>
        <FormBanner state={state} />
        {children}
        <div className="flex items-center gap-3 pt-2">
          <SubmitButton label={submitLabel} />
        </div>
      </form>
    </FieldErrorCtx.Provider>
  );
}

export function FormBanner({ state }: { state: FormState }) {
  if (state.ok && state.message) {
    return (
      <div className="flex items-center gap-2 rounded border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
        <CheckCircle2 size={16} /> {state.message}
      </div>
    );
  }
  if (!state.ok && state.error) {
    return (
      <div className="flex items-center gap-2 rounded border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
        <AlertCircle size={16} /> {state.error}
      </div>
    );
  }
  return null;
}

export function SubmitButton({ label = 'حفظ' }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? <Loader2 size={16} className="animate-spin" /> : null}
      {label}
    </button>
  );
}

// --- Field primitives -------------------------------------------------------

function FieldShell({
  name,
  label,
  hint,
  required,
  children,
  htmlFor,
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  const error = useFieldError(name);
  return (
    <div>
      <label htmlFor={htmlFor} className="admin-label">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="admin-hint">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

interface BaseFieldProps {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  defaultValue?: string | number | null;
  placeholder?: string;
  disabled?: boolean;
}

export function TextField({ type = 'text', ...p }: BaseFieldProps & { type?: string }) {
  const id = useId();
  return (
    <FieldShell name={p.name} label={p.label} hint={p.hint} required={p.required} htmlFor={id}>
      <input
        id={id}
        name={p.name}
        type={type}
        required={p.required}
        placeholder={p.placeholder}
        disabled={p.disabled}
        defaultValue={p.defaultValue ?? undefined}
        className="admin-input"
      />
    </FieldShell>
  );
}

export function NumberField(p: BaseFieldProps & { step?: string; min?: number; max?: number }) {
  const id = useId();
  return (
    <FieldShell name={p.name} label={p.label} hint={p.hint} required={p.required} htmlFor={id}>
      <input
        id={id}
        name={p.name}
        type="number"
        inputMode="decimal"
        step={p.step ?? 'any'}
        min={p.min}
        max={p.max}
        required={p.required}
        placeholder={p.placeholder}
        disabled={p.disabled}
        defaultValue={p.defaultValue ?? undefined}
        className="admin-input"
      />
    </FieldShell>
  );
}

export function TextareaField(p: BaseFieldProps & { rows?: number }) {
  const id = useId();
  return (
    <FieldShell name={p.name} label={p.label} hint={p.hint} required={p.required} htmlFor={id}>
      <textarea
        id={id}
        name={p.name}
        rows={p.rows ?? 4}
        required={p.required}
        placeholder={p.placeholder}
        disabled={p.disabled}
        defaultValue={p.defaultValue ?? undefined}
        className="admin-input"
      />
    </FieldShell>
  );
}

export interface Option {
  value: string;
  label: string;
}

export function SelectField(
  p: BaseFieldProps & { options: Option[]; includeBlank?: string }
) {
  const id = useId();
  return (
    <FieldShell name={p.name} label={p.label} hint={p.hint} required={p.required} htmlFor={id}>
      <select
        id={id}
        name={p.name}
        required={p.required}
        disabled={p.disabled}
        defaultValue={p.defaultValue != null ? String(p.defaultValue) : ''}
        className="admin-input"
      >
        {p.includeBlank !== undefined && <option value="">{p.includeBlank}</option>}
        {p.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({
  name,
  label,
  hint,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
        <input
          id={id}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          disabled={disabled}
          className="h-4 w-4 rounded border-ink/30 text-gold focus:ring-gold/40"
        />
        {label}
      </label>
      {hint && <p className="admin-hint">{hint}</p>}
    </div>
  );
}

/** Native multi-select → submits string[] (fd.getAll). Good for longer lists. */
export function MultiSelectField({
  name,
  label,
  hint,
  options,
  defaultValues = [],
}: {
  name: string;
  label: string;
  hint?: string;
  options: Option[];
  defaultValues?: string[];
}) {
  const id = useId();
  return (
    <FieldShell name={name} label={label} hint={hint} htmlFor={id}>
      <select id={id} name={name} multiple defaultValue={defaultValues} className="admin-input min-h-32">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </FieldShell>
  );
}

/** A group of checkboxes sharing one name → submits string[] (fd.getAll). */
export function CheckboxGroup({
  name,
  label,
  options,
  defaultValues = [],
}: {
  name: string;
  label: string;
  options: Option[];
  defaultValues?: string[];
}) {
  const set = new Set(defaultValues);
  return (
    <FieldShell name={name} label={label}>
      <div className="flex flex-wrap gap-3 rounded border border-ink/15 p-3">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name={name}
              value={o.value}
              defaultChecked={set.has(o.value)}
              className="h-4 w-4 rounded border-ink/30 text-gold focus:ring-gold/40"
            />
            {o.label}
          </label>
        ))}
      </div>
    </FieldShell>
  );
}
