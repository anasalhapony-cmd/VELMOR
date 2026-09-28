import { whatsappUrl } from '@/lib/utils/format';
import { Icon } from '@/components/store/ui';

/** Branded holding page shown to customers while maintenance mode is on. */
export function Maintenance({ message, whatsapp }: { message?: string; whatsapp: string }) {
  return (
    <main className="vp-maint">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/brand/logo-gold.webp" alt="VELMOR" width={420} height={184} />
      <h1>{message || 'نُجهّز شيئًا يليق بحضورك. نعود قريبًا.'}</h1>
      <p>المتجر متوقف مؤقتًا للصيانة. للطلبات والاستفسارات تواصل معنا مباشرة.</p>
      <a className="vp-btn vp-btn--gold" href={whatsappUrl(whatsapp)} target="_blank" rel="noopener noreferrer">
        <Icon name="whatsapp" size={18} />
        <span>واتساب</span>
      </a>
    </main>
  );
}
