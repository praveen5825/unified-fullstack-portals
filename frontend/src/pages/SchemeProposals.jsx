import { useEffect, useState, useMemo } from 'react';
import Topbar from '../layout/Topbar';
import { proposalsApi } from '../api/duplicateCheck';
import {
  Eye, Pencil, Trash2, Download, FileSearch, Search, X,
  LayoutGrid, List, Sparkles, MapPin, User, FileText, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';

const TABS = [
  { key: 'all', label: 'All Proposals', statusFilter: null },
  { key: 'received', label: 'Received', statusFilter: 'received' },
  { key: 'selected', label: 'Selected', statusFilter: 'selected' },
  { key: 'awarded', label: 'Awarded', statusFilter: 'awarded' },
];

const SCHEME_META = {
  SPARK: { color: 'var(--color-spark)', gradient: 'spark-gradient', label: 'SPARK Programme' },
  'PG-STAR': { color: 'var(--color-pgstar)', gradient: 'pgstar-gradient', label: 'PG-STAR Programme' },
  'PDF-STAR': { color: 'var(--color-pdfstar)', gradient: 'pdfstar-gradient', label: 'PDF-STAR Programme' },
};

export default function SchemeProposals({ scheme, title, subtitle }) {
  const [allProposals, setAllProposals] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'grid' | 'table'
  const navigate = useNavigate();
  const meta = SCHEME_META[scheme] || {};

  const load = async () => {
    setLoading(true);
    try {
      const res = await proposalsApi.list({ scheme, page_size: 1000 });
      setAllProposals(res.data.results ?? []);
    } catch {
      setAllProposals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [scheme]);

  const stats = useMemo(() => ({
    total: allProposals.length,
    received: allProposals.filter((p) => p.status === 'received').length,
    selected: allProposals.filter((p) => p.status === 'selected').length,
    awarded: allProposals.filter((p) => p.status === 'awarded').length,
  }), [allProposals]);

  const filtered = useMemo(() => {
    let list = activeTab === 'all' ? allProposals : allProposals.filter((p) => p.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.spark_id?.toLowerCase().includes(q) ||
        p.student_name?.toLowerCase().includes(q) ||
        p.title?.toLowerCase().includes(q) ||
        p.college_name?.toLowerCase().includes(q) ||
        p.guide_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allProposals, activeTab, search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this proposal? This cannot be undone.')) return;
    await proposalsApi.delete(id).catch(() => {});
    load();
  };

  const exportCsv = () => {
    const headers = ['Spark ID', 'Student', 'Guide', 'College', 'State', 'Year', 'Title', 'Research Area', 'Status'];
    const rows = filtered.map((p) => [
      p.spark_id, p.student_name, p.guide_name, p.college_name,
      p.state, p.year, p.title, p.research_area, p.status,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scheme}_proposals.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper for generating avatar initials
  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div>
      <Topbar title="Proposals" subtitle={`Manage ${scheme} submissions`} onRefresh={load} />

      {/* ─── Premium Hero Banner ─── */}
      <div 
        className="relative rounded-[2.5rem] p-8 md:p-12 mb-8 overflow-hidden isolate animate-fade-in"
        style={{
          background: `linear-gradient(135deg, ${meta.color}20 0%, ${meta.color}05 100%)`,
          border: `1px solid ${meta.color}30`,
          boxShadow: `0 24px 50px -12px ${meta.color}15`,
        }}
      >
        {/* Animated Background Orbs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20 animate-float pointer-events-none" style={{ background: `radial-gradient(circle, ${meta.color}, transparent 70%)`, filter: 'blur(50px)' }} />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-15 animate-float pointer-events-none" style={{ background: `radial-gradient(circle, ${meta.color}, transparent 70%)`, filter: 'blur(50px)', animationDelay: '2s' }} />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold mb-5 shadow-sm" style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30`, backdropFilter: 'blur(10px)' }}>
              <Sparkles size={14} /> {meta.label || scheme}
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-3 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              {title}
            </h1>
            <p className="text-sm md:text-base font-medium leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              {subtitle} Explore and manage all submissions seamlessly.
            </p>
          </div>
          
          {/* Glassmorphic Stats Board */}
          <div 
            className="flex items-center gap-2 p-2 rounded-[1.5rem] shrink-0" 
            style={{ 
              background: 'var(--color-surface-2)', 
              border: '1px solid var(--color-border-soft)', 
              boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
              backdropFilter: 'blur(20px)' 
            }}
          >
            {[
              { label: 'Total', val: stats.total, color: 'var(--color-text-primary)' },
              { label: 'Received', val: stats.received, color: 'var(--color-text-faint)' },
              { label: 'Selected', val: stats.selected, color: 'var(--color-warning)' },
              { label: 'Awarded', val: stats.awarded, color: 'var(--color-success)' },
            ].map((stat, i, arr) => (
              <div key={stat.label} className="flex items-center">
                <div className="flex flex-col items-center px-4 md:px-6 py-2">
                  <span className="text-2xl md:text-3xl font-black mb-1" style={{ color: stat.color }}>{loading ? '—' : stat.val}</span>
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest" style={{ color: stat.color, opacity: 0.8 }}>{stat.label}</span>
                </div>
                {i < arr.length - 1 && <div className="w-px h-10" style={{ background: 'var(--color-border-soft)' }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Toolbar ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        {/* Animated Tabs */}
        <div className="inline-flex p-1.5 rounded-2xl overflow-x-auto scrollbar-hide w-full lg:w-auto" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-soft)' }}>
          {TABS.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="relative px-5 py-2 rounded-xl text-xs font-semibold transition-all duration-300 whitespace-nowrap flex-1 lg:flex-none"
                style={{ color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
              >
                {isActive && (
                  <span className="absolute inset-0 rounded-xl shadow-sm" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-soft)' }} />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {t.label}
                  {t.statusFilter && (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px]" style={{ background: isActive ? `${meta.color}15` : 'transparent', color: isActive ? meta.color : 'inherit' }}>
                      {allProposals.filter((p) => p.status === t.statusFilter).length}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="hidden sm:flex items-center p-1 rounded-xl" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-soft)' }}>
            <button
              onClick={() => setViewMode('grid')}
              className="p-1.5 rounded-lg transition-all"
              style={viewMode === 'grid' ? { background: 'var(--color-surface)', color: 'var(--color-accent)', boxShadow: 'var(--shadow-sm)' } : { color: 'var(--color-text-faint)' }}
              title="Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className="p-1.5 rounded-lg transition-all"
              style={viewMode === 'table' ? { background: 'var(--color-surface)', color: 'var(--color-accent)', boxShadow: 'var(--shadow-sm)' } : { color: 'var(--color-text-faint)' }}
              title="Table View"
            >
              <List size={15} />
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 lg:flex-none">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: search ? meta.color : 'var(--color-text-faint)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search proposals..."
              className="text-sm pl-9 pr-8 py-2.5 rounded-xl outline-none w-full transition-all"
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border-soft)',
                color: 'var(--color-text-primary)',
                boxShadow: search ? `0 0 0 3px ${meta.color}15` : 'none',
                borderColor: search ? meta.color : 'var(--color-border-soft)'
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Export */}
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 shadow-sm"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-surface)'; }}
          >
            <Download size={14} /> <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* ─── Content Area ─── */}
      {loading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="card p-6 min-h-[220px]">
                <div className="skeleton h-4 w-20 mb-4 rounded" />
                <div className="skeleton h-6 w-3/4 mb-2 rounded" />
                <div className="skeleton h-4 w-1/2 mb-6 rounded" />
                <div className="flex gap-3"><div className="skeleton h-10 w-10 rounded-full" /><div className="skeleton h-10 flex-1 rounded" /></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm"><LoadingSkeleton rows={6} cols={6} /></table>
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FileSearch}
            title={search ? 'No matching proposals found' : 'No proposals yet'}
            description={search ? `Try adjusting your search for "${search}"` : 'Be the first to submit a proposal for this scheme.'}
            action={search ? <button onClick={() => setSearch('')} className="btn btn-ghost text-xs">Clear search</button> : null}
          />
        </div>
      ) : viewMode === 'grid' ? (
        /* ─── Premium Grid View ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((p, i) => (
            <div
              key={p.id}
              className="group card p-6 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col h-full cursor-pointer animate-fade-in"
              style={{ animationDelay: `${i * 30}ms`, border: '1px solid var(--color-border-soft)' }}
              onClick={() => navigate(`/proposals/${p.id}`)}
            >
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 w-full h-1 transition-all duration-300 group-hover:h-1.5" style={{ background: meta.color }} />
              
              <div className="flex items-start justify-between mb-4 mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-widest" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-faint)', border: '1px solid var(--color-border-soft)' }}>
                  {p.spark_id}
                </span>
                <StatusBadge value={p.status} />
              </div>
              
              <h3 className="text-lg font-bold mb-2 line-clamp-2 leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                {p.title}
              </h3>
              
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold mb-6 w-fit" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                <FileText size={12} style={{ color: meta.color }} /> {p.research_area}
              </div>

              <div className="mt-auto pt-5 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-border-soft)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm" style={{ background: meta.color }}>
                    {getInitials(p.student_name)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold leading-none mb-1" style={{ color: 'var(--color-text-primary)' }}>{p.student_name}</div>
                    <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>{p.year}</div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0" style={{ background: 'var(--color-surface-2)', color: meta.color }}>
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ─── Refined Table View ─── */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-soft)', background: 'var(--color-surface-2)' }}>
                  {['Spark ID', 'Student', 'Research Topic', 'Institution', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr
                    key={p.id}
                    className="group animate-fade-in transition-colors duration-200"
                    style={{ borderBottom: '1px solid var(--color-border-soft)', animationDelay: `${i * 20}ms` }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="px-6 py-4 font-mono text-xs font-bold whitespace-nowrap" style={{ color: meta.color }}>
                      {p.spark_id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: meta.color }}>
                          {getInitials(p.student_name)}
                        </div>
                        <div>
                          <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{p.student_name}</div>
                          <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: 'var(--color-text-faint)' }}>Year: {p.year}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="line-clamp-2 font-medium text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>{p.title}</div>
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}>
                        {p.research_area}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-sm flex items-center gap-1.5 mb-1" style={{ color: 'var(--color-text-primary)' }}>
                        <MapPin size={12} style={{ color: 'var(--color-text-faint)' }}/> <span className="truncate max-w-[150px]">{p.college_name}</span>
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
                        Guide: <span style={{ color: 'var(--color-text-muted)' }}>{p.guide_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge value={p.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity duration-200">
                        {p.document && (
                          <a href={p.document} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg transition-colors" style={{ color: meta.color }} onMouseEnter={(e) => e.currentTarget.style.background = `${meta.color}20`} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} title="View PDF">
                            <FileSearch size={15} />
                          </a>
                        )}
                        <IconBtn onClick={() => navigate(`/proposals/${p.id}`)} title="View"><Eye size={15} /></IconBtn>
                        <IconBtn onClick={() => navigate(`/proposals/${p.id}/edit`)} title="Edit"><Pencil size={15} /></IconBtn>
                        <IconBtn onClick={() => handleDelete(p.id)} title="Delete" danger><Trash2 size={15} /></IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Footer ─── */}
      {!loading && filtered.length > 0 && (
        <div className="mt-6 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
          Showing {filtered.length} of {allProposals.length} proposals
        </div>
      )}
    </div>
  );
}

function IconBtn({ onClick, title, danger, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-2 rounded-lg transition-all duration-200"
      style={{ color: danger ? 'var(--color-danger)' : 'var(--color-text-muted)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? 'var(--color-danger-soft)' : 'var(--color-surface-3)';
        e.currentTarget.style.color = danger ? 'var(--color-danger)' : 'var(--color-text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = danger ? 'var(--color-danger)' : 'var(--color-text-muted)';
      }}
    >
      {children}
    </button>
  );
}