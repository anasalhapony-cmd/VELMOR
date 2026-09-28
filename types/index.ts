import type {
  Gender,
  Concentration,
  Season,
  Occasion,
  OrderStatus,
  PaymentMethod,
  StockLevel,
} from '@/config/constants';

/** Storefront art-direction field behind the bottle (approved design). */
export type ArtField = 'ink' | 'paper' | 'pine' | 'gold' | 'char';

/** Lightweight variant carried on cards for quick-add (never exact stock). */
export interface CardVariant {
  id: string;
  size: number;
  unit: string;
  price: number;
  compareAtPrice: number | null;
  stockLevel: StockLevel;
}

/** A product as shown in listings / rails. */
export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  nameAr: string | null;
  brand: string | null;
  minPrice: number | null;
  compareAtPrice: number | null;
  image: string | null;
  ratingAvg: number;
  ratingCount: number;
  gender: Gender | null;
  isNew: boolean;
  isBestSeller: boolean;
  isFeatured: boolean;
  /** Present when the source query provides them (list_products v2 / home). */
  family?: string | null;
  familySlug?: string | null;
  artField?: ArtField;
  shortDescription?: string | null;
  inStock?: boolean;
  variants?: CardVariant[];
}

export interface VariantPublic {
  id: string;
  size: number;
  unit: string;
  price: number;
  compareAtPrice: number | null;
  stockLevel: StockLevel;
  active: boolean;
}

export interface NoteRef {
  slug: string;
  name: string;
  nameEn?: string | null;
}

export interface NotePyramid {
  top: NoteRef[];
  heart: NoteRef[];
  base: NoteRef[];
}

export interface ProductDetail extends Omit<ProductCard, 'minPrice' | 'compareAtPrice'> {
  description: string | null;
  shortDescription: string | null;
  concentration: Concentration | null;
  season: Season | null;
  occasions: Occasion[];
  longevity: number | null;
  sillage: number | null;
  familySlug: string | null;
  familyName: string | null;
  images: { url: string; alt: string | null }[];
  variants: VariantPublic[];
  notes: NotePyramid;
  seoTitle: string | null;
  seoDescription: string | null;
  artField: ArtField;
  inspirationProfile: string | null;
  freshness: number | null;
  sweetness: number | null;
}

/** A line held in the client cart store (only ids + qty are trusted server-side). */
export interface CartItem {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  size: number;
  unit: string;
  price: number; // display only — server re-prices at checkout
  image: string | null;
  quantity: number;
}

/** Server quote result (from quote_order / create-order preview). */
export interface QuoteLine {
  variant_id: string;
  product_id: string;
  name: string;
  name_ar: string | null;
  size: number;
  unit: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  available: boolean;
}
export interface Quote {
  ok: boolean;
  items: QuoteLine[];
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  coupon: { valid: boolean; reason: string; code?: string; discount?: number } | null;
  gift_wrap_available?: boolean;
  gift_wrap?: boolean;
  gift_wrap_fee?: number;
}

/** Safe customer-facing order projection (from get_order_public / track_order). */
export interface OrderPublic {
  order_number: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  subtotal: number;
  discount_total: number;
  delivery_fee: number;
  gift_wrap?: boolean;
  gift_wrap_fee?: number;
  total: number;
  created_at: string;
  delivery: { city: string; area: string | null; zone: string | null };
  items: {
    name: string;
    variant: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
    image: string | null;
  }[];
  timeline: { status: OrderStatus; at: string }[];
}

/** Perfume Finder answers collected from the wizard. */
export interface FinderAnswers {
  gender?: Gender;
  occasion?: Occasion;
  season?: Season;
  families?: string[]; // family slugs
  notes?: string[]; // preferred note slugs
  freshness?: number; // 1..5
  sweetness?: number; // 1..5
  intensity?: number; // 1..5 (≈ sillage + longevity)
  sillage?: number; // 1..5
  longevity?: number; // 1..5
}

export interface FinderResult {
  product: ProductCard;
  score: number;
  maxScore: number;
  /** score/maxScore as a percentage, null when nothing was answered. */
  matchPct: number | null;
  reasons: string[];
  /** Plain-language Arabic explanation built from the matched dimensions. */
  summary: string;
}
