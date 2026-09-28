/**
 * Compile-time brand & store defaults.
 *
 * IMPORTANT: operational values (WhatsApp number, announcement, toggles, social
 * links, delivery flags…) are stored in the `site_settings` table and are
 * editable from the admin dashboard. The values here are ONLY the fallback used
 * before settings are loaded, and the immutable brand facts. Do not scatter
 * these strings across components — import from here (or read settings).
 */

export const BRAND = {
  name: 'VELMOR',
  nameAr: 'فيلمور',
  tagline: 'عطور تُعبّر عنك',
  taglineEn: 'Elegance with attitude',
  // From the brand identity: a modern Libyan fragrance brand for a new
  // generation of men — elegant, bold, youthful, refined, exclusive.
  descriptionAr:
    'علامة عطور ليبية عصرية لجيل جديد من الرجال — أناقة بحضور، وثقة، وطابع مميز.',
} as const;

export const LOCALE = {
  lang: 'ar' as const,
  dir: 'rtl' as const,
  currency: 'LYD' as const,
  currencySymbol: 'د.ل',
  country: 'LY',
  city: 'بنغازي', // launch market: Benghazi
} as const;

/**
 * Default fallback WhatsApp number (from the project brief). The live value is
 * `site_settings.whatsapp_number` and can be changed by the admin.
 */
export const DEFAULT_WHATSAPP = '0919774260';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

/**
 * Homepage section keys, in default display order. The admin can enable/disable
 * and reorder these via `homepage_sections`; this is only the seed order.
 */
export const DEFAULT_HOMEPAGE_SECTIONS = [
  'announcement',
  'hero',
  'featured_collection',
  'best_sellers',
  'brand_story',
  'perfume_finder',
  'fragrance_families',
  'featured_products',
  'new_arrivals',
  'seasonal',
  'reviews',
  'why_velmor',
  'delivery_info',
  'whatsapp_cta',
  'brand_statement',
] as const;

export type HomepageSectionKey = (typeof DEFAULT_HOMEPAGE_SECTIONS)[number];
