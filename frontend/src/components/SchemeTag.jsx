const SCHEME_CONFIG = {
  SPARK: { color: 'var(--color-spark)', bg: 'var(--color-spark-soft)', label: 'SPARK' },
  'PG-STAR': { color: 'var(--color-pgstar)', bg: 'var(--color-pgstar-soft)', label: 'PG-STAR' },
  'PDF-STAR': { color: 'var(--color-pdfstar)', bg: 'var(--color-pdfstar-soft)', label: 'PDF-STAR' },
};

export default function SchemeTag({ scheme, small = false }) {
  const cfg = SCHEME_CONFIG[scheme] || {
    color: 'var(--color-text-muted)',
    bg: 'var(--color-surface-3)',
    label: scheme || '—',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: small ? '0.65rem' : '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.06em',
        padding: small ? '0.15rem 0.4rem' : '0.2rem 0.6rem',
        borderRadius: '999px',
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.color}30`,
        textTransform: 'uppercase',
        flexShrink: 0,
      }}
    >
      {cfg.label}
    </span>
  );
}
