import { z } from 'zod';
import { normalizeLibyanPhone } from '@/lib/utils/phone';
import { GENDERS, SEASONS, OCCASIONS, MAX_QTY_PER_LINE, MAX_CART_LINES } from '@/config/constants';

/** A Libyan mobile number, normalised to E.164 digits (2189XXXXXXXX). */
export const libyanPhone = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizeLibyanPhone(v);
    if (!n.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'رقم هاتف ليبي غير صالح' });
      return z.NEVER;
    }
    return n.e164;
  });

export const cartLineSchema = z.object({
  variant_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(MAX_QTY_PER_LINE),
});

/** Cart lines: bounded, and duplicate variants merged (so the DB never sees
 *  the same variant twice in one order). */
export const cartLinesSchema = z
  .array(cartLineSchema)
  .min(1, 'السلة فارغة')
  .max(MAX_CART_LINES)
  .transform((lines, ctx) => {
    const merged = new Map<string, number>();
    for (const l of lines) merged.set(l.variant_id, (merged.get(l.variant_id) ?? 0) + l.quantity);
    const out = [...merged].map(([variant_id, quantity]) => ({ variant_id, quantity }));
    if (out.some((l) => l.quantity > MAX_QTY_PER_LINE)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'كمية غير صالحة لأحد المنتجات' });
      return z.NEVER;
    }
    return out;
  });

export const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2, 'الاسم مطلوب').max(120),
  phone: libyanPhone,
  whatsapp: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? normalizeLibyanPhone(v).e164 || undefined : undefined)),
  city: z.string().trim().min(1, 'المدينة مطلوبة').max(80),
  area: z.string().trim().max(120).optional(),
  address: z.string().trim().min(5, 'العنوان التفصيلي مطلوب').max(300),
  delivery_note: z.string().trim().max(400).optional(),
  delivery_zone_id: z.string().uuid('اختر منطقة التوصيل'),
  coupon_code: z.string().trim().max(40).optional(),
  payment_method: z.literal('COD').default('COD'),
  // Honoured only when gift wrapping is enabled in settings (server decides the fee).
  gift_wrap: z.boolean().optional().default(false),
  gift_message: z.string().trim().max(300).optional(),
  items: cartLinesSchema,
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/**
 * Client-side checkout form schema (plain strings, no transforms) for use with
 * react-hook-form. The SERVER re-validates with the transforming checkoutSchema
 * — this is only for inline UX validation.
 */
export const checkoutFormSchema = z.object({
  customer_name: z.string().trim().min(2, 'الاسم مطلوب'),
  phone: z
    .string()
    .trim()
    .refine((v) => normalizeLibyanPhone(v).ok, 'رقم هاتف ليبي غير صالح'),
  whatsapp: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || normalizeLibyanPhone(v).ok, 'رقم واتساب غير صالح'),
  address: z.string().trim().min(5, 'العنوان التفصيلي مطلوب'),
  delivery_note: z.string().trim().max(400).optional(),
  delivery_zone_id: z.string().uuid('اختر منطقة التوصيل'),
  coupon_code: z.string().trim().max(40).optional(),
  gift_wrap: z.boolean().optional(),
  gift_message: z.string().trim().max(300, 'الرسالة طويلة').optional(),
});
export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export const quoteSchema = z.object({
  items: cartLinesSchema,
  delivery_zone_id: z.string().uuid().optional(),
  coupon_code: z.string().trim().max(40).optional(),
  phone: z.string().trim().max(30).optional(),
  gift_wrap: z.boolean().optional(),
});
export type QuoteInput = z.infer<typeof quoteSchema>;

export const reviewSchema = z.object({
  product_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().max(1500).optional(),
  display_name: z.string().trim().max(60).optional(),
  // Optional proof of purchase → "verified purchase" badge (checked server-side).
  order_number: z.string().trim().max(20).optional(),
  phone: libyanPhone.optional(),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const trackSchema = z.object({
  order_number: z.string().trim().min(4).max(20),
  phone: libyanPhone,
});

const slug = z.string().trim().regex(/^[a-z0-9-]{1,60}$/);
const level = z.number().int().min(1).max(5);
export const finderSchema = z.object({
  gender: z.enum(GENDERS).optional(),
  occasion: z.enum(OCCASIONS).optional(),
  season: z.enum(SEASONS).optional(),
  families: z.array(slug).max(6).optional(),
  notes: z.array(slug).max(8).optional(),
  freshness: level.optional(),
  sweetness: level.optional(),
  intensity: level.optional(),
  sillage: level.optional(),
  longevity: level.optional(),
});
export type FinderInput = z.infer<typeof finderSchema>;

/**
 * Client-reportable events (tracking plan). Server-only events such as
 * order_created, search and perfume_finder_completed are recorded by the
 * server itself and cannot be forged from the browser.
 */
export const CLIENT_EVENTS = [
  'product_view',
  'add_to_cart',
  'remove_from_cart',
  'begin_checkout',
  'wishlist_add',
  'wishlist_remove',
] as const;
export const analyticsSchema = z.object({
  event_type: z.enum(CLIENT_EVENTS),
  product_id: z.string().uuid().optional(),
  // Small, flat metadata only: ≤12 keys, short keys, primitive values, and
  // strings capped — nobody can store megabytes through the event endpoint.
  meta: z
    .record(
      z.string().max(40),
      z.union([z.string().max(200), z.number().finite(), z.boolean(), z.null()])
    )
    .refine((m) => Object.keys(m).length <= 12, 'too many keys')
    .optional(),
});
