'use client';

import { useState } from 'react';
import type { ArtField } from '@/types';

/** PDP gallery on the product's art-direction field; tilt/glare from the engine. */
export function Gallery({
  images,
  name,
  word,
  field,
}: {
  images: { url: string; alt: string | null }[];
  name: string;
  word: string;
  field: ArtField;
}) {
  const [i, setI] = useState(0);
  const current = images[i];
  return (
    <div className={`vp-gal vp-field--${field}`} data-tilt>
      <span className="vp-gal__word" dir="ltr" aria-hidden="true">
        {word}
      </span>
      {current ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={current.url} className="vp-gal__img" src={current.url} alt={current.alt || name} width={1035} height={1400} fetchPriority="high" />
      ) : (
        <span className="vp-gal__ph">{name}</span>
      )}
      <span className="vp-pcard__glare" aria-hidden="true" />
      {images.length > 1 && (
        <div className="vp-gal__thumbs" role="tablist" aria-label="صور المنتج">
          {images.map((img, j) => (
            <button
              key={img.url}
              type="button"
              role="tab"
              aria-selected={j === i}
              aria-label={`الصورة ${j + 1}`}
              className={j === i ? 'is-on' : ''}
              onClick={() => setI(j)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" width={64} height={86} loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
