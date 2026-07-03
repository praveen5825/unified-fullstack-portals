import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { duplicateCheckApi } from '../../api/duplicateCheck';
import MatchCard from '../../components/MatchCard';
import StatusBadge from '../../components/StatusBadge';

export default function ReviewResults() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await duplicateCheckApi.reviewResults();
      setProposals(res.data.results ?? []);
    } catch {
      setProposals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setReviewStatus = async (proposalId, status) => {
    await duplicateCheckApi.updateReviewStatus(proposalId, status).catch(() => {});
    load();
  };

  if (loading) {
    return <div className="rounded-2xl bg-surface border border-border-soft p-10 text-center text-text-faint text-sm">Loading results...</div>;
  }

  if (proposals.length === 0) {
    return (
      <div className="rounded-2xl bg-surface border border-border-soft p-10 text-center text-text-faint text-sm">
        No checked proposals yet. Run a check from the Pending Queue to see results here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {proposals.map((p) => {
        const isOpen = expandedId === p.id;
        const matchCount = p.matches?.length ?? 0;
        return (
          <div key={p.id} className="rounded-2xl bg-surface border border-border-soft overflow-hidden">
            <button
              onClick={() => setExpandedId(isOpen ? null : p.id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-sm font-medium">{p.spark_id} — {p.student_name}</div>
                  <div className="text-xs text-text-muted">{p.college_name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${matchCount > 0 ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'}`}>
                  {matchCount > 0 ? `${matchCount} duplicate(s) found` : 'No duplicates'}
                </span>
                <StatusBadge value={p.review_status} />
                {isOpen ? <ChevronUp size={16} className="text-text-faint" /> : <ChevronDown size={16} className="text-text-faint" />}
              </div>
            </button>

            {isOpen && (
              <div className="px-5 pb-5 border-t border-border-soft pt-4">
                {matchCount === 0 ? (
                  <div className="text-sm text-text-faint">No similar proposals found.</div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {p.matches.map((m) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        onMarkReviewed={() => setReviewStatus(p.id, 'cleared')}
                        onFlag={() => setReviewStatus(p.id, 'flagged')}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
