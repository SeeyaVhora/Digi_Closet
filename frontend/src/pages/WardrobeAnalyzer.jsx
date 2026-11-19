import { useState, useCallback } from 'react';
import { ScanSearch, Upload, CheckCircle2, Pencil, ArrowLeft, Save, RotateCcw } from 'lucide-react';
import useWardrobe from '../hooks/useWardrobe';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Badge from '../components/Badge';
import UploadDropzone from '../components/UploadDropzone';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const CATEGORIES = ['Tops', 'Shirts', 'T-Shirts', 'Trousers', 'Jeans', 'Dresses', 'Footwear', 'Outerwear', 'Accessories'];

const STEPS = [
  { label: 'Upload', icon: Upload },
  { label: 'Review', icon: ScanSearch },
  { label: 'Saved', icon: CheckCircle2 },
];

// ---------- Step Indicator ----------

function StepIndicator({ currentStep }) {
  return (
    <div className="analyzer-steps">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const state = i < currentStep ? 'completed' : i === currentStep ? 'active' : '';
        return (
          <div key={step.label} className={`analyzer-step ${state ? `analyzer-step--${state}` : ''}`}>
            <div className="analyzer-step__circle"><Icon size={16} /></div>
            <span className="analyzer-step__label">{step.label}</span>
            {i < STEPS.length - 1 && <div className="analyzer-step__connector" />}
          </div>
        );
      })}
    </div>
  );
}

// ---------- Step 0: Upload ----------

function UploadStep({ onFileSelect, analyzing, error }) {
  return (
    <div className="analyzer-upload">
      <UploadDropzone
        onFileSelect={onFileSelect}
        label="Drop a clothing image to analyze"
        hint="JPEG, PNG, or WebP — up to 5MB"
      />
      {analyzing && (
        <div className="analyzer-analyzing">
          <LoadingSpinner size="sm" />
          <p>AI is analyzing your clothing item…</p>
        </div>
      )}
      {error && <ErrorMessage message={error} />}
    </div>
  );
}

// ---------- Step 1: Review & Edit ----------

function ReviewStep({ imagePreview, form, onChange, aiMode, onBack, onSave, saving, formError }) {
  return (
    <div className="analyzer-review">
      <div className="analyzer-review__layout">
        {/* Image preview panel */}
        <div className="analyzer-review__image-panel">
          <img src={imagePreview} alt="Clothing preview" className="analyzer-review__image" />
          {aiMode && (
            <Badge variant={aiMode === 'ai' ? 'success' : 'default'} size="sm">
              {aiMode === 'ai' ? '✨ AI Detected' : 'Offline Mode'}
            </Badge>
          )}
        </div>

        {/* Editable details panel */}
        <div className="analyzer-review__details-panel">
          <div className="analyzer-review__section-header">
            <Pencil size={14} />
            <span>Review &amp; edit the detected details</span>
          </div>

          <Input
            label="Item Name"
            name="name"
            placeholder="e.g. Navy Oxford Shirt"
            value={form.name}
            onChange={onChange}
          />

          <div className="form-grid form-grid--2">
            <Select
              label="Category"
              name="category"
              options={CATEGORIES}
              value={form.category}
              onChange={onChange}
            />
            <Input
              label="Type"
              name="type"
              placeholder="e.g. Polo Shirt"
              value={form.type}
              onChange={onChange}
            />
          </div>

          <div className="form-grid form-grid--2">
            <Input
              label="Colors (comma separated)"
              name="colors"
              placeholder="e.g. Navy, White"
              value={form.colors}
              onChange={onChange}
            />
            <Input
              label="Pattern"
              name="pattern"
              placeholder="e.g. Solid, Striped"
              value={form.pattern}
              onChange={onChange}
            />
          </div>

          <div className="form-grid form-grid--2">
            <Input
              label="Style"
              name="style"
              placeholder="e.g. Casual"
              value={form.style}
              onChange={onChange}
            />
            <Input
              label="Occasions (comma separated)"
              name="occasions"
              placeholder="e.g. Office, Casual"
              value={form.occasions}
              onChange={onChange}
            />
          </div>

          {formError && <div className="alert alert--error">{formError}</div>}

          <div className="analyzer-review__actions">
            <Button variant="ghost" onClick={onBack}><ArrowLeft size={16} /> Start Over</Button>
            <Button onClick={onSave} loading={saving}><Save size={16} /> Save to Wardrobe</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Step 2: Success ----------

function SuccessStep({ savedItem, imagePreview, onAddAnother }) {
  return (
    <div className="analyzer-success">
      <div className="analyzer-success__icon">
        <CheckCircle2 size={48} />
      </div>
      <h2 className="analyzer-success__title">Item Added to Wardrobe!</h2>

      <div className="analyzer-success__card">
        {imagePreview && <img src={imagePreview} alt={savedItem.name} className="analyzer-success__image" />}
        <div className="analyzer-success__info">
          <p className="analyzer-success__name">{savedItem.name}</p>
          <div className="analyzer-success__tags">
            <Badge size="sm">{savedItem.category}</Badge>
            {savedItem.style && <Badge variant="info" size="sm">{savedItem.style}</Badge>}
            {(savedItem.colors || []).map((c) => (
              <Badge key={c} variant="default" size="sm">{c}</Badge>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={onAddAnother}><RotateCcw size={16} /> Analyze Another Item</Button>
    </div>
  );
}

// ---------- Main Page Component ----------

const emptyForm = { name: '', category: '', type: '', colors: '', pattern: '', style: '', occasions: '' };

export default function WardrobeAnalyzer() {
  const { addItem, uploadImage, classifyImage } = useWardrobe();
  const { showToast } = useToast();

  const [step, setStep] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [aiMode, setAiMode] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedItem, setSavedItem] = useState(null);

  const reset = useCallback(() => {
    setStep(0);
    setImageFile(null);
    setImagePreview('');
    setAnalyzing(false);
    setAnalyzeError('');
    setAiMode(null);
    setForm(emptyForm);
    setFormError('');
    setSaving(false);
    setSavedItem(null);
  }, []);

  // Step 0 → Step 1: upload image + AI classify
  const handleFileSelect = useCallback(async (file) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setAnalyzeError('');
    setAnalyzing(true);

    try {
      const result = await classifyImage(file);
      setAiMode(result.mode || 'ai');
      setForm({
        name: result.name || '',
        category: result.category || '',
        type: result.type || '',
        colors: (result.colors || []).join(', '),
        pattern: result.pattern || '',
        style: result.style || '',
        occasions: (result.occasions || []).join(', '),
      });
      setStep(1);
      showToast(
        result.mode === 'ai'
          ? 'AI analysis complete — review the details below.'
          : 'AI unavailable (offline mode). Please fill in details manually.',
        result.mode === 'ai' ? 'success' : 'info'
      );
    } catch {
      setAnalyzeError('Failed to analyze image. Please try again or use the manual wardrobe form.');
    } finally {
      setAnalyzing(false);
    }
  }, [classifyImage, showToast]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
  };

  // Step 1 → Step 2: save to wardrobe
  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      setFormError('Item name is required.');
      return;
    }
    if (!form.category) {
      setFormError('Please select a category.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      // Upload image first
      let imageUrl = '';
      if (imageFile) {
        const uploadResult = await uploadImage(imageFile);
        imageUrl = uploadResult.imageUrl;
      }

      const colors = form.colors ? form.colors.split(',').map((c) => c.trim()).filter(Boolean) : [];
      const occasions = form.occasions ? form.occasions.split(',').map((c) => c.trim()).filter(Boolean) : [];

      const payload = {
        name: form.name.trim(),
        category: form.category,
        imageUrl,
        colors,
        pattern: form.pattern || null,
        style: form.style || null,
        occasions,
        description: form.type ? `Type: ${form.type}` : '',
        aiSuggested: {
          category: form.category,
          colors,
          style: form.style || null,
          accepted: true,
        },
      };

      const result = await addItem(payload);
      setSavedItem(result.data.item);
      setStep(2);
      showToast('Item saved to your wardrobe!', 'success');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save item. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, imageFile, uploadImage, addItem, showToast]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="AI Wardrobe Analyzer"
        subtitle="Upload a clothing photo and let AI identify its details automatically."
      />

      <StepIndicator currentStep={step} />

      {step === 0 && (
        <UploadStep
          onFileSelect={handleFileSelect}
          analyzing={analyzing}
          error={analyzeError}
        />
      )}

      {step === 1 && (
        <ReviewStep
          imagePreview={imagePreview}
          form={form}
          onChange={handleChange}
          aiMode={aiMode}
          onBack={reset}
          onSave={handleSave}
          saving={saving}
          formError={formError}
        />
      )}

      {step === 2 && (
        <SuccessStep
          savedItem={savedItem}
          imagePreview={imagePreview}
          onAddAnother={reset}
        />
      )}
    </div>
  );
}
