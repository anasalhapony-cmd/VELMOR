import type { Metadata } from 'next';
import { TrackOrder } from '@/components/store/checkout/TrackOrder';

export const metadata: Metadata = {
  title: 'تتبّع الطلب',
  description: 'تتبّع طلبك من VELMOR برقم الطلب ورقم الهاتف.',
  robots: { index: false, follow: true },
};

export default async function TrackOrderPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const order = typeof sp.order === 'string' ? sp.order.slice(0, 20).toUpperCase() : '';
  return <TrackOrder initialNumber={/^[A-Z]{2,5}-[A-Z0-9]{4,10}$/.test(order) ? order : ''} />;
}
