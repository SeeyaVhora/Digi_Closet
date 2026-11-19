import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Wand2, Shuffle, RefreshCw, Shirt } from 'lucide-react';
import useOutfits from '../hooks/useOutfits';
import useWardrobe from '../hooks/useWardrobe';
import { getErrorMessage } from '../services/api';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import Button from '../components/Button';
import OutfitCard from '../components/OutfitCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { OCCASIONS, STYLES, SEASONS } from '../constants/wardrobe';

const comboKey = (ids) => [...ids].sort().join('|');

export default function OutfitRecommendations() {
  const navigate = useNavigate();
  const { items, loading: wardrobeLoading } = useWardrobe();
  const { recommend, recommending, saveOutfit } = useOutfits({ autoFetch: false });
  const { showToast } = useToast();

  // Links such as the dashboard's style inspiration preselect ?style= or ?occasion=.
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState(() => {
    const style = searchParams.get('style');
    const occasion = searchParams.get('occasion');
    return {
      occasion: OCCASIONS.includes(occasion) ? occasion : 'College',
      style: STYLES.includes(style) ? style : '',
      season: '',
      city: 'Bengaluru',
    };
  });
  const [colors, setColors] = useState([]);
  const [outfits, setOutfits] = useState([]);
  const [seenCombos, setSeenCombos] = useState([]);
  const [weather, setWeather] = useState(null);
  const [lastRequest, setLastRequest] = useState(null);
  const [error, setError] = useState('');
  const [savedKeys, setSavedKeys] = useState(new Set());
  const [savingKey, setSavingKey] = useState(null);

  const itemsById = useMemo(() => new Map(items.map((i) => [i._id, i])), [items]);
  const wardrobeColors = useMemo(
    () => [...new Set(items.flatMap((i) => i.colors || []).map((c) => c.trim()))].sort(),
    [items]
  );

  const set = (name) => (e) => setForm((prev) => ({ ...prev, [name]: e.target.value }));
  const toggleColor = (color) => setColors((prev) => (prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]));

  const generate = async (request, { alternatives = false } = {}) => {
    setError('');
    try {
      const data = await recommend({ ...request, excludeCombos: alternatives ? seenCombos : [] });
      setOutfits(data.outfits);
      setWeather(data.weather);
      setLastRequest(request);
      const newCombos = data.outfits.map((o) => o.itemIds);
      setSeenCombos((prev) => (alternatives ? [...prev, ...newCombos] : newCombos));
      setSavedKeys(new Set());
    } catch (err) {
      setError(getErrorMessage(err, 'Could not generate outfits.'));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    generate({ ...form, colors });
  };

  const handleSave = async (outfit) => {
    const key = comboKey(outfit.itemIds);
    try {
      setSavingKey(key);
      await saveOutfit({ ...outfit, source: 'outfit-recommendation' });
      setSavedKeys((prev) => new Set(prev).add(key));
      showToast('Outfit saved.', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not save outfit.'), 'error');
    } finally {
      setSavingKey(null);
    }
  };

  if (wardrobeLoading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Discover your next look"
        title="New combinations. Same you."
        subtitle="Complete outfits put together from the pieces you already own, for the occasion, style and weather you choose."
        image="/images/editorial/flatlay-blazer.jpg"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Shirt}
          title="Add some clothes first"
          description="Outfits are built only from your own wardrobe. Add at least a top, a bottom and a pair of shoes."
          actionLabel="Build your wardrobe"
          onAction={() => navigate('/wardrobe')}
        />
      ) : (
        <>
          <Card className="section">
            <form onSubmit={handleSubmit} className="generator-form">
              <div className="form-grid generator-form__fields">
                <Select label="Occasion" options={OCCASIONS} placeholder="Any occasion" value={form.occasion} onChange={set('occasion')} />
                <Select label="Style" options={STYLES} placeholder="No preference" value={form.style} onChange={set('style')} />
                <Select label="Season" options={SEASONS} placeholder="Any season" value={form.season} onChange={set('season')} />
                <Input label="City for weather" placeholder="Leave empty to ignore" value={form.city} onChange={set('city')} />
              </div>

              {wardrobeColors.length > 0 && (
                <div className="field">
                  <span className="field__label">Colours to wear <span className="text-muted">(optional)</span></span>
                  <div className="filter-bar filter-bar--compact">
                    {wardrobeColors.map((color) => (
                      <button
                        type="button"
                        key={color}
                        onClick={() => toggleColor(color)}
                        className={`filter-chip ${colors.includes(color) ? 'filter-chip--active' : ''}`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="generator-form__actions">
                <Button type="submit" loading={recommending && !lastRequest?.surprise}>
                  <Wand2 size={16} /> Create your next look
                </Button>
                <Button type="button" variant="outline" disabled={recommending} onClick={() => generate({ surprise: true, city: form.city })}>
                  <Shuffle size={16} /> Surprise me
                </Button>
              </div>
            </form>
          </Card>

          {error && <div className="alert alert--error section">{error}</div>}

          {recommending && (
            <div className="generator-loading section">
              <LoadingSpinner size="sm" />
              <span>Styling {items.length} pieces from your wardrobe. This usually takes 5–15 seconds.</span>
            </div>
          )}

          {!recommending && outfits.length > 0 && (
            <section className="section">
              <div className="results-header">
                <div>
                  <h2 className="results-header__title">
                    {lastRequest?.surprise ? 'Something different' : `${lastRequest?.occasion || 'Everyday'} looks`}
                  </h2>
                  {weather && <p className="results-header__note">Dressed for {weather}</p>}
                </div>
                <Button variant="outline" size="sm" onClick={() => generate(lastRequest, { alternatives: true })}>
                  <RefreshCw size={14} /> Show alternatives
                </Button>
              </div>

              <div className="grid grid--outfits">
                {outfits.map((outfit) => {
                  const key = comboKey(outfit.itemIds);
                  return (
                    <OutfitCard
                      key={key}
                      outfit={outfit}
                      items={outfit.itemIds.map((id) => itemsById.get(id)).filter(Boolean)}
                      onSave={handleSave}
                      saved={savedKeys.has(key)}
                      saving={savingKey === key}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
