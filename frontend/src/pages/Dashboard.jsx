import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, CheckCircle2, Award, Clock, TrendingUp, TrendingDown,
  BarChart2, Users, Minus, Plus, Eye, AlertTriangle, ArrowRight,
  Sparkles, Activity, Target, Layers,
} from 'lucide-react';
import Topbar from '../layout/Topbar';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import SchemeTag from '../components/SchemeTag';
import { SkeletonCard, SkeletonBlock } from '../components/LoadingSkeleton';
import EChart, { cssVar } from '../components/EChart';
import { proposalsApi, duplicateCheckApi } from '../api/duplicateCheck';

// ── Palette helper ──────────────────────────────────────────────────────────
function usePalette() {
  return useMemo(() => ({
    spark:      cssVar('--color-spark',       '#3b82f6'),
    pgstar:     cssVar('--color-pgstar',      '#f59e0b'),
    pdfstar:    cssVar('--color-pdfstar',     '#10b981'),
    received:   cssVar('--color-text-faint',  '#64748b'),
    selected:   cssVar('--color-warning',     '#f59e0b'),
    awarded:    cssVar('--color-success',     '#10b981'),
    danger:     cssVar('--color-danger',      '#ef4444'),
    accent:     cssVar('--color-accent',      '#818cf8'),
    accentFrom: cssVar('--color-accent-from', '#6366f1'),
    accentTo:   cssVar('--color-accent-to',   '#a855f7'),
    textPrimary:cssVar('--color-text-primary','#f8fafc'),
    textMuted:  cssVar('--color-text-muted',  '#94a3b8'),
    textFaint:  cssVar('--color-text-faint',  '#475569'),
    surface2:   cssVar('--color-surface-2',   '#111322'),
    surface3:   cssVar('--color-surface-3',   '#181a30'),
    border:     cssVar('--color-border',      '#232742'),
    borderSoft: cssVar('--color-border-soft', '#181a30'),
  }), []);
}

// ── Month helpers ───────────────────────────────────────────────────────────
function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function calcTrend(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Welcome Banner ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function WelcomeBanner({ totalProposals, loading }) {
  const navigate = useNavigate();
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-7 mb-6 animate-fade-in"
      style={{
        background: 'linear-gradient(135deg, var(--color-accent-from) 0%, var(--color-accent-to) 60%, #ec4899 100%)',
        boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
      }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full opacity-10"
        style={{ background: 'white', filter: 'blur(40px)' }} />
      <div className="absolute bottom-0 right-24 w-32 h-32 rounded-full opacity-10"
        style={{ background: 'white', filter: 'blur(30px)' }} />
      {/* Sparkle icon */}
      <div className="absolute top-5 right-6 opacity-20">
        <Sparkles size={80} color="white" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">👋</span>
          <h2 className="text-xl font-bold text-white">Hello, Admin</h2>
        </div>
        <p className="text-white/80 text-sm max-w-md mb-5 leading-relaxed">
          Welcome to <strong>CCRAS Unified Portal</strong>. Track proposals, monitor duplicate checks,
          and review submissions across SPARK, PG-STAR and PDF-STAR.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('proposals/new')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            <Plus size={15} /> New Proposal
          </button>
          <button
            onClick={() => navigate('duplicate-check')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.15)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <Activity size={15} /> Run Duplicate Check
          </button>
        </div>
      </div>

      {/* Right side stat pill */}
      <div
        className="absolute right-6 bottom-6 hidden lg:flex items-center gap-3 px-4 py-2.5 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}
      >
        <FileText size={18} color="white" />
        <div>
          <div className="text-white/60 text-[10px] font-medium uppercase tracking-wide">Total Proposals</div>
          <div className="text-white text-xl font-bold leading-none mt-0.5">
            {loading ? '—' : totalProposals}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Selected + Awarded split card (above monthly chart) ───────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function SelectedAwardedSplit({ selected, awarded, loading }) {
  return (
    <div
      className="flex divide-x mb-0"
      style={{ borderBottom: '1px solid var(--color-border-soft)', divideColor: 'var(--color-border-soft)' }}
    >
      {[
        { label: 'Selected', value: selected, color: 'var(--color-warning)', dot: '#f59e0b' },
        { label: 'Awarded',  value: awarded,  color: 'var(--color-success)', dot: '#10b981' },
      ].map(({ label, value, color, dot }) => (
        <div key={label} className="flex-1 px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
          </div>
          <div className="text-3xl font-bold" style={{ color }}>
            {loading ? <div className="skeleton h-7 w-14 rounded" /> : value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Scheme Donut Legend List ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function SchemeLegendList({ donutData, total }) {
  return (
    <div className="mt-2 space-y-2.5">
      {donutData.map(({ name, value, itemStyle }) => {
        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
        return (
          <div key={name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: itemStyle.color }} />
              <span className="font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{name}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-2">
              <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</span>
              <span className="w-10 text-right" style={{ color: 'var(--color-text-faint)' }}>{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Top States Ranked List ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function RankedStateList({ states, loading }) {
  if (loading) return (
    <div className="space-y-4">
      {Array(5).fill(0).map((_, i) => <div key={i} className="skeleton h-9 rounded-xl" />)}
    </div>
  );
  if (!states.length) return (
    <div className="text-sm text-center py-10" style={{ color: 'var(--color-text-faint)' }}>No state data yet.</div>
  );
  return (
    <div className="space-y-3.5">
      {states.map(({ state, count, pct }, i) => (
        <div key={state}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-md shrink-0"
                style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-faint)' }}
              >
                {i + 1}
              </span>
              <span className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                {state}
              </span>
            </div>
            <span className="text-xs font-bold shrink-0 ml-2" style={{ color: 'var(--color-accent)' }}>
              {count}
            </span>
          </div>
          <div className="progress-bar ml-7">
            <div
              className="progress-fill"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, var(--color-accent-from), var(--color-accent-to))`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Review Status Badge ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function ReviewBadge({ value }) {
  const cfg = {
    flagged:    { label: 'Flagged',    bg: 'var(--color-danger-soft)',   color: 'var(--color-danger)'  },
    cleared:    { label: 'Cleared',    bg: 'var(--color-success-soft)',  color: 'var(--color-success)' },
    unreviewed: { label: 'Pending',    bg: 'var(--color-warning-soft)',  color: 'var(--color-warning)' },
  };
  const c = cfg[value] || cfg.unreviewed;
  return (
    <span
      className="badge text-[10px]"
      style={{ background: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Similarity Score Indicator ────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function SimilarityBadge({ score }) {
  const pct = Math.round(score ?? 0);
  const color = pct >= 70 ? 'var(--color-danger)' : pct >= 40 ? 'var(--color-warning)' : 'var(--color-success)';
  const bg    = pct >= 70 ? 'var(--color-danger-soft)' : pct >= 40 ? 'var(--color-warning-soft)' : 'var(--color-success-soft)';
  return (
    <span className="badge font-bold" style={{ background: bg, color }}>{pct}%</span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Main Dashboard ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [proposals,  setProposals]  = useState([]);
  const [flagged,    setFlagged]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [flagLoading,setFlagLoading]= useState(true);
  const palette = usePalette();
  const navigate = useNavigate();

  // ── Data loading ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setFlagLoading(true);
    try {
      const [propRes, reviewRes] = await Promise.allSettled([
        proposalsApi.list({ page_size: 1000 }),
        duplicateCheckApi.reviewResults(),
      ]);
      if (propRes.status === 'fulfilled') {
        setProposals(propRes.value.data.results ?? []);
      }
      if (reviewRes.status === 'fulfilled') {
        // Extract high-risk matches from review results
        const results = reviewRes.value.data.results ?? [];
        const highRisk = [];
        results.forEach(proposal => {
          (proposal.similarity_matches ?? []).forEach(match => {
            if ((match.overall_score ?? 0) >= 40) {
              highRisk.push({ proposal, match });
            }
          });
        });
        setFlagged(highRisk.sort((a, b) => b.match.overall_score - a.match.overall_score).slice(0, 6));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setFlagLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const now        = new Date();
  const thisMonKey = getMonthKey(now);
  const lastMon    = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonKey = getMonthKey(lastMon);

  const stats = useMemo(() => {
    const total    = proposals.length;
    const received = proposals.filter(p => p.status === 'received').length;
    const selected = proposals.filter(p => p.status === 'selected').length;
    const awarded  = proposals.filter(p => p.status === 'awarded').length;

    const thisM = proposals.filter(p => p.created_at && getMonthKey(new Date(p.created_at)) === thisMonKey).length;
    const lastM = proposals.filter(p => p.created_at && getMonthKey(new Date(p.created_at)) === lastMonKey).length;
    const trend = calcTrend(thisM, lastM);

    return { total, received, selected, awarded, trend };
  }, [proposals, thisMonKey, lastMonKey]);

  // ── Scheme donut data ─────────────────────────────────────────────────────
  const schemeDonutData = useMemo(() => {
    return [
      { name: 'SPARK',    color: palette.spark   },
      { name: 'PG-STAR',  color: palette.pgstar  },
      { name: 'PDF-STAR', color: palette.pdfstar },
    ]
      .map(({ name, color }) => ({
        name,
        value: proposals.filter(p => p.scheme === name).length,
        itemStyle: { color },
      }))
      .filter(d => d.value > 0);
  }, [proposals, palette]);

  // ── Grouped bar data ──────────────────────────────────────────────────────
  const schemeBarData = useMemo(() => ['SPARK', 'PG-STAR', 'PDF-STAR'].map(scheme => {
    const sub = proposals.filter(p => p.scheme === scheme);
    return {
      scheme,
      received: sub.filter(p => p.status === 'received').length,
      selected: sub.filter(p => p.status === 'selected').length,
      awarded:  sub.filter(p => p.status === 'awarded').length,
    };
  }), [proposals]);

  // ── Monthly data ──────────────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const months = {};
    proposals.forEach(p => {
      if (!p.created_at) return;
      const d = new Date(p.created_at);
      const key   = getMonthKey(d);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!months[key]) months[key] = { month: label, count: 0, key };
      months[key].count++;
    });
    return Object.values(months).sort((a, b) => a.key.localeCompare(b.key)).slice(-12);
  }, [proposals]);

  // ── Top states ────────────────────────────────────────────────────────────
  const topStates = useMemo(() => {
    const map = {};
    proposals.forEach(p => { if (p.state) map[p.state] = (map[p.state] || 0) + 1; });
    const maxCount = Math.max(...Object.values(map), 1);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([state, count]) => ({ state, count, pct: Math.round((count / maxCount) * 100) }));
  }, [proposals]);

  // ── Recent proposals ──────────────────────────────────────────────────────
  const recentProposals = useMemo(() =>
    [...proposals].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8),
  [proposals]);

  // ── Trend per-stat-card ───────────────────────────────────────────────────
  const statCards = [
    {
      label: 'Total Proposals', value: stats.total, icon: Layers,
      color: palette.accent, subtitle: 'All schemes combined',
      trendValue: stats.trend, delay: 0,
    },
    {
      label: 'Received', value: stats.received, icon: Clock,
      color: palette.received, subtitle: 'Awaiting review',
      trendValue: null, delay: 60,
    },
    {
      label: 'Selected', value: stats.selected, icon: Target,
      color: palette.selected, subtitle: 'Under evaluation',
      trendValue: null, delay: 120,
    },
    {
      label: 'Awarded', value: stats.awarded, icon: Award,
      color: palette.awarded, subtitle: 'Funded proposals',
      trendValue: null, delay: 180,
    },
  ];

  // ── EChart option builders ────────────────────────────────────────────────
  const buildDonutOption = useCallback(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: palette.surface3,
      borderColor: palette.borderSoft,
      textStyle: { color: palette.textPrimary, fontSize: 12 },
      formatter: '{b}: <b>{c}</b> ({d}%)',
    },
    legend: { show: false },
    series: [{
      name: 'Proposals by Scheme',
      type: 'pie',
      radius: ['55%', '80%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: 'transparent', borderWidth: 3 },
      label: { show: false },
      emphasis: {
        itemStyle: { shadowBlur: 16, shadowColor: 'rgba(0,0,0,0.35)' },
        label: { show: true, formatter: '{d}%', fontSize: 13, fontWeight: 700, color: palette.textPrimary },
      },
      data: schemeDonutData.length
        ? schemeDonutData
        : [{ name: 'No data', value: 1, itemStyle: { color: palette.surface3 } }],
    }],
    graphic: {
      elements: [
        { type: 'text', left: 'center', top: '40%', style: { text: String(stats.total), fontSize: 28, fontWeight: 700, fill: palette.textPrimary } },
        { type: 'text', left: 'center', top: '52%', style: { text: 'Total', fontSize: 11, fill: palette.textFaint } },
      ],
    },
  }), [schemeDonutData, stats.total, palette]);

  const buildBarOption = useCallback(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: palette.surface3,
      borderColor: palette.borderSoft,
      textStyle: { color: palette.textPrimary, fontSize: 12 },
    },
    legend: { top: 0, right: 0, textStyle: { color: palette.textMuted, fontSize: 11 }, itemWidth: 10, itemHeight: 10, icon: 'circle' },
    grid: { left: 32, right: 12, top: 36, bottom: 24 },
    xAxis: {
      type: 'category',
      data: schemeBarData.map(d => d.scheme),
      axisLine: { lineStyle: { color: palette.border } },
      axisTick: { show: false },
      axisLabel: { color: palette.textFaint, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: palette.border, opacity: 0.4 } },
      axisLabel: { color: palette.textFaint, fontSize: 11 },
    },
    series: [
      { name: 'Received', type: 'bar', stack: 'total', barMaxWidth: 48, data: schemeBarData.map(d => d.received), itemStyle: { color: palette.received, borderRadius: [0, 0, 0, 0] } },
      { name: 'Selected', type: 'bar', stack: 'total', barMaxWidth: 48, data: schemeBarData.map(d => d.selected), itemStyle: { color: palette.selected } },
      { name: 'Awarded',  type: 'bar', stack: 'total', barMaxWidth: 48, data: schemeBarData.map(d => d.awarded),  itemStyle: { color: palette.awarded, borderRadius: [6, 6, 0, 0] } },
    ],
  }), [schemeBarData, palette]);

  const buildAreaOption = useCallback(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: palette.accent, type: 'dashed' } },
      backgroundColor: palette.surface3,
      borderColor: palette.borderSoft,
      textStyle: { color: palette.textPrimary, fontSize: 12 },
      formatter: params => {
        const p = params[0];
        return `${p.name}<br/><b>${p.value}</b> proposal${p.value === 1 ? '' : 's'}`;
      },
    },
    grid: { left: 36, right: 16, top: 16, bottom: 28 },
    xAxis: {
      type: 'category',
      data: monthlyData.map(d => d.month),
      axisLine: { lineStyle: { color: palette.border } },
      axisTick: { show: false },
      axisLabel: { color: palette.textFaint, fontSize: 10 },
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: palette.border, opacity: 0.35 } },
      axisLabel: { color: palette.textFaint, fontSize: 10 },
      minInterval: 1,
    },
    series: [{
      name: 'Proposals',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      data: monthlyData.map(d => d.count),
      lineStyle: { width: 2.5, color: palette.accentFrom },
      itemStyle: { color: palette.accentFrom, borderColor: palette.accentTo, borderWidth: 2 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: `${palette.accentFrom}50` },
            { offset: 1, color: `${palette.accentFrom}05` },
          ],
        },
      },
      emphasis: { itemStyle: { scale: 1.4 } },
    }],
  }), [monthlyData, palette]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <Topbar title="Dashboard" subtitle="Real-time research portal analytics" onRefresh={load} />

      {/* ── Welcome Banner ─────────────────────────────────────────────────── */}
      <WelcomeBanner totalProposals={stats.total} loading={loading} />

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {loading
          ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map(card => <StatCard key={card.label} {...card} />)
        }
      </div>

      {/* ── Row 2: Monthly Submissions (with Selected/Awarded) + Scheme Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

        {/* Monthly submissions card */}
        <div className="lg:col-span-2 card overflow-hidden">
          <SelectedAwardedSplit
            selected={stats.selected}
            awarded={stats.awarded}
            loading={loading}
          />
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Monthly Submissions
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Proposals submitted over the last 12 months
              </div>
            </div>
            <TrendingUp size={16} style={{ color: 'var(--color-success)' }} />
          </div>
          {loading ? (
            <div className="px-5 pb-5"><SkeletonBlock height="180px" /></div>
          ) : monthlyData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm" style={{ color: 'var(--color-text-faint)' }}>
              No timeline data available
            </div>
          ) : (
            <EChart getOption={buildAreaOption} style={{ height: 200 }} />
          )}
        </div>

        {/* Scheme Distribution Donut + legend list */}
        <div className="card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Scheme Distribution
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Share of total proposals
              </div>
            </div>
            <BarChart2 size={16} style={{ color: 'var(--color-accent)' }} />
          </div>

          {loading ? (
            <SkeletonBlock height="180px" />
          ) : (
            <>
              <EChart getOption={buildDonutOption} style={{ height: 180 }} />
              <div
                className="mt-3 pt-3"
                style={{ borderTop: '1px solid var(--color-border-soft)' }}
              >
                <SchemeLegendList donutData={schemeDonutData} total={stats.total} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Row 3: Scheme Bar Chart + Top States ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

        {/* Proposals by Scheme grouped bar */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Proposals by Scheme
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Status breakdown across SPARK, PG-STAR &amp; PDF-STAR
              </div>
            </div>
            <BarChart2 size={16} style={{ color: 'var(--color-accent)' }} />
          </div>
          {loading ? (
            <SkeletonBlock height="220px" />
          ) : proposals.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-sm" style={{ color: 'var(--color-text-faint)' }}>No data yet</div>
          ) : (
            <EChart getOption={buildBarOption} style={{ height: 220 }} />
          )}
        </div>

        {/* Top States ranked list */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Top States</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>By proposal count</div>
            </div>
            <Users size={15} style={{ color: 'var(--color-accent)' }} />
          </div>
          <RankedStateList states={topStates} loading={loading} />
        </div>
      </div>

      {/* ── Row 4: High-Risk Duplicate Matches ───────────────────────────────
      <div className="card overflow-hidden mb-4">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--color-border-soft)' }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} style={{ color: 'var(--color-danger)' }} />
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              High-Risk Duplicate Matches
            </div>
          </div>
          <button
            onClick={() => navigate('/duplicate-check')}
            className="flex items-center gap-1 text-xs font-medium transition-colors"
            style={{ color: 'var(--color-accent)' }}
          >
            View all <ArrowRight size={12} />
          </button>
        </div>

        {flagLoading ? (
          <div className="p-5 space-y-3">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="skeleton h-4 w-24 rounded" />
                <div className="skeleton h-4 flex-1 rounded" />
                <div className="skeleton h-4 w-16 rounded" />
                <div className="skeleton h-6 w-12 rounded-full" />
              </div>
            ))}
          </div>
        ) : flagged.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: 'var(--color-success)' }} />
            <div className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
              No high-risk duplicates found
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-faint)' }}>
              Run a duplicate check to see results here
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                  {['Proposal', 'Matched With', 'Scheme', 'Similarity', 'Review', 'Action'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold"
                      style={{ color: 'var(--color-text-faint)', background: 'var(--color-surface-2)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flagged.map(({ proposal, match }, i) => (
                  <tr
                    key={`${proposal.id}-${match.id || i}`}
                    className="animate-fade-in"
                    style={{
                      borderBottom: '1px solid var(--color-border-soft)',
                      animationDelay: `${i * 40}ms`,
                      animationFillMode: 'both',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="px-5 py-3">
                      <div className="font-mono text-xs font-bold" style={{ color: 'var(--color-accent)' }}>
                        {proposal.spark_id}
                      </div>
                      <div className="text-xs truncate max-w-[160px]" style={{ color: 'var(--color-text-muted)' }}>
                        {proposal.title?.slice(0, 40) ?? '—'}…
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-primary)' }}>
                      {match.matched_proposal?.student_name ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <SchemeTag scheme={proposal.scheme} small />
                    </td>
                    <td className="px-5 py-3">
                      <SimilarityBadge score={match.overall_score} />
                    </td>
                    <td className="px-5 py-3">
                      <ReviewBadge value={proposal.review_status} />
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => navigate('/p3/duplicate-check')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: 'var(--color-surface-3)',
                          color: 'var(--color-text-muted)',
                          border: '1px solid var(--color-border-soft)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'var(--color-accent-soft)';
                          e.currentTarget.style.color = 'var(--color-accent)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'var(--color-surface-3)';
                          e.currentTarget.style.color = 'var(--color-text-muted)';
                        }}
                      >
                        <Eye size={11} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div> */}

      {/* ── Row 5: Recent Proposals Table ──────────────────────────────────── */}
      <div className="card overflow-hidden mb-2">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--color-border-soft)' }}
        >
          <div className="flex items-center gap-2">
            <FileText size={16} style={{ color: 'var(--color-accent)' }} />
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Recent Proposals
            </div>
          </div>
          <button
            onClick={() => navigate('/p3/spark')}
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: 'var(--color-accent)' }}
          >
            View all <ArrowRight size={12} />
          </button>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="skeleton h-4 w-20 rounded" />
                <div className="skeleton h-4 flex-1 rounded" />
                <div className="skeleton h-4 w-16 rounded" />
                <div className="skeleton h-6 w-14 rounded-full" />
                <div className="skeleton h-7 w-14 rounded-lg" />
              </div>
            ))}
          </div>
        ) : recentProposals.length === 0 ? (
          <div className="p-10 text-center text-sm" style={{ color: 'var(--color-text-faint)' }}>
            No proposals yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                  {['Spark ID', 'Student', 'Title', 'Scheme', 'Status', 'Date', 'Action'].map(h => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold"
                      style={{ color: 'var(--color-text-faint)', background: 'var(--color-surface-2)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentProposals.map((p, i) => (
                  <tr
                    key={p.id}
                    className="animate-fade-in"
                    style={{
                      borderBottom: '1px solid var(--color-border-soft)',
                      animationDelay: `${i * 35}ms`,
                      animationFillMode: 'both',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold" style={{ color: 'var(--color-accent)' }}>
                        {p.spark_id}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {p.student_name}
                    </td>
                    <td className="px-5 py-3 max-w-xs">
                      <span className="line-clamp-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {p.title}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <SchemeTag scheme={p.scheme} small />
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge value={p.status} />
                    </td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-faint)' }}>
                      {p.created_at
                        ? new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                        : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => navigate(`/spark`)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: 'var(--color-surface-3)',
                          color: 'var(--color-text-muted)',
                          border: '1px solid var(--color-border-soft)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'var(--color-accent-soft)';
                          e.currentTarget.style.color = 'var(--color-accent)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'var(--color-surface-3)';
                          e.currentTarget.style.color = 'var(--color-text-muted)';
                        }}
                      >
                        <Eye size={11} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}