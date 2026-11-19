import { useState } from 'react';
import { Sparkles, Wand2 } from 'lucide-react';
import useLooks from '../hooks/useLooks';
import { getErrorMessage } from '../services/api';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import UploadDropzone from '../components/UploadDropzone';
import LookResult from '../components/LookResult';
import LookGallery from '../components/LookGallery';
import '../styles/critic-palette.css';
import '../styles/looks.css';

function SuggestionList({ title, items }) {
  if (!items?.length) return null;
  return (
    <section className="fc-section">
      <h3 className="fc-section__title">{title}</h3>
      <ul className="fc-list">
        {items.map((text) => <li key={text}>{text}</li>)}
      </ul>
    </section>
  );
}

function StyleOptionCard({ option, onGenerate, generating, disabled }) {
  return (
    <Card className="makeover-option">
      <div className="makeover-option__header">
        <h3 className="makeover-option__name">{option.name}</h3>
        {option.styleCategory && <span className="makeover-option__category">{option.styleCategory}</span>}
      </div>
      <p className="makeover-option__summary">{option.summary}</p>
      <div>
        <SuggestionList title="Clothing" items={option.clothingChanges} />
        <SuggestionList title="Accessories" items={option.accessories} />
        <SuggestionList title="Footwear" items={option.footwear} />
      </div>
      <Button variant="outline" fullWidth onClick={onGenerate} loading={generating} disabled={disabled}>
        <Wand2 size={16} /> Generate this look
      </Button>
    </Card>
  );
}

export default function StyleMakeover() {
  const { savedLooks, loading, error: listError, fetchLooks, analyzeMakeover, generateMakeover, updateLook, deleteLook } = useLooks('makeover');

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  // Reuse the stored copy of the photo once one look has been made from it.
  const [photoLookId, setPhotoLookId] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeStyle, setActiveStyle] = useState(null);
  const [look, setLook] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handlePhoto = (file) => {
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : '');
    setPhotoLookId(null);
    setAnalysis(null);
    setLook(null);
    setError('');
  };

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      setError('');
      setAnalysis(await analyzeMakeover(photoFile));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not analyse your outfit. Please try again.'));
    } finally {
      setAnalyzing(false);
    }
  };

  const generate = async (style, sourceLookId = photoLookId) => {
    try {
      setActiveStyle(style.name);
      setGenerating(true);
      setError('');
      const result = await generateMakeover(sourceLookId ? { style, sourceLookId } : { photoFile, style });
      setLook(result);
      if (!sourceLookId || sourceLookId === photoLookId) setPhotoLookId(result._id);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not generate this look. Please try again.'));
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdate = async (id, changes) => {
    const updated = await updateLook(id, changes);
    if (look?._id === id) setLook(updated);
  };

  const handleDelete = async (id) => {
    await deleteLook(id);
    if (look?._id === id) setLook(null);
    if (photoLookId === id) setPhotoLookId(null);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Find your signature style"
        title="A new perspective on your style."
        subtitle="Upload today's outfit and get three personalised ways to elevate it, then see yourself in each one."
        image="/images/editorial/white-shirt-man.jpg"
        variant="reverse"
      />

      <div className="looks-layout section">
        <Card className="looks-panel">
          <div className="looks-step">
            <h2 className="looks-step__title">Your outfit</h2>
            <p className="looks-step__hint">A clear, well-lit full-body photo of what you are wearing today.</p>
            <UploadDropzone
              onFileSelect={handlePhoto}
              preview={photoPreview}
              onRemove={() => handlePhoto(null)}
              label="Upload a full-body photo"
            />
          </div>
          {error && <div className="alert alert--error">{error}</div>}
          <Button fullWidth size="lg" onClick={handleAnalyze} loading={analyzing} disabled={!photoFile || generating}>
            <Sparkles size={16} /> {analysis ? 'Analyse again' : 'Analyse my style'}
          </Button>
          {analyzing && <p className="fc-wait">Your stylist is looking at the outfit. This can take up to 30 seconds.</p>}
        </Card>

        <div className="looks-output">
          {analysis ? (
            <Card>
              <h2 className="looks-step__title">Stylist's take</h2>
              <p className="makeover-option__summary">{analysis.assessment.summary}</p>
              <SuggestionList title="What works" items={analysis.assessment.strengths} />
              <SuggestionList title="To elevate it" items={analysis.assessment.improvements} />
            </Card>
          ) : (
            <div className="looks-output__empty">
              <Sparkles size={22} />
              <p>Your personalised suggestions will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {analysis && (
        <section className="section">
          <h2 className="section__title">Three ways to style it</h2>
          <div className="makeover-options">
            {analysis.options.map((option) => (
              <StyleOptionCard
                key={option.name}
                option={option}
                onGenerate={() => generate(option)}
                generating={generating && activeStyle === option.name}
                disabled={generating}
              />
            ))}
          </div>
        </section>
      )}

      {(look || generating) && (
        <section className="section looks-result-section">
          <LookResult
            look={look}
            generating={generating}
            onRegenerate={() => generate(look.style, look._id)}
            onUpdate={handleUpdate}
          />
        </section>
      )}

      <LookGallery
        looks={savedLooks}
        loading={loading}
        error={listError}
        onRetry={fetchLooks}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        emptyText="Generate a makeover and save the ones you like."
      />
    </div>
  );
}
