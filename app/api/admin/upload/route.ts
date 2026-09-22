import { NextResponse, type NextRequest } from 'next/server';
import { getAdminIdentity } from '@/lib/admin/auth';
import { hasPermission } from '@/lib/admin/permissions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAction } from '@/lib/admin/audit';

export const runtime = 'nodejs';

const BUCKET = 'product-images';
const MAX_BYTES = 5 * 1024 * 1024;

/** Detect image type from magic bytes — never trust the client MIME/extension. */
function sniff(bytes: Uint8Array): { ext: string; mime: string } | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: 'png', mime: 'image/png' };
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return { ext: 'webp', mime: 'image/webp' };
  // AVIF: bytes 4..7 = 'ftyp', 8..11 = 'avif' | 'avis'
  if (b.length >= 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8]!, b[9]!, b[10]!, b[11]!);
    if (brand === 'avif' || brand === 'avis') return { ext: 'avif', mime: 'image/avif' };
  }
  return null;
}

export async function POST(req: NextRequest) {
  const me = await getAdminIdentity();
  if (!me || !hasPermission(me, 'manage_products')) {
    return NextResponse.json({ error: 'غير مصرّح.' }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح.' }, { status: 400 });
  }

  const file = form.get('file');
  const productId = String(form.get('product_id') ?? '');
  if (!(file instanceof Blob) || !productId) {
    return NextResponse.json({ error: 'ملف أو معرّف منتج مفقود.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'حجم الصورة يتجاوز 5 ميغابايت.' }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) {
    return NextResponse.json({ error: 'صيغة الصورة غير مدعومة (JPEG/PNG/WebP/AVIF فقط).' }, { status: 415 });
  }

  const admin = createAdminClient();
  const path = `${productId}/${crypto.randomUUID()}.${kind.ext}`;
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: kind.mime, upsert: false });
  if (upErr) {
    return NextResponse.json(
      { error: `تعذّر رفع الصورة. تأكد من إنشاء حاوية التخزين «${BUCKET}» في Supabase.` },
      { status: 500 }
    );
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;

  // Insert the image row via the RLS-guarded admin client (the signed-in admin).
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('product_images')
    .select('id, sort_order')
    .eq('product_id', productId)
    .order('sort_order', { ascending: false });
  const nextSort = existing && existing.length ? (existing[0]!.sort_order ?? 0) + 1 : 0;
  const isPrimary = !existing || existing.length === 0;

  const { error: insErr } = await supabase
    .from('product_images')
    .insert({ product_id: productId, url, is_primary: isPrimary, sort_order: nextSort });
  if (insErr) {
    return NextResponse.json({ error: 'تم الرفع لكن تعذّر ربط الصورة بالمنتج.' }, { status: 500 });
  }

  await logAction({ action: 'upload_image', entity: 'products', entityId: productId, next: { url } });
  return NextResponse.json({ ok: true, url });
}
