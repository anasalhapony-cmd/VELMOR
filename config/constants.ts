/**
 * Shared enumerations and business constants.
 * These MUST stay in sync with the Postgres enums/constraints in
 * supabase/migrations. The database is the ultimate authority; these are the
 * TypeScript mirror used for labels, validation and UI.
 */

// ---------------------------------------------------------------------------
// Order status state machine
// ---------------------------------------------------------------------------
export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_DELIVERY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'FAILED',
  'EXPIRED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS_AR: Record<OrderStatus, string> = {
  PENDING: 'قيد المراجعة',
  CONFIRMED: 'تم تأكيد الطلب',
  PREPARING: 'قيد التجهيز',
  READY_FOR_DELIVERY: 'جاهز للتوصيل',
  OUT_FOR_DELIVERY: 'خرج للتوصيل',
  DELIVERED: 'تم التسليم',
  CANCELLED: 'تم الإلغاء',
  FAILED: 'تعذر التسليم',
  EXPIRED: 'منتهي',
};

/**
 * Allowed forward transitions. Any transition not listed here is rejected by
 * both the app layer and the DB function `admin_update_order_status`, unless the
 * caller passes an explicit override (admin-only, always audited).
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED', 'EXPIRED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DELIVERY: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
  DELIVERED: [], // terminal (future: RETURN_REQUESTED)
  CANCELLED: [], // terminal
  FAILED: ['OUT_FOR_DELIVERY', 'CANCELLED'], // retry a delivery attempt
  EXPIRED: [], // terminal
};

/**
 * Statuses that free reserved stock back to inventory exactly once.
 * FAILED is excluded: a failed delivery can be retried (FAILED -> OUT_FOR_DELIVERY),
 * so stock is only restored on the terminal cancellations.
 */
export const STOCK_RESTORING_STATUSES: OrderStatus[] = ['CANCELLED', 'EXPIRED'];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------
export const PAYMENT_METHODS = ['COD', 'CARD', 'BANK_TRANSFER', 'ONLINE_PAYMENT'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
/** Only COD is enabled at launch; the abstraction supports the rest later. */
export const ENABLED_PAYMENT_METHODS: PaymentMethod[] = ['COD'];

export const PAYMENT_STATUSES = ['UNPAID', 'PAID', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// ---------------------------------------------------------------------------
// Fragrance attributes
// ---------------------------------------------------------------------------
export const GENDERS = ['MEN', 'WOMEN', 'UNISEX'] as const;
export type Gender = (typeof GENDERS)[number];
export const GENDER_LABELS_AR: Record<Gender, string> = {
  MEN: 'رجالي',
  WOMEN: 'نسائي',
  UNISEX: 'للجنسين',
};

export const CONCENTRATIONS = [
  'EAU_DE_PARFUM',
  'EAU_DE_TOILETTE',
  'PARFUM',
  'EXTRAIT',
  'PERFUME_OIL',
  'OTHER',
] as const;
export type Concentration = (typeof CONCENTRATIONS)[number];
export const CONCENTRATION_LABELS_AR: Record<Concentration, string> = {
  EAU_DE_PARFUM: 'أو دو بارفان',
  EAU_DE_TOILETTE: 'أو دو تواليت',
  PARFUM: 'بارفان',
  EXTRAIT: 'إكستريه',
  PERFUME_OIL: 'زيت عطري',
  OTHER: 'أخرى',
};

export const SEASONS = ['SUMMER', 'WINTER', 'SPRING', 'AUTUMN', 'ALL_YEAR'] as const;
export type Season = (typeof SEASONS)[number];
export const SEASON_LABELS_AR: Record<Season, string> = {
  SUMMER: 'صيف',
  WINTER: 'شتاء',
  SPRING: 'ربيع',
  AUTUMN: 'خريف',
  ALL_YEAR: 'طوال العام',
};

export const OCCASIONS = ['DAILY', 'WORK', 'FORMAL', 'EVENING', 'SPECIAL'] as const;
export type Occasion = (typeof OCCASIONS)[number];
export const OCCASION_LABELS_AR: Record<Occasion, string> = {
  DAILY: 'يومي',
  WORK: 'العمل',
  FORMAL: 'رسمي',
  EVENING: 'سهرة',
  SPECIAL: 'مناسبات خاصة',
};

/** Intensity scale used for longevity & sillage (1..5). */
export const INTENSITY_LEVELS = [1, 2, 3, 4, 5] as const;
export type IntensityLevel = (typeof INTENSITY_LEVELS)[number];

export const NOTE_TIERS = ['TOP', 'HEART', 'BASE'] as const;
export type NoteTier = (typeof NOTE_TIERS)[number];
export const NOTE_TIER_LABELS_AR: Record<NoteTier, string> = {
  TOP: 'المقدمة',
  HEART: 'القلب',
  BASE: 'القاعدة',
};

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------
/** Public availability buckets. Exact quantities are never exposed publicly. */
export const LOW_STOCK_THRESHOLD = 10;
export type StockLevel = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export const STOCK_LEVEL_LABELS_AR: Record<StockLevel, string> = {
  IN_STOCK: 'متوفر',
  LOW_STOCK: 'كمية محدودة',
  OUT_OF_STOCK: 'نفد',
};
export function stockLevel(qty: number): StockLevel {
  if (qty <= 0) return 'OUT_OF_STOCK';
  if (qty <= LOW_STOCK_THRESHOLD) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export const INVENTORY_REASONS = [
  'SALE',
  'RESTOCK',
  'MANUAL_ADJUSTMENT',
  'CANCELLATION',
  'RETURN',
  'CORRECTION',
] as const;
export type InventoryReason = (typeof INVENTORY_REASONS)[number];

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------
export const COUPON_TYPES = ['PERCENTAGE', 'FIXED'] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

// ---------------------------------------------------------------------------
// Admin permissions (single owner role at launch; structured for growth)
// ---------------------------------------------------------------------------
export const ADMIN_PERMISSIONS = [
  'view_orders',
  'manage_orders',
  'manage_products',
  'manage_inventory',
  'manage_prices',
  'manage_coupons',
  'manage_reviews',
  'manage_delivery',
  'manage_cms',
  'view_analytics',
  'manage_settings',
  'view_audit_logs',
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const ADMIN_ROLES = ['owner', 'manager', 'staff'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------
export const SORT_OPTIONS = [
  'recommended',
  'newest',
  'price_asc',
  'price_desc',
  'best_selling',
  'top_rated',
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];
export const SORT_LABELS_AR: Record<SortOption, string> = {
  recommended: 'موصى به',
  newest: 'الأحدث',
  price_asc: 'السعر: من الأقل للأعلى',
  price_desc: 'السعر: من الأعلى للأقل',
  best_selling: 'الأكثر مبيعًا',
  top_rated: 'الأعلى تقييمًا',
};
