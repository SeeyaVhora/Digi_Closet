import { Sparkles, AlertCircle } from 'lucide-react';
import Input from './Input';
import Select from './Select';
import UploadDropzone from './UploadDropzone';
import LoadingSpinner from './LoadingSpinner';
import { CATEGORIES, SEASONS, STYLES } from '../constants/wardrobe';

export default function WardrobeItemForm({
  form, onChange, imagePreview, onFileSelect, onRemoveImage, analyzing, aiStatus, error, onSubmit,
}) {
  const set = (name) => (e) => onChange(name, e.target.value);
  const toggleSeason = (season) => onChange(
    'season',
    form.season.includes(season) ? form.season.filter((s) => s !== season) : [...form.season, season]
  );

  return (
    <form onSubmit={onSubmit} className="item-form">
      <div className="item-form__media">
        <UploadDropzone
          onFileSelect={onFileSelect}
          preview={imagePreview}
          onRemove={onRemoveImage}
          label="Add a photo and Gemini will fill in the details"
        />
        {analyzing && (
          <div className="item-form__status"><LoadingSpinner size="sm" /> Reading the photo…</div>
        )}
        {aiStatus?.type === 'success' && (
          <p className="item-form__status item-form__status--ai">
            <Sparkles size={14} /> Detected by Gemini. Check the details and correct anything that's off.
          </p>
        )}
        {aiStatus?.type === 'error' && (
          <p className="item-form__status item-form__status--error">
            <AlertCircle size={14} /> {aiStatus.message} You can still fill the details in yourself.
          </p>
        )}
      </div>

      <fieldset className="item-form__fields" disabled={analyzing}>
        <Input label="Name" value={form.name} onChange={set('name')} placeholder="e.g. Navy Oxford Shirt" required />
        <div className="form-grid form-grid--2">
          <Select label="Category" options={CATEGORIES} value={form.category} onChange={set('category')} />
          <Input label="Type" value={form.type} onChange={set('type')} placeholder="e.g. Oxford shirt" />
          <Input label="Main colour" value={form.primaryColor} onChange={set('primaryColor')} placeholder="e.g. Navy" />
          <Input label="Secondary colour" value={form.secondaryColor} onChange={set('secondaryColor')} placeholder="Optional" />
          <Input label="Pattern" value={form.pattern} onChange={set('pattern')} placeholder="e.g. Solid, Striped" />
          <Select label="Style" options={STYLES.includes(form.style) || !form.style ? STYLES : [form.style, ...STYLES]} value={form.style} onChange={set('style')} />
          <Input label="Brand" value={form.brand} onChange={set('brand')} placeholder="Optional" />
          <Input label="Size" value={form.size} onChange={set('size')} placeholder="e.g. M, 32, UK 9" />
        </div>

        <div className="field">
          <span className="field__label">Season</span>
          <div className="filter-bar filter-bar--compact">
            {SEASONS.map((season) => (
              <button
                type="button"
                key={season}
                className={`filter-chip ${form.season.includes(season) ? 'filter-chip--active' : ''}`}
                onClick={() => toggleSeason(season)}
              >
                {season}
              </button>
            ))}
          </div>
        </div>

        <Input label="Occasions" value={form.occasions} onChange={set('occasions')} placeholder="Comma separated, e.g. Office, College" />
        <div className="field">
          <label className="field__label" htmlFor="item-notes">Notes</label>
          <textarea id="item-notes" rows={2} className="input" value={form.notes} onChange={set('notes')} placeholder="Fit, fabric, care…" />
        </div>
        {error && <div className="alert alert--error">{error}</div>}
      </fieldset>
    </form>
  );
}
