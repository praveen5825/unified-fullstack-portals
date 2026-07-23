import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { BarChart3, TrendingUp, MapPin, BookOpen, Calendar, ShieldAlert, RefreshCw, Download } from 'lucide-react';
import Topbar from '../layout/Topbar';
import EChart, { cssVar } from '../components/EChart';
import { analyticsApi } from '../api/duplicateCheck';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

// ── Scheme filter options ────────────────────────────────────────────────────
const SCHEME_OPTIONS = [
  { value: '', label: 'All Schemes' },
  { value: 'SPARK', label: 'SPARK' },
  { value: 'PG-STAR', label: 'PG-STAR' },
  { value: 'PDF-STAR', label: 'PDF-STAR' },
];

// ── Small KPI card ────────────────────────────────────────────────────────────
function KpiCard({ label, value, color, icon: Icon, sub }) {
  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4 animate-fade-in"
      style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        className="flex items-center justify-center rounded-xl shrink-0"
        style={{ width: 46, height: 46, background: `${color}22`, color }}
      >
        <Icon size={22} />
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{value ?? '—'}</div>
        <div className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
        {sub && <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-faint)' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Chart panel wrapper ────────────────────────────────────────────────────────
function ChartPanel({ title, icon: Icon, color, children, fullWidth = false }) {
  return (
    <div
      className={`rounded-2xl p-5 animate-fade-in ${fullWidth ? 'col-span-full' : ''}`}
      style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="flex items-center justify-center rounded-lg"
          style={{ width: 30, height: 30, background: `${color}22`, color }}
        >
          <Icon size={15} />
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

// ── Loading placeholder ───────────────────────────────────────────────────────
function ChartLoading() {
  return (
    <div className="flex items-center justify-center h-48 rounded-xl animate-pulse"
      style={{ background: 'var(--color-surface-3)' }}>
      <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>Loading chart…</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// ── ANALYTICS PAGE ─────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════════
export default function Analytics() {
  const [scheme, setScheme] = useState('');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [yearly, setYearly] = useState([]);
  const [statewise, setStatewise] = useState([]);
  const [researchArea, setResearchArea] = useState([]);
  const [session, setSession] = useState([]);
  const [dupStats, setDupStats] = useState([]);
  const dashboardRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPdf = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading('Generating PDF Report...');
    try {
      const canvas = await html2canvas(dashboardRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('CCRAS_Analytics_Report.pdf');
      toast.success('Report downloaded successfully!', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    const params = scheme ? { scheme } : {};
    try {
      const [ovRes, yrRes, stRes, raRes, ssRes, dsRes] = await Promise.all([
        analyticsApi.overview(params),
        analyticsApi.yearly(params),
        analyticsApi.statewise(params),
        analyticsApi.researchArea(params),
        analyticsApi.session(params),
        analyticsApi.duplicateStats(params),
      ]);
      setOverview(ovRes.data);
      setYearly(yrRes.data.results || []);
      setStatewise(stRes.data.results || []);
      setResearchArea(raRes.data.results || []);
      setSession(ssRes.data.results || []);
      setDupStats(dsRes.data.results || []);
    } catch (e) {
      console.error('Analytics load failed:', e);
    } finally {
      setLoading(false);
    }
  }, [scheme]);

  useEffect(() => { load(); }, [load]);

  // ── ECharts option builders ────────────────────────────────────────────────

  const yearlyOption = useMemo(() => {
    if (!yearly.length) return null;
    const spark   = cssVar('--color-spark',   '#3b82f6');
    const pgstar  = cssVar('--color-pgstar',  '#f59e0b');
    const pdfstar = cssVar('--color-pdfstar', '#10b981');
    const labels  = yearly.map(r => r.year);
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['SPARK', 'PG-STAR', 'PDF-STAR'], top: 0, textStyle: { color: cssVar('--color-text-muted', '#94a3b8') } },
      grid: { left: 16, right: 16, bottom: 24, top: 40, containLabel: true },
      xAxis: { type: 'category', data: labels, axisLine: { lineStyle: { color: cssVar('--color-border', '#232742') } }, axisLabel: { color: cssVar('--color-text-faint', '#475569'), fontSize: 11 } },
      yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: cssVar('--color-border', '#232742'), type: 'dashed' } }, axisLabel: { color: cssVar('--color-text-faint', '#475569'), fontSize: 11 } },
      series: [
        { name: 'SPARK',    type: 'bar', stack: 'total', data: yearly.map(r => r.spark   || 0), itemStyle: { color: spark,   borderRadius: [0,0,0,0] } },
        { name: 'PG-STAR',  type: 'bar', stack: 'total', data: yearly.map(r => r.pgstar  || 0), itemStyle: { color: pgstar,  borderRadius: [0,0,0,0] } },
        { name: 'PDF-STAR', type: 'bar', stack: 'total', data: yearly.map(r => r.pdfstar || 0), itemStyle: { color: pdfstar, borderRadius: [4,4,0,0] } },
      ],
    };
  }, [yearly]);

  const statewiseOption = useMemo(() => {
    if (!statewise.length) return null;
    const accent = cssVar('--color-accent', '#818cf8');
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 120, right: 24, bottom: 16, top: 16, containLabel: false },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: cssVar('--color-border', '#232742'), type: 'dashed' } }, axisLabel: { color: cssVar('--color-text-faint', '#475569'), fontSize: 10 } },
      yAxis: {
        type: 'category',
        data: [...statewise].reverse().map(r => r.state),
        axisLabel: { color: cssVar('--color-text-muted', '#94a3b8'), fontSize: 10, width: 110, overflow: 'truncate' },
        axisLine: { lineStyle: { color: cssVar('--color-border', '#232742') } },
      },
      series: [{
        type: 'bar',
        data: [...statewise].reverse().map(r => r.total),
        itemStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: cssVar('--color-accent-from', '#6366f1') }, { offset: 1, color: cssVar('--color-accent-to', '#a855f7') }] },
          borderRadius: [0, 4, 4, 0],
        },
        label: { show: true, position: 'right', color: cssVar('--color-text-muted', '#94a3b8'), fontSize: 10, formatter: '{c}' },
      }],
    };
  }, [statewise]);

  const researchAreaOption = useMemo(() => {
    if (!researchArea.length) return null;
    const colors = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'];
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { color: cssVar('--color-text-muted', '#94a3b8'), fontSize: 10 }, formatter: n => n.length > 22 ? n.slice(0, 22) + '…' : n },
      series: [{
        type: 'pie',
        radius: ['42%', '70%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: true,
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
        data: researchArea.map((r, i) => ({ value: r.total, name: r.research_area, itemStyle: { color: colors[i % colors.length] } })),
      }],
    };
  }, [researchArea]);

  const sessionOption = useMemo(() => {
    if (!session.length) return null;
    const accent = cssVar('--color-accent', '#818cf8');
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 16, right: 16, bottom: 24, top: 16, containLabel: true },
      xAxis: { type: 'category', data: session.map(r => r.session), axisLabel: { color: cssVar('--color-text-faint', '#475569'), fontSize: 10, rotate: 30 }, axisLine: { lineStyle: { color: cssVar('--color-border', '#232742') } } },
      yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: cssVar('--color-border', '#232742'), type: 'dashed' } }, axisLabel: { color: cssVar('--color-text-faint', '#475569'), fontSize: 10 } },
      series: [{
        type: 'line',
        smooth: true,
        data: session.map(r => r.total),
        lineStyle: { color: accent, width: 2 },
        itemStyle: { color: accent },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: accent + '55' }, { offset: 1, color: accent + '00' }] } },
      }],
    };
  }, [session]);

  const dupOption = useMemo(() => {
    if (!dupStats.length) return null;
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['Flagged', 'Cleared', 'Unreviewed'], top: 0, textStyle: { color: cssVar('--color-text-muted', '#94a3b8') } },
      grid: { left: 16, right: 16, bottom: 24, top: 40, containLabel: true },
      xAxis: { type: 'category', data: dupStats.map(r => r.year), axisLabel: { color: cssVar('--color-text-faint', '#475569') }, axisLine: { lineStyle: { color: cssVar('--color-border', '#232742') } } },
      yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: cssVar('--color-border', '#232742'), type: 'dashed' } }, axisLabel: { color: cssVar('--color-text-faint', '#475569'), fontSize: 11 } },
      series: [
        { name: 'Flagged',    type: 'bar', stack: 'dup', data: dupStats.map(r => r.flagged    || 0), itemStyle: { color: '#ef4444', borderRadius: [0,0,0,0] } },
        { name: 'Cleared',    type: 'bar', stack: 'dup', data: dupStats.map(r => r.cleared    || 0), itemStyle: { color: '#10b981', borderRadius: [0,0,0,0] } },
        { name: 'Unreviewed', type: 'bar', stack: 'dup', data: dupStats.map(r => r.unreviewed || 0), itemStyle: { color: '#64748b', borderRadius: [4,4,0,0] } },
      ],
    };
  }, [dupStats]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <Topbar
        title="Analytics"
        subtitle="Year-wise, state-wise and research-area breakdowns"
        onRefresh={load}
      />

      {/* ── Scheme Filter ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {SCHEME_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setScheme(opt.value)}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
            style={{
              background: scheme === opt.value ? 'var(--color-accent)' : 'var(--color-surface-2)',
              color: scheme === opt.value ? '#fff' : 'var(--color-text-muted)',
              border: `1px solid ${scheme === opt.value ? 'var(--color-accent)' : 'var(--color-border)'}`,
            }}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={load}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all"
          style={{ background: 'var(--color-accent)', color: '#fff', opacity: isExporting ? 0.7 : 1 }}
        >
          <Download size={12} />
          {isExporting ? 'Exporting...' : 'Export PDF'}
        </button>
      </div>

      <div ref={dashboardRef} className="p-4 -mx-4 rounded-xl" style={{ background: 'var(--color-bg)' }}>
      {/* ── KPI Row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <KpiCard label="Total Proposals"  value={overview?.total}                color="#818cf8" icon={BarChart3} />
        <KpiCard label="SPARK"            value={overview?.by_scheme?.SPARK}      color="#3b82f6" icon={TrendingUp} />
        <KpiCard label="PG-STAR"          value={overview?.by_scheme?.['PG-STAR']}color="#f59e0b" icon={TrendingUp} />
        <KpiCard label="PDF-STAR"         value={overview?.by_scheme?.['PDF-STAR']}color="#10b981"icon={TrendingUp} />
        <KpiCard label="Flagged Dupl."    value={overview?.by_review?.flagged}    color="#ef4444" icon={ShieldAlert} sub="of checked proposals" />
        <KpiCard label="Cleared"          value={overview?.by_review?.cleared}    color="#10b981" icon={ShieldAlert} sub="passed review" />
      </div>

      {/* ── Status Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {['received','selected','awarded'].map(s => (
          <div key={s} className="rounded-2xl p-4 flex justify-between items-center"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <span className="text-xs font-medium capitalize" style={{ color: 'var(--color-text-muted)' }}>{s}</span>
            <span className="text-lg font-bold" style={{ color: s === 'awarded' ? '#10b981' : s === 'selected' ? '#f59e0b' : '#94a3b8' }}>
              {overview?.by_status?.[s] ?? '—'}
            </span>
          </div>
        ))}
      </div>

      {/* ── Charts Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Year-wise stacked bar */}
        <ChartPanel title="Year-wise Submissions (Stacked by Scheme)" icon={BarChart3} color="#818cf8" fullWidth>
          {loading ? <ChartLoading /> : yearlyOption
            ? <EChart getOption={() => yearlyOption} style={{ height: 280 }} />
            : <EmptyChart msg="No year data available" />
          }
        </ChartPanel>

        {/* State-wise horizontal bar */}
        <ChartPanel title="Top States by Submission Volume" icon={MapPin} color="#f472b6">
          {loading ? <ChartLoading /> : statewiseOption
            ? <EChart getOption={() => statewiseOption} style={{ height: 360 }} />
            : <EmptyChart msg="No state data available" />
          }
        </ChartPanel>

        {/* Research Area donut */}
        <ChartPanel title="Research Area Breakdown" icon={BookOpen} color="#f59e0b">
          {loading ? <ChartLoading /> : researchAreaOption
            ? <EChart getOption={() => researchAreaOption} style={{ height: 300 }} />
            : <EmptyChart msg="No research area data available" />
          }
        </ChartPanel>

        {/* Session trend line */}
        <ChartPanel title="Submissions by Academic Session" icon={Calendar} color="#34d399">
          {loading ? <ChartLoading /> : sessionOption
            ? <EChart getOption={() => sessionOption} style={{ height: 300 }} />
            : <EmptyChart msg="No session data available" />
          }
        </ChartPanel>

        {/* Duplicate Detection Funnel */}
        <ChartPanel title="Duplicate Review Outcome by Year" icon={ShieldAlert} color="#ef4444" fullWidth>
          {loading ? <ChartLoading /> : dupOption
            ? <EChart getOption={() => dupOption} style={{ height: 260 }} />
            : <EmptyChart msg="No checked proposals yet — run Duplicate Check first" />
          }
        </ChartPanel>

      </div>
      </div>
    </div>
  );
}

function EmptyChart({ msg }) {
  return (
    <div className="flex items-center justify-center h-48 rounded-xl"
      style={{ background: 'var(--color-surface-3)', border: '1px dashed var(--color-border)' }}>
      <span className="text-xs text-center max-w-xs" style={{ color: 'var(--color-text-faint)' }}>{msg}</span>
    </div>
  );
}
