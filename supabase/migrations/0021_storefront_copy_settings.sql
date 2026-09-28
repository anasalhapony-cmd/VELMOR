-- =============================================================================
-- 0021 — Storefront copy settings (approved design wording, editable in Admin)
-- =============================================================================
-- The approved design says "توصيل داخل بنغازي" in the menu and the closing
-- frame. If you deliver beyond Benghazi, change it in Admin → Settings
-- (e.g. "توصيل إلى باب منزلك") so the promise always matches your zones.
insert into site_settings (key, value, group_name, label) values
  ('delivery_tagline', '"توصيل داخل بنغازي"', 'general', 'عبارة التوصيل في القائمة والإطار الأخير')
on conflict (key) do nothing;
