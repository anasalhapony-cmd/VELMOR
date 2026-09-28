import { headers } from 'next/headers';
import { Mr_Dafoe } from 'next/font/google';
import { StoreHeader } from '@/components/store/chrome/StoreHeader';
import { StoreFooter } from '@/components/store/chrome/StoreFooter';
import { CartDrawer } from '@/components/store/chrome/CartDrawer';
import { Toast } from '@/components/store/chrome/Toast';
import { WhatsAppFab } from '@/components/store/chrome/WhatsAppFab';
import { MotionChrome, PREPAINT_SCRIPT } from '@/components/store/motion/Chrome';
import { MotionProvider } from '@/components/store/motion/MotionProvider';
import { WishlistHydrator } from '@/components/layout/WishlistHydrator';
import { Maintenance } from '@/components/store/Maintenance';
import { getSettings, settingBool, settingString } from '@/lib/settings';
import { getAdminIdentity } from '@/lib/admin/auth';
import { getPrimaryImageBySlug } from '@/lib/products/queries';
import { DEFAULT_WHATSAPP } from '@/config/site';
import './store.css';

// Brush-script accent for the brand's "BillionDreams" face (not distributable
// via Google Fonts). Swap for the licensed BillionDreams files with
// next/font/local when available — only this declaration changes.
const script = Mr_Dafoe({ subsets: ['latin'], weight: '400', variable: '--font-script', display: 'swap' });

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, hdrs] = await Promise.all([getSettings(), headers()]);
  const nonce = hdrs.get('x-nonce') ?? undefined;
  const whatsapp = settingString(settings, 'whatsapp_number', DEFAULT_WHATSAPP);

  // Maintenance mode: the storefront shows a branded holding page; signed-in
  // active admins still see the live store (to verify before reopening).
  if (settingBool(settings, 'maintenance_mode', false)) {
    const admin = await getAdminIdentity().catch(() => null);
    if (!admin) {
      return (
        <div className={`vp ${script.variable}`} id="vp-root" dir="rtl" lang="ar">
          <Maintenance message={settingString(settings, 'maintenance_message')} whatsapp={whatsapp} />
        </div>
      );
    }
  }

  const menuImage = await getPrimaryImageBySlug(settingString(settings, 'home_signature_product')).catch(() => null);
  const announcement = settingBool(settings, 'announcement_enabled', false)
    ? settingString(settings, 'announcement') || null
    : null;

  return (
    <div className={`vp ${script.variable}`} id="vp-root" dir="rtl" lang="ar">
      {/* Browsers blank the `nonce` attribute in the DOM after a CSP-nonced script
          is parsed ("nonce hiding"), so the client always sees nonce="" while the
          server rendered the real value. Expected and harmless: suppress that one
          attribute check here (Next.js's documented approach). */}
      <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: PREPAINT_SCRIPT }} />
      <a href="#main" className="vp-skip">
        تخطَّ إلى المحتوى
      </a>
      <MotionChrome />
      <StoreHeader
        announcement={announcement}
        menuImage={menuImage}
        deliveryLine={settingString(settings, 'delivery_tagline', 'توصيل داخل بنغازي')}
      />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <StoreFooter />
      <CartDrawer />
      <Toast />
      <WhatsAppFab number={whatsapp} />
      <WishlistHydrator />
      <MotionProvider />
    </div>
  );
}
