import type { Metadata } from 'next';
import { CartView } from '@/components/store/checkout/CartView';

export const metadata: Metadata = { title: 'السلة', robots: { index: false, follow: true } };

export default function CartPage() {
  return <CartView />;
}
