import { NavLink } from 'react-router-dom';
import {
  LayoutGrid, FilePlus2, UploadCloud, ScanSearch,
  FileText, BookOpen, GraduationCap, Sparkles,
} from 'lucide-react';

const menuItems = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/proposals/new', label: 'New Proposal', icon: FilePlus2 },
  { to: '/bulk-import', label: 'Bulk Import', icon: UploadCloud },
  { to: '/duplicate-check', label: 'Duplicate Check', icon: ScanSearch },
  { to: '/spark', label: 'Spark', icon: FileText },
  { to: '/pdfstar', label: 'Pdfstar', icon: BookOpen },
  { to: '/pgstar', label: 'Pgstar', icon: GraduationCap },
];

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 h-full bg-surface border-r border-border-soft flex flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="w-9 h-9 rounded-xl accent-gradient flex items-center justify-center shrink-0">
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">CCRAS</div>
          <div className="text-xs text-text-muted leading-tight">Unified Portal</div>
        </div>
      </div>

      <div className="px-5 pt-2 pb-2 text-xs tracking-wider text-text-faint font-medium">
        MENU
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                isActive
                  ? 'bg-accent-soft text-white'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-2'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} className={isActive ? 'text-accent' : ''} />
                <span className="flex-1">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        <div className="rounded-xl bg-surface-2 border border-border-soft px-3 py-3 text-xs text-text-muted">
          Signed in as <span className="text-text-primary font-medium">Admin</span>
        </div>
      </div>
    </aside>
  );
}