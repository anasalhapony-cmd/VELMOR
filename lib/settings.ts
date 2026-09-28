import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_WHATSAPP } from '@/config/site';

export type SettingsMap = Record<string, unknown>;

/**
 * Load all public store settings as a key -> value map, deduped per request.
 * Falls back to an empty map (callers use sensible defaults) if the fetch fails.
 */
export const getSettings = cache(async (): Promise<SettingsMap> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('site_settings').select('key, value');
    const map: SettingsMap = {};
    for (const row of data ?? []) map[row.key] = row.value;
    return map;
  } catch {
    return {};
  }
});

export function settingString(map: SettingsMap, key: string, fallback = ''): string {
  const v = map[key];
  return typeof v === 'string' ? v : fallback;
}

export function settingBool(map: SettingsMap, key: string, fallback = false): boolean {
  const v = map[key];
  return typeof v === 'boolean' ? v : fallback;
}

export async function getWhatsappNumber(): Promise<string> {
  const s = await getSettings();
  return settingString(s, 'whatsapp_number', DEFAULT_WHATSAPP);
}

export async function isMaintenanceMode(): Promise<boolean> {
  const s = await getSettings();
  return settingBool(s, 'maintenance_mode', false);
}
