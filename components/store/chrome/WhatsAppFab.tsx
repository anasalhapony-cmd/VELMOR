'use client';

import { useEffect, useState } from 'react';
import { whatsappUrl } from '@/lib/utils/format';
import { Icon } from '@/components/store/ui';

/**
 * Floating WhatsApp contact — the number comes from site_settings (single
 * source). On pages that open with the cinematic hero it waits until the
 * visitor has scrolled past most of the hero, so the approved hero
 * composition is never covered.
 */
export function WhatsAppFab({ number }: { number: string }) {
  const [away, setAway] = useState(true);

  useEffect(() => {
    const update = () => {
      const hero = document.querySelector<HTMLElement>('.vp-hero');
      if (!hero) return setAway(false);
      setAway(window.scrollY < hero.offsetHeight * 0.45);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <a
      className="vp-wafab"
      data-away={away ? '' : undefined}
      href={whatsappUrl(number, 'مرحبًا VELMOR، أريد الاستفسار عن عطر.')}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل معنا عبر واتساب"
      data-magnetic
    >
      <Icon name="whatsapp" size={22} />
    </a>
  );
}
