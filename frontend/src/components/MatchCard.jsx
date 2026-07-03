import { CheckCircle2, Flag, FileSearch } from 'lucide-react';
import ScoreBar from './ScoreBar';
import StatusBadge from './StatusBadge';

function confidenceBand(score) {
  if (score >= 70) return { label: 'High', color: 'text-danger', dot: 'bg-danger' };
  if (score >= 40) return { label: 'Medium', color: 'text-warning', dot: 'bg-warning' };
  return { label: 'Low', color: 'text-success', dot: 'bg-success' };
}

export default function MatchCard({ match, onMarkReviewed, onFlag }) {
  const band = confidenceBand(match.overall_score);
  const { matched_proposal: m } = match;

  return (
    <div className="rounded-2xl bg-surface border border-border-soft p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${band.dot}`} />
          <span className="text-lg font-semibold">{match.overall_score}%</span>
          <span className={`text-xs font-medium ${band.color}`}>{band.label} confidence</span>
        </div>
        <StatusBadge value={m.status} />
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4">
        <ScoreBar label="Content similarity" value={match.content_score} />
        <ScoreBar label="Title similarity" value={match.title_score} />
        <ScoreBar label="Student name match" value={match.student_name_score} />
        <ScoreBar label="College match" value={match.college_score} />
      </div>

      <div className="rounded-xl bg-surface-2 border border-border-soft p-3 mb-4">
        <div className="text-xs text-text-faint mb-1">Matched with</div>
        <div className="text-sm font-medium">{m.spark_id} · {m.scheme}</div>
        <div className="text-sm text-text-muted">{m.student_name} — {m.college_name}</div>
      </div>

      {match.matching_terms?.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-text-faint mb-2 flex items-center gap-1">
            <FileSearch size={12} /> Common key terms
          </div>
          <div className="flex flex-wrap gap-1.5">
            {match.matching_terms.map((term) => (
              <span key={term} className="text-xs bg-surface-3 text-text-muted px-2 py-1 rounded-lg">
                {term}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onMarkReviewed}
          className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-xl bg-surface-2 border border-border-soft hover:bg-surface-3 transition-colors"
        >
          <CheckCircle2 size={14} /> Mark Reviewed
        </button>
        <button
          onClick={onFlag}
          className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-xl bg-danger-soft text-danger hover:opacity-80 transition-opacity"
        >
          <Flag size={14} /> Flag Duplicate
        </button>
      </div>
    </div>
  );
}
