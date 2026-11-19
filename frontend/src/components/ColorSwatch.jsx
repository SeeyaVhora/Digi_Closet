const COLOR_MAP = {
  black: '#1a1a1a', white: '#f5f5f5', navy: '#1e2a4a', grey: '#8a8a8a', gray: '#8a8a8a',
  beige: '#d4c5a9', brown: '#6b4a2f', red: '#dc2626', blue: '#3b82f6', green: '#22c55e',
  pink: '#ec4899', maroon: '#800020', olive: '#6b7f23', yellow: '#eab308', orange: '#f97316',
  purple: '#8b5cf6', multi: 'linear-gradient(135deg, #f87171, #facc15, #4ade80, #60a5fa)',
};

const EXTRA_COLORS = {
  'off-white': '#f4f1ea', cream: '#f3ead7', ivory: '#fbf7ec', camel: '#c19a6b', tan: '#c8a27c',
  khaki: '#bfae86', charcoal: '#3a3a3a', burgundy: '#701a31', mustard: '#d9a62e', rust: '#a8502b',
  denim: '#4f6d8f', multi: COLOR_MAP.multi,
};

// Wardrobe colours are free text ("Light Blue", "Off-white"), so try our map,
// then the browser's CSS colour names, then the last word ("dark olive" -> olive).
function resolveColor(name = '') {
  const key = name.trim().toLowerCase();
  if (COLOR_MAP[key] || EXTRA_COLORS[key]) return COLOR_MAP[key] || EXTRA_COLORS[key];
  const compact = key.replace(/[\s-]+/g, '');
  if (compact && typeof CSS !== 'undefined' && CSS.supports('color', compact)) return compact;
  const lastWord = key.split(/[\s-]+/).pop();
  if (lastWord !== key) return resolveColor(lastWord);
  return '#c9c3b8';
}

export function ColorSwatch({ color, showLabel = true }) {
  return (
    <span className="color-swatch">
      <span className="color-swatch__dot" style={{ background: resolveColor(color) }} title={color} />
      {showLabel && <span className="color-swatch__label">{color}</span>}
    </span>
  );
}

export function ColorSwatchGrid({ colors = [] }) {
  return (
    <div className="color-swatch-grid">
      {colors.map((c, i) => (
        <span key={i} className="color-chip">
          <span className="color-swatch__dot" style={{ width: '1rem', height: '1rem', background: resolveColor(c) }} />
          {c}
        </span>
      ))}
    </div>
  );
}
