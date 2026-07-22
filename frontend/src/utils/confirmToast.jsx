import toast from 'react-hot-toast';

export const confirmAction = (message, confirmText = 'Confirm') => {
  return new Promise((resolve) => {
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <div className="font-semibold text-sm text-[var(--color-text-primary)]">
          {message}
        </div>
        <div className="flex justify-end gap-2 mt-1">
          <button 
            className="px-4 py-1.5 text-xs font-bold rounded-lg transition-colors border"
            style={{ 
              background: 'var(--color-surface-2)', 
              color: 'var(--color-text-muted)',
              borderColor: 'var(--color-border)'
            }}
            onClick={() => { toast.dismiss(t.id); resolve(false); }}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-1.5 text-xs font-bold rounded-lg transition-colors border border-transparent"
            style={{ 
              background: 'var(--color-danger)', 
              color: 'white',
              boxShadow: '0 4px 10px rgba(220, 38, 38, 0.2)'
            }}
            onClick={() => { toast.dismiss(t.id); resolve(true); }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    ), { 
      duration: Infinity, 
      id: 'confirm-dialog',
      style: { minWidth: '300px' }
    });
  });
};
