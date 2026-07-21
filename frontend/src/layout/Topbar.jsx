import { Search, Bell, RefreshCw, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

export default function Topbar({ title, subtitle, onRefresh }) {
  const { userProfile } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const [searchVal, setSearchVal] = useState('');
  const searchRef = useRef(null);

  // Ctrl+K / Cmd+K shortcut to focus search from anywhere
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`);
      setSearchVal('');
    }
  };

  const initials = userProfile?.initials || 'U';
  const displayName = userProfile?.displayName || 'User';

  return (
    <div className="flex items-center justify-between gap-4 mb-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div
          className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl w-64 transition-all duration-200"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-soft)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-accent)';
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-soft)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border-soft)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Search size={14} style={{ color: 'var(--color-text-faint)', flexShrink: 0 }} />
          <input
            ref={searchRef}
            placeholder="Search proposals…  (Ctrl+K)"
            className="bg-transparent text-sm outline-none w-full"
            style={{ color: 'var(--color-text-primary)' }}
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>

        {/* Refresh */}
        {onRefresh && (
          <TopbarButton onClick={onRefresh} title="Refresh data">
            <RefreshCw size={15} />
          </TopbarButton>
        )}

        {/* Notification Bell */}
        <TopbarButton title="Notifications">
          <div className="relative">
            <Bell size={15} />
            <span
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
              style={{ background: 'var(--color-accent)' }}
            />
          </div>
        </TopbarButton>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-soft)',
            color: 'var(--color-text-muted)',
          }}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-surface-3)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-surface-2)';
            e.currentTarget.style.color = 'var(--color-text-muted)';
          }}
        >
          <div className="relative w-4 h-4">
            <Sun
              size={15}
              className="absolute inset-0 transition-all duration-300"
              style={{
                opacity: isDark ? 0 : 1,
                transform: isDark ? 'rotate(90deg) scale(0)' : 'rotate(0deg) scale(1)',
              }}
            />
            <Moon
              size={15}
              className="absolute inset-0 transition-all duration-300"
              style={{
                opacity: isDark ? 1 : 0,
                transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0)',
              }}
            />
          </div>
          <span className="hidden sm:inline text-xs">{isDark ? 'Dark' : 'Light'}</span>
        </button>

        {/* Avatar */}
        <div
          className="accent-gradient w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white cursor-pointer select-none"
          style={{ boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)' }}
          title={displayName}
        >
          {initials}
        </div>
      </div>
    </div>
  );
}

function TopbarButton({ onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-soft)', color: 'var(--color-text-muted)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--color-surface-3)';
        e.currentTarget.style.color = 'var(--color-text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--color-surface-2)';
        e.currentTarget.style.color = 'var(--color-text-muted)';
      }}
    >
      {children}
    </button>
  );
}
