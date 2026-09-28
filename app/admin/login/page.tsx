import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAdminIdentity } from '@/lib/admin/auth';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'تسجيل الدخول — لوحة التحكم',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  // Already an active admin? Skip the form.
  if (await getAdminIdentity()) redirect('/admin');
  const { redirect: dest } = await searchParams;

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-3xl tracking-wide text-paper">VELMOR</p>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-gold-300">لوحة التحكم</p>
        </div>
        <div className="rounded-lg bg-paper p-6 shadow-xl">
          <LoginForm redirectTo={dest} />
        </div>
        <p className="mt-6 text-center text-xs text-paper/40">
          الوصول مقصور على المشرفين المصرّح لهم.
        </p>
      </div>
    </div>
  );
}
