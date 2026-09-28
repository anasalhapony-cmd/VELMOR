import { EntityForm, CheckboxGroup, type Option } from '@/components/admin/form';
import { NOTE_TIER_LABELS_AR } from '@/config/constants';
import { setProductNotes } from '@/app/admin/(dashboard)/products/note-actions';

export function NotesSection({
  productId,
  allNotes,
  selected,
}: {
  productId: string;
  allNotes: Option[];
  selected: { TOP: string[]; HEART: string[]; BASE: string[] };
}) {
  return (
    <section className="admin-card space-y-5">
      <h2 className="font-medium text-ink">النوتات العطرية (هرم العطر)</h2>
      {allNotes.length === 0 ? (
        <p className="text-sm text-ink-500">
          لا توجد نوتات معرّفة بعد. أضِفها من صفحة «النوتات العطرية» أولًا.
        </p>
      ) : (
        <EntityForm action={setProductNotes} submitLabel="حفظ النوتات">
          <input type="hidden" name="product_id" value={productId} />
          <CheckboxGroup name="notes_TOP" label={`نوتات ${NOTE_TIER_LABELS_AR.TOP}`} options={allNotes} defaultValues={selected.TOP} />
          <CheckboxGroup name="notes_HEART" label={`نوتات ${NOTE_TIER_LABELS_AR.HEART}`} options={allNotes} defaultValues={selected.HEART} />
          <CheckboxGroup name="notes_BASE" label={`نوتات ${NOTE_TIER_LABELS_AR.BASE}`} options={allNotes} defaultValues={selected.BASE} />
        </EntityForm>
      )}
    </section>
  );
}
