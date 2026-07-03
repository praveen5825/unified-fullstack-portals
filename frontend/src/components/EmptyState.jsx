export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      {Icon && (
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--color-surface-3)' }}
        >
          <Icon size={28} style={{ color: 'var(--color-text-faint)' }} />
        </div>
      )}
      <div className="text-base font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
        {title || 'Nothing here yet'}
      </div>
      {description && (
        <div className="text-sm max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
