import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, ListChecks, ExternalLink, ImageIcon } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import useOutfits from '../hooks/useOutfits';
import useShoppingList from '../hooks/useShoppingList';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import OutfitCard from '../components/OutfitCard';
import ShoppingPlanCard from '../components/ShoppingPlanCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatPrice } from '../utils/shopping';
import '../styles/shopping.css';

function useSavedProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/products/saved')
      .then(({ data }) => setProducts(data.data.saved))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (id) => {
    await api.delete(`/products/saved/${id}`);
    setProducts((prev) => prev.filter((p) => p._id !== id));
  };

  return { products, loading, remove };
}

export default function SavedItems() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { saved: outfits, loading: outfitsLoading, toggleFavorite, deleteOutfit } = useOutfits();
  const { lists, loading: listsLoading, deleteList } = useShoppingList();
  const { products, loading: productsLoading, remove: removeProduct } = useSavedProducts();
  const [tab, setTab] = useState('outfits');
  const [favouritesOnly, setFavouritesOnly] = useState(false);

  const run = async (action, success, failure) => {
    try {
      await action();
      if (success) showToast(success, 'success');
    } catch (err) {
      showToast(getErrorMessage(err, failure), 'error');
    }
  };

  const visibleOutfits = favouritesOnly ? outfits.filter((o) => o.favorite) : outfits;
  const tabs = [
    { key: 'outfits', label: 'Outfits', icon: Heart, count: outfits.length },
    { key: 'products', label: 'Products', icon: ShoppingBag, count: products.length },
    { key: 'lists', label: 'Shopping plans', icon: ListChecks, count: lists.length },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Saved" subtitle="Outfits you liked, products you bookmarked and your shopping plans." />

      <div className="si-tabs" role="tablist">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={`si-tab ${tab === key ? 'si-tab--active' : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon size={15} /> {label} <span className="si-tab__count">{count}</span>
          </button>
        ))}
      </div>

      {tab === 'outfits' && (
        outfitsLoading ? <LoadingSpinner /> : outfits.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="No saved outfits yet"
            description="Generate outfits from your wardrobe and save the ones you like."
            actionLabel="Generate outfits"
            onAction={() => navigate('/outfits')}
          />
        ) : (
          <>
            <label className="si-filter">
              <input type="checkbox" checked={favouritesOnly} onChange={(e) => setFavouritesOnly(e.target.checked)} />
              Favourites only
            </label>
            {visibleOutfits.length === 0 ? (
              <p className="text-muted">No favourites yet. Tap the heart on an outfit to add it.</p>
            ) : (
              <div className="si-outfits">
                {visibleOutfits.map((outfit) => (
                  <OutfitCard
                    key={outfit._id}
                    outfit={outfit}
                    items={outfit.clothingItems}
                    onFavoriteToggle={() => run(() => toggleFavorite(outfit._id), null, 'Could not update favourite.')}
                    onDelete={() => run(() => deleteOutfit(outfit._id), 'Outfit removed.', 'Could not remove outfit.')}
                  />
                ))}
              </div>
            )}
          </>
        )
      )}

      {tab === 'products' && (
        productsLoading ? <LoadingSpinner /> : products.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No saved products yet"
            description="Bookmark products from the Clothes Finder to compare them later."
            actionLabel="Open Clothes Finder"
            onAction={() => navigate('/shopping/finder')}
          />
        ) : (
          <div className="sf-grid">
            {products.map((p) => (
              <Card key={p._id} padding={false} className="sf-product">
                <div className="sf-product__image">
                  {p.imageUrl ? <img src={p.imageUrl} alt={p.title} loading="lazy" /> : <ImageIcon size={28} />}
                </div>
                <div className="sf-product__body">
                  <p className="sf-product__merchant">{p.merchant}</p>
                  <h3 className="sf-product__title" title={p.title}>{p.title}</h3>
                  {p.price != null && <span className="sf-product__price">{formatPrice(p.price)}</span>}
                  <p className="si-price-note">Price when saved</p>
                  <div className="sf-product__actions">
                    <a href={p.link} target="_blank" rel="noopener noreferrer" className="btn btn--outline btn--sm">
                      View <ExternalLink size={13} />
                    </a>
                    <Button size="sm" variant="ghost" onClick={() => run(() => removeProduct(p._id), 'Removed.', 'Could not remove product.')}>
                      Remove
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === 'lists' && (
        listsLoading ? <LoadingSpinner /> : lists.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No shopping plans yet"
            description="Set a budget and get a shopping list built around what you already own."
            actionLabel="Plan a budget"
            onAction={() => navigate('/shopping/budget')}
          />
        ) : (
          <div className="bp-previous">
            {lists.map((list) => (
              <ShoppingPlanCard
                key={list._id}
                list={list}
                onDelete={() => run(() => deleteList(list._id), 'Plan deleted.', 'Could not delete plan.')}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
