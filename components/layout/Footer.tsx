import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { createClient } from '@/lib/supabase/server';
import { getSettings, settingString } from '@/lib/settings';
import { whatsappUrl } from '@/lib/utils/format';
import { BRAND, DEFAULT_WHATSAPP, LOCALE } from '@/config/site';

export async function Footer() {
  const s = await getSettings();
  const whatsapp = settingString(s, 'whatsapp_number', DEFAULT_WHATSAPP);
  const instagram = settingString(s, 'social_instagram', '');
  const facebook = settingString(s, 'social_facebook', '');

  const supabase = await createClient();
  const { data: pages } = await supabase
    .from('pages')
    .select('slug, title')
    .eq('active', true)
    .eq('approved', true);

  return (
    <footer className="mt-section border-t border-ink/10 bg-ink text-paper">
      <div className="container-content grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo variant="cream" width={140} height={46} href={null} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-paper/70">{BRAND.descriptionAr}</p>
        </div>

        <FooterCol title="تسوّق">
          <FooterLink href="/products">كل العطور</FooterLink>
          <FooterLink href="/products?gender=MEN">رجالي</FooterLink>
          <FooterLink href="/products?flag=new">وصل حديثًا</FooterLink>
          <FooterLink href="/products?flag=best">الأكثر مبيعًا</FooterLink>
          <FooterLink href="/finder">مستشار العطور</FooterLink>
        </FooterCol>

        <FooterCol title="المساعدة">
          <FooterLink href="/track-order">تتبع الطلب</FooterLink>
          <FooterLink href="/faq">الأسئلة الشائعة</FooterLink>
          <a href={whatsappUrl(whatsapp)} target="_blank" rel="noopener noreferrer" className="text-sm text-paper/70 hover:text-paper">
            تواصل عبر واتساب
          </a>
          {(pages ?? []).map((p) => (
            <FooterLink key={p.slug} href={`/pages/${p.slug}`}>
              {p.title}
            </FooterLink>
          ))}
        </FooterCol>

        <FooterCol title="تواصل معنا">
          <span className="text-sm text-paper/70">{LOCALE.city}، ليبيا</span>
          <a href={`tel:${whatsapp}`} className="text-sm text-paper/70 hover:text-paper" dir="ltr">
            {whatsapp}
          </a>
          <div className="mt-2 flex gap-4">
            {instagram && <a href={instagram} target="_blank" rel="noopener noreferrer" className="text-sm text-paper/70 hover:text-paper">إنستغرام</a>}
            {facebook && <a href={facebook} target="_blank" rel="noopener noreferrer" className="text-sm text-paper/70 hover:text-paper">فيسبوك</a>}
          </div>
        </FooterCol>
      </div>

      <div className="border-t border-paper/10">
        <div className="container-content flex flex-col items-center justify-between gap-2 py-5 text-xs text-paper/50 sm:flex-row">
          <span>© {new Date().getFullYear()} {BRAND.name}. جميع الحقوق محفوظة.</span>
          <span>الدفع عند الاستلام · توصيل داخل {LOCALE.city}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display-ar text-sm font-semibold text-paper">{title}</h3>
      {children}
    </div>
  );
}
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-paper/70 transition-colors hover:text-paper">
      {children}
    </Link>
  );
}
