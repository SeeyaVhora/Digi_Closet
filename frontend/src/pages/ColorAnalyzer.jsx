import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, Pencil, Trash2, Save, X, Plus, Info } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import UploadDropzone from '../components/UploadDropzone';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import '../styles/critic-palette.css';

const SECTIONS = [
  { key: 'recommendedColors', title: 'Core colours', hint: 'Easy everyday choices for shirts, tops and knitwear.' },
  { key: 'neutralColors', title: 'Neutrals', hint: 'Bases for trousers, outerwear and shoes.' },
  { key: 'experimentColors', title: 'Try these', hint: 'Accents worth experimenting with.' },
  { key: 'avoidColors', title: 'Wear less often', hint: 'Better kept away from the face, or used in small doses.' },
];

// Dark text on light swatches, white text on dark ones.
function textColorFor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#252321' : '#FFFFFF';
}

function Swatch({ swatch, onRemove }) {
  return (
    <div className="cp-swatch">
      <div className="cp-swatch__chip" style={{ background: swatch.hex, color: textColorFor(swatch.hex) }}>
        <span>{swatch.hex}</span>
        {onRemove && (
          <button type="button" className="cp-swatch__remove" onClick={onRemove} aria-label={`Remove ${swatch.name}`}>
            <X size={12} />
          </button>
        )}
      </div>
      <p className="cp-swatch__name">{swatch.name}</p>
      {swatch.note && <p className="cp-swatch__note">{swatch.note}</p>}
    </div>
  );
}

function AddSwatch({ onAdd }) {
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#B89B7A');

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), hex: hex.toUpperCase(), note: '' });
    setName('');
  };

  return (
    <div className="cp-add">
      <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} aria-label="Colour" />
      <input
        className="input"
        placeholder="Colour name"
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
      />
      <Button size="sm" variant="outline" onClick={submit} disabled={!name.trim()}><Plus size={14} /> Add</Button>
    </div>
  );
}

function PaletteView({ palette, editing, onChange }) {
  const meta = [
    palette.season && palette.season !== 'Unknown' && palette.season,
    palette.undertone && palette.undertone !== 'uncertain' && `${palette.undertone} undertone`,
    palette.contrast && `${palette.contrast} contrast`,
    palette.source === 'custom' && 'customised',
  ].filter(Boolean);

  const updateSection = (key, list) => onChange({ ...palette, [key]: list });

  return (
    <div className="cp-palette">
      {meta.length > 0 && <p className="cp-meta">{meta.join(' · ')}</p>}
      {palette.summary && <p className="cp-summary">{palette.summary}</p>}
      {palette.lightingNote && (
        <p className="cp-lighting"><Info size={14} /> {palette.lightingNote}</p>
      )}

      {SECTIONS.map(({ key, title, hint }) => {
        const list = palette[key] || [];
        if (!editing && list.length === 0) return null;
        return (
          <section key={key} className="cp-section">
            <div className="cp-section__header">
              <h3>{title}</h3>
              <p>{hint}</p>
            </div>
            <div className="cp-swatches">
              {list.map((swatch, index) => (
                <Swatch
                  key={`${swatch.hex}-${index}`}
                  swatch={swatch}
                  onRemove={editing ? () => updateSection(key, list.filter((_, i) => i !== index)) : undefined}
                />
              ))}
            </div>
            {editing && <AddSwatch onAdd={(swatch) => updateSection(key, [...list, swatch])} />}
          </section>
        );
      })}

      {palette.combinations?.length > 0 && (
        <section className="cp-section">
          <div className="cp-section__header">
            <h3>Outfit combinations</h3>
            <p>Colour pairings to build looks around.</p>
          </div>
          <div className="cp-combos">
            {palette.combinations.map((combo) => (
              <div key={combo.name} className="cp-combo">
                <div className="cp-combo__strip">
                  {combo.hexes.map((hex, i) => <span key={`${hex}-${i}`} style={{ background: hex }} />)}
                </div>
                <p className="cp-combo__name">{combo.name}</p>
                <p className="cp-combo__usage">{combo.usage}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function ColorAnalyzer() {
  const { showToast } = useToast();
  const [saved, setSaved] = useState(null);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [draft, setDraft] = useState(null);
  const [draftSource, setDraftSource] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [consent, setConsent] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    api.get('/colors/palette')
      .then(({ data }) => setSaved(data.data.palette))
      .catch((err) => setError(getErrorMessage(err, 'Could not load your saved palette.')))
      .finally(() => setLoadingSaved(false));
  }, []);

  const analyze = async () => {
    const form = new FormData();
    form.append('image', imageFile);
    form.append('consent', 'true');
    try {
      setAnalyzing(true);
      setError('');
      const { data } = await api.post('/colors/palette/analyze', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDraft(data.data.palette);
      setDraftSource('ai');
      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err, 'The photo could not be analysed.'));
    } finally {
      setAnalyzing(false);
    }
  };

  const savePalette = async () => {
    try {
      setSaving(true);
      const { data } = await api.put('/colors/palette', { ...draft, source: draftSource });
      setSaved(data.data.palette);
      setDraft(null);
      setEditing(false);
      setShowUpload(false);
      setImageFile(null);
      setImagePreview('');
      showToast('Palette saved.', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not save the palette.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const removePalette = async () => {
    try {
      await api.delete('/colors/palette');
      setSaved(null);
      showToast('Palette removed.', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not remove the palette.'), 'error');
    } finally {
      setConfirmRemove(false);
    }
  };

  const startEditing = (palette) => {
    setDraft({
      ...palette,
      recommendedColors: palette.recommendedColors || [],
      neutralColors: palette.neutralColors || [],
      experimentColors: palette.experimentColors || [],
      avoidColors: palette.avoidColors || [],
      combinations: palette.combinations || [],
    });
    setDraftSource('custom');
    setEditing(true);
  };

  const cancelDraft = () => {
    setDraft(null);
    setEditing(false);
  };

  if (loadingSaved) return <LoadingSpinner />;

  const disclaimer = (
    <p className="cp-disclaimer">
      These are AI style suggestions, not a precise colour analysis. Lighting, camera settings and filters all change how colours appear, so treat them as a starting point.
    </p>
  );

  // Reviewing a freshly generated palette, or customising one.
  if (draft) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          eyebrow="AI Studio · Personal Colour"
          title="Your palette."
          subtitle={editing ? 'Remove colours you don’t like and add your own.' : 'Review your suggested palette before saving it.'}
          action={
            <div className="cp-actions">
              <Button variant="ghost" onClick={cancelDraft}>Cancel</Button>
              {!editing && draftSource === 'ai' && (
                <Button variant="outline" onClick={analyze} loading={analyzing}><RefreshCw size={15} /> Regenerate</Button>
              )}
              {!editing && <Button variant="outline" onClick={() => setEditing(true)}><Pencil size={15} /> Customise</Button>}
              <Button onClick={savePalette} loading={saving}><Save size={15} /> Save palette</Button>
            </div>
          }
        />
        {error && <div className="alert alert--error section">{error}</div>}
        <Card>
          <PaletteView palette={draft} editing={editing} onChange={(next) => { setDraft(next); setDraftSource('custom'); }} />
          {disclaimer}
        </Card>
      </div>
    );
  }

  const showForm = !saved || showUpload;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="AI Studio"
        title="Find the colours that feel like you."
        subtitle="Find the clothing colours that flatter you, read from a clear photo of your face."
        image="/images/editorial/knit-rail.jpg"
        action={saved && !showUpload && (
          <div className="cp-actions">
            <Button variant="ghost" onClick={() => setConfirmRemove(true)}><Trash2 size={15} /> Remove</Button>
            <Button variant="outline" onClick={() => startEditing(saved)}><Pencil size={15} /> Edit</Button>
            <Button onClick={() => setShowUpload(true)}><RefreshCw size={15} /> Re-analyse</Button>
          </div>
        )}
      />

      {showForm ? (
        <Card className="cp-upload">
          <UploadDropzone
            onFileSelect={(file) => { setImageFile(file); setImagePreview(URL.createObjectURL(file)); setError(''); }}
            preview={imagePreview}
            onRemove={() => { setImageFile(null); setImagePreview(''); }}
            label="Upload a clear, front-facing photo"
            hint="Natural daylight, no filters or sunglasses. JPEG, PNG or WebP up to 5MB."
          />
          <label className="cp-consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>I agree to send this photo to Google Gemini for analysis. DigiCloset does not store the photo.</span>
          </label>
          {disclaimer}
          {error && (
            <div className="alert alert--error fc-error">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={analyze} disabled={!imageFile || !consent || analyzing}>Try again</Button>
            </div>
          )}
          <div className="cp-actions">
            {saved && <Button variant="ghost" onClick={() => setShowUpload(false)}>Cancel</Button>}
            <Button onClick={analyze} loading={analyzing} disabled={!imageFile || !consent}>
              <Sparkles size={16} /> Analyse my colours
            </Button>
          </div>
          {analyzing && <p className="fc-wait">Analysing your photo. This can take up to 30 seconds.</p>}
        </Card>
      ) : (
        <Card>
          <PaletteView palette={saved} editing={false} />
          {disclaimer}
        </Card>
      )}

      <ConfirmDialog
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={removePalette}
        title="Remove palette?"
        message="Your saved colour palette will be deleted. Outfit suggestions will stop using it."
        confirmLabel="Remove"
      />
    </div>
  );
}
