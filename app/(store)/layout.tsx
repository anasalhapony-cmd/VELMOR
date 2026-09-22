import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';
import { WishlistHydrator } from '@/components/layout/WishlistHydrator';
import { getWhatsappNumber } from '@/lib/settings';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const whatsapp = await getWhatsappNumber();
  return (
    <>
      <AnnouncementBar />
      <Header />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton number={whatsapp} />
      <WishlistHydrator />
    </>
  );
}
