import Image from 'next/image';
import Link from 'next/link';
import { BRAND } from '@/config/site';

type Variant = 'gold' | 'white' | 'charcoal' | 'cream' | 'green';

export function Logo({
  variant = 'charcoal',
  className = '',
  width = 132,
  height = 44,
  href = '/',
}: {
  variant?: Variant;
  className?: string;
  width?: number;
  height?: number;
  href?: string | null;
}) {
  const img = (
    <Image
      src={`/brand/velmor-logo-${variant}.png`}
      alt={BRAND.name}
      width={width}
      height={height}
      priority
      className={className}
      style={{ height: 'auto', width: 'auto', maxHeight: height }}
    />
  );
  if (href === null) return img;
  return (
    <Link href={href} aria-label={BRAND.name} className="inline-flex items-center">
      {img}
    </Link>
  );
}
