import { Star, Trash2 } from 'lucide-react';
import { Badge } from '@/components/admin/ui';
import { ImageUploader } from '@/components/admin/products/ImageUploader';
import type { ProductImageRow } from '@/types/database';
import { addProductImage, setPrimaryImage, deleteProductImage } from '@/app/admin/(dashboard)/products/image-actions';

export function ImagesSection({
  productId,
  images,
}: {
  productId: string;
  images: ProductImageRow[];
}) {
  return (
    <section className="admin-card space-y-5">
      <h2 className="font-medium text-ink">الصور</h2>

      {images.length === 0 ? (
        <p className="text-sm text-ink-500">لا توجد صور بعد. ارفع صورة أو أضِف رابطًا.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="group relative overflow-hidden rounded border border-ink/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt ?? ''} className="aspect-square w-full object-cover" />
              {img.is_primary && (
                <span className="absolute start-2 top-2"><Badge tone="gold">رئيسية</Badge></span>
              )}
              <div className="flex items-center justify-between gap-1 p-2">
                {!img.is_primary ? (
                  <form action={setPrimaryImage}>
                    <input type="hidden" name="id" value={img.id} />
                    <input type="hidden" name="product_id" value={productId} />
                    <button className="admin-btn-sm" type="submit"><Star size={14} /> رئيسية</button>
                  </form>
                ) : <span />}
                <form action={deleteProductImage}>
                  <input type="hidden" name="id" value={img.id} />
                  <input type="hidden" name="product_id" value={productId} />
                  <button className="admin-btn-sm text-danger hover:bg-danger/5" type="submit"><Trash2 size={14} /></button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <ImageUploader productId={productId} />

      <details className="rounded border border-dashed border-ink/20 p-3">
        <summary className="cursor-pointer text-sm text-ink-600">إضافة صورة برابط خارجي</summary>
        <form action={addProductImage} className="mt-3 space-y-3">
          <input type="hidden" name="product_id" value={productId} />
          <input name="url" required placeholder="https://…" className="admin-input" dir="ltr" />
          <input name="alt" placeholder="النص البديل (اختياري)" className="admin-input" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_primary" className="h-4 w-4 rounded border-ink/30 text-gold focus:ring-gold/40" />
            تعيينها كصورة رئيسية
          </label>
          <button type="submit" className="btn-outline">إضافة الصورة</button>
        </form>
      </details>
    </section>
  );
}
