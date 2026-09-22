import { createClient } from '@/lib/supabase/server';
import { getSettings } from '@/lib/settings';
import { toProductCard } from '@/lib/products/mappers';
import { scoreCandidate, resolveWeights, type FinderCandidate } from '@/lib/finder/scoring';
import type { FinderInput } from '@/lib/validation/schemas';
import type { FinderResult, ProductCard } from '@/types';

const SELECT = `
  id, slug, name, name_ar, gender, season, occasions, longevity, sillage,
  is_new_arrival, is_best_seller, is_featured, rating_avg, rating_count,
  brands ( name ),
  fragrance_families ( slug ),
  product_images ( url, alt, is_primary, sort_order ),
  product_variants ( id, size, unit, price, compare_at_price, active, stock_status, position )
`;

/**
 * Perfume Finder recommendation: fetch candidate products, score them with the
 * transparent scoring function using configurable weights, and return the best
 * matches with human-readable reasons. Handles no-match / missing metadata
 * gracefully. Never uses an LLM.
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
    const candidate: FinderCandidate = {
      gender: p.gender,
      season: p.season,
      familySlug: fam?.slug ?? null,
      sillage: p.sillage,
      longevity: p.longevity,
      occasions: p.occasions ?? [],
    };
    const { score, maxScore, reasons } = scoreCandidate(candidate, answers, weights);
    const card: ProductCard = toProductCard(p);
    results.push({ product: card, score, maxScore, reasons });
  }

  // If the customer answered nothing, fall back to best sellers / featured.
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
