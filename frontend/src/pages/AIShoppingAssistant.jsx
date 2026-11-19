import { useState, useEffect } from 'react';
import {
  Sparkles, Search, ExternalLink, Tag, DollarSign,
  CheckCircle2, AlertCircle, ShoppingBag, Heart, RefreshCw,
  Globe, Info,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const EXAMPLE_QUERIES = [
  'Find me a red casual top under ₹1,000 for college.',
  'Blue slim fit jeans under ₹2,500 for casual wear.',
  'Classic white sneakers under ₹2,000.',
  'Black formal shirt for office under ₹1,500.',
  'Summer floral dress under ₹2,000 for party.',
  'Olive cargo pants under ₹1,200.',
];

const PLATFORMS = ['All', 'Amazon', 'Myntra', 'Flipkart', 'AJIO'];
const CATEGORIES = ['All Categories', 'Tops', 'Shirts', 'T-Shirts', 'Jeans', 'Trousers', 'Dresses', 'Jackets', 'Sneakers', 'Loafers', 'Accessories'];
const COLORS = ['All Colors', 'Red', 'Blue', 'Black', 'White', 'Navy', 'Beige', 'Green', 'Maroon', 'Olive', 'Brown', 'Grey'];

const SORT_OPTIONS = [
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
];

const formatPrice = (price) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);

export default function AIShoppingAssistant() {
  const { showToast } = useToast();

  const [inputQuery, setInputQuery] = useState('Find me a red casual top under ₹1,000 for college.');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedColor, setSelectedColor] = useState('All Colors');
  const [selectedSort, setSelectedSort] = useState('price_asc');
  const [withinBudgetOnly, setWithinBudgetOnly] = useState(false);

  const [loading, setLoading] = useState(false);
  const [parsedInfo, setParsedInfo] = useState(null);
  const [products, setProducts] = useState([]);
  const [alternatives, setAlternatives] = useState([]);
  const [directLinks, setDirectLinks] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [savedProductIds, setSavedProductIds] = useState(new Set());

  // Execute Search
  const handleSearch = async (overrideQuery) => {
    const q = overrideQuery !== undefined ? overrideQuery : inputQuery;
    if (!q.trim() && selectedCategory === 'All Categories' && selectedColor === 'All Colors') {
      showToast('Please type a search query or pick a category.', 'error');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        query: q.trim(),
        platform: selectedPlatform !== 'All' ? selectedPlatform : undefined,
        category: selectedCategory !== 'All Categories' ? selectedCategory : undefined,
        color: selectedColor !== 'All Colors' ? selectedColor : undefined,
        sort: selectedSort,
        withinBudgetOnly,
      };

      const { data } = await api.post('/shopping/assistant/search', payload);
      setParsedInfo(data.data.parsed);
      setProducts(data.data.products || []);
      setAlternatives(data.data.alternatives || []);
      setDirectLinks(data.data.directSearchLinks || []);
      setHasSearched(true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to search products.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Run initial default search on mount to populate the example query
  useEffect(() => {
    handleSearch('Find me a red casual top under ₹1,000 for college.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChipClick = (example) => {
    setInputQuery(example);
    setSelectedPlatform('All');
    setSelectedCategory('All Categories');
    setSelectedColor('All Colors');
    handleSearch(example);
  };

  const handleSaveProduct = async (productId) => {
    try {
      await api.post('/products/saved', { productId });
      setSavedProductIds((prev) => new Set([...prev, productId]));
      showToast('Product saved to your wishlist!', 'success');
    } catch {
      showToast('Failed to save product.', 'error');
    }
  };

  const getPlatformBadgeClass = (platform) => {
    switch (platform?.toLowerCase()) {
      case 'amazon':
        return 'platform-badge--amazon';
      case 'myntra':
        return 'platform-badge--myntra';
      case 'flipkart':
        return 'platform-badge--flipkart';
      case 'ajio':
        return 'platform-badge--ajio';
      default:
        return 'platform-badge--myntra';
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="AI Fashion Shopping Assistant"
        subtitle="Search clothes using natural language. Gemini extracts category, color, budget, and occasion across Amazon, Myntra, Flipkart, and AJIO."
      />

      {/* --- Natural Language Search Box --- */}
      <div className="shopping-search-box">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
        >
          <div className="shopping-search-input-wrap">
            <Search className="shopping-search-icon" size={20} />
            <input
              type="text"
              className="shopping-search-input"
              placeholder="e.g. Find me a red casual top under ₹1,000 for college..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
            />
            <Button type="submit" loading={loading} style={{ minWidth: '8rem' }}>
              <Sparkles size={16} /> AI Search
            </Button>
          </div>
        </form>

        {/* Example Query Chips */}
        <div className="shopping-chips-row">
          <span className="shopping-chip-hint">Try:</span>
          {EXAMPLE_QUERIES.map((q, idx) => (
            <button
              key={idx}
              type="button"
              className="shopping-example-chip"
              onClick={() => handleChipClick(q)}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* --- Gemini Extracted Criteria Breakdown --- */}
      {parsedInfo && (
        <div className="shopping-parsed-bar animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent)', fontWeight: 600 }}>
            <Sparkles size={14} /> Understood by AI:
          </div>
          {parsedInfo.category && (
            <span className="shopping-parsed-tag">
              <Tag size={12} color="var(--accent-blue)" /> Category: {parsedInfo.category}
            </span>
          )}
          {parsedInfo.color && (
            <span className="shopping-parsed-tag">
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: parsedInfo.color.toLowerCase(),
                  display: 'inline-block',
                }}
              />
              Color: {parsedInfo.color}
            </span>
          )}
          {parsedInfo.style && (
            <span className="shopping-parsed-tag">Style: {parsedInfo.style}</span>
          )}
          {parsedInfo.occasion && (
            <span className="shopping-parsed-tag">Occasion: {parsedInfo.occasion}</span>
          )}
          {parsedInfo.maxBudget && (
            <span className="shopping-parsed-tag" style={{ borderColor: 'rgba(34, 197, 94, 0.4)', color: '#4ade80' }}>
              <DollarSign size={12} /> Max Budget: ₹{parsedInfo.maxBudget.toLocaleString('en-IN')}
            </span>
          )}
        </div>
      )}

      {/* --- Filter & Sort Controls Toolbar --- */}
      <div className="shopping-filters-toolbar">
        {/* Platform Pills */}
        <div className="shopping-filters-left">
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
            Platform:
          </span>
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              className={`platform-pill ${selectedPlatform === p ? 'platform-pill--active' : ''}`}
              onClick={() => {
                setSelectedPlatform(p);
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Dropdowns & Sort */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
          <select
            className="field__input"
            style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: 'var(--text-xs)' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            className="field__input"
            style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: 'var(--text-xs)' }}
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
          >
            {COLORS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            className="field__input"
            style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: 'var(--text-xs)' }}
            value={selectedSort}
            onChange={(e) => setSelectedSort(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              marginLeft: 'var(--space-2)',
            }}
          >
            <input
              type="checkbox"
              checked={withinBudgetOnly}
              onChange={(e) => setWithinBudgetOnly(e.target.checked)}
            />
            Stay within budget
          </label>

          <Button size="sm" variant="outline" onClick={() => handleSearch()}>
            <RefreshCw size={13} /> Apply
          </Button>
        </div>
      </div>

      {/* --- Loading State --- */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>
          <LoadingSpinner />
          <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            Gemini is structuring your request and searching products across Amazon, Myntra, Flipkart, and AJIO...
          </p>
        </div>
      )}

      {/* --- Product Results Grid --- */}
      {!loading && hasSearched && (
        <div className="section">
          {products.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No exact matches found"
              description="Try adjusting your budget or selecting 'All' platforms to discover more clothing items."
              actionLabel="Show All Items"
              onAction={() => {
                setInputQuery('');
                setSelectedPlatform('All');
                setSelectedCategory('All Categories');
                setSelectedColor('All Colors');
                handleSearch('');
              }}
            />
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <h3 className="section__title" style={{ margin: 0, fontSize: 'var(--text-base)' }}>
                  Matching Products ({products.length})
                </h3>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Clicking any product opens the verified store page
                </span>
              </div>

              <div className="product-grid">
                {products.map((product) => {
                  const isSaved = savedProductIds.has(product._id);
                  return (
                    <Card
                      key={product._id}
                      padding={false}
                      hover
                      className="product-card"
                      style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                    >
                      <div className="product-card__image-wrap">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="product-card__image"
                          loading="lazy"
                        />
                      </div>

                      <div className="product-card__body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                          <span className={`platform-badge ${getPlatformBadgeClass(product.platform)}`}>
                            {product.platform}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSaveProduct(product._id)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: isSaved ? 'var(--color-danger)' : 'var(--text-muted)' }}
                            title="Save product"
                          >
                            <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} />
                          </button>
                        </div>

                        <span className="product-card__brand">{product.brand}</span>
                        <h3 className="product-card__name" title={product.name}>
                          {product.name}
                        </h3>

                        {/* Budget Status Badge */}
                        <div style={{ marginTop: 'var(--space-2)' }}>
                          {product.budgetStatus === 'within' && (
                            <span className="budget-badge budget-badge--within">
                              <CheckCircle2 size={12} /> Within Budget
                            </span>
                          )}
                          {product.budgetStatus === 'over' && (
                            <span className="budget-badge budget-badge--over">
                              <AlertCircle size={12} /> {product.budgetLabel}
                            </span>
                          )}
                        </div>

                        <div className="product-card__footer" style={{ marginTop: 'auto' }}>
                          <span className="product-card__price">{formatPrice(product.price)}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 500 }}>
                            ✓ Verified Price
                          </span>
                        </div>

                        {/* Open Product Link */}
                        <a
                          href={product.sourceUrl || `https://www.google.com/search?q=${encodeURIComponent(product.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="product-link-btn"
                        >
                          View on {product.platform} <ExternalLink size={13} />
                        </a>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* --- Alternative Products (Shown when exact matches are few or when requested) --- */}
          {alternatives.length > 0 && (
            <div className="section" style={{ marginTop: 'var(--space-8)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                <Info size={18} color="var(--accent)" />
                <div>
                  <h3 className="section__title" style={{ margin: 0, fontSize: 'var(--text-base)' }}>
                    Alternative Suggestions You Might Like
                  </h3>
                  <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Similar clothing items in adjacent colors or styles matching your budget.
                  </p>
                </div>
              </div>

              <div className="product-grid">
                {alternatives.map((product) => (
                  <Card
                    key={product._id}
                    padding={false}
                    hover
                    className="product-card"
                    style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                  >
                    <div className="product-card__image-wrap">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="product-card__image"
                        loading="lazy"
                      />
                    </div>
                    <div className="product-card__body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                        <span className={`platform-badge ${getPlatformBadgeClass(product.platform)}`}>
                          {product.platform}
                        </span>
                      </div>
                      <span className="product-card__brand">{product.brand}</span>
                      <h3 className="product-card__name" title={product.name}>
                        {product.name}
                      </h3>
                      <div className="product-card__footer" style={{ marginTop: 'auto' }}>
                        <span className="product-card__price">{formatPrice(product.price)}</span>
                      </div>
                      <a
                        href={product.sourceUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="product-link-btn"
                      >
                        View on {product.platform} <ExternalLink size={13} />
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* --- Live Direct Multi-Platform Search Strip --- */}
          {directLinks.length > 0 && (
            <div className="direct-platforms-strip">
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                <Globe size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Search live on verified stores:
              </span>
              {directLinks.map((link) => (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="direct-platform-link"
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: link.brandColor }} />
                  {link.platform} <ExternalLink size={11} />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
