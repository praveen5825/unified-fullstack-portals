import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, SlidersHorizontal, BookText, FileText, X, ChevronRight,
  Info, Zap, Tag, ArrowRight, ToggleLeft, ToggleRight, Loader2,
} from 'lucide-react';
import Topbar from '../layout/Topbar';
import StatusBadge from '../components/StatusBadge';
import SchemeTag from '../components/SchemeTag';
import { searchApi } from '../api/duplicateCheck';

// ── Constants ─────────────────────────────────────────────────────────────────
const SCHEME_OPTS = ['', 'SPARK', 'PG-STAR', 'PDF-STAR'];
const STATUS_OPTS = ['', 'received', 'selected', 'awarded'];
const SEARCH_IN_OPTS = [
  { value: 'both',     label: 'Both',     desc: 'Title + Synopsis' },
  { value: 'title',    label: 'Title',    desc: 'Title field only (fast)' },
  { value: 'synopsis', label: 'Synopsis', desc: 'Full synopsis text' },
];

// Boolean operator quick-insert chips
const BOOL_CHIPS = [
  { label: 'AND',   op: ' AND ',   color: '#6366f1', desc: 'Both words must match' },
  { label: 'OR',    op: ' OR ',    color: '#10b981', desc: 'Either word matches' },
  { label: 'NOT',   op: ' NOT ',   color: '#ef4444', desc: 'Exclude this word' },
  { label: '"phrase"', op: ' "" ', color: '#f59e0b', desc: 'Exact phrase match — place cursor between quotes' },
];

// ── Snippet highlighter ───────────────────────────────────────────────────────
function Highlight({ text, query }) {
  if (!text || !query) return <span>{text}</span>;
  const words = query
    .split(/\s+/)
    .filter(w => !['AND', 'OR', 'NOT'].includes(w.toUpperCase()) && w.length > 1)
    .map(w => w.replace(/['"]/g, ''));

  if (!words.length) return <span>{text}</span>;

  const pattern = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return (
    <span>
      {parts.map((part, i) =>
        pattern.test(part)
          ? <mark key={i} style={{ background: 'rgba(99,102,241,0.25)', color: 'var(--color-accent)', borderRadius: 3, padding: '0 2px' }}>{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({ result, query, onNavigate }) {
  return (
    <div
      className="group rounded-2xl p-5 cursor-pointer transition-all duration-200 animate-fade-in"
      style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--color-accent)';
        e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-accent-soft)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onClick={() => onNavigate(result.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className="text-sm font-semibold mb-1 leading-snug" style={{ color: 'var(--color-text-primary)' }}>
            <Highlight text={result.title || '(No title)'} query={query} />
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <SchemeTag scheme={result.scheme} />
            <StatusBadge status={result.status} />
            {result.year && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-faint)' }}>
                {result.year}
              </span>
            )}
            {result.matched_in && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--color-accent)' }}>
                <Tag size={9} /> matched in {result.matched_in}
              </span>
            )}
            {result.rank > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                {result.rank.toFixed(0)}% relevance
              </span>
            )}
          </div>

          {/* Student / College */}
          <div className="flex gap-4 text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
            {result.student_name && <span>👤 {result.student_name}</span>}
            {result.college_name && <span>🏛 {result.college_name}</span>}
            {result.state && <span>📍 {result.state}</span>}
          </div>

          {/* Snippet */}
          {result.snippet && (
            <p className="text-xs leading-relaxed rounded-lg px-3 py-2"
              style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
              <Highlight text={result.snippet} query={query} />
            </p>
          )}
        </div>

        {/* Arrow */}
        <div className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-accent)' }}>
          <ChevronRight size={18} />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// ── GLOBAL SEARCH PAGE ─────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════════
export default function GlobalSearch() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState('simple');          // 'simple' | 'boolean'
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchIn, setSearchIn] = useState('both');
  const [scheme, setScheme] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchType, setSearchType] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Auto-search if ?q= in URL
  useEffect(() => {
    const urlQ = searchParams.get('q');
    if (urlQ) {
      setQuery(urlQ);
      doSearch(urlQ, 'simple', 'both', '', '', 1);
    }
    // Focus input
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // ── Search logic ───────────────────────────────────────────────────────────
  const doSearch = useCallback(async (
    q = query, m = mode, si = searchIn, sc = scheme, st = statusFilter, pg = page
  ) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setHasSearched(true);
    try {
      let res;
      if (m === 'boolean') {
        res = await searchApi.booleanSearch({ query: trimmed, search_in: si, scheme: sc || undefined, status: st || undefined, page: pg });
      } else {
        res = await searchApi.globalSearch({ q: trimmed, scheme: sc || undefined, status: st || undefined, page: pg });
      }
      setResults(res.data.results || []);
      setTotal(res.data.count || 0);
      setTotalPages(res.data.total_pages || 1);
      setSearchType(res.data.search_type || m);
    } catch (e) {
      console.error('Search error', e);
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query, mode, searchIn, scheme, statusFilter, page]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    setPage(1);
    setSearchParams(query ? { q: query } : {});
    doSearch(query, mode, searchIn, scheme, statusFilter, 1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const insertAtCursor = (op) => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newVal = query.slice(0, start) + op + query.slice(end);
    setQuery(newVal);
    setTimeout(() => {
      el.focus();
      const pos = start + op.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  };

  const handlePageChange = (p) => {
    setPage(p);
    doSearch(query, mode, searchIn, scheme, statusFilter, p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <Topbar title="Global Search" subtitle="Search across all proposals — titles, synopsis, students, colleges" />

      {/* ── Hero Search Box ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 mb-5 animate-fade-in"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}
      >
        {/* Mode Toggle */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Search Mode:</span>
          <button
            onClick={() => setMode('simple')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
            style={{
              background: mode === 'simple' ? 'var(--color-accent)' : 'var(--color-surface-3)',
              color: mode === 'simple' ? '#fff' : 'var(--color-text-muted)',
              border: `1px solid ${mode === 'simple' ? 'var(--color-accent)' : 'var(--color-border)'}`,
            }}
          >
            <Zap size={11} /> Simple Search
          </button>
          <button
            onClick={() => setMode('boolean')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
            style={{
              background: mode === 'boolean' ? 'var(--color-accent)' : 'var(--color-surface-3)',
              color: mode === 'boolean' ? '#fff' : 'var(--color-text-muted)',
              border: `1px solid ${mode === 'boolean' ? 'var(--color-accent)' : 'var(--color-border)'}`,
            }}
          >
            <BookText size={11} /> Boolean Search
          </button>
        </div>

        {/* Search Input */}
        <div className="flex gap-3 items-center">
          <div
            className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
            style={{ background: 'var(--color-surface-3)', border: '1.5px solid var(--color-border)' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-soft)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <Search size={16} style={{ color: 'var(--color-text-faint)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--color-text-primary)' }}
              placeholder={mode === 'boolean'
                ? 'e.g.  ayurveda AND cancer  OR  "clinical trial"  NOT  synthetic'
                : 'Search by title, student name, college, research area…'
              }
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); setHasSearched(false); }}
                style={{ color: 'var(--color-text-faint)' }}>
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!query.trim() || loading}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              background: 'var(--color-accent)',
              color: '#fff',
              opacity: !query.trim() || loading ? 0.5 : 1,
              boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
            }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            Search
          </button>
        </div>

        {/* Boolean Mode — Operator Chips + Guide */}
        {mode === 'boolean' && (
          <div className="mt-4">
            {/* Operator chips */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[10px] font-semibold mr-1" style={{ color: 'var(--color-text-faint)' }}>Insert:</span>
              {BOOL_CHIPS.map(chip => (
                <button
                  key={chip.label}
                  onClick={() => insertAtCursor(chip.op)}
                  title={chip.desc}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-150 hover:scale-105"
                  style={{ background: `${chip.color}22`, color: chip.color, border: `1px solid ${chip.color}44` }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Guide panel */}
            <div
              className="rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-3"
              style={{ background: 'var(--color-surface-4)', border: '1px solid var(--color-border)' }}
            >
              <div>
                <div className="text-[10px] font-bold mb-1" style={{ color: '#6366f1' }}>AND</div>
                <code className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>ayurveda AND cancer</code>
                <div className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-faint)' }}>Both words must appear</div>
              </div>
              <div>
                <div className="text-[10px] font-bold mb-1" style={{ color: '#10b981' }}>OR</div>
                <code className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>cancer OR diabetes</code>
                <div className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-faint)' }}>Either word matches</div>
              </div>
              <div>
                <div className="text-[10px] font-bold mb-1" style={{ color: '#ef4444' }}>NOT</div>
                <code className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>ayurveda NOT synthetic</code>
                <div className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-faint)' }}>Exclude that word</div>
              </div>
              <div>
                <div className="text-[10px] font-bold mb-1" style={{ color: '#f59e0b' }}>"Phrase"</div>
                <code className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>"clinical trial"</code>
                <div className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-faint)' }}>Exact phrase match</div>
              </div>
            </div>

            {/* Search-in toggle */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-faint)' }}>Search In:</span>
              {SEARCH_IN_OPTS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSearchIn(opt.value)}
                  title={opt.desc}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all duration-150"
                  style={{
                    background: searchIn === opt.value ? 'var(--color-accent)' : 'var(--color-surface-3)',
                    color: searchIn === opt.value ? '#fff' : 'var(--color-text-muted)',
                    border: `1px solid ${searchIn === opt.value ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
              <span className="text-[10px] ml-2" style={{ color: 'var(--color-text-faint)' }}>
                {SEARCH_IN_OPTS.find(o => o.value === searchIn)?.desc}
              </span>
            </div>
          </div>
        )}

        {/* Filters Row */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all"
            style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            <SlidersHorizontal size={12} />
            Filters {(scheme || statusFilter) ? '●' : ''}
          </button>

          {showFilters && (
            <>
              <select
                value={scheme}
                onChange={e => setScheme(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-xl outline-none"
                style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                {SCHEME_OPTS.map(s => <option key={s} value={s}>{s || 'All Schemes'}</option>)}
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-xl outline-none"
                style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
              </select>
              {(scheme || statusFilter) && (
                <button onClick={() => { setScheme(''); setStatusFilter(''); }} className="text-xs" style={{ color: 'var(--color-danger)' }}>
                  Clear filters
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Results ─────────────────────────────────────────────────────── */}
      {hasSearched && (
        <div>
          {/* Summary bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {loading
                ? 'Searching…'
                : total > 0
                  ? <><strong style={{ color: 'var(--color-text-primary)' }}>{total}</strong> result{total !== 1 ? 's' : ''} for <strong style={{ color: 'var(--color-accent)' }}>"{query}"</strong>
                      {searchType && <span className="ml-2 text-[10px]" style={{ color: 'var(--color-text-faint)' }}>({searchType === 'fts' ? 'PostgreSQL FTS' : 'text match'})</span>}
                    </>
                  : <span>No results found for <strong>"{query}"</strong> — try different keywords or operators.</span>
              }
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-3">
            {results.map(r => (
              <ResultCard
                key={r.id}
                result={r}
                query={query}
                onNavigate={id => navigate(`/proposals/${id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
                className="px-3 py-1.5 rounded-xl text-xs transition-all"
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  color: page === 1 ? 'var(--color-text-faint)' : 'var(--color-text-muted)',
                  opacity: page === 1 ? 0.4 : 1,
                }}
              >← Prev</button>

              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className="w-8 h-8 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: page === p ? 'var(--color-accent)' : 'var(--color-surface-2)',
                      color: page === p ? '#fff' : 'var(--color-text-muted)',
                      border: `1px solid ${page === p ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    }}
                  >{p}</button>
                );
              })}

              <button
                disabled={page === totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="px-3 py-1.5 rounded-xl text-xs transition-all"
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  color: page === totalPages ? 'var(--color-text-faint)' : 'var(--color-text-muted)',
                  opacity: page === totalPages ? 0.4 : 1,
                }}
              >Next →</button>
            </div>
          )}
        </div>
      )}

      {/* ── Empty / Welcome state ─────────────────────────────────────── */}
      {!hasSearched && (
        <div
          className="rounded-2xl p-10 text-center animate-fade-in"
          style={{ background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)' }}
        >
          <Search size={40} className="mx-auto mb-4" style={{ color: 'var(--color-text-faint)' }} />
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Search All Proposals</p>
          <p className="text-xs mb-5" style={{ color: 'var(--color-text-faint)' }}>
            Use <strong style={{ color: 'var(--color-accent)' }}>Simple Search</strong> for quick lookups, or switch to <strong style={{ color: 'var(--color-accent)' }}>Boolean Search</strong> for advanced queries using AND / OR / NOT / "phrases".
          </p>
          <div className="flex justify-center gap-3 flex-wrap text-[11px]">
            {['"clinical trial" AND ayurveda', 'cancer OR diabetes', 'ayurveda NOT synthetic', 'pharmacological SPARK'].map(ex => (
              <button
                key={ex}
                onClick={() => { setQuery(ex); setMode('boolean'); setTimeout(handleSubmit, 50); }}
                className="px-3 py-1.5 rounded-xl font-medium transition-all hover:scale-105"
                style={{ background: 'var(--color-surface-3)', color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
