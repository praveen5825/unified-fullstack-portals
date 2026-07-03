import { useEffect, useState } from 'react';
import { Play, PlayCircle, Loader2 } from 'lucide-react';
import { duplicateCheckApi } from '../../api/duplicateCheck';
import StatusBadge from '../../components/StatusBadge';

export default function PendingQueue() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningIds, setRunningIds] = useState([]);

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
    const interval = setInterval(load, 5000); // reflect processing -> done transitions
    return () => clearInterval(interval);
  }, []);

  const runOne = async (id) => {
    setRunningIds((prev) => [...prev, id]);
    await duplicateCheckApi.runCheck(id).catch(() => {});
    setTimeout(load, 1000);
  };

  const runAll = async () => {
    const ids = proposals.map((p) => p.id);
    if (ids.length === 0) return;
    setRunningIds(ids);
    await duplicateCheckApi.bulkRun(ids).catch(() => {});
    setTimeout(load, 1000);
  };

  return (
    <div className="rounded-2xl bg-surface border border-border-soft overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft">
        <div className="text-sm text-text-muted">{proposals.length} proposal(s) awaiting check</div>
        <button
          onClick={runAll}
          disabled={proposals.length === 0}
          className="flex items-center gap-2 text-sm font-medium accent-gradient text-white px-4 py-2 rounded-xl disabled:opacity-40"
        >
          <PlayCircle size={15} /> Run All
        </button>
      </div>

      {loading ? (
        <div className="p-10 text-center text-text-faint text-sm">Loading queue...</div>
      ) : proposals.length === 0 ? (
        <div className="p-10 text-center text-text-faint text-sm">
          Nothing pending. New proposals will show up here automatically.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-faint text-xs border-b border-border-soft">
              <th className="px-5 py-3 font-medium">Spark ID</th>
              <th className="px-5 py-3 font-medium">Student</th>
              <th className="px-5 py-3 font-medium">Scheme</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((p) => {
              const isRunning = p.extraction_status === 'processing' || runningIds.includes(p.id);
              return (
                <tr key={p.id} className="border-b border-border-soft last:border-0 hover:bg-surface-2/50">
                  <td className="px-5 py-3.5 font-medium">{p.spark_id}</td>
                  <td className="px-5 py-3.5 text-text-muted">{p.student_name}</td>
                  <td className="px-5 py-3.5 text-text-muted">{p.scheme}</td>
                  <td className="px-5 py-3.5"><StatusBadge value={p.extraction_status} /></td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => runOne(p.id)}
                      disabled={isRunning}
                      className="inline-flex items-center gap-1.5 text-xs font-medium bg-surface-2 border border-border-soft px-3 py-1.5 rounded-lg hover:bg-surface-3 disabled:opacity-50"
                    >
                      {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                      {isRunning ? 'Checking...' : 'Run Check'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
