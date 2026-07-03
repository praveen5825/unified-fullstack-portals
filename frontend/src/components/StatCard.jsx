export default function StatCard({ label, value, trend, icon: Icon }) {
  return (
    <div className="rounded-2xl bg-surface border border-border-soft p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-text-muted mb-2">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-accent-soft flex items-center justify-center">
            <Icon size={16} className="text-accent" />
          </div>
        )}
      </div>
      {trend && <div className="text-xs text-success mt-3">{trend}</div>}
    </div>
  );
}
