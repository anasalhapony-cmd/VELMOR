'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * Two-step destructive submit button. First click arms it ("تأكيد؟"); the second
 * click submits the enclosing <form>. Avoids native confirm() dialogs.
 */
export function DangerButton({
  label = 'حذف',
  confirmLabel = 'تأكيد الحذف؟',
  className,
}: {
  label?: string;
  confirmLabel?: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!armed) {
          e.preventDefault();
          setArmed(true);
        }
      }}
      onBlur={() => setArmed(false)}
      className={cn(
        'admin-btn-sm',
        armed ? 'border-danger bg-danger text-white hover:bg-danger' : 'text-danger hover:bg-danger/5',
        className
      )}
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : null}
      {armed ? confirmLabel : label}
    </button>
  );
}
