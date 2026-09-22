import { NOTE_TIER_LABELS_AR } from '@/config/constants';
import type { NotePyramid } from '@/types';

/**
 * Fragrance pyramid — top / heart / base. Responsive, and degrades to elegant
 * typography when no note icons exist (which is the norm here).
 */
export function FragrancePyramid({ notes }: { notes: NotePyramid }) {
  const tiers: { key: keyof NotePyramid; label: string; width: string }[] = [
    { key: 'top', label: NOTE_TIER_LABELS_AR.TOP, width: 'w-full' },
    { key: 'heart', label: NOTE_TIER_LABELS_AR.HEART, width: 'w-11/12' },
    { key: 'base', label: NOTE_TIER_LABELS_AR.BASE, width: 'w-10/12' },
  ];
  const hasAny = notes.top.length || notes.heart.length || notes.base.length;
  if (!hasAny) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      {tiers.map((t) => {
        const list = notes[t.key];
        if (list.length === 0) return null;
        return (
          <div
            key={t.key}
            className={`${t.width} rounded-lg border border-ink/10 bg-paper-200 px-6 py-5 text-center`}
          >
            <span className="eyebrow text-gold-700">{t.label}</span>
            <p className="mt-2 font-display-ar text-base text-ink">
              {list.map((n) => n.name).join(' · ')}
            </p>
          </div>
        );
      })}
    </div>
  );
}
