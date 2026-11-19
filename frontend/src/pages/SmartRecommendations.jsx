import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, GraduationCap, Briefcase, PartyPopper, Coffee, Plane, RefreshCw, MapPin, Shirt } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import useWardrobe from '../hooks/useWardrobe';
import useOutfits from '../hooks/useOutfits';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Input from '../components/Input';
import OutfitCard from '../components/OutfitCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

const PRESETS = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'college', label: 'College', icon: GraduationCap },
  { id: 'office', label: 'Office', icon: Briefcase },
  { id: 'party', label: 'Party', icon: PartyPopper },
  { id: 'casual', label: 'Casual', icon: Coffee },
  { id: 'travel', label: 'Travel', icon: Plane },
];

const comboKey = (ids) => [...ids].sort().join('|');

export default function SmartRecommendations() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { items, loading: wardrobeLoading } = useWardrobe();
  const { saveOutfit } = useOutfits({ autoFetch: false });

  const [preset, setPreset] = useState('today');
  const [city, setCity] = useState('Bengaluru');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedKeys, setSavedKeys] = useState(new Set());

  const itemsById = useMemo(() => new Map(items.map((i) => [i._id, i])), [items]);

  const load = async (nextPreset, { more = false } = {}) => {
    setPreset(nextPreset);
    setLoading(true);
    setError('');
    try {
      const excludeCombos = more && result ? result.outfits.map((o) => o.itemIds) : [];
      const { data } = await api.post('/outfits/smart', { preset: nextPreset, city: city.trim() || undefined, excludeCombos });
      setResult(data.data);
      setSavedKeys(new Set());
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load recommendations.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!wardrobeLoading && items.length) load('today');
    // Only on first load; later loads are user-driven.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wardrobeLoading]);

  const handleSave = async (outfit) => {
    try {
      await saveOutfit({ ...outfit, source: 'smart-recommendation' });
      setSavedKeys((prev) => new Set(prev).add(comboKey(outfit.itemIds)));
      showToast('Outfit saved.', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not save outfit.'), 'error');
    }
  };

  if (wardrobeLoading) return <LoadingSpinner />;

  if (!items.length) {
    return (
      <div className="animate-fade-in">
        <PageHeader eyebrow="Discover" title="Dress for the day ahead." subtitle="Outfit suggestions that follow the forecast, your taste and your past favourites." image="/images/editorial/knit-outdoors.jpg" variant="overlay" />
        <EmptyState icon={Shirt} title="No wardrobe yet" description="Smart picks come from your own clothes. Add a few pieces to get started." actionLabel="Build your wardrobe" onAction={() => navigate('/wardrobe')} />
      </div>
    );
  }

  const weather = result?.weather;

  return (
    <div className="animate-fade-in">
      <PageHeader eyebrow="Discover" title="Dress for the day ahead." subtitle="Outfit suggestions that follow the forecast, your taste and your past favourites." image="/images/editorial/knit-outdoors.jpg" variant="overlay" />

      <div className="smart-bar section">
        <div className="smart-presets" role="tablist" aria-label="Occasion">
          {PRESETS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={preset === id}
              className={`smart-preset ${preset === id ? 'smart-preset--active' : ''}`}
              onClick={() => load(id)}
              disabled={loading}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
        <form className="smart-city" onSubmit={(e) => { e.preventDefault(); load(preset); }}>
          <Input icon={MapPin} value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" aria-label="City for weather" />
          <Button type="submit" variant="outline" disabled={loading}>Update</Button>
        </form>
      </div>

      {weather && (
        <p className="smart-context section">
          <strong>{weather.temperatureC}°C, {weather.condition.toLowerCase()}</strong> in {weather.city} · humidity {weather.humidity}%
          {result.usedHistory > 0 && <> · learning from {result.usedHistory} saved {result.usedHistory === 1 ? 'outfit' : 'outfits'}</>}
        </p>
      )}
      {result && !weather && <p className="smart-context section">Live weather is unavailable, so these picks ignore it.</p>}

      {error && (
        <div className="alert alert--error section">
          {error} <button className="link-button" onClick={() => load(preset)}>Try again</button>
        </div>
      )}

      {loading ? (
        <div className="generator-loading section">
          <LoadingSpinner size="sm" /> Checking the weather and your wardrobe…
        </div>
      ) : result?.outfits?.length > 0 && (
        <section className="section">
          <div className="results-header">
            <h2 className="results-header__title">{result.label}</h2>
            <Button variant="outline" size="sm" onClick={() => load(preset, { more: true })}>
              <RefreshCw size={14} /> More ideas
            </Button>
          </div>
          <div className="grid grid--outfits">
            {result.outfits.map((outfit) => {
              const key = comboKey(outfit.itemIds);
              return (
                <OutfitCard
                  key={key}
                  outfit={outfit}
                  items={outfit.itemIds.map((id) => itemsById.get(id)).filter(Boolean)}
                  onSave={handleSave}
                  saved={savedKeys.has(key)}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
