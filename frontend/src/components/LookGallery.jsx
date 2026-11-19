import { useState } from 'react';
import { Heart, Download, Trash2, Images } from 'lucide-react';
import { getErrorMessage } from '../services/api';
import { downloadImage, lookTitle } from '../utils/looks';
import { useToast } from './Toast';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import ErrorMessage from './ErrorMessage';
import ConfirmDialog from './ConfirmDialog';

const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Grid of saved looks with a Favourites filter, favourite/download/delete. */
export default function LookGallery({ looks, loading, error, onRetry, onUpdate, onDelete, emptyText }) {
  const { showToast } = useToast();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const visible = favoritesOnly ? looks.filter((look) => look.favorite) : looks;

  const toggleFavorite = (look) => onUpdate(look._id, { favorite: !look.favorite })
    .catch((err) => showToast(getErrorMessage(err, 'Could not update this look.'), 'error'));

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await onDelete(deleteTarget._id);
      showToast('Look deleted.', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not delete this look.'), 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <section className="section">
      <div className="look-gallery__header">
        <h2 className="section__title">Saved looks</h2>
        {looks.length > 0 && (
          <div className="tag-toggle-group">
            {[[false, 'All'], [true, 'Favourites']].map(([value, label]) => (
              <button
                key={label}
                type="button"
                className={`filter-chip ${favoritesOnly === value ? 'filter-chip--active' : ''}`}
                onClick={() => setFavoritesOnly(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage message={error} onRetry={onRetry} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Images}
          title={favoritesOnly ? 'No favourites yet' : 'No saved looks yet'}
          description={favoritesOnly ? 'Tap the heart on a saved look to add it here.' : emptyText}
        />
      ) : (
        <div className="look-gallery">
          {visible.map((look) => (
            <figure key={look._id} className="look-card">
              <a href={look.resultUrl} target="_blank" rel="noreferrer" className="look-card__image">
                <img src={look.resultUrl} alt={lookTitle(look)} loading="lazy" />
              </a>
              <figcaption className="look-card__body">
                <span className="look-card__title" title={lookTitle(look)}>{lookTitle(look)}</span>
                <span className="look-card__date">{dateFormat.format(new Date(look.createdAt))}</span>
              </figcaption>
              <div className="look-card__actions">
                <button type="button" onClick={() => toggleFavorite(look)} aria-label={look.favorite ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={look.favorite}>
                  <Heart size={15} fill={look.favorite ? 'currentColor' : 'none'} />
                </button>
                <button
                  type="button"
                  onClick={() => downloadImage(look.resultUrl, `digicloset-${look._id}`).catch(() => showToast('Could not download the image.', 'error'))}
                  aria-label="Download"
                >
                  <Download size={15} />
                </button>
                <button type="button" onClick={() => setDeleteTarget(look)} aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </figure>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this look?"
        message="The generated image will be permanently deleted."
        confirmLabel="Delete"
        loading={deleting}
      />
    </section>
  );
}
