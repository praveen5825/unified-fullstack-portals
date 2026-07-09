import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { getIntersectingWords, wrapIntersectingWords } from '../utils/textHighlighting';

/**
 * ParagraphBreakdown
 * Displays a scrollable list of matched paragraphs from the semantic diff.
 *
 * Props:
 *   matchedParagraphs  – array of { source_idx, target_idx, source_text, target_text, similarity }
 *   onJumpTo          – (sourceIndex, targetIndex) => void  — called when user clicks a row
 */
export default function ParagraphBreakdown({ matchedParagraphs = [], onJumpTo }) {
  const [expanded, setExpanded] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'exact' | 'near'

  const filtered = matchedParagraphs.filter((p) => {
    if (filter === 'exact') return p.similarity >= 95.0;
    if (filter === 'near')  return p.similarity < 95.0;
    return true;
  });

  const exactCount = matchedParagraphs.filter((p) => p.similarity >= 95.0).length;
  const nearCount  = matchedParagraphs.filter((p) => p.similarity <  95.0).length;

  function getRatioStyle(similarity) {
    if (similarity >= 95.0) return { color: 'var(--color-danger)', bg: 'var(--color-danger-soft)', label: 'Exact' };
    if (similarity >= 85.0) return { color: 'var(--color-warning)', bg: 'var(--color-warning-soft)', label: `${Math.round(similarity)}%` };
    return { color: 'var(--color-info)', bg: 'var(--color-info-soft)', label: `${Math.round(similarity)}%` };
  }

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-soft)',
        borderRadius: 'var(--radius)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-4 py-3 w-full text-left"
        style={{ background: 'var(--color-surface-2)', borderBottom: expanded ? '1px solid var(--color-border-soft)' : 'none' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Matched Sections
          </span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
          >
            {matchedParagraphs.length}
          </span>
          {exactCount > 0 && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}
            >
              {exactCount} exact
            </span>
          )}
          {nearCount > 0 && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}
            >
              {nearCount} near
            </span>
          )}
        </div>
        <div style={{ color: 'var(--color-text-faint)' }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <>
          {/* Filter tabs */}
          {matchedParagraphs.length > 0 && (
            <div
              className="flex gap-1 px-3 py-2"
              style={{ borderBottom: '1px solid var(--color-border-soft)', background: 'var(--color-surface-2)' }}
            >
              {[
                { key: 'all',   label: `All (${matchedParagraphs.length})` },
                { key: 'exact', label: `Exact (${exactCount})` },
                { key: 'near',  label: `Near (${nearCount})` },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className="text-xs px-3 py-1 rounded-lg font-medium transition-all duration-150"
                  style={
                    filter === key
                      ? { background: 'var(--color-accent)', color: 'white' }
                      : { background: 'var(--color-surface-3)', color: 'var(--color-text-faint)' }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Sentence list */}
          <div className="overflow-y-auto" style={{ maxHeight: '340px' }}>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CheckCircle2 size={28} style={{ color: 'var(--color-success)', opacity: 0.6 }} />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  No {filter !== 'all' ? filter + ' ' : ''}matches found
                </span>
              </div>
            ) : (
              filtered.map((paragraph, idx) => {
                const { color, bg, label } = getRatioStyle(paragraph.similarity);
                const isExact = paragraph.similarity >= 95.0;
                
                // Highlight overlapping words in the UI
                const words = isExact ? new Set() : getIntersectingWords(paragraph.source_text, paragraph.target_text);
                const highlightedHtml = isExact ? paragraph.source_text : wrapIntersectingWords(paragraph.source_text, words);

                return (
                  <button
                    key={idx}
                    onClick={() => onJumpTo?.(paragraph.source_idx, paragraph.target_idx)}
                    className="w-full text-left px-4 py-3 transition-all duration-150 group"
                    style={{
                      borderBottom: '1px solid var(--color-border-soft)',
                      background: 'transparent',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isExact
                          ? <AlertTriangle size={11} style={{ color: 'var(--color-danger)' }} />
                          : <AlertTriangle size={11} style={{ color: 'var(--color-warning)' }} />
                        }
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: bg, color }}
                        >
                          {label}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--color-text-faint)' }}>
                          §{paragraph.source_idx + 1} <ArrowRight size={8} className="inline" /> §{paragraph.target_idx + 1}
                        </span>
                      </div>
                      <span
                        className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        Jump ↗
                      </span>
                    </div>
                    <p
                      className="text-xs leading-relaxed line-clamp-3"
                      style={{ color: 'var(--color-text-muted)' }}
                      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                    />
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
