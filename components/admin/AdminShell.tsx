'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { visibleNav, ROLE_LABELS_AR, type AdminIdentity } from '@/lib/admin/permissions';
import { NavIcon } from '@/components/admin/icons';

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(href + '/');
}

export function AdminShell({
  identity,
  signOutAction,
  children,
}: {
  identity: AdminIdentity;
  signOutAction: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = visibleNav(identity);

  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {groups.map((group) => (
        <div key={group.title} className="mb-5">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-paper/40">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-gold/15 text-gold-300'
                        : 'text-paper/70 hover:bg-white/5 hover:text-paper'
                    )}
                  >
                    <NavIcon name={item.icon} className="shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const sidebarInner = (
    <>
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <Link href="/admin" className="font-display text-xl tracking-wide text-paper">
          VELMOR
          <span className="ms-2 align-middle text-[10px] uppercase tracking-widest text-gold-300">
            admin
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-paper/60 hover:text-paper lg:hidden"
          aria-label="إغلاق القائمة"
        >
          <X size={20} />
        </button>
      </div>
      {nav}
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 px-2">
          <p className="truncate text-sm text-paper">{identity.fullName || 'مشرف'}</p>
          <p className="text-xs text-paper/50">{ROLE_LABELS_AR[identity.role]}</p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-paper/70 transition-colors hover:bg-white/5 hover:text-paper"
          >
            <LogOut size={18} />
            تسجيل الخروج
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-paper-200/50 text-ink">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col bg-ink text-paper lg:flex">
        {sidebarInner}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 flex w-64 flex-col bg-ink text-paper">
            {sidebarInner}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="lg:ps-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-ink/10 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-ink"
            aria-label="فتح القائمة"
          >
            <Menu size={22} />
          </button>
          <span className="font-display text-lg">VELMOR admin</span>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
