import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutGrid, FilePlus2, UploadCloud, ScanSearch,
  FileText, BookOpen, GraduationCap, Sparkles,
  ChevronLeft, ChevronRight, BarChart3, Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MENU_GROUPS = [
  {
    label: 'OVERVIEW',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true, color: 'var(--color-accent)' },
    ],
  },
  {
    label: 'PROPOSALS',
    items: [
      { to: '/proposals/new', label: 'New Proposal', icon: FilePlus2, color: 'var(--color-accent)' },
      { to: '/bulk-import', label: 'Bulk Import', icon: UploadCloud, color: 'var(--color-accent)' },
    ],
  },
  {
    label: 'SCHEMES',
    items: [
      { to: '/spark', label: 'SPARK', icon: FileText, color: 'var(--color-spark)', gradient: 'spark-gradient', soft: 'var(--color-spark-soft)' },
      { to: '/pgstar', label: 'PG-STAR', icon: GraduationCap, color: 'var(--color-pgstar)', gradient: 'pgstar-gradient', soft: 'var(--color-pgstar-soft)' },
      { to: '/pdfstar', label: 'PDF-STAR', icon: BookOpen, color: 'var(--color-pdfstar)', gradient: 'pdfstar-gradient', soft: 'var(--color-pdfstar-soft)' },
    ],
  },
  {
    label: 'TOOLS',
    items: [
      { to: '/duplicate-check', label: 'Duplicate Check', icon: ScanSearch, color: '#f472b6', soft: 'rgba(244, 114, 182, 0.12)' },
      { to: '/analytics', label: 'Analytics', icon: BarChart3, color: '#34d399', soft: 'rgba(52, 211, 153, 0.12)' },
      { to: '/search', label: 'Global Search', icon: Search, color: '#60a5fa', soft: 'rgba(96, 165, 250, 0.12)' },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { userProfile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const initials = userProfile?.initials || 'U';
  const displayName = userProfile?.displayName || 'User';
  const role = userProfile?.is_staff ? 'Administrator' : 'Reviewer';

  return (
    <aside
      className="shrink-0 h-full flex flex-col relative transition-all duration-300"
      style={{
        width: collapsed ? '72px' : '240px',
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border-soft)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.08)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 overflow-hidden">
        <div
          className="accent-gradient shrink-0 flex items-center justify-center rounded-xl"
          style={{ width: 36, height: 36, boxShadow: '0 4px 12px rgba(139, 92, 246, 0.35)' }}
        >
          <Sparkles size={17} color="white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <div className="text-sm font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>CCRAS</div>
            <div className="text-xs leading-tight" style={{ color: 'var(--color-text-muted)' }}>Unified Portal</div>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[68px] z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
          boxShadow: 'var(--shadow-sm)',
        }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-4 scrollbar-hide">
        {MENU_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div
                className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-widest"
                style={{ color: 'var(--color-text-faint)' }}
              >
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, end, color, soft, gradient }) => {
                const isActive = end
                  ? location.pathname === to
                  : location.pathname.startsWith(to);

                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    title={collapsed ? label : undefined}
                    className="relative flex items-center rounded-xl text-sm transition-all duration-150"
                    style={({ isActive: navActive }) => ({
                      gap: collapsed ? 0 : '0.625rem',
                      padding: collapsed ? '0.6rem' : '0.55rem 0.75rem',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      background: isActive ? (soft || 'var(--color-accent-soft)') : 'transparent',
                      color: isActive ? color : 'var(--color-text-muted)',
                      fontWeight: isActive ? 600 : 400,
                    })}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'var(--color-surface-2)';
                        e.currentTarget.style.color = 'var(--color-text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--color-text-muted)';
                      }
                    }}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                        style={{
                          width: 3,
                          height: '55%',
                          background: color || 'var(--color-accent)',
                        }}
                      />
                    )}
                    <span
                      className="shrink-0 flex items-center justify-center rounded-lg"
                      style={{
                        width: 28,
                        height: 28,
                        background: isActive ? (soft || 'var(--color-accent-soft)') : 'transparent',
                        color: isActive ? color : 'inherit',
                      }}
                    >
                      <Icon size={15} />
                    </span>
                    {!collapsed && (
                      <span className="truncate">{label}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div
        className="p-3 mt-auto"
        style={{ borderTop: '1px solid var(--color-border-soft)' }}
      >
        <div
          className="flex items-center rounded-xl p-2 gap-3 overflow-hidden"
          style={{ background: 'var(--color-surface-2)' }}
        >
          <div
            className="accent-gradient shrink-0 flex items-center justify-center rounded-lg text-xs font-bold text-white cursor-pointer select-none"
            style={{ width: 30, height: 30 }}
            title={displayName}
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <div className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{displayName}</div>
              <div className="text-[10px] truncate" style={{ color: 'var(--color-text-faint)' }}>{role}</div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              className="shrink-0 text-xs rounded-lg px-2 py-1 transition-all"
              style={{ color: 'var(--color-danger)', background: 'var(--color-danger-soft)' }}
              title="Logout"
            >
              Exit
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}