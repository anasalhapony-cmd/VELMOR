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
