import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { CmsBlockRow, HomepageSectionRow, PageRow, FaqRow } from '@/types/database';

export const getHomepageSections = cache(async (): Promise<HomepageSectionRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('homepage_sections')
    .select('*')
    .eq('active', true)
    .order('sort_order');
  return data ?? [];
});

/** Active CMS blocks for a section (schedule window already enforced by RLS). */
export const getBlocks = cache(async (sectionKey: string): Promise<CmsBlockRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('cms_blocks')
    .select('*')
    .eq('section_key', sectionKey)
    .eq('active', true)
    .order('sort_order');
  return data ?? [];
});

export async function getBlock(sectionKey: string): Promise<CmsBlockRow | null> {
  const blocks = await getBlocks(sectionKey);
  return blocks[0] ?? null;
}

export const getPage = cache(async (slug: string): Promise<PageRow | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .eq('approved', true)
    .maybeSingle();
  return data ?? null;
});

export const getFaqs = cache(async (): Promise<FaqRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from('faqs').select('*').eq('active', true).order('sort_order');
  return data ?? [];
});

export const getDeliveryZones = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('delivery_zones')
    .select('id, name, city, area, fee')
    .eq('active', true)
    .order('sort_order');
  return data ?? [];
});

/** Approved, active info pages for the footer (unapproved placeholders never link). */
export const getFooterPages = cache(async (): Promise<{ slug: string; title: string }[]> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('pages')
      .select('slug, title')
      .eq('active', true)
      .eq('approved', true)
      .order('title');
    return (data ?? []).map((p) => ({ slug: String(p.slug), title: p.title }));
  } catch {
    return [];
  }
});

/** All active CMS blocks for a set of homepage sections in ONE query, grouped by key. */
export const getBlocksFor = cache(async (keys: readonly string[]): Promise<Record<string, CmsBlockRow[]>> => {
  const out: Record<string, CmsBlockRow[]> = {};
  if (!keys.length) return out;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('cms_blocks')
      .select('*')
      .in('section_key', keys as string[])
      .eq('active', true)
      .order('sort_order');
    for (const b of data ?? []) (out[b.section_key] ??= []).push(b);
  } catch {
    /* fall back to design copy */
  }
  return out;
});
