const STATUS_CONFIG = {
  // Proposal status
  received: { label: 'Received', color: 'var(--color-text-muted)', bg: 'var(--color-surface-3)', dot: 'var(--color-text-faint)' },
  selected: { label: 'Selected', color: 'var(--color-warning)', bg: 'var(--color-warning-soft)', dot: 'var(--color-warning)' },
  awarded: { label: 'Awarded', color: 'var(--color-success)', bg: 'var(--color-success-soft)', dot: 'var(--color-success)' },
  // Extraction status
  pending: { label: 'Pending', color: 'var(--color-text-muted)', bg: 'var(--color-surface-3)', dot: 'var(--color-text-faint)' },
  processing: { label: 'Processing', color: 'var(--color-info)', bg: 'var(--color-info-soft)', dot: 'var(--color-info)', pulse: true },
  done: { label: 'Done', color: 'var(--color-success)', bg: 'var(--color-success-soft)', dot: 'var(--color-success)' },
  failed: { label: 'Failed', color: 'var(--color-danger)', bg: 'var(--color-danger-soft)', dot: 'var(--color-danger)' },
  // Review status
  unreviewed: { label: 'Unreviewed', color: 'var(--color-text-muted)', bg: 'var(--color-surface-3)', dot: 'var(--color-text-faint)' },
  cleared: { label: 'Cleared', color: 'var(--color-success)', bg: 'var(--color-success-soft)', dot: 'var(--color-success)' },
  flagged: { label: 'Flagged', color: 'var(--color-danger)', bg: 'var(--color-danger-soft)', dot: 'var(--color-danger)' },
};

export default function StatusBadge({ value }) {
  const cfg = STATUS_CONFIG[value?.toLowerCase()] || {
    label: value || '—',
    color: 'var(--color-text-muted)',
    bg: 'var(--color-surface-3)',
    dot: 'var(--color-text-faint)',
  };

  return (
    <span
      className="badge"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span className="relative flex items-center justify-center" style={{ width: 6, height: 6 }}>
        <span
          className="block rounded-full"
          style={{ width: 6, height: 6, background: cfg.dot }}
        />
        {cfg.pulse && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: cfg.dot, opacity: 0.5 }}
          />
        )}
      </span>
      {cfg.label}
    </span>
  );
}
