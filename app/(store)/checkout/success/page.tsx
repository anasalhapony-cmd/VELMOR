import type { Metadata } from 'next';
import { SuccessView } from '@/components/store/checkout/SuccessView';
import { getSettings, settingString } from '@/lib/settings';
import { DEFAULT_WHATSAPP } from '@/config/site';

export const metadata: Metadata = { title: 'تم استلام طلبك', robots: { index: false, follow: false } };

export default async function SuccessPage() {
  const settings = await getSettings();
  return <SuccessView whatsapp={settingString(settings, 'whatsapp_number', DEFAULT_WHATSAPP)} />;
}
