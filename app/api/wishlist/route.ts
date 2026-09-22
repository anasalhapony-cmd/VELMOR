import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getGuestId } from '@/lib/security/guest';
import { getWishlistIds, addToWishlist, removeFromWishlist } from '@/lib/wishlist/queries';

const bodySchema = z.object({
  product_id: z.string().uuid(),
  action: z.enum(['add', 'remove']),
});

export async function GET() {
  const deviceId = await getGuestId();
  if (!deviceId) return NextResponse.json({ ids: [] });
  const ids = await getWishlistIds(deviceId);
  return NextResponse.json({ ids });
}

export async function POST(req: NextRequest) {
  const deviceId = await getGuestId();
  if (!deviceId) return NextResponse.json({ error: 'تعذّر تحديد الجهاز.' }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح.' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'بيانات غير صالحة.' }, { status: 422 });

  if (parsed.data.action === 'add') await addToWishlist(deviceId, parsed.data.product_id);
  else await removeFromWishlist(deviceId, parsed.data.product_id);

  return NextResponse.json({ ok: true });
}
