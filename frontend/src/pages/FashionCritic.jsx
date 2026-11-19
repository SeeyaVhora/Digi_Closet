import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RotateCcw, Check, ImageIcon, Shirt } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import useWardrobe from '../hooks/useWardrobe';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Select from '../components/Select';
import Button from '../components/Button';
import UploadDropzone from '../components/UploadDropzone';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import OutfitCard from '../components/OutfitCard';
import { OCCASIONS, sortBySlot } from '../constants/wardrobe';
import '../styles/critic-palette.css';

function FeedbackList({ title, items }) {
  if (!items?.length) return null;
  return (
    <section className="fc-section">
      <h3 className="fc-section__title">{title}</h3>
      <ul className="fc-list">
        {items.map((text) => <li key={text}>{text}</li>)}
      </ul>
    </section>
  );
}

function FeedbackText({ title, text }) {
  if (!text) return null;
  return (
    <section className="fc-section">
      <h3 className="fc-section__title">{title}</h3>
      <p className="fc-section__text">{text}</p>
    </section>
  );
}

function WardrobePicker({ items, selected, onToggle }) {
  return (
    <div className="fc-picker">
      {items.map((item) => {
        const isSelected = selected.includes(item._id);
        return (
          <button
            key={item._id}
            type="button"
            className={`fc-picker__item ${isSelected ? 'fc-picker__item--selected' : ''}`}
            onClick={() => onToggle(item._id)}
            aria-pressed={isSelected}
            title={item.name}
          >
            <span className="fc-picker__image">
              {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <ImageIcon size={20} />}
              {isSelected && <span className="fc-picker__check"><Check size={12} /></span>}
            </span>
            <span className="fc-picker__name">{item.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function FashionCritic() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { items: wardrobe, loading: wardrobeLoading } = useWardrobe();

  const [mode, setMode] = useState('photo');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [occasion, setOccasion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [savedTitles, setSavedTitles] = useState([]);
  const [savingTitle, setSavingTitle] = useState(null);

  const itemsById = new Map(wardrobe.map((i) => [i._id, i]));
  const resolve = (ids = []) => ids.map((id) => itemsById.get(id)).filter(Boolean);
  const canSubmit = mode === 'photo' ? Boolean(imageFile) : selectedIds.length >= 2;

  const toggleItem = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleFile = (file) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const handleAnalyze = async () => {
    const form = new FormData();
    if (mode === 'photo') form.append('image', imageFile);
    else form.append('itemIds', JSON.stringify(selectedIds));
    if (occasion) form.append('occasion', occasion);

    try {
      setLoading(true);
      setError('');
      const { data } = await api.post('/fashion/analyze', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data.data);
      setSavedTitles([]);
    } catch (err) {
      setError(getErrorMessage(err, 'The outfit could not be analysed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError('');
    setImageFile(null);
    setImagePreview('');
    setSelectedIds([]);
  };

  const handleSaveAlternative = async (alt) => {
    try {
      setSavingTitle(alt.title);
      await api.post('/outfits/saved', {
        title: alt.title,
        itemIds: alt.itemIds,
        explanation: alt.explanation,
        source: 'fashion-critic',
      });
      setSavedTitles((prev) => [...prev, alt.title]);
      showToast('Outfit saved.', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not save the outfit.'), 'error');
    } finally {
      setSavingTitle(null);
    }
  };

  if (result) {
    const reviewedItems = mode === 'wardrobe' ? sortBySlot(resolve(selectedIds)) : [];
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="Fashion Critic"
          subtitle={occasion ? `Feedback for ${occasion.toLowerCase()}` : 'Your outfit feedback'}
          action={<Button variant="outline" onClick={handleReset}><RotateCcw size={15} /> Review another outfit</Button>}
        />

        <div className="fc-results">
          <aside className="fc-summary">
            {mode === 'photo' && imagePreview && (
              <img src={imagePreview} alt="Your outfit" className="fc-summary__photo" />
            )}
            {reviewedItems.length > 0 && (
              <div className="fc-summary__thumbs">
                {reviewedItems.map((item) => (
                  <div key={item._id} className="fc-summary__thumb" title={item.name}>
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <ImageIcon size={18} />}
                  </div>
                ))}
              </div>
            )}
            <Card className="fc-score">
              <p className="fc-score__label">Overall</p>
              <p className="fc-score__value">{result.score.toFixed(1)}<span>/10</span></p>
              <div className="fc-score__bar"><div style={{ width: `${result.score * 10}%` }} /></div>
              <p className="fc-score__verdict">{result.verdict}</p>
              <p className="fc-score__summary">{result.summary}</p>
            </Card>
          </aside>

          <Card className="fc-feedback">
            <FeedbackList title="What works" items={result.whatLooksGood} />
            <FeedbackList title="What to improve" items={result.improvements} />
            <FeedbackText title="Colour" text={result.colorFeedback} />
            <FeedbackText title="Combination & balance" text={[result.combinationFeedback, result.balanceFeedback].filter(Boolean).join(' ')} />
            <FeedbackText title="Occasion" text={result.occasionFit} />
            <FeedbackText title="Accessories & footwear" text={result.accessoriesFeedback} />
            <FeedbackList title="Suggestions" items={result.suggestions} />
          </Card>
        </div>

        {result.alternatives?.length > 0 && (
          <section className="section">
            <h2 className="fc-heading">Try these from your wardrobe</h2>
            <div className="fc-alternatives">
              {result.alternatives.map((alt) => (
                <OutfitCard
                  key={alt.title}
                  outfit={alt}
                  items={resolve(alt.itemIds)}
                  saved={savedTitles.includes(alt.title)}
                  saving={savingTitle === alt.title}
                  onSave={handleSaveAlternative}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Fashion Critic"
        subtitle="Get honest, constructive feedback on an outfit photo or a combination from your wardrobe."
      />

      <Card className="fc-form">
        <div className="fc-toggle" role="tablist">
          {[['photo', 'Upload photo'], ['wardrobe', 'Pick from wardrobe']].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              className={`fc-toggle__option ${mode === value ? 'fc-toggle__option--active' : ''}`}
              onClick={() => { setMode(value); setError(''); }}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'photo' ? (
          <UploadDropzone
            onFileSelect={handleFile}
            preview={imagePreview}
            onRemove={() => { setImageFile(null); setImagePreview(''); }}
            label="Upload a photo of your outfit"
            hint="Full-length or mirror photos work best. JPEG, PNG or WebP up to 5MB."
          />
        ) : wardrobeLoading ? (
          <LoadingSpinner size="sm" />
        ) : wardrobe.length < 2 ? (
          <EmptyState
            icon={Shirt}
            title="Not enough items yet"
            description="Add at least two pieces to your wardrobe to review a combination."
            actionLabel="Go to wardrobe"
            onAction={() => navigate('/wardrobe')}
          />
        ) : (
          <>
            <p className="fc-picker__hint">
              {selectedIds.length ? `${selectedIds.length} selected` : 'Select the pieces you want to wear together'}
            </p>
            <WardrobePicker items={wardrobe} selected={selectedIds} onToggle={toggleItem} />
          </>
        )}

        <Select
          label="Occasion (optional)"
          options={OCCASIONS}
          placeholder="Any occasion"
          value={occasion}
          onChange={(e) => setOccasion(e.target.value)}
        />

        {error && (
          <div className="alert alert--error fc-error">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={handleAnalyze} disabled={!canSubmit || loading}>Try again</Button>
          </div>
        )}

        <Button onClick={handleAnalyze} loading={loading} disabled={!canSubmit} fullWidth>
          <Sparkles size={16} /> Review outfit
        </Button>
        {loading && <p className="fc-wait">Analysing the outfit. This can take up to 30 seconds.</p>}
      </Card>
    </div>
  );
}
