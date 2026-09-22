'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2 } from 'lucide-react';

export function ImageUploader({ productId }: { productId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('product_id', productId);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'تعذّر رفع الصورة.');
      } else {
        router.refresh();
      }
    } catch {
      setError('حدث خطأ في الشبكة.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <label className="admin-btn-sm inline-flex cursor-pointer">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        رفع صورة من الجهاز
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          disabled={busy}
          onChange={onChange}
        />
      </label>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      <p className="admin-hint">JPEG أو PNG أو WebP، حتى 5 ميغابايت.</p>
    </div>
  );
}
