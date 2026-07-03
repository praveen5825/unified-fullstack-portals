import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { duplicateCheckApi } from '../../api/duplicateCheck';
import MatchCard from '../../components/MatchCard';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';

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
    return (
      <div className="space-y-3">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="card p-5 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <div className="skeleton h-4 w-32 rounded" />
                <div className="skeleton h-4 w-24 rounded" />
              </div>
              <div className="skeleton h-6 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={CheckCircle}
          title="All caught up!"
          description="No checked proposals are waiting for review. Run a check from the Pending Queue to see results here."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {proposals.map((p, index) => {
        const isOpen = expandedId === p.id;
        const matchCount = p.matches?.length ?? 0;
        
        return (
          <div
            key={p.id}
            className="card overflow-hidden animate-fade-in transition-all duration-300"
            style={{ 
              animationDelay: `${index * 40}ms`,
              boxShadow: isOpen ? 'var(--shadow-md)' : 'var(--shadow-sm)'
            }}
          >
            {/* Header / Toggle Button */}
            <button
              onClick={() => setExpandedId(isOpen ? null : p.id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
              style={{ background: isOpen ? 'var(--color-surface-2)' : 'transparent' }}
              onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.background = 'var(--color-surface-2)'; }}
              onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
            >
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {p.spark_id}
                  </span>
                  <span className="text-sm truncate" style={{ color: 'var(--color-text-muted)' }}>
                    — {p.student_name}
                  </span>
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--color-text-faint)' }}>
                  {p.title || p.college_name}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"
                  style={matchCount > 0 
                    ? { background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)30' }
                    : { background: 'var(--color-success-soft)', color: 'var(--color-success)', border: '1px solid var(--color-success)30' }
                  }
                >
                  {matchCount > 0 ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                  {matchCount > 0 ? `${matchCount} duplicate(s) found` : 'No duplicates'}
                </span>
                
                <StatusBadge value={p.review_status} />
                
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300"
                  style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-faint)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <ChevronDown size={14} />
                </div>
              </div>
            </button>

            {/* Expanded Content */}
            {isOpen && (
              <div
                className="px-5 pb-5 pt-4 animate-slide-up"
                style={{ borderTop: '1px solid var(--color-border-soft)' }}
              >
                {matchCount === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6">
                    <CheckCircle size={32} style={{ color: 'var(--color-success)' }} className="mb-2 opacity-80" />
                    <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Looks good!</div>
                    <div className="text-xs mt-1 mb-4" style={{ color: 'var(--color-text-muted)' }}>No similar proposals were found in the database.</div>
                    
                    <button
                      onClick={() => setReviewStatus(p.id, 'cleared')}
                      className="btn btn-primary px-6 py-2 text-xs rounded-xl flex items-center gap-2"
                      style={{ background: 'var(--color-success)', color: 'white' }}
                    >
                      <CheckCircle size={14} /> Mark as Cleared
                    </button>
                  </div>
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
