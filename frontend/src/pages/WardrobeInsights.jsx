import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Shirt, Search } from 'lucide-react';
import useWardrobe from '../hooks/useWardrobe';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import { ColorSwatch } from '../components/ColorSwatch';
import '../styles/planning.css';

const NEUTRALS = ['white', 'black', 'grey', 'gray', 'beige', 'cream', 'navy', 'ivory', 'off-white', 'charcoal', 'tan', 'camel'];
const isNeutral = (item) => item.colors?.some((c) => NEUTRALS.some((n) => c.toLowerCase().includes(n)));
const isTop = (item) => ['Tops', 'Shirts', 'T-Shirts'].includes(item.category);

// A versatile capsule: each check looks at what the wardrobe actually holds,
// and `query` is what to search for in Clothes Finder when it's missing.
const ESSENTIALS = [
  { name: 'A neutral everyday top', test: (i) => isTop(i) && isNeutral(i), query: 'plain white cotton t-shirt' },
  { name: 'A button-down shirt', test: (i) => i.category === 'Shirts', query: 'classic oxford button-down shirt' },
  { name: 'Dark jeans or tailored trousers', test: (i) => ['Jeans', 'Trousers'].includes(i.category), query: 'dark indigo straight-fit jeans' },
  { name: 'An outer layer', test: (i) => i.category === 'Outerwear', query: 'lightweight neutral jacket' },
  { name: 'Everyday shoes', test: (i) => i.category === 'Footwear', query: 'white leather sneakers' },
  { name: 'Something for formal occasions', test: (i) => i.style === 'Formal' || i.occasions?.some((o) => ['Office', 'Wedding'].includes(o)), query: 'formal blazer' },
  { name: 'A warm layer for cold days', test: (i) => i.season?.includes('Winter'), query: 'merino wool sweater' },
  { name: 'Accessories to finish a look', test: (i) => i.category === 'Accessories', query: 'brown leather belt' },
];

const lastWorn = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

function Bars({ rows }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <ul className="bars">
      {rows.map(({ label, count, swatch }) => (
        <li key={label} className="bars__row">
          <span className="bars__label">{swatch && <ColorSwatch color={label} showLabel={false} />}{label}</span>
          <span className="bars__track"><span className="bars__fill" style={{ width: `${(count / max) * 100}%` }} /></span>
          <span className="bars__count">{count}</span>
        </li>
      ))}
    </ul>
  );
}

function ItemRow({ item, detail }) {
  return (
    <li className="insight-item">
      <span className="insight-item__thumb">{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <Shirt size={16} strokeWidth={1.25} />}</span>
      <span className="insight-item__name">{item.name}<small>{item.category}</small></span>
      <span className="insight-item__detail">{detail}</span>
    </li>
  );
}

export default function WardrobeInsights() {
  const navigate = useNavigate();
  const { items, loading, error, fetchItems } = useWardrobe();

  const insights = useMemo(() => {
    const count = (key) => {
      const counts = {};
      items.forEach((item) => [].concat(key(item) || []).forEach((v) => { counts[v] = (counts[v] || 0) + 1; }));
      return Object.entries(counts).map(([label, n]) => ({ label, count: n })).sort((a, b) => b.count - a.count);
    };
    const worn = items.filter((i) => i.wearCount > 0);
    return {
      categories: count((i) => i.category),
      colours: count((i) => i.colors?.map((c) => c.trim())).slice(0, 10),
      totalWears: items.reduce((sum, i) => sum + (i.wearCount || 0), 0),
      wornShare: items.length ? Math.round((worn.length / items.length) * 100) : 0,
      mostWorn: [...worn].sort((a, b) => b.wearCount - a.wearCount).slice(0, 5),
      leastUsed: [...items]
        .sort((a, b) => (a.wearCount || 0) - (b.wearCount || 0) || new Date(a.createdAt) - new Date(b.createdAt))
        .slice(0, 5),
      essentials: ESSENTIALS.map((e) => ({ ...e, owned: items.some(e.test) })),
    };
  }, [items]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={() => fetchItems()} />;

  const header = (
    <PageHeader
      eyebrow="Planning"
      title="Make every piece count."
      subtitle="What you own, what you actually wear, and the few pieces that would make everything work harder."
      image="/images/editorial/white-brown-rail.jpg"
      variant="stacked"
    />
  );

  if (items.length === 0) {
    return (
      <div className="animate-fade-in">
        {header}
        <EmptyState icon={Shirt} title="Nothing to analyse yet" description="Add clothes to your wardrobe to see insights here." actionLabel="Add clothing" onAction={() => navigate('/wardrobe?add=1')} />
      </div>
    );
  }

  const missing = insights.essentials.filter((e) => !e.owned);
  const hasWearData = insights.totalWears > 0;

  return (
    <div className="animate-fade-in">
      {header}

      <dl className="insight-stats">
        <div><dt>Pieces</dt><dd>{items.length}</dd></div>
        <div><dt>Categories</dt><dd>{insights.categories.length}</dd></div>
        <div><dt>Worn at least once</dt><dd>{insights.wornShare}%</dd></div>
        <div><dt>Essentials covered</dt><dd>{ESSENTIALS.length - missing.length}/{ESSENTIALS.length}</dd></div>
      </dl>

      <div className="insight-grid">
        <section className="insight-panel">
          <h2 className="insight-panel__title">Most worn</h2>
          {hasWearData ? (
            <ul className="insight-list">
              {insights.mostWorn.map((item) => (
                <ItemRow key={item._id} item={item} detail={`${item.wearCount}× · ${item.lastWornAt ? lastWorn.format(new Date(item.lastWornAt)) : ''}`} />
              ))}
            </ul>
          ) : (
            <p className="insight-panel__empty">
              Wear is tracked from the <Link to="/planner">Outfit Planner</Link>: plan a look, then mark the day as worn.
            </p>
          )}
        </section>

        <section className="insight-panel">
          <h2 className="insight-panel__title">Least used</h2>
          <ul className="insight-list">
            {insights.leastUsed.map((item) => (
              <ItemRow key={item._id} item={item} detail={item.wearCount ? `${item.wearCount}×` : 'Not worn yet'} />
            ))}
          </ul>
        </section>

        <section className="insight-panel">
          <h2 className="insight-panel__title">Colour distribution</h2>
          {insights.colours.length ? <Bars rows={insights.colours.map((c) => ({ ...c, swatch: true }))} /> : <p className="insight-panel__empty">No colours tagged yet.</p>}
        </section>

        <section className="insight-panel">
          <h2 className="insight-panel__title">By category</h2>
          <Bars rows={insights.categories} />
        </section>
      </div>

      <section className="section essentials">
        <header className="essentials__head">
          <span className="eyebrow">Gap analysis</span>
          <h2 className="essentials__title">{missing.length ? `${missing.length} essentials would round out your wardrobe.` : 'Your essentials are covered.'}</h2>
        </header>
        <ul className="essentials__list">
          {insights.essentials.map((e) => (
            <li key={e.name} className={`essential ${e.owned ? 'essential--owned' : ''}`}>
              <span className="essential__status">{e.owned ? <Check size={14} /> : null}</span>
              <span className="essential__name">{e.name}</span>
              {e.owned ? (
                <span className="essential__note">In your wardrobe</span>
              ) : (
                <Link to={`/shopping/finder?q=${encodeURIComponent(e.query)}`} className="essential__find"><Search size={13} /> Find one</Link>
              )}
            </li>
          ))}
        </ul>
        {missing.length > 0 && (
          <Link to="/shopping/budget" className="link-arrow">Plan these purchases within a budget <ArrowRight size={14} /></Link>
        )}
      </section>
    </div>
  );
}
