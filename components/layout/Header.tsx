'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Heart, ShoppingBag, Menu, X } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useCart } from '@/stores/cart-store';
import { useWishlist } from '@/stores/wishlist-store';

const NAV = [
  { href: '/products', label: 'كل العطور' },
  { href: '/products?gender=MEN', label: 'رجالي' },
  { href: '/products?flag=new', label: 'وصل حديثًا' },
  { href: '/products?flag=best', label: 'الأكثر مبيعًا' },
  { href: '/finder', label: 'مستشار العطور' },
];

export function Header() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const cartCount = useCart((s) => s.count());
  const openCart = useCart((s) => s.open);
  const wishCount = useWishlist((s) => s.ids.size);

  useEffect(() => setMounted(true), []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term) {
      router.push(`/search?q=${encodeURIComponent(term)}`);
      setSearchOpen(false);
      setMenuOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="container-content flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            className="grid h-10 w-10 place-items-center lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="القائمة"
          >
            <Menu size={22} />
          </button>
          <Logo variant="charcoal" width={120} height={40} />
        </div>

        <nav className="hidden items-center gap-7 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="link-underline text-sm text-ink hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button className="grid h-10 w-10 place-items-center" aria-label="بحث" onClick={() => setSearchOpen((v) => !v)}>
            <Search size={20} />
          </button>
          <Link href="/wishlist" className="relative grid h-10 w-10 place-items-center" aria-label="المفضلة">
            <Heart size={20} />
            {mounted && wishCount > 0 && <Badge>{wishCount}</Badge>}
          </Link>
          <button onClick={openCart} className="relative grid h-10 w-10 place-items-center" aria-label="السلة">
            <ShoppingBag size={20} />
            {mounted && cartCount > 0 && <Badge>{cartCount}</Badge>}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-ink/10 bg-[#fbf9f4]">
          <form onSubmit={submitSearch} className="container-content flex h-14 items-center gap-2">
            <Search size={18} className="text-ink-500" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن عطر، ماركة، أو نوتة…"
              className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-ink-500"
            />
            <button type="button" onClick={() => setSearchOpen(false)} aria-label="إغلاق">
              <X size={18} />
            </button>
          </form>
        </div>
      )}

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* الخلفية المظلمة */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          
          {/* القائمة الجانبية بخلفية كريمية صلبة */}
          <div className="fixed inset-y-0 right-0 w-72 max-w-[85%] bg-[#fbf9f4] p-6 shadow-2xl z-50 overflow-y-auto">
            <div className="mb-8 flex items-center justify-between border-b border-ink/10 pb-4">
              <Logo variant="charcoal" width={110} height={36} href={null} />
              <button onClick={() => setMenuOpen(false)} aria-label="إغلاق" className="p-1 text-ink">
                <X size={22} />
              </button>
            </div>
            <nav className="flex flex-col gap-2">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-ink/5"
                >
                  {n.label}
                </Link>
              ))}
              <Link
                href="/track-order"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-ink/5 border-t border-ink/10 mt-2 pt-4"
              >
                تتبع الطلب
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute -end-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-ink">
      {children}
    </span>
  );
}