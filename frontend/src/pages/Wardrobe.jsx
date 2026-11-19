import { useState, useEffect } from 'react';
import { Plus, Shirt, Search } from 'lucide-react';
import useWardrobe from '../hooks/useWardrobe';
import { getErrorMessage } from '../services/api';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import ClothingCard from '../components/ClothingCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import ConfirmDialog from '../components/ConfirmDialog';
import WardrobeItemForm from '../components/WardrobeItemForm';
import { CATEGORIES, SEASONS, OCCASIONS, splitList } from '../constants/wardrobe';

const emptyItemForm = {
  name: '', category: '', type: '', primaryColor: '', secondaryColor: '', pattern: '',
  style: '', size: '', brand: '', season: [], occasions: '', notes: '', imageUrl: '',
};

function itemToForm(item) {
  return {
    name: item.name || '',
    category: item.category || '',
    type: item.type || '',
    primaryColor: item.colors?.[0] || '',
    secondaryColor: item.colors?.[1] || '',
    pattern: item.pattern || '',
    style: item.style || '',
    size: item.size || '',
    brand: item.brand || '',
    season: item.season || [],
    occasions: (item.occasions || []).join(', '),
    notes: item.notes || '',
    imageUrl: item.imageUrl || '',
  };
}

const SORT_OPTIONS = [
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'category', label: 'Category' },
];

function formToPayload(form) {
  return {
    name: form.name.trim(),
    category: form.category,
    type: form.type.trim() || null,
    colors: [form.primaryColor, form.secondaryColor].map((c) => c.trim()).filter(Boolean),
    pattern: form.pattern.trim() || null,
    style: form.style || null,
    size: form.size.trim() || null,
    brand: form.brand.trim() || null,
    season: form.season,
    occasions: splitList(form.occasions),
    notes: form.notes.trim(),
  };
}

export default function Wardrobe() {
  const { items, loading, error, addItem, updateItem, deleteItem, uploadImage, classifyImage, fetchItems } = useWardrobe({ autoFetch: false });
  const { showToast } = useToast();

  const [filters, setFilters] = useState({ category: '', season: '', occasion: '', sort: '' });
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(emptyItemForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const hasFilters = Boolean(search || filters.category || filters.season || filters.occasion);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems({
        search: search.trim() || undefined,
        category: filters.category || undefined,
        season: filters.season || undefined,
        occasion: filters.occasion || undefined,
        sort: filters.sort || undefined,
      });
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, filters, fetchItems]);

  const setFilter = (name, value) => setFilters((prev) => ({ ...prev, [name]: value }));

  const openModal = (item = null) => {
    setEditingItem(item);
    setForm(item ? itemToForm(item) : emptyItemForm);
    setImagePreview(item?.imageUrl || '');
    setImageFile(null);
    setAiStatus(null);
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const handleFileSelect = async (file) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setAiStatus(null);
    setAnalyzing(true);
    try {
      const detected = await classifyImage(file);
      setForm((prev) => ({
        ...prev,
        name: detected.name || prev.name,
        category: detected.category || prev.category,
        type: detected.type || prev.type,
        primaryColor: detected.colors[0] || prev.primaryColor,
        secondaryColor: detected.colors[1] || '',
        pattern: detected.pattern || prev.pattern,
        style: detected.style || prev.style,
        season: detected.season.length ? detected.season : prev.season,
        occasions: detected.occasions.length ? detected.occasions.join(', ') : prev.occasions,
      }));
      setAiStatus({ type: 'success' });
    } catch (err) {
      setAiStatus({ type: 'error', message: getErrorMessage(err, 'Gemini could not analyse this photo.') });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setForm((prev) => ({ ...prev, imageUrl: '' }));
    setAiStatus(null);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.name.trim() || !form.category) {
      setFormError('Name and category are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = formToPayload(form);
      if (imageFile) {
        const uploaded = await uploadImage(imageFile);
        payload.imageUrl = uploaded.imageUrl;
        payload.imagePath = uploaded.imagePath;
      } else if (!form.imageUrl) {
        payload.imageUrl = null;
      }
      if (aiStatus?.type === 'success') {
        payload.aiSuggested = { category: form.category, colors: payload.colors, style: payload.style, accepted: true };
      }

      if (editingItem) {
        await updateItem(editingItem._id, payload);
        showToast('Item updated.', 'success');
      } else {
        await addItem(payload);
        showToast(`${payload.name} added to your wardrobe.`, 'success');
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not save this item.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteItem(deleteTarget._id);
      showToast('Item removed.', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not remove this item.'), 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Wardrobe"
        subtitle={loading && !items.length ? 'Loading your pieces…' : `${items.length} ${items.length === 1 ? 'piece' : 'pieces'}${hasFilters ? ' matching your filters' : ''}`}
        action={<Button onClick={() => openModal()}><Plus size={16} /> Add item</Button>}
      />

      <div className="wardrobe-toolbar">
        <Input
          placeholder="Search by name, colour, brand…"
          icon={Search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="wardrobe-toolbar__search"
          aria-label="Search wardrobe"
        />
        <Select options={SEASONS} placeholder="Any season" value={filters.season} onChange={(e) => setFilter('season', e.target.value)} aria-label="Season" />
        <Select options={OCCASIONS} placeholder="Any occasion" value={filters.occasion} onChange={(e) => setFilter('occasion', e.target.value)} aria-label="Occasion" />
        <Select options={SORT_OPTIONS} placeholder="Newest first" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)} aria-label="Sort" />
      </div>

      <div className="filter-bar">
        <button onClick={() => setFilter('category', '')} className={`filter-chip ${!filters.category ? 'filter-chip--active' : ''}`}>All</button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter('category', filters.category === cat ? '' : cat)}
            className={`filter-chip ${filters.category === cat ? 'filter-chip--active' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorMessage message={error} onRetry={() => setFilters((prev) => ({ ...prev }))} />
      ) : loading && !items.length ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        hasFilters ? (
          <EmptyState icon={Search} title="Nothing matches" description="Try a different search or clear the filters." />
        ) : (
          <EmptyState
            icon={Shirt}
            title="Your wardrobe is empty"
            description="Add a photo of a piece you own and Gemini will tag its category, colours and style for you."
            actionLabel="Add your first item"
            onAction={() => openModal()}
          />
        )
      ) : (
        <div className="grid grid--cards">
          {items.map((item) => (
            <ClothingCard key={item._id} item={item} onClick={openModal} onEdit={openModal} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingItem ? 'Edit item' : 'Add to wardrobe'}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} loading={saving} disabled={analyzing}>
              {editingItem ? 'Save changes' : 'Save item'}
            </Button>
          </>
        }
      >
        <WardrobeItemForm
          form={form}
          onChange={(name, value) => { setForm((prev) => ({ ...prev, [name]: value })); setFormError(''); }}
          imagePreview={imagePreview}
          onFileSelect={handleFileSelect}
          onRemoveImage={handleRemoveImage}
          analyzing={analyzing}
          aiStatus={aiStatus}
          error={formError}
          onSubmit={handleSubmit}
        />
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove item?"
        message={`Remove "${deleteTarget?.name}" from your wardrobe? Saved outfits that use it will lose this piece.`}
        confirmLabel="Remove"
      />
    </div>
  );
}
