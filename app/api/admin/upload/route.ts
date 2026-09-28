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
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
    return NextResponse.json({ error: 'معرّف منتج غير صالح.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'حجم الصورة يتجاوز 5 ميغابايت.' }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) {
    return NextResponse.json({ error: 'صيغة الصورة غير مدعومة (JPEG/PNG/WebP/AVIF فقط).' }, { status: 415 });
  }

  // The product must exist (and be visible to this admin) before anything is
  // written to storage — no orphaned objects, no arbitrary path prefixes.
  const supabase = await createClient();
  const { data: product } = await supabase.from('products').select('id').eq('id', productId).maybeSingle();
  if (!product) return NextResponse.json({ error: 'المنتج غير موجود.' }, { status: 404 });

  const admin = createAdminClient();
  const path = `${productId}/${crypto.randomUUID()}.${kind.ext}`;
  let { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: kind.mime, upsert: false });

  // First upload on a fresh project: the bucket may not exist yet. Create it
  // (public read, 5 MB, images only) with the server-only key and retry once.
  if (upErr && /bucket not found|not found/i.test(upErr.message)) {
    const { error: mkErr } = await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    });
    if (!mkErr || /already exists/i.test(mkErr.message)) {
      ({ error: upErr } = await admin.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: kind.mime, upsert: false }));
    } else {
      console.error('[upload] createBucket failed:', mkErr.message);
    }
  }

  if (upErr) {
    console.error('[upload] storage upload failed:', upErr.message);
    const hint = /jwt|signature|invalid api key|unauthorized|403/i.test(upErr.message)
      ? 'تحقّق من SUPABASE_SERVICE_ROLE_KEY في ملف .env.local ثم أعد تشغيل الخادم.'
      : `تأكد من وجود حاوية التخزين «${BUCKET}» في Supabase (Storage).`;
    // Admin-only endpoint (permission checked above): safe to show the real cause.
    return NextResponse.json(
      { error: `تعذّر رفع الصورة. ${hint} — السبب الفعلي من Supabase: «${upErr.message}»` },
      { status: 500 }
    );
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;

  // Insert the image row via the RLS-guarded client (the signed-in admin).
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
    await admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: 'تم الرفع لكن تعذّر ربط الصورة بالمنتج.' }, { status: 500 });
  }

  await logAction({ action: 'upload_image', entity: 'products', entityId: productId, next: { url } });
  return NextResponse.json({ ok: true, url });
}
