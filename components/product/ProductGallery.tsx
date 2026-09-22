'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

export function ProductGallery({ images, name }: { images: { url: string; alt: string | null }[]; name: string }) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : [];

  if (list.length === 0) {
    return (
      <div className="grid aspect-square place-items-center rounded-lg bg-paper-200 font-display text-4xl text-ink/20">
        VELMOR
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-paper-200">
        <Image
          src={list[active]!.url}
          alt={list[active]!.alt || name}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
      {list.length > 1 && (
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {list.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                'relative h-20 w-16 shrink-0 overflow-hidden rounded border',
                i === active ? 'border-ink' : 'border-transparent'
              )}
              aria-label={`صورة ${i + 1}`}
            >
              <Image src={img.url} alt={img.alt || name} fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
