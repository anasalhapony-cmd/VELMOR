import {
  EntityForm,
  TextField,
  TextareaField,
  NumberField,
  SelectField,
  CheckboxField,
  CheckboxGroup,
  type Option,
} from '@/components/admin/form';
import type { FormState } from '@/lib/admin/form-state';
import type { ProductRow } from '@/types/database';
import {
  GENDERS, GENDER_LABELS_AR,
  CONCENTRATIONS, CONCENTRATION_LABELS_AR,
  SEASONS, SEASON_LABELS_AR,
  OCCASIONS, OCCASION_LABELS_AR,
} from '@/config/constants';

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

const opts = <T extends string>(values: readonly T[], labels: Record<T, string>): Option[] =>
  values.map((v) => ({ value: v, label: labels[v] }));

const INTENSITY: Option[] = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} / 5` }));

export function ProductForm({
  action,
  defaults,
  brands,
  families,
  categories,
  collections,
  selectedCategories = [],
  selectedCollections = [],
}: {
  action: Action;
  defaults?: ProductRow;
  brands: Option[];
  families: Option[];
  categories: Option[];
  collections: Option[];
  selectedCategories?: string[];
  selectedCollections?: string[];
}) {
  return (
    <EntityForm action={action} submitLabel={defaults ? 'حفظ التغييرات' : 'إنشاء المنتج'}>
      {defaults && <input type="hidden" name="id" value={defaults.id} />}

      {/* Basic information */}
      <section className="admin-card space-y-5">
        <h2 className="font-medium text-ink">المعلومات الأساسية</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="name" label="اسم المنتج (لاتيني)" required defaultValue={defaults?.name} placeholder="VELMOR NOIR" />
          <TextField name="name_ar" label="الاسم بالعربية" defaultValue={defaults?.name_ar} placeholder="فيلمور نوار" />
          <TextField name="slug" label="الرابط (slug)" required defaultValue={defaults?.slug} placeholder="velmor-noir" />
          <SelectField name="brand_id" label="العلامة التجارية" defaultValue={defaults?.brand_id ?? ''} includeBlank="— بدون —" options={brands} />
        </div>
        <TextField name="short_description" label="وصف مختصر" defaultValue={defaults?.short_description} />
        <TextareaField name="description" label="الوصف الكامل" defaultValue={defaults?.description} rows={5} />
      </section>

      {/* Fragrance profile */}
      <section className="admin-card space-y-5">
        <h2 className="font-medium text-ink">الملف العطري</h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <SelectField name="family_id" label="العائلة العطرية" defaultValue={defaults?.family_id ?? ''} includeBlank="— بدون —" options={families} />
          <SelectField name="gender" label="الفئة" defaultValue={defaults?.gender ?? ''} includeBlank="— بدون —" options={opts(GENDERS, GENDER_LABELS_AR)} />
          <SelectField name="concentration" label="التركيز" defaultValue={defaults?.concentration ?? ''} includeBlank="— بدون —" options={opts(CONCENTRATIONS, CONCENTRATION_LABELS_AR)} />
          <SelectField name="season" label="الموسم" defaultValue={defaults?.season ?? ''} includeBlank="— بدون —" options={opts(SEASONS, SEASON_LABELS_AR)} />
          <SelectField name="longevity" label="الثبات" defaultValue={defaults?.longevity ?? ''} includeBlank="— غير محدد —" options={INTENSITY} />
          <SelectField name="sillage" label="الفوحان" defaultValue={defaults?.sillage ?? ''} includeBlank="— غير محدد —" options={INTENSITY} />
        </div>
        <CheckboxGroup name="occasions" label="المناسبات" options={opts(OCCASIONS, OCCASION_LABELS_AR)} defaultValues={defaults?.occasions ?? []} />
      </section>

      {/* Taxonomy */}
      <section className="admin-card space-y-5">
        <h2 className="font-medium text-ink">التصنيفات والمجموعات</h2>
        {categories.length > 0 ? (
          <CheckboxGroup name="category_ids" label="التصنيفات" options={categories} defaultValues={selectedCategories} />
        ) : (
          <p className="text-sm text-ink-500">لا توجد تصنيفات بعد.</p>
        )}
        {collections.length > 0 ? (
          <CheckboxGroup name="collection_ids" label="المجموعات" options={collections} defaultValues={selectedCollections} />
        ) : (
          <p className="text-sm text-ink-500">لا توجد مجموعات بعد.</p>
        )}
      </section>

      {/* SEO */}
      <section className="admin-card space-y-5">
        <h2 className="font-medium text-ink">SEO</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="seo_title" label="عنوان SEO" defaultValue={defaults?.seo_title} />
          <TextField name="og_image_url" label="صورة المشاركة (OG)" defaultValue={defaults?.og_image_url} placeholder="https://…" />
        </div>
        <TextareaField name="seo_description" label="وصف SEO" defaultValue={defaults?.seo_description} rows={2} />
        <TextField name="video_url" label="رابط فيديو (اختياري)" defaultValue={defaults?.video_url} placeholder="https://…" />
      </section>

      {/* Visibility */}
      <section className="admin-card space-y-4">
        <h2 className="font-medium text-ink">الظهور والحالة</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <CheckboxField name="active" label="مُفعّل (يظهر في المتجر)" defaultChecked={defaults ? defaults.active : true} />
          <CheckboxField name="is_featured" label="مميّز" defaultChecked={defaults?.is_featured ?? false} />
          <CheckboxField name="is_new_arrival" label="وصل حديثًا" defaultChecked={defaults?.is_new_arrival ?? false} />
          <CheckboxField name="is_best_seller" label="الأكثر مبيعًا" defaultChecked={defaults?.is_best_seller ?? false} />
        </div>
        <NumberField name="sort_order" label="ترتيب العرض" defaultValue={defaults?.sort_order ?? 0} min={0} />
        {/* archived stays false from the editor; archiving is a list action */}
        <input type="hidden" name="archived" value={defaults?.archived ? 'on' : ''} />
      </section>
    </EntityForm>
  );
}
