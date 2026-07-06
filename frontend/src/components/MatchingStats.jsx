import ScoreBar from './ScoreBar';

/**
 * MatchingStats
 * Compact stat panel for the CompareViewer header / sidebar.
 *
 * Props (all from the /compare/ API response):
 *   overall_score, content_score, title_score, student_name_score, college_score
 *   matched_words, total_words, matched_sentences (array), matched_paragraphs (array)
 */
export default function MatchingStats({
  overall_score = 0,
  content_score = 0,
  title_score = 0,
  student_name_score = 0,
  college_score = 0,
  matched_words = 0,
  total_words = 0,
  matched_sentences = [],
  matched_paragraphs = [],
}) {
  const wordPct = total_words > 0 ? Math.round((matched_words / total_words) * 100) : 0;
  const sentCount = Array.isArray(matched_sentences) ? matched_sentences.length : 0;
  const paraCount = Array.isArray(matched_paragraphs) ? matched_paragraphs.length : 0;

  const getOverallStyle = () => {
    if (overall_score >= 70) return { color: 'var(--color-danger)', bg: 'var(--color-danger-soft)', label: 'High Risk' };
    if (overall_score >= 40) return { color: 'var(--color-warning)', bg: 'var(--color-warning-soft)', label: 'Medium Risk' };
    return { color: 'var(--color-success)', bg: 'var(--color-success-soft)', label: 'Low Risk' };
  };
  const { color: riskColor, bg: riskBg, label: riskLabel } = getOverallStyle();

  return (
    <div
      className="flex flex-col gap-4 p-4"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-soft)',
        borderRadius: 'var(--radius)',
      }}
    >
      {/* Overall badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
          Similarity Analysis
        </span>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: riskBg, color: riskColor }}
        >
          {riskLabel}
        </span>
      </div>

      {/* Overall score big number */}
      <div className="text-center py-1">
        <div className="text-4xl font-extrabold" style={{ color: riskColor }}>
          {overall_score.toFixed(1)}%
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Overall Match Confidence
        </div>
      </div>

      {/* Score breakdown bars */}
      <div className="space-y-2">
        <ScoreBar label="Content"  value={content_score} />
        <ScoreBar label="Title"    value={title_score} />
        <ScoreBar label="Student"  value={student_name_score} />
        <ScoreBar label="College"  value={college_score} />
      </div>

      {/* Word / sentence stats grid */}
      <div
        className="grid grid-cols-2 gap-2 pt-2"
        style={{ borderTop: '1px solid var(--color-border-soft)' }}
      >
        {[
          { label: 'Words Matched', value: total_words > 0 ? `${matched_words} / ${total_words}` : '—', sub: total_words > 0 ? `${wordPct}%` : '' },
          { label: 'Sentences',    value: sentCount,  sub: sentCount === 1 ? 'match' : 'matches' },
          { label: 'Paragraphs',   value: paraCount,  sub: paraCount === 1 ? 'match' : 'matches' },
          { label: 'Word Coverage',value: `${wordPct}%`, sub: 'of source' },
        ].map(({ label, value, sub }) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center p-2 rounded-xl"
            style={{ background: 'var(--color-surface-2)' }}
          >
            <div className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {value}
            </div>
            <div className="text-[10px] font-medium" style={{ color: 'var(--color-text-faint)' }}>
              {label}
            </div>
            {sub && (
              <div className="text-[10px]" style={{ color: 'var(--color-text-faint)', opacity: 0.7 }}>
                {sub}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
