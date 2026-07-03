export default function ScoreBar({ label, value, color }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));

  const getColor = () => {
    if (color) return color;
    if (pct >= 70) return 'var(--color-danger)';
    if (pct >= 40) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>{label}</span>
        <span className="text-xs font-semibold" style={{ color: getColor() }}>{pct.toFixed(0)}%</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: getColor() }}
        />
      </div>
    </div>
  );
}
