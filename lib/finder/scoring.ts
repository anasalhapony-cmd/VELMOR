import type { Gender, Season, Occasion } from '@/config/constants';
import type { FinderAnswers } from '@/types';

/**
 * Transparent Perfume Finder scoring.
 *
 * A deterministic, explainable scoring function over real product metadata —
 * NOT an LLM. Each answered dimension contributes up to its configured weight;
 * `maxScore` counts only the dimensions the customer actually answered, so
 * score/maxScore is a meaningful match percentage. Weights are configurable
 * (site_settings.finder_weights); defaults below.
 */
export interface FinderWeights {
  gender: number;
  season: number;
  family: number;
  sillage: number;
  longevity: number;
  occasion: number;
}

export const DEFAULT_FINDER_WEIGHTS: FinderWeights = {
  gender: 3,
  season: 2,
  family: 3,
  sillage: 1,
  longevity: 1,
  occasion: 2,
};

export interface FinderCandidate {
  gender: Gender | null;
  season: Season | null;
  familySlug: string | null;
  sillage: number | null;
  longevity: number | null;
  occasions: Occasion[];
}

export interface ScoreResult {
  score: number;
  maxScore: number;
  reasons: string[];
}

/** Closeness of two 1..5 intensity values, in [0,1]. */
function closeness(a: number, b: number): number {
  return 1 - Math.abs(a - b) / 4;
}

export function scoreCandidate(
  cand: FinderCandidate,
  answers: FinderAnswers,
  weights: FinderWeights = DEFAULT_FINDER_WEIGHTS
): ScoreResult {
  let score = 0;
  let maxScore = 0;
  const reasons: string[] = [];

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
    } else if (cand.season === 'ALL_YEAR') {
      score += weights.season * 0.75;
      reasons.push('يصلح طوال العام');
    }
  }

  if (answers.families && answers.families.length > 0) {
    maxScore += weights.family;
    if (cand.familySlug && answers.families.includes(cand.familySlug)) {
      score += weights.family;
      reasons.push('من عائلتك العطرية المفضلة');
    }
  }

  if (answers.occasion) {
    maxScore += weights.occasion;
    if (cand.occasions.includes(answers.occasion)) {
      score += weights.occasion;
      reasons.push('مناسب للمناسبة');
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

  return { score: Math.round(score * 100) / 100, maxScore, reasons };
}

/** Parse/validate weights coming from settings (jsonb), falling back to defaults. */
export function resolveWeights(raw: unknown): FinderWeights {
  if (!raw || typeof raw !== 'object') return DEFAULT_FINDER_WEIGHTS;
  const r = raw as Record<string, unknown>;
  const num = (k: keyof FinderWeights) =>
    typeof r[k] === 'number' && Number.isFinite(r[k]) ? (r[k] as number) : DEFAULT_FINDER_WEIGHTS[k];
  return {
    gender: num('gender'),
    season: num('season'),
    family: num('family'),
    sillage: num('sillage'),
    longevity: num('longevity'),
    occasion: num('occasion'),
  };
}
