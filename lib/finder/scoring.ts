import type { Gender, Season, Occasion } from '@/config/constants';
import type { FinderAnswers } from '@/types';

/**
 * Transparent Perfume Finder scoring ("مستشار العطور").
 *
 * A deterministic, explainable scoring function over real product metadata —
 * NOT an AI model. Each answered dimension contributes up to its configured
 * weight; `maxScore` counts only the dimensions the customer actually answered,
 * so score/maxScore is an honest match percentage. Weights are configurable
 * (site_settings.finder_weights); defaults below.
 *
 * Freshness / sweetness come from the product when the admin set them, and are
 * otherwise DERIVED from the note pyramid + family with the fixed accord table
 * below — so every number shown to the customer can be traced back to data.
 */
export interface FinderWeights {
  gender: number;
  season: number;
  family: number;
  notes: number;
  occasion: number;
  sillage: number;
  longevity: number;
  intensity: number;
  freshness: number;
  sweetness: number;
}

export const DEFAULT_FINDER_WEIGHTS: FinderWeights = {
  gender: 3,
  season: 2,
  family: 3,
  notes: 2,
  occasion: 2,
  sillage: 1,
  longevity: 1,
  intensity: 1.5,
  freshness: 1.5,
  sweetness: 1.5,
};

export interface CandidateNote {
  slug: string;
  name: string;
}

export interface FinderCandidate {
  gender: Gender | null;
  season: Season | null;
  familySlug: string | null;
  sillage: number | null;
  longevity: number | null;
  occasions: Occasion[];
  notes?: CandidateNote[];
  /** Admin-set 1..5; when null the value is derived from notes + family. */
  freshness?: number | null;
  sweetness?: number | null;
}

export interface ScoreResult {
  score: number;
  maxScore: number;
  /** Short reason labels (bullets). */
  reasons: string[];
  /** Phrases used to build the explanation sentence. */
  phrases: string[];
}

// ---------------------------------------------------------------------------
// Accord table (note slug -> contribution). Documented, fixed, testable.
// ---------------------------------------------------------------------------
const FRESH_NOTES: Record<string, number> = {
  bergamot: 1, lemon: 1, mint: 1, marine: 1, lavender: 0.6, cardamom: 0.4,
  vetiver: 0.4, cedar: 0.3, jasmine: 0.2,
};
const SWEET_NOTES: Record<string, number> = {
  vanilla: 1, amber: 1, musk: 0.5, rose: 0.4, jasmine: 0.4, sandalwood: 0.5,
  oud: 0.3, saffron: 0.3, patchouli: 0.3, leather: 0.2,
};
const FAMILY_FRESH: Record<string, number> = { fresh: 2, citrus: 2, aromatic: 1.2, floral: 0.4 };
const FAMILY_SWEET: Record<string, number> = { oriental: 1.6, woody: 0.6, floral: 0.8 };

const SEASON_PHRASE: Record<Season, string> = {
  SUMMER: 'يناسب الصيف',
  WINTER: 'يناسب الشتاء',
  SPRING: 'يناسب الربيع',
  AUTUMN: 'يناسب الخريف',
  ALL_YEAR: 'يصلح طوال العام',
};
const OCCASION_PHRASE: Record<Occasion, string> = {
  DAILY: 'يناسب الاستخدام اليومي',
  WORK: 'يناسب أجواء العمل',
  FORMAL: 'يناسب المناسبات الرسمية',
  EVENING: 'يناسب السهرات',
  SPECIAL: 'يناسب المناسبات الخاصة',
};

function clamp15(n: number): number {
  return Math.max(1, Math.min(5, Math.round(n * 10) / 10));
}

/** Derive a 1..5 profile from the note pyramid and family. */
export function deriveProfile(cand: Pick<FinderCandidate, 'notes' | 'familySlug'>): {
  freshness: number;
  sweetness: number;
} {
  let fresh = 0;
  let sweet = 0;
  for (const n of cand.notes ?? []) {
    fresh += FRESH_NOTES[n.slug] ?? 0;
    sweet += SWEET_NOTES[n.slug] ?? 0;
  }
  fresh += FAMILY_FRESH[cand.familySlug ?? ''] ?? 0;
  sweet += FAMILY_SWEET[cand.familySlug ?? ''] ?? 0;
  return { freshness: clamp15(1 + fresh), sweetness: clamp15(1 + sweet) };
}

export function candidateProfile(cand: FinderCandidate): { freshness: number; sweetness: number; intensity: number | null } {
  const derived = deriveProfile(cand);
  const intensity =
    typeof cand.sillage === 'number' && typeof cand.longevity === 'number'
      ? (cand.sillage + cand.longevity) / 2
      : typeof cand.sillage === 'number'
        ? cand.sillage
        : typeof cand.longevity === 'number'
          ? cand.longevity
          : null;
  return {
    freshness: typeof cand.freshness === 'number' ? cand.freshness : derived.freshness,
    sweetness: typeof cand.sweetness === 'number' ? cand.sweetness : derived.sweetness,
    intensity,
  };
}

/** Closeness of two 1..5 values, in [0,1]. */
function closeness(a: number, b: number): number {
  return Math.max(0, 1 - Math.abs(a - b) / 4);
}

export function scoreCandidate(
  cand: FinderCandidate,
  answers: FinderAnswers,
  weights: FinderWeights = DEFAULT_FINDER_WEIGHTS
): ScoreResult {
  let score = 0;
  let maxScore = 0;
  const reasons: string[] = [];
  const phrases: string[] = [];
  const profile = candidateProfile(cand);

  if (answers.gender) {
    maxScore += weights.gender;
    if (cand.gender === answers.gender) {
      score += weights.gender;
      reasons.push('يناسب التصنيف المطلوب');
    } else if (cand.gender === 'UNISEX') {
      score += weights.gender; // unisex fits any requested gender
      reasons.push('مناسب للجنسين');
    }
  }

  if (answers.season) {
    maxScore += weights.season;
    if (cand.season === answers.season) {
      score += weights.season;
      reasons.push('مناسب للموسم');
      phrases.push(SEASON_PHRASE[answers.season]);
    } else if (cand.season === 'ALL_YEAR') {
      score += weights.season * 0.75;
      reasons.push('يصلح طوال العام');
      phrases.push('يصلح طوال العام');
    }
  }

  if (answers.families && answers.families.length > 0) {
    maxScore += weights.family;
    if (cand.familySlug && answers.families.includes(cand.familySlug)) {
      score += weights.family;
      reasons.push('من عائلتك العطرية المفضلة');
      phrases.push('ينتمي إلى العائلة العطرية التي اخترتها');
    }
  }

  if (answers.notes && answers.notes.length > 0) {
    maxScore += weights.notes;
    const hits = (cand.notes ?? []).filter((n) => answers.notes!.includes(n.slug));
    if (hits.length > 0) {
      const ratio = Math.min(1, hits.length / Math.min(answers.notes.length, 2));
      score += weights.notes * ratio;
      reasons.push('يحتوي على مكوّنات تفضّلها');
      phrases.push(`يحتوي على ${hits.slice(0, 2).map((h) => h.name).join(' و')} التي تفضّلها`);
    }
  }

  if (answers.occasion) {
    maxScore += weights.occasion;
    if (cand.occasions.includes(answers.occasion)) {
      score += weights.occasion;
      reasons.push('مناسب للمناسبة');
      phrases.push(OCCASION_PHRASE[answers.occasion]);
    }
  }

  if (typeof answers.freshness === 'number') {
    maxScore += weights.freshness;
    const c = closeness(profile.freshness, answers.freshness);
    score += weights.freshness * c;
    if (c >= 0.75) {
      reasons.push('مستوى الانتعاش قريب مما تحب');
      if (answers.freshness >= 4) phrases.push('يجمع بين الانتعاش والإشراقة');
    }
  }

  if (typeof answers.sweetness === 'number') {
    maxScore += weights.sweetness;
    const c = closeness(profile.sweetness, answers.sweetness);
    score += weights.sweetness * c;
    if (c >= 0.75) {
      reasons.push('درجة الحلاوة قريبة مما تحب');
      if (answers.sweetness >= 4) phrases.push('بدفءٍ حلوٍ واضح');
      else if (answers.sweetness <= 2) phrases.push('بعيد عن الحلاوة الثقيلة');
    }
  }

  if (typeof answers.intensity === 'number' && profile.intensity !== null) {
    maxScore += weights.intensity;
    const c = closeness(profile.intensity, answers.intensity);
    score += weights.intensity * c;
    if (c >= 0.75) {
      reasons.push('قوّة الحضور مناسبة');
      if (answers.intensity >= 4) phrases.push('بحضورٍ قوي وثبات طويل');
      else if (answers.intensity <= 2) phrases.push('بحضورٍ هادئ قريب من الجلد');
    }
  }

  if (typeof answers.sillage === 'number' && typeof cand.sillage === 'number') {
    maxScore += weights.sillage;
    const c = closeness(cand.sillage, answers.sillage);
    score += weights.sillage * c;
    if (c >= 0.75) reasons.push('مستوى الفوحان مناسب');
  }

  if (typeof answers.longevity === 'number' && typeof cand.longevity === 'number') {
    maxScore += weights.longevity;
    const c = closeness(cand.longevity, answers.longevity);
    score += weights.longevity * c;
    if (c >= 0.75) reasons.push('مستوى الثبات مناسب');
  }

  return { score: Math.round(score * 100) / 100, maxScore, reasons, phrases };
}

/** Human explanation, e.g. "اخترنا لك هذا العطر لأنه يجمع بين الانتعاش والإشراقة ويناسب الاستخدام اليومي." */
export function explain(phrases: string[]): string {
  const list = phrases.slice(0, 3);
  if (list.length === 0) return 'اخترناه لك لأنه من أكثر عطورنا طلبًا وتوازنًا.';
  const joined = list.length === 1 ? list[0] : `${list.slice(0, -1).join('، ')} و${list[list.length - 1]}`;
  return `اخترنا لك هذا العطر لأنه ${joined}.`;
}

export function matchPercent(score: number, maxScore: number): number | null {
  if (!maxScore) return null;
  return Math.round((score / maxScore) * 100);
}

/** Parse/validate weights coming from settings (jsonb), falling back to defaults. */
export function resolveWeights(raw: unknown): FinderWeights {
  if (!raw || typeof raw !== 'object') return DEFAULT_FINDER_WEIGHTS;
  const r = raw as Record<string, unknown>;
  const num = (k: keyof FinderWeights) =>
    typeof r[k] === 'number' && Number.isFinite(r[k]) && (r[k] as number) >= 0
      ? (r[k] as number)
      : DEFAULT_FINDER_WEIGHTS[k];
  return {
    gender: num('gender'),
    season: num('season'),
    family: num('family'),
    notes: num('notes'),
    occasion: num('occasion'),
    sillage: num('sillage'),
    longevity: num('longevity'),
    intensity: num('intensity'),
    freshness: num('freshness'),
    sweetness: num('sweetness'),
  };
}
