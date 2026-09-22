import { z } from 'zod';
import { normalizeLibyanPhone } from '@/lib/utils/phone';
import { GENDERS, SEASONS, OCCASIONS } from '@/config/constants';

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
  quantity: z.number().int().min(1).max(99),
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
  items: z.array(cartLineSchema).min(1, 'السلة فارغة').max(50),
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
});
export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export const quoteSchema = z.object({
  items: z.array(cartLineSchema).min(1).max(50),
  delivery_zone_id: z.string().uuid().optional(),
  coupon_code: z.string().trim().max(40).optional(),
  phone: z.string().trim().max(30).optional(),
});
export type QuoteInput = z.infer<typeof quoteSchema>;

export const reviewSchema = z.object({
  product_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().max(1500).optional(),
  display_name: z.string().trim().max(60).optional(),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const trackSchema = z.object({
  order_number: z.string().trim().min(4).max(20),
  phone: libyanPhone,
});

export const finderSchema = z.object({
  gender: z.enum(GENDERS).optional(),
  occasion: z.enum(OCCASIONS).optional(),
  season: z.enum(SEASONS).optional(),
  families: z.array(z.string()).max(6).optional(),
  sillage: z.number().int().min(1).max(5).optional(),
  longevity: z.number().int().min(1).max(5).optional(),
});
export type FinderInput = z.infer<typeof finderSchema>;

export const analyticsSchema = z.object({
  event_type: z.string().min(1).max(60),
  product_id: z.string().uuid().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
