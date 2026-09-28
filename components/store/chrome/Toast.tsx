'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/stores/toast-store';
import { Icon } from '@/components/store/ui';

export function Toast() {
  const { id, message, tone, action, hide } = useToast();
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(hide, 3200);
    return () => window.clearTimeout(t);
  }, [id, message, hide]);
  return (
    <div className={`vp-toast${message ? ' is-on' : ''}${tone === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite">
      <Icon name={tone === 'error' ? 'alert' : 'bag'} size={18} />
      <span>{message}</span>
      {action && message ? (
        <Link href={action.href} className="vp-toast__action" onClick={hide}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
