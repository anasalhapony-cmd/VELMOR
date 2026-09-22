'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Sparkles, ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';
import {
  GENDERS,
  GENDER_LABELS_AR,
  SEASONS,
  SEASON_LABELS_AR,
  OCCASIONS,
  OCCASION_LABELS_AR,
} from '@/config/constants';
import type { FinderAnswers, FinderResult } from '@/types';

type Family = { slug: string; name: string };

export function FinderWizard({ families }: { families: Family[] }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<FinderAnswers>({});
  const [results, setResults] = useState<FinderResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  const steps = [
    {
      q: 'لمن العطر؟',
      render: () => (
        <Options
          options={GENDERS.map((g) => ({ value: g, label: GENDER_LABELS_AR[g] }))}
          selected={answers.gender}
          onSelect={(v) => setAnswers((a) => ({ ...a, gender: v as FinderAnswers['gender'] }))}
        />
      ),
    },
    {
      q: 'ما نوع الاستخدام؟',
      render: () => (
        <Options
          options={OCCASIONS.map((o) => ({ value: o, label: OCCASION_LABELS_AR[o] }))}
          selected={answers.occasion}
          onSelect={(v) => setAnswers((a) => ({ ...a, occasion: v as FinderAnswers['occasion'] }))}
        />
      ),
    },
    {
      q: 'ما الموسم المفضل؟',
      render: () => (
        <Options
          options={SEASONS.map((s) => ({ value: s, label: SEASON_LABELS_AR[s] }))}
          selected={answers.season}
          onSelect={(v) => setAnswers((a) => ({ ...a, season: v as FinderAnswers['season'] }))}
        />
      ),
    },
    {
      q: 'ما الروائح التي تفضلها؟',
      hint: 'يمكنك اختيار أكثر من عائلة',
      render: () => (
        <div className="flex flex-wrap justify-center gap-2">
          {families.map((f) => {
            const active = answers.families?.includes(f.slug);
            return (
              <button
                key={f.slug}
                onClick={() =>
                  setAnswers((a) => {
                    const set = new Set(a.families ?? []);
                    if (set.has(f.slug)) set.delete(f.slug);
                    else set.add(f.slug);
                    return { ...a, families: [...set] };
                  })
                }
                className={`rounded-full border px-4 py-2 text-sm ${active ? 'border-ink bg-ink text-paper' : 'border-ink/20 hover:border-ink'}`}
              >
                {f.name}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      q: 'مستوى الفوحان المفضل',
      render: () => (
        <Scale value={answers.sillage} onSelect={(v) => setAnswers((a) => ({ ...a, sillage: v }))} lowLabel="خفيف" highLabel="قوي" />
      ),
    },
    {
      q: 'مستوى الثبات المفضل',
      render: () => (
        <Scale value={answers.longevity} onSelect={(v) => setAnswers((a) => ({ ...a, longevity: v }))} lowLabel="قصير" highLabel="طويل" />
      ),
    },
  ];

  async function finish() {
    setLoading(true);
    try {
      const res = await fetch('/api/finder', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(answers),
      });
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setAnswers({});
    setResults(null);
    setStep(0);
  }

  if (results) {
    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-display-ar text-h2 font-medium">ترشيحاتنا لك</h2>
          <button onClick={restart} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink">
            <RotateCcw size={15} /> إعادة
          </button>
        </div>
        {results.length === 0 ? (
          <div className="grid place-items-center rounded-lg border border-dashed border-ink/20 py-16 text-center">
            <p className="text-ink-500">لم نجد تطابقًا دقيقًا. تصفّح كامل المجموعة.</p>
            <Link href="/products" className="btn-primary mt-4">كل العطور</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {results.map((r) => (
              <div key={r.product.id}>
                <ProductCard product={r.product} />
                {r.maxScore > 0 && (
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold-700">
                      <Sparkles size={12} /> تطابق {Math.round((r.score / r.maxScore) * 100)}%
                    </span>
                    {r.reasons[0] && <p className="mt-1 text-xs text-ink-500">{r.reasons[0]}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const current = steps[step]!;
  const isLast = step === steps.length - 1;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8 h-1 w-full rounded-full bg-ink/10">
        <div className="h-1 rounded-full bg-gold transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>
      <div className="rounded-lg border border-ink/10 p-8 text-center">
        <span className="eyebrow">سؤال {step + 1} من {steps.length}</span>
        <h2 className="mt-2 font-display-ar text-h2 font-medium">{current.q}</h2>
        {current.hint && <p className="mt-1 text-sm text-ink-500">{current.hint}</p>}
        <div className="mt-8">{current.render()}</div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 disabled:opacity-40"
        >
          <ArrowRight size={16} /> السابق
        </button>
        {isLast ? (
          <button onClick={finish} disabled={loading} className="btn-gold">
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'اعرض النتائج'}
          </button>
        ) : (
          <button onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} className="btn-primary">
            التالي <ArrowLeft size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function Options({
  options,
  selected,
  onSelect,
}: {
  options: { value: string; label: string }[];
  selected?: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onSelect(o.value)}
          className={`rounded-lg border px-5 py-3 text-sm ${selected === o.value ? 'border-ink bg-ink text-paper' : 'border-ink/20 hover:border-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Scale({
  value,
  onSelect,
  lowLabel,
  highLabel,
}: {
  value?: number;
  onSelect: (v: number) => void;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onSelect(n)}
            className={`grid h-11 w-11 place-items-center rounded-full border text-sm ${value === n ? 'border-ink bg-ink text-paper' : 'border-ink/20 hover:border-ink'}`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-ink-500">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
