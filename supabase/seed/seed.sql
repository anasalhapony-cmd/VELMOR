-- =============================================================================
-- VELMOR — DEVELOPMENT SEED DATA  (clearly marked, NOT production data)
-- =============================================================================
-- Sample content so the app has something to render in development. The admin
-- MUST replace all products, imagery, prices, delivery fees and page copy
-- before launch. Product imagery here points at placeholder paths.
-- Idempotent: safe to re-run (uses ON CONFLICT on natural keys).
-- =============================================================================

-- ---- Store settings --------------------------------------------------------
insert into site_settings (key, value, group_name, label) values
  ('store_name',            '"VELMOR"',                'general',  'اسم المتجر'),
  ('store_description',     '"علامة عطور ليبية عصرية للرجال"', 'general', 'وصف المتجر'),
  ('currency',              '"LYD"',                   'general',  'العملة'),
  ('is_dev_seed',           'true',                    'general',  'بيانات تجريبية'),
  ('whatsapp_number',       '"0919774260"',            'contact',  'رقم واتساب'),
  ('contact_phone',         '"0919774260"',            'contact',  'رقم التواصل'),
  ('announcement',          '"توصيل داخل بنغازي — الدفع عند الاستلام"', 'general', 'شريط الإعلان'),
  ('announcement_enabled',  'true',                    'general',  'تفعيل شريط الإعلان'),
  ('reviews_enabled',       'true',                    'features', 'تفعيل التقييمات'),
  ('gift_wrapping_enabled', 'false',                   'features', 'تغليف الهدايا'),
  ('notifications_enabled', 'true',                    'features', 'إشعارات الطلبات (طابور)'),
  ('maintenance_mode',      'false',                   'features', 'وضع الصيانة'),
  ('delivery_enabled',      'true',                    'delivery', 'تفعيل التوصيل'),
  ('social_instagram',      '""',                      'social',   'إنستغرام'),
  ('social_facebook',       '""',                      'social',   'فيسبوك'),
  ('social_tiktok',         '""',                      'social',   'تيك توك'),
  ('seo_default_title',     '"VELMOR — عطور تُعبّر عنك"', 'seo',   'عنوان SEO الافتراضي'),
  ('seo_default_description','"تسوق عطور VELMOR الفاخرة للرجال في ليبيا — توصيل والدفع عند الاستلام."', 'seo', 'وصف SEO'),
  -- Perfume Finder scoring weights (configurable; used by lib/finder).
  ('finder_weights', '{"gender":3,"season":2,"family":3,"notes":2,"sillage":1,"longevity":1,"occasion":2}', 'features', 'أوزان مستشار العطور')
on conflict (key) do nothing;

-- ---- Homepage sections (order + visibility) --------------------------------
insert into homepage_sections (key, title, sort_order, active) values
  ('announcement','شريط الإعلان',0,true),
  ('hero','الواجهة',1,true),
  ('featured_collection','مجموعة مميزة',2,true),
  ('best_sellers','الأكثر مبيعًا',3,true),
  ('brand_story','قصة العلامة',4,true),
  ('perfume_finder','مستشار العطور',5,true),
  ('fragrance_families','العائلات العطرية',6,true),
  ('featured_products','منتجات مختارة',7,true),
  ('new_arrivals','وصل حديثًا',8,true),
  ('seasonal','مجموعة الموسم',9,true),
  ('reviews','آراء العملاء',10,true),
  ('why_velmor','لماذا فيلمور',11,true),
  ('delivery_info','معلومات التوصيل',12,true),
  ('whatsapp_cta','تواصل واتساب',13,true),
  ('brand_statement','بيان العلامة',14,true)
on conflict (key) do nothing;

-- ---- CMS content blocks ----------------------------------------------------
insert into cms_blocks (section_key, title, subtitle, body, cta_label, cta_href, image_url, sort_order) values
  ('hero','عطرٌ يُشبه حضورك','أناقة بحضور وثقة',
   'مجموعة VELMOR للرجال — توازن بين الفخامة والجرأة.',
   'اكتشف العطور','/products','/images/hero.jpg',0),
  ('brand_story','قصة VELMOR', null,
   'وُلدت VELMOR في ليبيا لجيل جديد من الرجال يهتمون بالحضور والثقة والمظهر. مستوحاة من المعنى الفرنسي لكلمة «الأناقة»، تمثّل VELMOR الأناقة بطابعٍ مميز — توازن بين الفخامة والرجولة وثقافة الشارع.',
   'المزيد عنّا','/pages/about', null, 0),
  ('brand_statement','VELMOR', null, 'ليست مجرد عطور، بل أسلوب حياة.', null, null, null, 0),
  ('why_velmor','منتج فاخر', null, 'عطور بتركيبات غنية وثبات عالٍ.', null, null, null, 0),
  ('why_velmor','الدفع عند الاستلام', null, 'ادفع نقدًا عند استلام طلبك.', null, null, null, 1),
  ('why_velmor','توصيل سريع', null, 'توصيل داخل بنغازي إلى باب منزلك.', null, null, null, 2),
  ('delivery_info','توصيل داخل بنغازي', null, 'نوصل طلبك إلى جميع مناطق بنغازي مع الدفع عند الاستلام.', null, null, null, 0)
on conflict do nothing;

-- ---- Legal / info pages (§112: placeholders, NOT approved) ------------------
insert into pages (slug, title, body, is_placeholder, approved, noindex) values
  ('about','عن VELMOR','هذا نص مبدئي. سيقوم المسؤول بتحديثه.', true, false, true),
  ('privacy','سياسة الخصوصية','نص مبدئي — بانتظار الاعتماد.', true, false, true),
  ('terms','الشروط والأحكام','نص مبدئي — بانتظار الاعتماد.', true, false, true),
  ('delivery-policy','سياسة التوصيل','نص مبدئي — بانتظار الاعتماد.', true, false, true),
  ('return-policy','سياسة الإرجاع','نص مبدئي — بانتظار الاعتماد.', true, false, true),
  ('contact','تواصل معنا','تواصل معنا عبر واتساب.', true, false, true)
on conflict (slug) do nothing;

insert into faqs (question, answer, sort_order) values
  ('كيف أطلب؟','اختر العطر والحجم، أضِفه للسلة، ثم أكمل بيانات التوصيل واختر الدفع عند الاستلام.',0),
  ('كيف أتتبع طلبي؟','من صفحة «تتبع الطلب» بإدخال رقم الطلب ورقم هاتفك.',1),
  ('ما مناطق التوصيل؟','نوصل حاليًا داخل بنغازي.',2),
  ('ما طرق الدفع؟','الدفع عند الاستلام نقدًا.',3)
on conflict do nothing;

-- ---- Delivery zones (Benghazi) --------------------------------------------
insert into delivery_zones (name, city, fee, sort_order) values
  ('وسط المدينة','بنغازي',10,0),
  ('الصابري','بنغازي',12,1),
  ('الكيش','بنغازي',12,2),
  ('قاريونس','بنغازي',12,3),
  ('الحدائق','بنغازي',12,4),
  ('بنينا','بنغازي',15,5)
on conflict do nothing;

-- ---- Brand, families, notes, categories ------------------------------------
insert into brands (slug, name, name_en) values ('velmor','فيلمور','VELMOR')
on conflict (slug) do nothing;

insert into fragrance_families (slug, name, name_en, sort_order) values
  ('woody','خشبية','Woody',0),
  ('oriental','شرقية','Oriental',1),
  ('fresh','منعشة','Fresh',2),
  ('aromatic','عطرية','Aromatic',3),
  ('floral','زهرية','Floral',4),
  ('citrus','حمضية','Citrus',5)
on conflict (slug) do nothing;

insert into fragrance_notes (slug, name, name_en) values
  ('bergamot','برغموت','Bergamot'), ('lemon','ليمون','Lemon'),
  ('lavender','لافندر','Lavender'), ('mint','نعناع','Mint'),
  ('saffron','زعفران','Saffron'), ('cardamom','هيل','Cardamom'),
  ('pepper','فلفل أسود','Black Pepper'), ('oud','عود','Oud'),
  ('rose','ورد','Rose'), ('jasmine','ياسمين','Jasmine'),
  ('marine','بحري','Marine'), ('leather','جلد','Leather'),
  ('sandalwood','خشب الصندل','Sandalwood'), ('cedar','أرز','Cedar'),
  ('vetiver','فيتيفر','Vetiver'), ('amber','عنبر','Amber'),
  ('musk','مسك','Musk'), ('vanilla','فانيليا','Vanilla'),
  ('patchouli','باتشولي','Patchouli')
on conflict (slug) do nothing;

insert into categories (slug, name, sort_order) values
  ('men','رجالية',0), ('women','نسائية',1), ('unisex','للجنسين',2)
on conflict (slug) do nothing;

-- ---- Products, variants, images, note assignments, links -------------------
do $$
declare
  b uuid := (select id from brands where slug='velmor');
  f_woody uuid := (select id from fragrance_families where slug='woody');
  f_orient uuid := (select id from fragrance_families where slug='oriental');
  f_fresh uuid := (select id from fragrance_families where slug='fresh');
  f_arom uuid := (select id from fragrance_families where slug='aromatic');
  cat_men uuid := (select id from categories where slug='men');
  cat_uni uuid := (select id from categories where slug='unisex');
  pid uuid;
begin
  -- Only seed products once.
  if exists (select 1 from products where slug='velmor-noir') then return; end if;

  -- 1) VELMOR NOIR
  insert into products (slug,name,name_ar,brand_id,family_id,gender,concentration,season,occasions,
    short_description,description,longevity,sillage,is_featured,is_best_seller,active,sort_order)
  values ('velmor-noir','VELMOR NOIR','فيلمور نوار',b,f_woody,'MEN','EAU_DE_PARFUM','WINTER',
    array['EVENING','FORMAL']::occasion[],
    'عطر خشبي شرقي جريء للسهرات.',
    'تركيبة خشبية شرقية غنية تجمع بين العود والعنبر مع لمسة من الحمضيات في المقدمة — حضور واثق يدوم طويلًا.',
    5,4,true,true,true,0) returning id into pid;
  insert into product_variants (product_id,size,unit,sku,price,compare_at_price,stock_quantity,position) values
    (pid,50,'ml','NOIR-50',150,200,25,0),
    (pid,100,'ml','NOIR-100',250,300,15,1);
  insert into product_images (product_id,url,alt,is_primary,sort_order) values
    (pid,'/images/products/noir.jpg','VELMOR NOIR',true,0);
  insert into product_categories(product_id,category_id) values (pid,cat_men);
  insert into product_notes(product_id,note_id,tier,position)
    select pid, id, 'TOP', row_number() over () from fragrance_notes where slug in ('bergamot','lavender');
  insert into product_notes(product_id,note_id,tier,position)
    select pid, id, 'HEART', row_number() over () from fragrance_notes where slug in ('oud','rose');
  insert into product_notes(product_id,note_id,tier,position)
    select pid, id, 'BASE', row_number() over () from fragrance_notes where slug in ('amber','musk');

  -- 2) VELMOR BLANC
  insert into products (slug,name,name_ar,brand_id,family_id,gender,concentration,season,occasions,
    short_description,description,longevity,sillage,is_new_arrival,active,sort_order)
  values ('velmor-blanc','VELMOR BLANC','فيلمور بلان',b,f_fresh,'MEN','EAU_DE_TOILETTE','SUMMER',
    array['DAILY','WORK']::occasion[],
    'عطر منعش نظيف للنهار.',
    'انتعاش حمضي بحري مثالي لأيام الصيف والاستخدام اليومي.',
    3,3,true,true,1) returning id into pid;
  insert into product_variants (product_id,size,unit,sku,price,stock_quantity,position) values
    (pid,50,'ml','BLANC-50',120,30,0),
    (pid,100,'ml','BLANC-100',190,20,1);
  insert into product_images (product_id,url,alt,is_primary) values (pid,'/images/products/blanc.jpg','VELMOR BLANC',true);
  insert into product_categories(product_id,category_id) values (pid,cat_men);
  insert into product_notes(product_id,note_id,tier,position)
    select pid,id,'TOP',row_number() over() from fragrance_notes where slug in ('bergamot','lemon');
  insert into product_notes(product_id,note_id,tier,position)
    select pid,id,'HEART',row_number() over() from fragrance_notes where slug in ('mint','marine');
  insert into product_notes(product_id,note_id,tier,position)
    select pid,id,'BASE',row_number() over() from fragrance_notes where slug in ('cedar','musk');

  -- 3) VELMOR OUD ROYAL
  insert into products (slug,name,name_ar,brand_id,family_id,gender,concentration,season,occasions,
    short_description,description,longevity,sillage,is_featured,is_best_seller,active,sort_order)
  values ('velmor-oud-royal','VELMOR OUD ROYAL','عود فيلمور الملكي',b,f_orient,'UNISEX','PARFUM','WINTER',
    array['SPECIAL','EVENING']::occasion[],
    'عود فاخر بثبات استثنائي.',
    'عطر شرقي فاخر يتصدره العود مع الزعفران والورد وقاعدة من خشب الصندل والعنبر.',
    5,5,true,true,true,2) returning id into pid;
  insert into product_variants (product_id,size,unit,sku,price,compare_at_price,stock_quantity,position) values
    (pid,50,'ml','OUD-50',220,null,12,0),
    (pid,100,'ml','OUD-100',360,null,8,1),
    (pid,150,'ml','OUD-150',500,null,4,2);
  insert into product_images (product_id,url,alt,is_primary) values (pid,'/images/products/oud.jpg','VELMOR OUD ROYAL',true);
  insert into product_categories(product_id,category_id) values (pid,cat_uni);
  insert into product_notes(product_id,note_id,tier,position)
    select pid,id,'TOP',row_number() over() from fragrance_notes where slug in ('saffron','bergamot');
  insert into product_notes(product_id,note_id,tier,position)
    select pid,id,'HEART',row_number() over() from fragrance_notes where slug in ('oud','rose');
  insert into product_notes(product_id,note_id,tier,position)
    select pid,id,'BASE',row_number() over() from fragrance_notes where slug in ('sandalwood','amber');

  -- 4) VELMOR VERT (green — Blooming Jasmine & Velvet Rose)
  insert into products (slug,name,name_ar,brand_id,family_id,gender,concentration,season,occasions,
    short_description,description,longevity,sillage,is_new_arrival,active,sort_order)
  values ('velmor-vert','VELMOR VERT','فيلمور فير',b,f_arom,'MEN','EAU_DE_PARFUM','SPRING',
    array['DAILY','WORK']::occasion[],
    'أخضر عطري بلمسة ياسمين وورد.',
    'انطلاقة خضراء عطرية مع الياسمين والورد المخملي وقاعدة من الفيتيفر — أناقة نهارية.',
    4,3,true,true,3) returning id into pid;
  insert into product_variants (product_id,size,unit,sku,price,stock_quantity,position) values
    (pid,50,'ml','VERT-50',160,22,0),
    (pid,100,'ml','VERT-100',260,14,1);
  insert into product_images (product_id,url,alt,is_primary) values (pid,'/images/products/vert.jpg','VELMOR VERT',true);
  insert into product_categories(product_id,category_id) values (pid,cat_men);
  insert into product_notes(product_id,note_id,tier,position)
    select pid,id,'TOP',row_number() over() from fragrance_notes where slug in ('bergamot','cardamom');
  insert into product_notes(product_id,note_id,tier,position)
    select pid,id,'HEART',row_number() over() from fragrance_notes where slug in ('jasmine','rose');
  insert into product_notes(product_id,note_id,tier,position)
    select pid,id,'BASE',row_number() over() from fragrance_notes where slug in ('vetiver','musk');

  -- 5) VELMOR INTENSE
  insert into products (slug,name,name_ar,brand_id,family_id,gender,concentration,season,occasions,
    short_description,description,longevity,sillage,is_best_seller,active,sort_order)
  values ('velmor-intense','VELMOR INTENSE','فيلمور انتنس',b,f_woody,'MEN','EXTRAIT','ALL_YEAR',
    array['EVENING','SPECIAL']::occasion[],
    'تركيز عالٍ بطابع جلدي دافئ.',
    'إكستريه مركّز بطابع جلدي حار مع العود والفانيليا والعنبر — للمناسبات المميزة.',
    5,5,true,true,4) returning id into pid;
  insert into product_variants (product_id,size,unit,sku,price,compare_at_price,stock_quantity,position) values
    (pid,50,'ml','INT-50',280,340,10,0),
    (pid,100,'ml','INT-100',460,null,6,1);
  insert into product_images (product_id,url,alt,is_primary) values (pid,'/images/products/intense.jpg','VELMOR INTENSE',true);
  insert into product_categories(product_id,category_id) values (pid,cat_men);
  insert into product_notes(product_id,note_id,tier,position)
    select pid,id,'TOP',row_number() over() from fragrance_notes where slug in ('pepper','cardamom');
  insert into product_notes(product_id,note_id,tier,position)
    select pid,id,'HEART',row_number() over() from fragrance_notes where slug in ('leather','oud');
  insert into product_notes(product_id,note_id,tier,position)
    select pid,id,'BASE',row_number() over() from fragrance_notes where slug in ('vanilla','amber');
end $$;

-- ---- Sample coupons --------------------------------------------------------
insert into coupons (code, type, value, min_order_amount, per_customer_limit, active) values
  ('WELCOME10','PERCENTAGE',10,100,1,true),
  ('VELMOR20','FIXED',20,200,null,true)
on conflict (code) do nothing;

-- ---- A few approved sample reviews ----------------------------------------
insert into reviews (product_id, rating, title, body, display_name, status, approved_at)
select id, 5, 'رائع', 'ثبات ممتاز وفوحان قوي.', 'زبون', 'APPROVED', now()
from products where slug='velmor-noir'
on conflict do nothing;
