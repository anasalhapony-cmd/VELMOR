import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CheckoutInput } from '@/lib/validation/schemas';
import type { OrderPublic } from '@/types';

export type CreateOrderResult =
  | { ok: true; order: OrderPublic }
  | { ok: false; code: OrderErrorCode; message: string; variantId?: string };

export type OrderErrorCode =
  | 'OUT_OF_STOCK'
  | 'VARIANT_UNAVAILABLE'
  | 'PRODUCT_UNAVAILABLE'
  | 'INVALID_DELIVERY_ZONE'
  | 'DELIVERY_ZONE_REQUIRED'
  | 'EMPTY_CART'
  | 'TOO_MANY_ITEMS'
  | 'INVALID_QUANTITY'
  | 'PAYMENT_METHOD_DISABLED'
  | 'TOO_MANY_OPEN_ORDERS'
  | 'UNKNOWN';

const ERROR_MESSAGES_AR: Record<OrderErrorCode, string> = {
  OUT_OF_STOCK: 'أحد المنتجات لم يعد متوفرًا بالكمية المطلوبة.',
  VARIANT_UNAVAILABLE: 'أحد المنتجات لم يعد متاحًا.',
  PRODUCT_UNAVAILABLE: 'أحد المنتجات لم يعد متاحًا.',
  INVALID_DELIVERY_ZONE: 'منطقة التوصيل غير صالحة.',
  DELIVERY_ZONE_REQUIRED: 'يرجى اختيار منطقة التوصيل.',
  EMPTY_CART: 'السلة فارغة.',
  TOO_MANY_ITEMS: 'عدد المنتجات في الطلب كبير جدًا.',
  INVALID_QUANTITY: 'كمية غير صالحة لأحد المنتجات.',
  PAYMENT_METHOD_DISABLED: 'طريقة الدفع غير متاحة حاليًا.',
  TOO_MANY_OPEN_ORDERS: 'لديك طلبات قيد التنفيذ بهذا الرقم. سنتواصل معك لتأكيدها، أو راسلنا عبر واتساب.',
  UNKNOWN: 'تعذّر إنشاء الطلب. حاول مرة أخرى.',
};

function parseError(message: string | undefined): { code: OrderErrorCode; variantId?: string } {
  const raw = message ?? '';
  for (const code of Object.keys(ERROR_MESSAGES_AR) as OrderErrorCode[]) {
    if (raw.includes(code)) {
      const m = raw.match(new RegExp(`${code}:([0-9a-f-]{36})`));
      return { code, variantId: m?.[1] };
    }
  }
  return { code: 'UNKNOWN' };
}

/**
 * Create an order atomically via the create_order SECURITY DEFINER function,
 * using the service-role client. The payload has already been validated + the
 * phone normalised by the caller (the API route). The DB is authoritative for
 * every price, the delivery fee, coupon discount and stock.
 */
export async function createOrder(
  input: CheckoutInput,
  idempotencyKey: string
): Promise<CreateOrderResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('create_order', {
    p_payload: {
      customer_name: input.customer_name,
      phone: input.phone,
      whatsapp: input.whatsapp ?? null,
      city: input.city,
      area: input.area ?? null,
      address: input.address,
      delivery_note: input.delivery_note ?? null,
      delivery_zone_id: input.delivery_zone_id,
      coupon_code: input.coupon_code ?? null,
      payment_method: input.payment_method,
      gift_wrap: input.gift_wrap ?? false,
      gift_message: input.gift_message ?? null,
      items: input.items,
    },
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    const { code, variantId } = parseError(error.message);
    return { ok: false, code, message: ERROR_MESSAGES_AR[code], variantId };
  }
  return { ok: true, order: data as unknown as OrderPublic };
}
