import { useState } from 'react';
import { Search, ExternalLink, Bookmark, Check, Star, ImageIcon } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatPrice } from '../utils/shopping';
import '../styles/shopping.css';

const EXAMPLES = [
  'Black oversized t-shirt under ₹800',
  'Beige cargo pants for college',
  'White sneakers under ₹2,000',
];

function describeFilters(filters) {
  const chips = [
    filters.category,
    filters.color,
    filters.style,
    filters.occasion,
    filters.brand,
    filters.gender,
    filters.size && `Size ${filters.size}`,
    filters.minPrice && `From ${formatPrice(filters.minPrice)}`,
    filters.maxPrice && `Up to ${formatPrice(filters.maxPrice)}`,
    ...(filters.otherRequirements || []),
  ];
  return [...new Set(chips.filter(Boolean))];
}

function ProductCard({ product, saved, onSave }) {
  return (
    <Card padding={false} className="sf-product">
      <div className="sf-product__image">
        {product.imageUrl ? <img src={product.imageUrl} alt={product.title} loading="lazy" /> : <ImageIcon size={28} />}
      </div>
      <div className="sf-product__body">
        <p className="sf-product__merchant">{product.merchant}</p>
        <h3 className="sf-product__title" title={product.title}>{product.title}</h3>
        <div className="sf-product__price-row">
          <span className="sf-product__price">{product.priceText || formatPrice(product.price)}</span>
          {product.rating && (
            <span className="sf-product__rating">
              <Star size={12} fill="currentColor" /> {product.rating}{product.reviews ? ` (${product.reviews})` : ''}
            </span>
          )}
        </div>
        {product.description && <p className="sf-product__description">{product.description}</p>}
        <div className="sf-product__actions">
          <a href={product.link} target="_blank" rel="noopener noreferrer" className="btn btn--outline btn--sm">
            View on {product.merchant} <ExternalLink size={13} />
          </a>
          <Button size="sm" variant="ghost" onClick={() => onSave(product)} disabled={saved} aria-label="Save product">
            {saved ? <Check size={15} /> : <Bookmark size={15} />}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MarketplaceLinks({ links, query }) {
  return (
    <div className="sf-links">
      {links.map((link) => (
        <a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer" className="btn btn--outline btn--sm">
          Search {link.platform} for “{query}” <ExternalLink size={13} />
        </a>
      ))}
    </div>
  );
}

export default function ClothesFinder() {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedIds, setSavedIds] = useState(new Set());

  const search = async (text) => {
    const q = text.trim();
    if (q.length < 3) {
      setError('Describe what you are looking for, e.g. “black oversized t-shirt under ₹800”.');
      return;
    }
    setQuery(q);
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/shopping/assistant/search', { query: q });
      setResult(data.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Search failed. Please try again.'));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const saveProduct = async (product) => {
    try {
      await api.post('/products/saved', {
        id: product.id, title: product.title, price: product.price,
        merchant: product.merchant, imageUrl: product.imageUrl, link: product.link,
      });
      setSavedIds((prev) => new Set(prev).add(product.id));
      showToast('Saved to your products.', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not save the product.'), 'error');
    }
  };

  const filters = result ? describeFilters(result.filters) : [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Clothes Finder"
        subtitle="Describe what you want in your own words, with colour, style, size or budget, and we'll search for it."
      />

      <form className="sf-search" onSubmit={(e) => { e.preventDefault(); search(query); }}>
        <Search size={18} className="sf-search__icon" aria-hidden="true" />
        <input
          className="sf-search__input"
          placeholder="e.g. Beige cargo pants for college under ₹1,500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={300}
          aria-label="What are you looking for?"
        />
        <Button type="submit" loading={loading}>Search</Button>
      </form>

      <div className="sf-examples">
        {EXAMPLES.map((example) => (
          <button key={example} type="button" className="filter-chip" onClick={() => search(example)} disabled={loading}>
            {example}
          </button>
        ))}
      </div>

      {error && <div className="alert alert--error section">{error}</div>}

      {loading && (
        <div className="sf-loading">
          <LoadingSpinner size="md" />
          <p>Understanding your request and searching…</p>
        </div>
      )}

      {result && !loading && (
        <section className="section">
          <div className="sf-understood">
            <span className="sf-understood__label">What we understood</span>
            <div className="sf-understood__chips">
              {filters.length > 0
                ? filters.map((chip) => <span key={chip} className="sf-chip">{chip}</span>)
                : <span className="sf-chip">{result.filters.searchQuery}</span>}
            </div>
          </div>

          {!result.configured ? (
            <Card className="sf-notice">
              <h3>Live product listings aren't connected yet</h3>
              <p>
                DigiCloset only shows real products with real prices, and no product search provider is configured on the server.
                Add a SerpApi key as <code>PRODUCT_SEARCH_API_KEY</code> in <code>backend/.env</code> to show Google Shopping
                results here. In the meantime, you can run this search directly on these stores:
              </p>
              <MarketplaceLinks links={result.marketplaceLinks} query={result.filters.searchQuery} />
            </Card>
          ) : result.products.length === 0 ? (
            <Card className="sf-notice">
              <h3>No products matched{result.filters.maxPrice ? ` under ${formatPrice(result.filters.maxPrice)}` : ''}</h3>
              <p>Try a broader description or a higher budget, or search the stores directly:</p>
              <MarketplaceLinks links={result.marketplaceLinks} query={result.filters.searchQuery} />
            </Card>
          ) : (
            <>
              <p className="sf-count">{result.products.length} results from {result.provider}</p>
              <div className="sf-grid">
                {result.products.map((product) => (
                  <ProductCard key={product.id} product={product} saved={savedIds.has(product.id)} onSave={saveProduct} />
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
