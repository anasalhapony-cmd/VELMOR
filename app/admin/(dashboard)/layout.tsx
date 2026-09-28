import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { signOut } from '@/app/admin/actions';

export const metadata: Metadata = {
  title: 'لوحة التحكم',
  robots: { index: false, follow: false },
};

// Admin data is per-request and must never be statically cached.
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const identity = await requireAdmin();
  return (
    <AdminShell identity={identity} signOutAction={signOut}>
      {children}
    </AdminShell>
  );
}
