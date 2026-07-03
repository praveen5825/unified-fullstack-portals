const STATUS_STYLES = {
  received: 'bg-surface-3 text-text-muted',
  selected: 'bg-warning-soft text-warning',
  awarded: 'bg-success-soft text-success',
  pending: 'bg-surface-3 text-text-muted',
  processing: 'bg-accent-soft text-accent',
  done: 'bg-success-soft text-success',
  failed: 'bg-danger-soft text-danger',
  unreviewed: 'bg-surface-3 text-text-muted',
  cleared: 'bg-success-soft text-success',
  flagged: 'bg-danger-soft text-danger',
};

export default function StatusBadge({ value }) {
  const style = STATUS_STYLES[value] || 'bg-surface-3 text-text-muted';
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${style}`}>
      {value}
    </span>
  );
}
