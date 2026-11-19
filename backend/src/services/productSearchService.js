/**
 * Product search across real shopping sources.
 *
 * Providers are plain objects with a `search()` that returns normalised
 * products. Only SerpApi's Google Shopping engine is implemented; add another
 * provider to PROVIDERS and point PRODUCT_SEARCH_PROVIDER at it.
 *
 * With no provider configured, search() returns no products, only genuine
 * marketplace search links, and says so. It never invents listings.
 */

const env = require('../config/env');

const serpApiProvider = {
  name: 'Google Shopping (SerpApi)',

  async search({ query, minPrice, maxPrice, limit }) {
    const params = new URLSearchParams({
      engine: 'google_shopping',
      q: query,
      gl: 'in',
      hl: 'en',
      location: 'India',
      api_key: env.PRODUCT_SEARCH_API_KEY,
    });
    if (minPrice) params.set('min_price', String(minPrice));
    if (maxPrice) params.set('max_price', String(maxPrice));

    const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(20000) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      const err = new Error(`Product search failed: ${data.error || res.statusText}`);
      err.statusCode = res.status === 401 ? 502 : 503;
      throw err;
    }

    return (data.shopping_results || [])
      .filter((p) => p.title && p.product_link && typeof p.extracted_price === 'number')
      .slice(0, limit)
      .map((p) => ({
        id: p.product_id || p.product_link,
        title: p.title,
        price: Math.round(p.extracted_price),
        priceText: p.price,
        merchant: p.source || 'Online store',
        imageUrl: p.thumbnail || null,
        link: p.product_link,
        rating: p.rating ?? null,
        reviews: p.reviews ?? null,
        description: p.snippet || (p.extensions || []).join(' · '),
      }));
  },
};

const PROVIDERS = { serpapi: serpApiProvider };

function marketplaceLinks(query) {
  const q = encodeURIComponent(query.trim());
  return [
    { platform: 'Myntra', url: `https://www.myntra.com/${encodeURIComponent(query.trim().toLowerCase().replace(/\s+/g, '-'))}` },
    { platform: 'Amazon', url: `https://www.amazon.in/s?k=${q}` },
    { platform: 'Flipkart', url: `https://www.flipkart.com/search?q=${q}` },
    { platform: 'AJIO', url: `https://www.ajio.com/search/?text=${q}` },
  ];
}

class ProductSearchService {
  constructor() {
    this.provider = env.PRODUCT_SEARCH_CONFIGURED ? PROVIDERS[env.PRODUCT_SEARCH_PROVIDER] : null;
    if (env.PRODUCT_SEARCH_CONFIGURED && !this.provider) {
      console.warn(`⚠️  Unknown PRODUCT_SEARCH_PROVIDER "${env.PRODUCT_SEARCH_PROVIDER}". Product search is disabled.`);
    }
  }

  get isConfigured() {
    return Boolean(this.provider);
  }

  async search({ query, minPrice, maxPrice, limit = 12 }) {
    const base = {
      configured: this.isConfigured,
      provider: this.provider?.name || null,
      marketplaceLinks: marketplaceLinks(query),
    };
    if (!this.provider) {
      return { ...base, products: [] };
    }

    const products = await this.provider.search({ query, minPrice, maxPrice, limit: limit * 2 });
    // Providers treat price bounds as hints, so enforce them here.
    const inRange = products
      .filter((p) => (!maxPrice || p.price <= maxPrice) && (!minPrice || p.price >= minPrice))
      .slice(0, limit);
    return { ...base, products: inRange };
  }
}

module.exports = new ProductSearchService();
