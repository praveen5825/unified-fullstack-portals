export default function ScoreBar({ label, value }) {
  const color = value >= 70 ? 'bg-danger' : value >= 40 ? 'bg-warning' : 'bg-success';
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-text-muted">{label}</span>
        <span className="text-text-primary font-medium">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}
