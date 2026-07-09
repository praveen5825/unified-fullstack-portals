import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, CheckCircle2, Flag, Loader2,
  Link2, Unlink, ZoomIn, ZoomOut, LayoutPanelLeft, X,
  ChevronRight,
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

import { duplicateCheckApi } from '../../api/duplicateCheck';
import client from '../../api/client';
import ParagraphBreakdown from '../../components/ParagraphBreakdown';
import MatchingStats from '../../components/MatchingStats';
import { buildHighlightData } from '../../utils/textHighlighting';
import Topbar from '../../layout/Topbar';

// Configure PDF.js worker (unpkg CDN — no local worker setup required)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.15;

/**
 * Custom PDF.js text renderer.
 * Wraps exact block matches in a red alert mark, and semantic word overlaps in a subtle orange mark.
 */
function makeTextRenderer(highlightData) {
  const { exactBlocks, highlightWords } = highlightData;
  return (textItem) => {
    const raw = textItem.str || '';
    if (!raw || raw.trim().length < 4) return raw;

    const escaped = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const lower = raw.toLowerCase().trim();
    
    // Check if the text matches an exact duplicated block
    const isExact = exactBlocks.has(lower) || 
      (lower.length >= 20 && [...exactBlocks].some(b => b.includes(lower)));
      
    if (isExact) {
      return `<mark style="background:rgba(239, 68, 68, 0.4);color:inherit;border-radius:2px;padding:0 2px;box-shadow: 0 0 8px rgba(239, 68, 68, 0.3);">${escaped}</mark>`;
    }

    // Semantic word-by-word highlight (highlight individual intersecting keywords)
    if (highlightWords.size > 0) {
      return escaped.replace(/\b([a-z0-9]+)\b/gi, (match, word) => {
        if (highlightWords.has(word.toLowerCase())) {
          return `<mark style="background:rgba(245, 158, 11, 0.35);color:inherit;border-radius:2px;padding:0 1px;">${match}</mark>`;
        }
        return match;
      });
    }

    return escaped;
  };
}

// ── PDF Panel ──────────────────────────────────────────────────────────────

function PdfPanel({ label, pdfUrl, scale, textRenderer, scrollRef, onScroll, syncScroll }) {
  const [numPages, setNumPages] = useState(null);

  return (
    <div className="flex-1 flex flex-col min-w-0" style={{ borderRight: '1px solid var(--color-border-soft)' }}>
      {/* Panel label */}
      <div
        className="shrink-0 px-4 py-2.5 flex items-center justify-between text-sm font-bold z-10"
        style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border-soft)' }}
      >
        <span style={{ color: 'var(--color-text-primary)' }}>{label}</span>
        {numPages && (
          <span className="text-xs font-normal" style={{ color: 'var(--color-text-faint)' }}>
            {numPages} page{numPages !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Scrollable PDF area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto flex flex-col items-center gap-5 p-5"
        style={{ background: 'rgba(0,0,0,0.06)' }}
        onScroll={onScroll}
      >
        {pdfUrl ? (
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            loading={
              <div className="flex items-center gap-2 mt-16" style={{ color: 'var(--color-text-muted)' }}>
                <Loader2 className="animate-spin" size={20} /> Loading PDF…
              </div>
            }
            error={
              <div
                className="mt-16 text-center text-sm px-6 py-4 rounded-xl"
                style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}
              >
                Could not load PDF. Check that the file exists and CORS is configured.
              </div>
            }
          >
            {numPages &&
              Array.from({ length: numPages }, (_, i) => (
                <div key={i} className="shadow-xl rounded-lg overflow-hidden" style={{ maxWidth: '100%' }}>
                  <Page
                    pageNumber={i + 1}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    customTextRenderer={textRenderer}
                  />
                </div>
              ))}
          </Document>
        ) : (
          <div
            className="mt-16 text-center text-sm px-6 py-4 rounded-xl"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
          >
            No PDF available for this panel.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function CompareViewer() {
  const { checkId, matchedProposalId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading]   = useState(true);
  const [matchData, setMatchData] = useState(null);
  const [error, setError]       = useState(null);

  // PDF viewer controls
  const [syncScroll, setSyncScroll] = useState(true);
  const [scale, setScale]           = useState(1.0);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);

  // Scroll refs
  const sourceScrollRef = useRef(null);
  const targetScrollRef = useRef(null);
  const isSyncing = useRef(false);

  // ── Load comparison data ────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await duplicateCheckApi.getComparison(checkId, matchedProposalId);
        setMatchData(res.data);
      } catch {
        setError('Failed to load comparison data. Please go back and try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [checkId, matchedProposalId]);

  // ── Text renderer (memoised on matched paragraphs) ──────────────────────
  const highlightData = matchData
    ? buildHighlightData(matchData.matched_paragraphs || [])
    : { exactBlocks: new Set(), highlightWords: new Set() };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const textRenderer = useCallback(makeTextRenderer(highlightData), [matchData]);

  // ── Scroll sync handlers ────────────────────────────────────────────────
  const activePanel = useRef(null);
  const scrollTimeout = useRef(null);

  const handleSourceScroll = useCallback((e) => {
    if (!syncScroll || !targetScrollRef.current) return;
    if (activePanel.current === 'target') return; // Target is driving
    activePanel.current = 'source';

    const sourceMax = e.target.scrollHeight - e.target.clientHeight;
    const targetMax = targetScrollRef.current.scrollHeight - targetScrollRef.current.clientHeight;
    
    if (sourceMax > 0 && targetMax > 0) {
      const percentage = e.target.scrollTop / sourceMax;
      targetScrollRef.current.scrollTop = percentage * targetMax;
    }

    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      activePanel.current = null;
    }, 100);
  }, [syncScroll]);

  const handleTargetScroll = useCallback((e) => {
    if (!syncScroll || !sourceScrollRef.current) return;
    if (activePanel.current === 'source') return; // Source is driving
    activePanel.current = 'target';

    const targetMax = e.target.scrollHeight - e.target.clientHeight;
    const sourceMax = sourceScrollRef.current.scrollHeight - sourceScrollRef.current.clientHeight;
    
    if (sourceMax > 0 && targetMax > 0) {
      const percentage = e.target.scrollTop / targetMax;
      sourceScrollRef.current.scrollTop = percentage * sourceMax;
    }

    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      activePanel.current = null;
    }, 100);
  }, [syncScroll]);

  // ── Zoom helpers ────────────────────────────────────────────────────────
  const zoomIn  = () => setScale((s) => Math.min(MAX_SCALE, parseFloat((s + SCALE_STEP).toFixed(2))));
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, parseFloat((s - SCALE_STEP).toFixed(2))));
  const zoomReset = () => setScale(1.0);

  // ── Review actions ──────────────────────────────────────────────────────
  const handleAction = async (reviewStatus) => {
    setActionLoading(true);
    try {
      await duplicateCheckApi.updateReviewStatus(matchedProposalId, reviewStatus);
      navigate(-1);
    } catch {
      setActionLoading(false);
    }
  };

  // ── Jump-to handler (from ParagraphBreakdown) ───────────────────────────
  const handleJumpTo = useCallback((_sourceIdx, _targetIdx) => {
    // Scroll both panels to the approximate vertical position of the paragraph.
    const paras = matchData?.matched_paragraphs ?? [];
    if (!paras.length) return;
    const totalParas = paras.length;
    const frac = _sourceIdx / Math.max(totalParas, 1);

    [sourceScrollRef, targetScrollRef].forEach((ref) => {
      if (ref.current) {
        const maxScroll = ref.current.scrollHeight - ref.current.clientHeight;
        ref.current.scrollTop = maxScroll * frac;
      }
    });
  }, [matchData]);

  // ── Construct PDF URLs ──────────────────────────────────────────────────
  const baseUrl = client.defaults.baseURL
    ? client.defaults.baseURL.replace(/\/api$/, '')
    : 'http://localhost:8000';
  const sourcePdfUrl = `${baseUrl}/media/synopsis_checks/${checkId}.pdf`;
  const targetPdfUrl = matchData?.matched_proposal?.document_url
    ? `${baseUrl}${matchData.matched_proposal.document_url}`
    : null;

  // ── Loading / error states ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex flex-col" style={{ background: 'var(--color-base)' }}>
        <Topbar title="Plagiarism Comparison" subtitle="Loading comparison data…" />
        <div className="flex-1 flex items-center justify-center gap-3" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 className="animate-spin" size={28} style={{ color: 'var(--color-accent)' }} />
          <span className="text-sm">Analysing documents…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col" style={{ background: 'var(--color-base)' }}>
        <Topbar title="Plagiarism Comparison" subtitle="Error" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div
            className="max-w-md text-center p-8 rounded-2xl"
            style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)30' }}
          >
            <div className="text-lg font-bold mb-2">Failed to Load</div>
            <div className="text-sm mb-4">{error}</div>
            <button onClick={() => navigate(-1)} className="btn btn-ghost text-sm">
              <ArrowLeft size={14} /> Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const mp = matchData.matched_proposal;
  const overallScore = matchData.overall_score ?? 0;
  const overallColor = overallScore >= 70
    ? 'var(--color-danger)'
    : overallScore >= 40
    ? 'var(--color-warning)'
    : 'var(--color-success)';

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col"
      style={{ height: '100vh', overflow: 'hidden', background: 'var(--color-base)' }}
    >
      {/* ── Top Header Bar ──────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center justify-between px-5 py-3 gap-4"
        style={{
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border-soft)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Left: back + title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl transition-colors shrink-0"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-surface-2)'; }}
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
              Plagiarism Comparison
            </h1>
            <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
              {mp.spark_id} · {mp.student_name}
            </div>
          </div>
          {/* Overall score chip */}
          <div
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
            style={{ background: `${overallColor}18`, color: overallColor, border: `1px solid ${overallColor}40` }}
          >
            <span className="text-base">{overallScore.toFixed(1)}%</span>
            <span className="text-[10px] font-semibold opacity-80">match</span>
          </div>
        </div>

        {/* Right: toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Zoom controls */}
          <div
            className="flex items-center gap-1 rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--color-border-soft)', background: 'var(--color-surface-2)' }}
          >
            <button
              onClick={zoomOut}
              disabled={scale <= MIN_SCALE}
              title="Zoom out"
              className="p-2 transition-colors disabled:opacity-40"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => { if (scale > MIN_SCALE) e.currentTarget.style.background = 'var(--color-surface-3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={zoomReset}
              title="Reset zoom"
              className="px-2 py-1 text-xs font-semibold min-w-[44px] text-center transition-colors"
              style={{ color: 'var(--color-text-primary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={zoomIn}
              disabled={scale >= MAX_SCALE}
              title="Zoom in"
              className="p-2 transition-colors disabled:opacity-40"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => { if (scale < MAX_SCALE) e.currentTarget.style.background = 'var(--color-surface-3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Sync scroll toggle */}
          <button
            onClick={() => setSyncScroll(!syncScroll)}
            title={syncScroll ? 'Disable scroll sync' : 'Enable scroll sync'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={
              syncScroll
                ? { background: 'var(--color-accent-soft)', color: 'var(--color-accent)', border: '1px solid var(--color-accent)40' }
                : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-soft)' }
            }
          >
            {syncScroll ? <Link2 size={13} /> : <Unlink size={13} />}
            Sync
          </button>

          {/* Toggle sidebar */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Hide analysis panel' : 'Show analysis panel'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={
              sidebarOpen
                ? { background: 'var(--color-accent-soft)', color: 'var(--color-accent)', border: '1px solid var(--color-accent)40' }
                : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-soft)' }
            }
          >
            <LayoutPanelLeft size={13} /> Analysis
          </button>

          {/* Download report */}
         <button
          onClick={() => duplicateCheckApi.downloadReport(checkId, matchedProposalId)}
          className="flex items-center gap-1.5 text-sm bg-surface-2 border border-border-soft px-3.5 py-2 rounded-xl hover:bg-surface-3"
        >
          <Download size={14} /> Report
        </button>

          {/* Mark cleared */}
          <button
            onClick={() => handleAction('cleared')}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
            style={{ background: 'var(--color-success)', color: 'white' }}
            onMouseEnter={(e) => { if (!actionLoading) e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <CheckCircle2 size={13} /> Clear
          </button>

          {/* Flag */}
          <button
            onClick={() => handleAction('flagged')}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
            style={{ background: 'var(--color-danger)', color: 'white' }}
            onMouseEnter={(e) => { if (!actionLoading) e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <Flag size={13} /> Flag
          </button>
        </div>
      </div>

      {/* ── Body: PDF panels + optional sidebar ─────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left PDF panel — uploaded synopsis */}
        <PdfPanel
          label="📄 Uploaded Synopsis"
          pdfUrl={sourcePdfUrl}
          scale={scale}
          textRenderer={textRenderer}
          scrollRef={sourceScrollRef}
          onScroll={handleSourceScroll}
          syncScroll={syncScroll}
        />

        {/* Right PDF panel — matched proposal */}
        <PdfPanel
          label={`📁 Matched: ${mp.spark_id} — ${mp.title?.slice(0, 50) ?? ''}`}
          pdfUrl={targetPdfUrl}
          scale={scale}
          textRenderer={textRenderer}
          scrollRef={targetScrollRef}
          onScroll={handleTargetScroll}
          syncScroll={syncScroll}
        />

        {/* Right sidebar — analysis panel */}
        {sidebarOpen && (
          <div
            className="shrink-0 flex flex-col overflow-y-auto gap-4 p-4 animate-slide-in-left"
            style={{
              width: '300px',
              borderLeft: '1px solid var(--color-border-soft)',
              background: 'var(--color-surface)',
            }}
          >
            {/* Close button */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
                Analysis
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-lg transition-colors"
                style={{ color: 'var(--color-text-faint)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Matching stats */}
            <MatchingStats
              overall_score={matchData.overall_score}
              content_score={matchData.content_score}
              title_score={matchData.title_score}
              student_name_score={matchData.student_name_score}
              college_score={matchData.college_score}
              matched_words={matchData.matched_words}
              total_words={matchData.total_words}
              matched_sentences={matchData.matched_sentences}
              matched_paragraphs={matchData.matched_paragraphs}
            />

            {/* Common terms */}
            {matchData.matching_terms?.length > 0 && (
              <div
                className="p-3 rounded-xl"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-soft)' }}
              >
                <div className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Top Matching Terms
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {matchData.matching_terms.map((term) => (
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
              </div>
            )}

            {/* Matched paragraph breakdown */}
            <ParagraphBreakdown
              matchedParagraphs={matchData.matched_paragraphs ?? []}
              onJumpTo={handleJumpTo}
            />

            {/* Link to matched proposal detail */}
            <a
              href={`/proposals/${mp.id}`}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: 'var(--color-surface-2)',
                color: 'var(--color-accent)',
                border: '1px solid var(--color-border-soft)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-surface-2)'; }}
            >
              View matched proposal detail
              <ChevronRight size={13} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
