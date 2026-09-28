import { createClient } from '@/lib/supabase/server';
import { getSettings } from '@/lib/settings';
import { toProductCard } from '@/lib/products/mappers';
import {
  scoreCandidate,
  resolveWeights,
  explain,
  matchPercent,
  type FinderCandidate,
  type CandidateNote,
} from '@/lib/finder/scoring';
import type { FinderInput } from '@/lib/validation/schemas';
import type { FinderResult } from '@/types';

const SELECT = `
  id, slug, name, name_ar, gender, season, occasions, longevity, sillage, freshness, sweetness,
  is_new_arrival, is_best_seller, is_featured, rating_avg, rating_count, art_field, short_description,
  brands ( name ),
  fragrance_families ( slug, name ),
  product_images ( url, alt, is_primary, sort_order ),
  product_variants ( id, size, unit, price, compare_at_price, active, stock_status, position ),
  product_notes ( tier, position, fragrance_notes ( slug, name ) )
`;

type NoteJoin = { fragrance_notes: CandidateNote | CandidateNote[] | null };

/**
 * Perfume Finder recommendation: fetch candidate products, score them with the
 * transparent scoring function using configurable weights, and return the best
 * matches with human-readable reasons and a plain-language explanation.
 * Deterministic; never uses an AI model.
 */
export async function recommend(answers: FinderInput, limit = 6): Promise<FinderResult[]> {
  const supabase = await createClient();
  const settings = await getSettings();
  const weights = resolveWeights(settings['finder_weights']);

  const { data, error } = await supabase
    .from('products')
    .select(SELECT)
    .eq('active', true)
    .eq('archived', false);

  if (error || !data) return [];

  const results: FinderResult[] = [];
  for (const row of data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = row as any;
    const fam = Array.isArray(p.fragrance_families) ? p.fragrance_families[0] : p.fragrance_families;
    const notes: CandidateNote[] = ((p.product_notes ?? []) as NoteJoin[])
      .map((pn) => (Array.isArray(pn.fragrance_notes) ? pn.fragrance_notes[0] : pn.fragrance_notes))
      .filter((n): n is CandidateNote => !!n);
    const candidate: FinderCandidate = {
      gender: p.gender,
      season: p.season,
      familySlug: fam?.slug ?? null,
      sillage: p.sillage,
      longevity: p.longevity,
      occasions: p.occasions ?? [],
      notes,
      freshness: p.freshness,
      sweetness: p.sweetness,
    };
    const { score, maxScore, reasons, phrases } = scoreCandidate(candidate, answers, weights);
    const card = toProductCard(p);
    // A sold-out product is never the headline recommendation.
    if (card.inStock === false) continue;
    results.push({
      product: card,
      score,
      maxScore,
      matchPct: matchPercent(score, maxScore),
      reasons,
      summary: explain(phrases),
    });
  }

  const answered = Object.values(answers).some((v) => v !== undefined && (!Array.isArray(v) || v.length));
  if (!answered) {
    return results
      .sort((a, b) => Number(b.product.isBestSeller) - Number(a.product.isBestSeller))
      .slice(0, limit);
  }

  return results
    .filter((r) => r.maxScore === 0 || r.score > 0)
    .sort((a, b) => {
      const ra = a.maxScore ? a.score / a.maxScore : 0;
      const rb = b.maxScore ? b.score / b.maxScore : 0;
      if (rb !== ra) return rb - ra;
      return Number(b.product.isBestSeller) - Number(a.product.isBestSeller);
    })
    .slice(0, limit);
}
