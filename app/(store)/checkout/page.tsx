import type { Metadata } from 'next';
import Link from 'next/link';
import { getDeliveryZones } from '@/lib/cms/queries';
import { isMaintenanceMode } from '@/lib/settings';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';

export const metadata: Metadata = { title: 'إتمام الطلب', robots: { index: false } };

export default async function CheckoutPage() {
  const [zones, maintenance] = await Promise.all([getDeliveryZones(), isMaintenanceMode()]);

  if (maintenance) {
    return (
      <div className="container-content grid place-items-center py-24 text-center">
        <h1 className="font-display-ar text-h2 font-medium">الطلبات متوقفة مؤقتًا</h1>
        <p className="mt-2 text-ink-500">نعتذر، لا يمكن إتمام الطلبات حاليًا. حاول لاحقًا.</p>
        <Link href="/products" className="btn-outline mt-6">تصفّح العطور</Link>
      </div>
    );
  }

  return (
    <div className="container-content py-10">
      <h1 className="mb-8 font-display-ar text-h1 font-medium">إتمام الطلب</h1>
      <CheckoutForm
        zones={zones.map((z) => ({ id: z.id, name: z.name, city: z.city, fee: Number(z.fee) }))}
      />
    </div>
  );
}
