import { getSettings, settingString, settingBool } from '@/lib/settings';

export async function AnnouncementBar() {
  const s = await getSettings();
  if (!settingBool(s, 'announcement_enabled', true)) return null;
  const text = settingString(s, 'announcement', '');
  if (!text) return null;
  return (
    <div className="bg-ink text-paper">
      <div className="container-content flex h-9 items-center justify-center text-center text-xs tracking-wide">
        {text}
      </div>
    </div>
  );
}
