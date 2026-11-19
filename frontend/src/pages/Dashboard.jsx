import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart, Shirt, Camera, UserCircle, ArrowRight, Wand2, Palette, Wallet, Bot, Search, CloudSun,
  Cloud, Sun, CloudRain, Snowflake, CloudLightning, CloudDrizzle, Wind,
  Thermometer, MapPin, Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useWardrobe from '../hooks/useWardrobe';
import useOutfits from '../hooks/useOutfits';
import useWeather from '../hooks/useWeather';
import Card from '../components/Card';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import ClothingCard from '../components/ClothingCard';
import { ColorSwatch } from '../components/ColorSwatch';

const quickLinks = [
  { to: '/outfits', label: 'Outfit Generator', icon: Wand2 },
  { to: '/recommendations', label: 'Smart Picks', icon: CloudSun },
  { to: '/fashion-critic', label: 'Fashion Critic', icon: Sparkles },
  { to: '/colors', label: 'Colour Palette', icon: Palette },
  { to: '/chat', label: 'Stylist Chat', icon: Bot },
  { to: '/shopping/finder', label: 'Clothes Finder', icon: Search },
  { to: '/shopping/budget', label: 'Budget Planner', icon: Wallet },
  { to: '/try-on', label: 'Virtual Try-On', icon: Camera },
];

const WEATHER_ICONS = {
  'Clear sky': Sun, 'Mainly clear': Sun, 'Partly cloudy': Cloud, 'Overcast': Cloud,
  'Fog': Cloud, 'Depositing rime fog': Cloud,
  'Light drizzle': CloudDrizzle, 'Moderate drizzle': CloudDrizzle, 'Dense drizzle': CloudDrizzle,
  'Slight rain': CloudRain, 'Moderate rain': CloudRain, 'Heavy rain': CloudRain,
  'Rain showers': CloudRain, 'Moderate rain showers': CloudRain, 'Violent rain showers': CloudRain,
  'Slight snow': Snowflake, 'Moderate snow': Snowflake, 'Heavy snow': Snowflake,
  'Thunderstorm': CloudLightning, 'Thunderstorm with hail': CloudLightning,
};

function getWeatherTip(condition, temp) {
  if (temp >= 35) return 'Scorching! Go for breathable cotton, linen, and light colors.';
  if (temp >= 28) return 'It\'s warm — opt for light fabrics and shorter sleeves.';
  if (temp >= 18) return 'Pleasant weather! Great for layering with a light jacket.';
  if (temp >= 10) return 'Getting chilly — pair with a sweater or a jacket.';
  if (temp < 10) return 'Cold out there — go for warm layers, thermals, and coats.';
  if (condition?.includes('rain') || condition?.includes('drizzle')) return 'Carry an umbrella and avoid suede/delicate fabrics.';
  return 'Dress comfortably for the weather!';
}

function WeatherWidget({ weather, loading, onRefresh, city }) {
  if (loading) {
    return (
      <Card className="weather-widget weather-widget--loading">
        <div className="weather-widget__shimmer" />
        <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>Fetching weather…</p>
      </Card>
    );
  }

  if (!weather || !weather.found) {
    return (
      <Card className="weather-widget weather-widget--empty">
        <Cloud size={28} color="var(--text-muted)" />
        <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
          {city ? `Couldn't find weather for "${city}"` : 'Enable location to see weather-based outfit tips'}
        </p>
        <Button size="sm" variant="ghost" onClick={onRefresh}>Retry</Button>
      </Card>
    );
  }

  const WeatherIcon = WEATHER_ICONS[weather.condition] || Cloud;
  const tip = getWeatherTip(weather.condition, weather.temperatureC);

  return (
    <Card className="weather-widget">
      <div className="weather-widget__header">
        <div className="weather-widget__icon-wrap">
          <WeatherIcon size={28} />
        </div>
        <div>
          <div className="weather-widget__temp">{Math.round(weather.temperatureC)}°C</div>
          <div className="weather-widget__condition">{weather.condition}</div>
        </div>
      </div>
      <div className="weather-widget__details">
        <span className="weather-widget__detail"><MapPin size={12} /> {weather.city}</span>
        <span className="weather-widget__detail"><Wind size={12} /> {weather.windSpeedKmh} km/h</span>
        <span className="weather-widget__detail"><Thermometer size={12} /> Humidity {weather.humidity}%</span>
      </div>
      <p className="weather-widget__tip">{tip}</p>
    </Card>
  );
}

function WardrobeAnalytics({ items }) {
  if (items.length === 0) return null;

  const catCounts = {};
  const colorCounts = {};
  items.forEach((item) => {
    catCounts[item.category] = (catCounts[item.category] || 0) + 1;
    (item.colors || []).forEach((c) => { colorCounts[c] = (colorCounts[c] || 0) + 1; });
  });

  const sortedCategories = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  const maxCatCount = sortedCategories[0]?.[1] || 1;
  const topColors = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const gapCategories = ['Tops', 'Shirts', 'T-Shirts', 'Trousers', 'Jeans', 'Footwear', 'Outerwear'].filter(
    (cat) => !catCounts[cat]
  );

  return (
    <Card className="section">
      <h2 className="section__title">Your wardrobe at a glance</h2>
      <div className="analytics-grid">
        <div>
          <h3 className="analytics-subtitle">By category</h3>
          <div className="analytics-bars">
            {sortedCategories.map(([cat, count]) => (
              <div key={cat} className="analytics-bar-row">
                <span className="analytics-bar-label">{cat}</span>
                <div className="analytics-bar-track">
                  <div className="analytics-bar-fill" style={{ width: `${(count / maxCatCount) * 100}%` }} />
                </div>
                <span className="analytics-bar-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="analytics-subtitle">Top colours</h3>
          <div className="analytics-color-chips">
            {topColors.map(([color, count]) => (
              <span key={color} className="analytics-color-chip">
                <ColorSwatch color={color} showLabel={false} />
                {color} <span className="text-muted">({count})</span>
              </span>
            ))}
          </div>
          {gapCategories.length > 0 && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <h3 className="analytics-subtitle">Gaps</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                You're missing: {gapCategories.join(', ')}. Adding these will help AI build better outfits.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { user, firebaseUser } = useAuth();
  const navigate = useNavigate();
  const { items, loading: wardrobeLoading } = useWardrobe();
  const { saved, loading: outfitsLoading } = useOutfits();
  const { weather, loading: weatherLoading, fetchWeather } = useWeather();
  const [weatherCity, setWeatherCity] = useState('Bengaluru');

  // Auto-detect location on mount for weather, defaulting to Bangalore
  useEffect(() => {
    const defaultCity = 'Bengaluru';
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            const data = await fetchWeather({ lat: latitude, lon: longitude });
            if (data?.city) {
              setWeatherCity(data.city);
            }
          } catch {
            fetchWeather(defaultCity);
          }
        },
        () => {
          // Geolocation denied or unavailable — default to Bangalore
          fetchWeather(defaultCity);
        },
        { timeout: 5000 }
      );
    } else {
      fetchWeather(defaultCity);
    }
  }, [fetchWeather]);

  const firstName = (user?.name || firebaseUser?.displayName || '').split(' ')[0] || 'there';
  const recentItems = items.slice(0, 4);

  const totalColors = new Set(items.flatMap((i) => i.colors || [])).size;
  const statCards = [
    { icon: Shirt, label: 'Wardrobe items', value: wardrobeLoading ? '—' : String(items.length) },
    { icon: Heart, label: 'Saved outfits', value: outfitsLoading ? '—' : String(saved.length) },
    { icon: Palette, label: 'Colours owned', value: wardrobeLoading ? '—' : String(totalColors) },
    { icon: UserCircle, label: 'Style profile', value: user?.onboardingCompleted ? 'Complete' : 'Not set' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="section">
        <h1 className="page-header__title">Welcome back, {firstName}</h1>
        <p className="page-header__subtitle">Let&apos;s make your next outfit your best one.</p>
      </div>

      {/* Weather + Stats Row */}
      <div className="dashboard-top-grid section">
        <WeatherWidget
          weather={weather}
          loading={weatherLoading}
          city={weatherCity}
          onRefresh={() => fetchWeather(weatherCity || 'Bengaluru')}
        />
        <div className="grid grid--stats">
          {statCards.map(({ icon: Icon, label, value }) => (
            <Card key={label} className="stat-card">
              <div className="stat-card__icon">
                <Icon size={20} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p className="stat-card__label">{label}</p>
                <p className="stat-card__value">{value}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {weather?.found && items.length > 0 && (
        <Card className="dashboard-cta section">
          <div>
            <h2 className="dashboard-cta__title">What to wear today</h2>
            <p className="text-muted">Picks from your wardrobe for {weather.temperatureC}°C and {weather.condition.toLowerCase()} in {weather.city}.</p>
          </div>
          <Button onClick={() => navigate('/recommendations')}>See today's picks <ArrowRight size={16} /></Button>
        </Card>
      )}

      {/* Wardrobe Analytics */}
      {!wardrobeLoading && <WardrobeAnalytics items={items} />}

      {/* Recently Added */}
      <div className="section">
        <h2 className="section__title">Recently added</h2>
        {recentItems.length === 0 ? (
          <EmptyState
            icon={Shirt}
            title="Your wardrobe is empty"
            description="Add your first clothing item to start getting personalized outfit recommendations."
            actionLabel="Add Item"
            onAction={() => navigate('/wardrobe')}
          />
        ) : (
          <div className="grid grid--cards">
            {recentItems.map((item) => (
              <ClothingCard key={item._id} item={item} onClick={() => navigate('/wardrobe')} />
            ))}
          </div>
        )}
      </div>

      {/* Explore All Features */}
      <div className="section">
        <h2 className="section__title">Explore</h2>
        <div className="feature-grid">
          {quickLinks.map(({ to, label, icon: Icon }) => (
            <Card key={to} hover className="feature-tile" onClick={() => navigate(to)} style={{ cursor: 'pointer' }}>
              <div className="feature-tile__icon"><Icon size={20} /></div>
              <h3 className="feature-tile__title">{label}</h3>
              <ArrowRight size={14} color="var(--text-muted)" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
