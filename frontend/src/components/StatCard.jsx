import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ label, value, icon: Icon, color, gradient, trend, trendValue, subtitle, delay = 0 }) {
  const trendPositive = trendValue > 0;
  const trendNeutral = trendValue === 0 || trendValue == null;

  return (
    <div
      className="card card-hover animate-fade-in p-5 relative overflow-hidden"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      {/* Subtle background glow */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10"
        style={{ background: color || 'var(--color-accent)', filter: 'blur(20px)' }}
      />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-faint)', letterSpacing: '0.04em' }}>
            {label}
          </div>
          <div className="text-3xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            {value ?? '—'}
          </div>
          {subtitle && (
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</div>
          )}
        </div>

        {Icon && (
          <div
            className={`flex items-center justify-center rounded-xl shrink-0 ${gradient || ''}`}
            style={{
              width: 44,
              height: 44,
              background: gradient ? undefined : (color ? `${color}20` : 'var(--color-accent-soft)'),
              color: color || 'var(--color-accent)',
              boxShadow: `0 4px 12px ${color || 'var(--color-accent)'}30`,
            }}
          >
            <Icon size={20} color={gradient ? 'white' : undefined} />
          </div>
        )}
      </div>

      {/* Trend indicator */}
      {trendValue != null && (
        <div className="flex items-center gap-1 mt-3 pt-3 relative z-10" style={{ borderTop: '1px solid var(--color-border-soft)' }}>
          {trendNeutral ? (
            <Minus size={12} style={{ color: 'var(--color-text-faint)' }} />
          ) : trendPositive ? (
            <TrendingUp size={12} style={{ color: 'var(--color-success)' }} />
          ) : (
            <TrendingDown size={12} style={{ color: 'var(--color-danger)' }} />
          )}
          <span
            className="text-xs font-medium"
            style={{
              color: trendNeutral
                ? 'var(--color-text-faint)'
                : trendPositive
                ? 'var(--color-success)'
                : 'var(--color-danger)',
            }}
          >
            {trendNeutral ? 'No change' : `${trendPositive ? '+' : ''}${trendValue}% from last month`}
          </span>
        </div>
      )}
    </div>
  );
}
