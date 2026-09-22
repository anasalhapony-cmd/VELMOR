import {
  GENDER_LABELS_AR,
  CONCENTRATION_LABELS_AR,
  SEASON_LABELS_AR,
  OCCASION_LABELS_AR,
} from '@/config/constants';
import type { ProductDetail } from '@/types';

function IntensityBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-ink-500">{label}</span>
      </div>
      <div className="flex gap-1" aria-label={`${label} ${value} من 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= value ? 'bg-gold' : 'bg-ink/10'}`} />
        ))}
      </div>
    </div>
  );
}

export function ProductAttributes({ product }: { product: ProductDetail }) {
  const facts: { label: string; value: string }[] = [];
  if (product.gender) facts.push({ label: 'التصنيف', value: GENDER_LABELS_AR[product.gender] });
  if (product.concentration) facts.push({ label: 'التركيز', value: CONCENTRATION_LABELS_AR[product.concentration] });
  if (product.season) facts.push({ label: 'الموسم', value: SEASON_LABELS_AR[product.season] });
  if (product.familyName) facts.push({ label: 'العائلة العطرية', value: product.familyName });
  if (product.occasions.length)
    facts.push({ label: 'المناسبة', value: product.occasions.map((o) => OCCASION_LABELS_AR[o]).join('، ') });

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      {facts.length > 0 && (
        <dl className="grid grid-cols-2 gap-y-4">
          {facts.map((f) => (
            <div key={f.label} className="col-span-2 flex justify-between border-b border-ink/10 pb-2">
              <dt className="text-sm text-ink-500">{f.label}</dt>
              <dd className="text-sm font-medium text-ink">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {(product.longevity || product.sillage) && (
        <div className="flex flex-col justify-center gap-4">
          {product.longevity ? <IntensityBar label="الثبات" value={product.longevity} /> : null}
          {product.sillage ? <IntensityBar label="الفوحان" value={product.sillage} /> : null}
        </div>
      )}
    </div>
  );
}
