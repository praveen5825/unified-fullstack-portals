import { useEffect, useState, useMemo } from 'react';
import Topbar from '../layout/Topbar';
import { proposalsApi } from '../api/duplicateCheck';
import { Eye, Pencil, Trash2, Download, FileText, Award, CheckCircle2, Clock, FileSearch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
const TABS = [
  { key: 'all', label: 'All Proposals', statusFilter: null },
  { key: 'selected', label: 'Selected', statusFilter: 'selected' },
  { key: 'awarded', label: 'Awardees', statusFilter: 'awarded' },
];

const STAGE_STYLES = {
  received: 'bg-surface-3 text-text-muted',
  selected: 'bg-warning-soft text-warning',
  awarded: 'bg-success-soft text-success',
};

export default function SchemeProposals({ scheme, title, subtitle }) {
  const [allProposals, setAllProposals] = useState([]); // full set, fetched once
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const load = async () => {
    setLoading(true);
    try {
      // single call, large page_size -- stats computed client-side from this,
      // no separate /stats/ endpoint to keep in sync or silently fail
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

  const visibleProposals = useMemo(() => {
    const tab = TABS.find((t) => t.key === activeTab);
    if (!tab.statusFilter) return allProposals;
    return allProposals.filter((p) => p.status === tab.statusFilter);
  }, [allProposals, activeTab]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this proposal? This cannot be undone.')) return;
    await proposalsApi.delete(id).catch(() => {});
    load();
  };

  const exportCsv = () => {
    const headers = ['Spark ID', 'Student', 'Guide', 'College', 'State', 'Year', 'Title', 'Research Area', 'Status'];
    const rows = visibleProposals.map((p) => [
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

  const statCards = [
    { label: 'Total', value: stats.total, icon: FileText, color: 'text-accent' },
    { label: 'Received', value: stats.received, icon: Clock, color: 'text-text-muted' },
    { label: 'Selected', value: stats.selected, icon: CheckCircle2, color: 'text-warning' },
    { label: 'Awarded', value: stats.awarded, icon: Award, color: 'text-success' },
  ];

  return (
    <div>
      <Topbar title={title} subtitle={subtitle} onRefresh={load} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl bg-surface border border-border-soft p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted">{label}</span>
              <Icon size={15} className={color} />
            </div>
            <div className="text-2xl font-semibold">{loading ? '—' : value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-surface border border-border-soft overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft">
          <div className="flex items-center gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === t.key ? 'accent-gradient text-white' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={exportCsv}
            disabled={visibleProposals.length === 0}
            className="flex items-center gap-1.5 text-xs font-medium bg-surface-2 border border-border-soft px-3 py-1.5 rounded-lg hover:bg-surface-3 disabled:opacity-40"
          >
            <Download size={12} /> Export CSV
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-text-faint text-sm">Loading...</div>
        ) : visibleProposals.length === 0 ? (
          <div className="p-10 text-center text-text-faint text-sm">No proposals in this view yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-faint text-xs border-b border-border-soft">
                  <th className="px-5 py-3 font-medium">Spark ID</th>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Research Topic</th>
                  <th className="px-5 py-3 font-medium">Institution Details</th>
                  <th className="px-5 py-3 font-medium">Stage</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleProposals.map((p) => (
                  <tr key={p.id} className="border-b border-border-soft last:border-0 hover:bg-surface-2/50">
                    <td className="px-5 py-3.5 font-medium whitespace-nowrap">{p.spark_id}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium">{p.student_name}</div>
                      <div className="text-xs text-text-muted">{p.year}</div>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <div className="line-clamp-2">{p.title}</div>
                      <span className="text-[11px] bg-surface-3 text-text-muted px-1.5 py-0.5 rounded mt-1 inline-block">
                        {p.research_area}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-text-muted">
                      <div>{p.college_name}</div>
                      <div className="text-xs">Guide: <span className="text-text-primary">{p.guide_name}</span></div>
                      <div className="text-xs">State: {p.state}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STAGE_STYLES[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                            {p.document && (
                                <a
                                    href={p.document}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1.5 rounded-lg hover:bg-surface-3"
                                    title="View Synopsis PDF"
                                >
                                    <FileSearch size={14} className="text-accent" />
                                </a>
                                )}
                            <button onClick={() => navigate(`/proposals/${p.id}`)} className="p-1.5 rounded-lg hover:bg-surface-3" title="View Details">
                            <Eye size={14} className="text-text-muted" />
                            </button>
                            <button onClick={() => navigate(`/proposals/${p.id}/edit`)} className="p-1.5 rounded-lg hover:bg-surface-3" title="Edit">
                            <Pencil size={14} className="text-text-muted" />
                            </button>
                            <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-danger-soft" title="Delete">
                            <Trash2 size={14} className="text-danger" />
                            </button>
                        </div>
                        </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}