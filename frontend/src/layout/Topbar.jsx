import { Search, Bell, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Topbar({ title, subtitle, onRefresh }) {
  const { logout } = useAuth();

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 bg-surface-2 border border-border-soft rounded-xl px-3 py-2 w-72">
          <Search size={15} className="text-text-faint" />
          <input
            placeholder="Search proposals, researchers..."
            className="bg-transparent text-sm outline-none w-full placeholder:text-text-faint"
          />
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="w-9 h-9 rounded-xl bg-surface-2 border border-border-soft flex items-center justify-center hover:bg-surface-3 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw size={15} className="text-text-muted" />
          </button>
        )}
        <button className="w-9 h-9 rounded-xl bg-surface-2 border border-border-soft flex items-center justify-center hover:bg-surface-3 transition-colors" aria-label="Notifications">
          <Bell size={15} className="text-text-muted" />
        </button>
        <button
          onClick={logout}
          className="w-9 h-9 rounded-xl bg-surface-2 border border-border-soft flex items-center justify-center hover:bg-danger-soft hover:text-danger transition-colors"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={15} className="text-text-muted" />
        </button>
        <div className="w-9 h-9 rounded-xl accent-gradient flex items-center justify-center text-xs font-semibold text-white">
          AD
        </div>
      </div>
    </div>
  );
}
