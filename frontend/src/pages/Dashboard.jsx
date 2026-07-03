import { useEffect, useState, useMemo } from 'react';
import { FileText, CheckCircle2, Award, Clock } from 'lucide-react';
import Topbar from '../layout/Topbar';
import StatCard from '../components/StatCard';
import { proposalsApi } from '../api/duplicateCheck';

export default function Dashboard() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await proposalsApi.list({ page_size: 1000 });
      setProposals(res.data.results ?? []);
    } catch {
      setProposals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total: proposals.length,
    received: proposals.filter((p) => p.status === 'received').length,
    selected: proposals.filter((p) => p.status === 'selected').length,
    awarded: proposals.filter((p) => p.status === 'awarded').length,
  }), [proposals]);

  return (
    <div>
      <Topbar title="CCRAS Dashboard" subtitle="Real-time research portal analytics" onRefresh={load} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Proposals" value={loading ? '—' : stats.total} icon={FileText} />
        <StatCard label="Received" value={loading ? '—' : stats.received} icon={Clock} />
        <StatCard label="Selected" value={loading ? '—' : stats.selected} icon={CheckCircle2} />
        <StatCard label="Awarded" value={loading ? '—' : stats.awarded} icon={Award} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl bg-surface border border-border-soft p-5">
          <div className="text-sm font-semibold mb-1">Monthly Submissions</div>
          <div className="text-xs text-text-muted mb-4">Research proposals over time</div>
          <div className="h-64 flex items-center justify-center text-text-faint text-sm">
            Connect proposal data to render this chart
          </div>
        </div>
        <div className="rounded-2xl bg-surface border border-border-soft p-5">
          <div className="text-sm font-semibold mb-1">Top States</div>
          <div className="text-xs text-text-muted mb-4">Proposals by state</div>
          <div className="h-64 flex items-center justify-center text-text-faint text-sm">
            Connect proposal data to render this chart
          </div>
        </div>
      </div>
    </div>
  );
}