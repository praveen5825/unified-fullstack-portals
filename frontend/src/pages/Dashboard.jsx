// import { useEffect, useState, useMemo } from 'react';
// import {
//   FileText, CheckCircle2, Award, Clock, TrendingUp, AlertTriangle, BarChart2, Users
// } from 'lucide-react';
// import {
//   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
//   PieChart, Pie, Cell, AreaChart, Area, Legend,
// } from 'recharts';
// import Topbar from '../layout/Topbar';
// import StatCard from '../components/StatCard';
// import StatusBadge from '../components/StatusBadge';
// import SchemeTag from '../components/SchemeTag';
// import { SkeletonCard, SkeletonBlock } from '../components/LoadingSkeleton';
// import { proposalsApi } from '../api/duplicateCheck';

// /* ─── Custom Recharts Tooltip ─── */
// function CustomTooltip({ active, payload, label }) {
//   if (!active || !payload?.length) return null;
//   return (
//     <div
//       className="rounded-xl px-3 py-2.5 text-xs shadow-lg"
//       style={{
//         background: 'var(--color-surface-3)',
//         border: '1px solid var(--color-border)',
//         color: 'var(--color-text-primary)',
//         minWidth: 120,
//       }}
//     >
//       {label && <div className="font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{label}</div>}
//       {payload.map((p) => (
//         <div key={p.name} className="flex items-center gap-2 py-0.5">
//           <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
//           <span style={{ color: 'var(--color-text-muted)' }}>{p.name}:</span>
//           <span className="font-semibold ml-auto pl-2">{p.value}</span>
//         </div>
//       ))}
//     </div>
//   );
// }

// /* ─── Donut Label ─── */
// function DonutLabel({ cx, cy, midAngle, outerRadius, percent, name }) {
//   if (percent < 0.05) return null;
//   const RADIAN = Math.PI / 180;
//   const radius = outerRadius + 24;
//   const x = cx + radius * Math.cos(-midAngle * RADIAN);
//   const y = cy + radius * Math.sin(-midAngle * RADIAN);
//   return (
//     <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"
//       style={{ fill: 'var(--color-text-muted)', fontSize: 11, fontWeight: 500 }}>
//       {`${(percent * 100).toFixed(0)}%`}
//     </text>
//   );
// }

// const SCHEME_COLORS = {
//   SPARK: 'var(--color-spark)',
//   'PG-STAR': 'var(--color-pgstar)',
//   'PDF-STAR': 'var(--color-pdfstar)',
// };

// const STATUS_COLORS = {
//   received: 'var(--color-text-faint)',
//   selected: 'var(--color-warning)',
//   awarded: 'var(--color-success)',
// };

// export default function Dashboard() {
//   const [proposals, setProposals] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const load = async () => {
//     setLoading(true);
//     try {
//       const res = await proposalsApi.list({ page_size: 1000 });
//       setProposals(res.data.results ?? []);
//     } catch {
//       setProposals([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { load(); }, []);

//   /* ─── Computed Stats ─── */
//   const stats = useMemo(() => ({
//     total: proposals.length,
//     received: proposals.filter((p) => p.status === 'received').length,
//     selected: proposals.filter((p) => p.status === 'selected').length,
//     awarded: proposals.filter((p) => p.status === 'awarded').length,
//   }), [proposals]);

//   /* ─── Scheme × Status Bar Chart ─── */
//   const schemeBarData = useMemo(() => {
//     const schemes = ['SPARK', 'PG-STAR', 'PDF-STAR'];
//     return schemes.map((scheme) => {
//       const sub = proposals.filter((p) => p.scheme === scheme);
//       return {
//         scheme: scheme.replace('-', '‑'),
//         Received: sub.filter((p) => p.status === 'received').length,
//         Selected: sub.filter((p) => p.status === 'selected').length,
//         Awarded: sub.filter((p) => p.status === 'awarded').length,
//         total: sub.length,
//       };
//     });
//   }, [proposals]);

//   /* ─── Status Pie ─── */
//   const statusPieData = useMemo(() => [
//     { name: 'Received', value: stats.received, color: 'var(--color-text-faint)' },
//     { name: 'Selected', value: stats.selected, color: 'var(--color-warning)' },
//     { name: 'Awarded', value: stats.awarded, color: 'var(--color-success)' },
//   ].filter((d) => d.value > 0), [stats]);

//   /* ─── Monthly Area Chart ─── */
//   const monthlyData = useMemo(() => {
//     const months = {};
//     proposals.forEach((p) => {
//       if (!p.created_at) return;
//       const d = new Date(p.created_at);
//       const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
//       const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
//       if (!months[key]) months[key] = { month: label, count: 0, key };
//       months[key].count++;
//     });
//     return Object.values(months)
//       .sort((a, b) => a.key.localeCompare(b.key))
//       .slice(-12);
//   }, [proposals]);

//   /* ─── Top States ─── */
//   const topStates = useMemo(() => {
//     const map = {};
//     proposals.forEach((p) => {
//       if (!p.state) return;
//       map[p.state] = (map[p.state] || 0) + 1;
//     });
//     return Object.entries(map)
//       .sort((a, b) => b[1] - a[1])
//       .slice(0, 6)
//       .map(([state, count]) => ({ state, count, pct: Math.round((count / proposals.length) * 100) }));
//   }, [proposals]);

//   /* ─── Recent Proposals ─── */
//   const recentProposals = useMemo(() =>
//     [...proposals].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6),
//   [proposals]);

//   const statCards = [
//     { label: 'Total Proposals', value: stats.total, icon: FileText, color: 'var(--color-accent)', subtitle: 'All schemes combined', trendValue: null, delay: 0 },
//     { label: 'Received', value: stats.received, icon: Clock, color: 'var(--color-text-faint)', subtitle: 'Awaiting review', trendValue: null, delay: 50 },
//     { label: 'Selected', value: stats.selected, icon: CheckCircle2, color: 'var(--color-warning)', subtitle: 'Under evaluation', trendValue: null, delay: 100 },
//     { label: 'Awarded', value: stats.awarded, icon: Award, color: 'var(--color-success)', subtitle: 'Funded proposals', trendValue: null, delay: 150 },
//   ];

//   return (
//     <div>
//       <Topbar title="Dashboard" subtitle="Real-time research portal analytics" onRefresh={load} />

//       {/* ─── Stat Cards ─── */}
//       <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
//         {loading
//           ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
//           : statCards.map((card) => (
//             <StatCard
//               key={card.label}
//               label={card.label}
//               value={card.value}
//               icon={card.icon}
//               color={card.color}
//               subtitle={card.subtitle}
//               trendValue={card.trendValue}
//               delay={card.delay}
//             />
//           ))
//         }
//       </div>

//       {/* ─── Charts Row 1 ─── */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
//         {/* Bar Chart: Scheme × Status */}
//         <div className="lg:col-span-2 card p-5">
//           <div className="flex items-center justify-between mb-4">
//             <div>
//               <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
//                 Proposals by Scheme
//               </div>
//               <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
//                 Status breakdown across SPARK, PG-STAR & PDF-STAR
//               </div>
//             </div>
//             <BarChart2 size={18} style={{ color: 'var(--color-accent)' }} />
//           </div>
//           {loading ? (
//             <SkeletonBlock height="220px" />
//           ) : proposals.length === 0 ? (
//             <div className="h-56 flex items-center justify-center text-sm" style={{ color: 'var(--color-text-faint)' }}>
//               No data yet
//             </div>
//           ) : (
//             <ResponsiveContainer width="100%" height={220}>
//               <BarChart data={schemeBarData} barCategoryGap="35%" barGap={2}>
//                 <CartesianGrid vertical={false} stroke="var(--color-border-soft)" strokeOpacity={0.5} />
//                 <XAxis dataKey="scheme" tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }} axisLine={false} tickLine={false} />
//                 <YAxis tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
//                 <Tooltip content={<CustomTooltip />} />
//                 <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)', paddingTop: 8 }} />
//                 <Bar dataKey="Received" fill="var(--color-text-faint)" radius={[4, 4, 0, 0]} />
//                 <Bar dataKey="Selected" fill="var(--color-warning)" radius={[4, 4, 0, 0]} />
//                 <Bar dataKey="Awarded" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
//               </BarChart>
//             </ResponsiveContainer>
//           )}
//         </div>

//         {/* Donut: Status Distribution */}
//         <div className="card p-5">
//           <div className="flex items-center justify-between mb-4">
//             <div>
//               <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
//                 Status Split
//               </div>
//               <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
//                 All proposals
//               </div>
//             </div>
//           </div>
//           {loading ? (
//             <SkeletonBlock height="220px" />
//           ) : statusPieData.length === 0 ? (
//             <div className="h-56 flex items-center justify-center text-sm" style={{ color: 'var(--color-text-faint)' }}>
//               No data yet
//             </div>
//           ) : (
//             <>
//               <ResponsiveContainer width="100%" height={180}>
//                 <PieChart>
//                   <Pie
//                     data={statusPieData}
//                     cx="50%"
//                     cy="50%"
//                     innerRadius={52}
//                     outerRadius={78}
//                     paddingAngle={3}
//                     dataKey="value"
//                     labelLine={false}
//                   >
//                     {statusPieData.map((entry, index) => (
//                       <Cell key={index} fill={entry.color} stroke="none" />
//                     ))}
//                   </Pie>
//                   <Tooltip content={<CustomTooltip />} />
//                 </PieChart>
//               </ResponsiveContainer>
//               <div className="space-y-2 mt-2">
//                 {statusPieData.map((item) => (
//                   <div key={item.name} className="flex items-center justify-between text-xs">
//                     <div className="flex items-center gap-2">
//                       <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
//                       <span style={{ color: 'var(--color-text-muted)' }}>{item.name}</span>
//                     </div>
//                     <div className="flex items-center gap-2">
//                       <div className="progress-bar w-16">
//                         <div className="progress-fill" style={{ width: `${(item.value / stats.total) * 100}%`, background: item.color }} />
//                       </div>
//                       <span className="font-semibold w-6 text-right" style={{ color: 'var(--color-text-primary)' }}>{item.value}</span>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </>
//           )}
//         </div>
//       </div>

//       {/* ─── Charts Row 2 ─── */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
//         {/* Area Chart: Monthly Submissions */}
//         <div className="lg:col-span-2 card p-5">
//           <div className="flex items-center justify-between mb-4">
//             <div>
//               <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
//                 Monthly Submissions
//               </div>
//               <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
//                 Proposals submitted over the last 12 months
//               </div>
//             </div>
//             <TrendingUp size={18} style={{ color: 'var(--color-success)' }} />
//           </div>
//           {loading ? (
//             <SkeletonBlock height="180px" />
//           ) : monthlyData.length === 0 ? (
//             <div className="h-44 flex items-center justify-center text-sm" style={{ color: 'var(--color-text-faint)' }}>
//               No timeline data available
//             </div>
//           ) : (
//             <ResponsiveContainer width="100%" height={180}>
//               <AreaChart data={monthlyData}>
//                 <defs>
//                   <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
//                     <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.25} />
//                     <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
//                   </linearGradient>
//                 </defs>
//                 <CartesianGrid vertical={false} stroke="var(--color-border-soft)" strokeOpacity={0.5} />
//                 <XAxis dataKey="month" tick={{ fill: 'var(--color-text-faint)', fontSize: 10 }} axisLine={false} tickLine={false} />
//                 <YAxis tick={{ fill: 'var(--color-text-faint)', fontSize: 10 }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
//                 <Tooltip content={<CustomTooltip />} />
//                 <Area
//                   type="monotone"
//                   dataKey="count"
//                   name="Proposals"
//                   stroke="var(--color-accent)"
//                   strokeWidth={2.5}
//                   fill="url(#areaGradient)"
//                   dot={{ fill: 'var(--color-accent)', r: 3, strokeWidth: 0 }}
//                   activeDot={{ r: 5, fill: 'var(--color-accent)', stroke: 'white', strokeWidth: 2 }}
//                 />
//               </AreaChart>
//             </ResponsiveContainer>
//           )}
//         </div>

//         {/* Top States */}
//         <div className="card p-5">
//           <div className="flex items-center justify-between mb-4">
//             <div>
//               <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Top States</div>
//               <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>By proposal count</div>
//             </div>
//             <Users size={16} style={{ color: 'var(--color-accent)' }} />
//           </div>
//           {loading ? (
//             <div className="space-y-3">
//               {Array(5).fill(0).map((_, i) => (
//                 <div key={i} className="skeleton h-8 rounded" />
//               ))}
//             </div>
//           ) : topStates.length === 0 ? (
//             <div className="text-sm text-center py-8" style={{ color: 'var(--color-text-faint)' }}>No data</div>
//           ) : (
//             <div className="space-y-3">
//               {topStates.map(({ state, count, pct }, i) => (
//                 <div key={state}>
//                   <div className="flex items-center justify-between text-xs mb-1">
//                     <div className="flex items-center gap-1.5">
//                       <span className="font-medium w-4 text-center" style={{ color: 'var(--color-text-faint)' }}>{i + 1}</span>
//                       <span className="truncate max-w-[100px]" style={{ color: 'var(--color-text-primary)' }}>{state}</span>
//                     </div>
//                     <span className="font-semibold" style={{ color: 'var(--color-accent)' }}>{count}</span>
//                   </div>
//                   <div className="progress-bar ml-6">
//                     <div
//                       className="progress-fill"
//                       style={{
//                         width: `${pct}%`,
//                         background: `linear-gradient(90deg, var(--color-accent-from), var(--color-accent-to))`,
//                       }}
//                     />
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* ─── Recent Proposals ─── */}
//       <div className="card overflow-hidden">
//         <div
//           className="flex items-center justify-between px-5 py-4"
//           style={{ borderBottom: '1px solid var(--color-border-soft)' }}
//         >
//           <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
//             Recent Proposals
//           </div>
//           <a href="/spark" className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
//             View all →
//           </a>
//         </div>
//         {loading ? (
//           <div className="p-5 space-y-3">
//             {Array(4).fill(0).map((_, i) => (
//               <div key={i} className="flex gap-3">
//                 <div className="skeleton h-4 w-20 rounded" />
//                 <div className="skeleton h-4 flex-1 rounded" />
//                 <div className="skeleton h-4 w-16 rounded" />
//               </div>
//             ))}
//           </div>
//         ) : recentProposals.length === 0 ? (
//           <div className="p-10 text-center text-sm" style={{ color: 'var(--color-text-faint)' }}>
//             No proposals yet.
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm">
//               <thead>
//                 <tr style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
//                   {['Spark ID', 'Student', 'Title', 'Scheme', 'Status', 'Date'].map((h) => (
//                     <th key={h} className="px-5 py-3 text-left font-medium text-xs" style={{ color: 'var(--color-text-faint)' }}>
//                       {h}
//                     </th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {recentProposals.map((p, i) => (
//                   <tr
//                     key={p.id}
//                     className="animate-fade-in"
//                     style={{
//                       borderBottom: '1px solid var(--color-border-soft)',
//                       animationDelay: `${i * 40}ms`,
//                       animationFillMode: 'both',
//                     }}
//                     onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
//                     onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
//                   >
//                     <td className="px-5 py-3 font-mono text-xs font-medium whitespace-nowrap" style={{ color: 'var(--color-accent)' }}>
//                       {p.spark_id}
//                     </td>
//                     <td className="px-5 py-3 whitespace-nowrap" style={{ color: 'var(--color-text-primary)' }}>
//                       {p.student_name}
//                     </td>
//                     <td className="px-5 py-3 max-w-xs">
//                       <span className="line-clamp-1" style={{ color: 'var(--color-text-muted)' }}>{p.title}</span>
//                     </td>
//                     <td className="px-5 py-3">
//                       <SchemeTag scheme={p.scheme} small />
//                     </td>
//                     <td className="px-5 py-3">
//                       <StatusBadge value={p.status} />
//                     </td>
//                     <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-faint)' }}>
//                       {p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

import { useEffect, useState, useMemo } from 'react';
import {
  FileText, CheckCircle2, Award, Clock, TrendingUp, BarChart2, Users
} from 'lucide-react';
import Topbar from '../layout/Topbar';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import SchemeTag from '../components/SchemeTag';
import { SkeletonCard, SkeletonBlock } from '../components/LoadingSkeleton';
import EChart, { cssVar } from '../components/EChart';
import { proposalsApi } from '../api/duplicateCheck';

function usePalette() {
  return useMemo(() => ({
    spark: cssVar('--color-spark', '#6366f1'),
    pgstar: cssVar('--color-pgstar', '#10b981'),
    pdfstar: cssVar('--color-pdfstar', '#f59e0b'),
    received: cssVar('--color-text-faint', '#64748b'),
    selected: cssVar('--color-warning', '#eab308'),
    awarded: cssVar('--color-success', '#22c55e'),
    accent: cssVar('--color-accent', '#a855f7'),
    accentFrom: cssVar('--color-accent-from', '#8b5cf6'),
    accentTo: cssVar('--color-accent-to', '#d946ef'),
    textPrimary: cssVar('--color-text-primary', '#f2f2f6'),
    textMuted: cssVar('--color-text-muted', '#8b8fa3'),
    textFaint: cssVar('--color-text-faint', '#5c5f78'),
    surface3: cssVar('--color-surface-3', '#1f2136'),
    border: cssVar('--color-border', '#23253a'),
  }), []);
}

export default function Dashboard() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const palette = usePalette();

  const load = async () => {
    setLoading(true);
    try {
      const res = await proposalsApi.list({ page_size: 1000 });
      setProposals(res.data.results ?? []);
    } catch {
      setProposals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total: proposals.length,
    received: proposals.filter((p) => p.status === 'received').length,
    selected: proposals.filter((p) => p.status === 'selected').length,
    awarded: proposals.filter((p) => p.status === 'awarded').length,
  }), [proposals]);

  const schemeDonutData = useMemo(() => {
    const schemes = [
      { key: 'SPARK', color: palette.spark },
      { key: 'PG-STAR', color: palette.pgstar },
      { key: 'PDF-STAR', color: palette.pdfstar },
    ];
    return schemes
      .map(({ key, color }) => ({
        name: key,
        value: proposals.filter((p) => p.scheme === key).length,
        itemStyle: { color },
      }))
      .filter((d) => d.value > 0);
  }, [proposals, palette]);

  const schemeBarData = useMemo(() => {
    const schemes = ['SPARK', 'PG-STAR', 'PDF-STAR'];
    return schemes.map((scheme) => {
      const sub = proposals.filter((p) => p.scheme === scheme);
      return {
        scheme,
        received: sub.filter((p) => p.status === 'received').length,
        selected: sub.filter((p) => p.status === 'selected').length,
        awarded: sub.filter((p) => p.status === 'awarded').length,
      };
    });
  }, [proposals]);

  const monthlyData = useMemo(() => {
    const months = {};
    proposals.forEach((p) => {
      if (!p.created_at) return;
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!months[key]) months[key] = { month: label, count: 0, key };
      months[key].count++;
    });
    return Object.values(months).sort((a, b) => a.key.localeCompare(b.key)).slice(-12);
  }, [proposals]);

  const topStates = useMemo(() => {
    const map = {};
    proposals.forEach((p) => {
      if (!p.state) return;
      map[p.state] = (map[p.state] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([state, count]) => ({ state, count, pct: Math.round((count / proposals.length) * 100) }));
  }, [proposals]);

  const recentProposals = useMemo(() =>
    [...proposals].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6),
  [proposals]);

  const statCards = [
    { label: 'Total Proposals', value: stats.total, icon: FileText, color: palette.accent, subtitle: 'All schemes combined' },
    { label: 'Received', value: stats.received, icon: Clock, color: palette.received, subtitle: 'Awaiting review' },
    { label: 'Selected', value: stats.selected, icon: CheckCircle2, color: palette.selected, subtitle: 'Under evaluation' },
    { label: 'Awarded', value: stats.awarded, icon: Award, color: palette.awarded, subtitle: 'Funded proposals' },
  ];

  const buildSchemeDonutOption = () => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: palette.surface3,
      borderColor: palette.border,
      textStyle: { color: palette.textPrimary, fontSize: 12 },
      formatter: '{b}: <b>{c}</b> ({d}%)',
    },
    legend: {
      bottom: 0,
      textStyle: { color: palette.textMuted, fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
      icon: 'circle',
    },
    series: [{
      name: 'Proposals by Scheme',
      type: 'pie',
      radius: ['52%', '78%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: 'transparent', borderWidth: 2 },
      label: { show: true, formatter: '{d}%', color: palette.textMuted, fontSize: 11, fontWeight: 500 },
      labelLine: { length: 10, length2: 8, lineStyle: { color: palette.border } },
      emphasis: {
        itemStyle: { shadowBlur: 16, shadowColor: 'rgba(0,0,0,0.35)' },
        label: { fontSize: 13, fontWeight: 700 },
      },
      data: schemeDonutData.length ? schemeDonutData : [{ name: 'No data', value: 1, itemStyle: { color: palette.surface3 } }],
    }],
    graphic: {
      elements: [
        { type: 'text', left: 'center', top: '38%', style: { text: String(stats.total), fontSize: 26, fontWeight: 700, fill: palette.textPrimary } },
        { type: 'text', left: 'center', top: '48%', style: { text: 'Total', fontSize: 11, fill: palette.textFaint } },
      ],
    },
  });

  const buildBarOption = () => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: palette.surface3,
      borderColor: palette.border,
      textStyle: { color: palette.textPrimary, fontSize: 12 },
    },
    legend: { top: 0, right: 0, textStyle: { color: palette.textMuted, fontSize: 11 }, itemWidth: 10, itemHeight: 10, icon: 'circle' },
    grid: { left: 32, right: 12, top: 32, bottom: 24 },
    xAxis: {
      type: 'category',
      data: schemeBarData.map((d) => d.scheme),
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
      { name: 'Received', type: 'bar', stack: 'total', data: schemeBarData.map((d) => d.received), itemStyle: { color: palette.received } },
      { name: 'Selected', type: 'bar', stack: 'total', data: schemeBarData.map((d) => d.selected), itemStyle: { color: palette.selected } },
      { name: 'Awarded', type: 'bar', stack: 'total', data: schemeBarData.map((d) => d.awarded), itemStyle: { color: palette.awarded, borderRadius: [6, 6, 0, 0] } },
    ],
  });

  const buildAreaOption = () => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow', shadowStyle: { color: `${palette.accent}14` } },
    backgroundColor: palette.surface3,
    borderColor: palette.border,
    textStyle: { color: palette.textPrimary, fontSize: 12 },
    formatter: (params) => {
      const p = params[0];
      return `${p.name}<br/><b>${p.value}</b> proposal${p.value === 1 ? '' : 's'} submitted`;
    },
  },
  grid: { left: 28, right: 16, top: 24, bottom: 24 },
  xAxis: {
    type: 'category',
    data: monthlyData.map((d) => d.month),
    axisLine: { lineStyle: { color: palette.border } },
    axisTick: { show: false },
    axisLabel: { color: palette.textFaint, fontSize: 10 },
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: palette.border, opacity: 0.4 } },
    axisLabel: { color: palette.textFaint, fontSize: 10 },
    minInterval: 1,
  },
  series: [{
    name: 'Proposals',
    type: 'bar',
    barMaxWidth: 40,
    barMinWidth: 18,
    data: monthlyData.map((d) => d.count),
    itemStyle: {
      borderRadius: [8, 8, 0, 0],
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: palette.accentFrom },
          { offset: 1, color: palette.accentTo },
        ],
      },
    },
    label: {
      show: true,
      position: 'top',
      color: palette.textPrimary,
      fontSize: 12,
      fontWeight: 600,
    },
    emphasis: {
      itemStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: palette.accentTo },
            { offset: 1, color: palette.accentFrom },
          ],
        },
      },
    },
  }],
});

  return (
    <div>
      <Topbar title="Dashboard" subtitle="Real-time research portal analytics" onRefresh={load} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {loading
          ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((card) => <StatCard key={card.label} {...card} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Proposals by Scheme</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Status breakdown across SPARK, PG-STAR & PDF-STAR</div>
            </div>
            <BarChart2 size={18} style={{ color: 'var(--color-accent)' }} />
          </div>
          {loading ? (
            <SkeletonBlock height="240px" />
          ) : proposals.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm" style={{ color: 'var(--color-text-faint)' }}>No data yet</div>
          ) : (
            <EChart getOption={buildBarOption} style={{ height: 240 }} />
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Scheme Distribution</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Share of total proposals</div>
            </div>
          </div>
          {loading ? <SkeletonBlock height="240px" /> : <EChart getOption={buildSchemeDonutOption} style={{ height: 240 }} />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Monthly Submissions</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Proposals submitted over the last 12 months</div>
            </div>
            <TrendingUp size={18} style={{ color: 'var(--color-success)' }} />
          </div>
          {loading ? (
            <SkeletonBlock height="200px" />
          ) : monthlyData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm" style={{ color: 'var(--color-text-faint)' }}>No timeline data available</div>
          ) : (
            <EChart getOption={buildAreaOption} style={{ height: 200 }} />
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Top States</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>By proposal count</div>
            </div>
            <Users size={16} style={{ color: 'var(--color-accent)' }} />
          </div>
          {loading ? (
            <div className="space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="skeleton h-8 rounded" />)}</div>
          ) : topStates.length === 0 ? (
            <div className="text-sm text-center py-8" style={{ color: 'var(--color-text-faint)' }}>No data</div>
          ) : (
            <div className="space-y-3">
              {topStates.map(({ state, count, pct }, i) => (
                <div key={state}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium w-4 text-center" style={{ color: 'var(--color-text-faint)' }}>{i + 1}</span>
                      <span className="truncate max-w-[100px]" style={{ color: 'var(--color-text-primary)' }}>{state}</span>
                    </div>
                    <span className="font-semibold" style={{ color: 'var(--color-accent)' }}>{count}</span>
                  </div>
                  <div className="progress-bar ml-6">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, var(--color-accent-from), var(--color-accent-to))` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
          <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Recent Proposals</div>
          <a href="/spark" className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>View all →</a>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="skeleton h-4 w-20 rounded" />
                <div className="skeleton h-4 flex-1 rounded" />
                <div className="skeleton h-4 w-16 rounded" />
              </div>
            ))}
          </div>
        ) : recentProposals.length === 0 ? (
          <div className="p-10 text-center text-sm" style={{ color: 'var(--color-text-faint)' }}>No proposals yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                  {['Spark ID', 'Student', 'Title', 'Scheme', 'Status', 'Date'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left font-medium text-xs" style={{ color: 'var(--color-text-faint)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentProposals.map((p, i) => (
                  <tr
                    key={p.id}
                    className="animate-fade-in"
                    style={{ borderBottom: '1px solid var(--color-border-soft)', animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="px-5 py-3 font-mono text-xs font-medium whitespace-nowrap" style={{ color: 'var(--color-accent)' }}>{p.spark_id}</td>
                    <td className="px-5 py-3 whitespace-nowrap" style={{ color: 'var(--color-text-primary)' }}>{p.student_name}</td>
                    <td className="px-5 py-3 max-w-xs"><span className="line-clamp-1" style={{ color: 'var(--color-text-muted)' }}>{p.title}</span></td>
                    <td className="px-5 py-3"><SchemeTag scheme={p.scheme} small /></td>
                    <td className="px-5 py-3"><StatusBadge value={p.status} /></td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-faint)' }}>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
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