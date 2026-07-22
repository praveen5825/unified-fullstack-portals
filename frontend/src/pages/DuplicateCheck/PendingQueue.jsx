import { useEffect, useState } from 'react';
import { Play, PlayCircle, Loader2, RefreshCw, Clock } from 'lucide-react';
import { duplicateCheckApi } from '../../api/duplicateCheck';
import StatusBadge from '../../components/StatusBadge';
import SchemeTag from '../../components/SchemeTag';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { confirmAction } from '../../utils/confirmToast';

export default function PendingQueue() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningIds, setRunningIds] = useState(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const res = await duplicateCheckApi.pendingQueue();
      setProposals(res.data.results ?? []);
    } catch {
      setProposals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const runOne = async (id) => {
    setRunningIds((prev) => new Set([...prev, id]));
    await duplicateCheckApi.runCheck(id).catch(() => {});
    setTimeout(load, 1000);
    setTimeout(() => setRunningIds((prev) => { const s = new Set(prev); s.delete(id); return s; }), 5000);
  };

  const runAll = async () => {
    if (!proposals.length) return;
    const confirmed = await confirmAction(`Run duplicate check for all ${proposals.length} pending proposals?`, 'Run All');
    if (!confirmed) return;
    const ids = proposals.map((p) => p.id);
    setRunningIds(new Set(ids));
    await duplicateCheckApi.bulkRun(ids).catch(() => {});
    setTimeout(load, 1000);
  };

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--color-border-soft)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-warning-soft)' }}
          >
            <Clock size={15} style={{ color: 'var(--color-warning)' }} />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Pending Queue
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {proposals.length} proposal{proposals.length !== 1 ? 's' : ''} awaiting check
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-soft)', color: 'var(--color-text-muted)' }}
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={runAll}
            disabled={proposals.length === 0}
            className="btn btn-primary text-xs px-3 py-2 disabled:opacity-40"
          >
            <PlayCircle size={14} /> Run All
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <table className="w-full text-sm">
          <LoadingSkeleton rows={4} cols={5} />
        </table>
      ) : proposals.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Queue is empty"
          description="All proposals have been checked. New proposals will appear here automatically."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                {['Spark ID', 'Student', 'Scheme', 'Status', 'Action'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium" style={{ color: 'var(--color-text-faint)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proposals.map((p, i) => {
                const isRunning = p.extraction_status === 'processing' || runningIds.has(p.id);
                return (
                  <tr
                    key={p.id}
                    className="animate-fade-in"
                    style={{
                      borderBottom: '1px solid var(--color-border-soft)',
                      animationDelay: `${i * 30}ms`,
                      animationFillMode: 'both',
                      background: isRunning ? 'var(--color-info-soft)' : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (!isRunning) e.currentTarget.style.background = 'var(--color-surface-2)'; }}
                    onMouseLeave={(e) => { if (!isRunning) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>
                      {p.spark_id}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{p.student_name}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{p.college_name}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <SchemeTag scheme={p.scheme} small />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge value={p.extraction_status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => runOne(p.id)}
                        disabled={isRunning}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-60"
                        style={isRunning
                          ? { background: 'var(--color-info-soft)', color: 'var(--color-info)' }
                          : { background: 'var(--color-surface-3)', border: '1px solid var(--color-border-soft)', color: 'var(--color-text-muted)' }
                        }
                        onMouseEnter={(e) => { if (!isRunning) { e.currentTarget.style.background = 'var(--color-accent)'; e.currentTarget.style.color = 'white'; }}}
                        onMouseLeave={(e) => { if (!isRunning) { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}}
                      >
                        {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                        {isRunning ? 'Running...' : 'Run Check'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
