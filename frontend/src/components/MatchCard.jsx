import { CheckCircle2, Flag, FileSearch, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import ScoreBar from './ScoreBar';
import StatusBadge from './StatusBadge';
import SchemeTag from './SchemeTag';

function getConfidenceBand(score) {
  if (score >= 70) return { label: 'High Risk', color: 'var(--color-danger)', bg: 'var(--color-danger-soft)', dot: 'var(--color-danger)' };
  if (score >= 40) return { label: 'Medium Risk', color: 'var(--color-warning)', bg: 'var(--color-warning-soft)', dot: 'var(--color-warning)' };
  return { label: 'Low Risk', color: 'var(--color-success)', bg: 'var(--color-success-soft)', dot: 'var(--color-success)' };
}

export default function MatchCard({ match, onMarkReviewed, onFlag }) {
  const [showTerms, setShowTerms] = useState(false);
  const band = getConfidenceBand(match.overall_score);
  const { matched_proposal: m } = match;

  return (
    <div
      className="card animate-fade-in overflow-hidden"
      style={{ borderLeft: `3px solid ${band.dot}` }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: band.bg, borderBottom: '1px solid var(--color-border-soft)' }}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0 block"
              style={{ background: band.dot }}
            />
            {match.overall_score >= 70 && (
              <span
                className="absolute inset-0 rounded-full animate-ping"
                style={{ background: band.dot, opacity: 0.4 }}
              />
            )}
          </div>
          <span className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {match.overall_score}%
          </span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: band.bg, color: band.color, border: `1px solid ${band.dot}30` }}
          >
            {band.label}
          </span>
        </div>
        <StatusBadge value={m.status} />
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Score Bars */}
        <div className="space-y-3 mb-4">
          <ScoreBar label="Content similarity" value={match.content_score} />
          <ScoreBar label="Title similarity" value={match.title_score} />
          <ScoreBar label="Student name match" value={match.student_name_score} />
          <ScoreBar label="College match" value={match.college_score} />
        </div>

        {/* Matched Proposal Info */}
        <div
          className="rounded-xl p-3 mb-4"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-soft)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {m.spark_id}
              </span>
              <SchemeTag scheme={m.scheme} small />
            </div>
            {m.id && (
              <a
                href={`/proposals/${m.id}`}
                className="flex items-center gap-1 text-xs transition-colors"
                style={{ color: 'var(--color-accent)' }}
              >
                <ExternalLink size={11} /> View
              </a>
            )}
          </div>
          <div className="text-sm font-medium line-clamp-1" style={{ color: 'var(--color-text-primary)' }}>
            {m.title || '—'}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {m.student_name} · {m.college_name}
          </div>
        </div>

        {/* Common Terms Toggle */}
        {match.matching_terms?.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowTerms(!showTerms)}
              className="flex items-center gap-1 text-xs mb-2 transition-colors"
              style={{ color: 'var(--color-text-faint)' }}
            >
              <FileSearch size={12} />
              <span>{match.matching_terms.length} common terms</span>
              {showTerms ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showTerms && (
              <div className="flex flex-wrap gap-1.5 animate-fade-in">
                {match.matching_terms.map((term) => (
                  <span
                    key={term}
                    className="text-xs px-2 py-0.5 rounded-lg font-medium"
                    style={{
                      background: 'var(--color-accent-soft)',
                      color: 'var(--color-accent)',
                      border: '1px solid var(--color-accent-hover)',
                    }}
                  >
                    {term}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onMarkReviewed}
            className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-xl font-medium transition-all duration-150"
            style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)', border: '1px solid var(--color-success)30' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-success)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-success-soft)';
              e.currentTarget.style.color = 'var(--color-success)';
            }}
          >
            <CheckCircle2 size={14} /> Mark Cleared
          </button>
          <button
            onClick={onFlag}
            className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-xl font-medium transition-all duration-150"
            style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)30' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-danger)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-danger-soft)';
              e.currentTarget.style.color = 'var(--color-danger)';
            }}
          >
            <Flag size={14} /> Flag Duplicate
          </button>
        </div>
      </div>
    </div>
  );
}
