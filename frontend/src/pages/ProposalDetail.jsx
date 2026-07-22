import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, FileText, ExternalLink, Calendar, MapPin, User, GraduationCap, Library, Hash, Loader2, BookOpen, FlaskConical } from 'lucide-react';
import { confirmAction } from '../utils/confirmToast';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

import Topbar from '../layout/Topbar';
import StatusBadge from '../components/StatusBadge';
import SchemeTag from '../components/SchemeTag';
import { proposalsApi } from '../api/duplicateCheck';
import client from '../api/client';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const FIELD_GROUPS = [
  {
    title: 'Identification',
    icon: Hash,
    fields: [
      { key: 'spark_id', label: 'Spark ID' },
      { key: 'scheme', label: 'Scheme', isTag: true },
      { key: 'session', label: 'Session' },
      { key: 'year', label: 'Batch / Year' },
    ]
  },
  {
    title: 'Researcher',
    icon: User,
    fields: [
      { key: 'student_name', label: 'Student Name' },
      { key: 'guide_name', label: 'Guide / Mentor' },
    ]
  },
  {
    title: 'Institution',
    icon: Library,
    fields: [
      { key: 'college_name', label: 'College Name' },
      { key: 'state', label: 'State / UT' },
    ]
  }
];

export default function ProposalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await proposalsApi.detail(id);
      setProposal(res.data);
    } catch {
      setProposal(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleDelete = async () => {
    const confirmed = await confirmAction('Delete this proposal? This cannot be undone.', 'Delete');
    if (!confirmed) return;
    await proposalsApi.delete(id).catch(() => {});
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="flex justify-between mb-8">
          <div className="skeleton h-8 w-24 rounded" />
          <div className="skeleton h-8 w-48 rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 skeleton h-[500px] rounded-2xl" />
          <div className="skeleton h-[500px] rounded-2xl" />
        </div>
      </div>
    );
  }
  if (!proposal) {
    return (
      <div className="card p-16 text-center">
        <div className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Proposal not found</div>
        <div className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>The proposal might have been deleted or the ID is incorrect.</div>
        <button onClick={() => navigate(-1)} className="btn btn-primary mt-6">Go Back</button>
      </div>
    );
  }

  const baseUrl = client.defaults.baseURL?.replace(/\/api$/, '') || 'http://localhost:8000';

  const resolveUrl = (path) => {
    if (!path) return null;
    return path.startsWith('http') ? path : `${baseUrl}${path}`;
  };

  const pdfUrl = resolveUrl(proposal.document);
  const finalReportUrl = resolveUrl(proposal.final_report);

  return (
    <div>
      {/* ─── Topbar Actions ─── */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="btn btn-ghost text-xs rounded-xl">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-2">
          <Link to={`/proposals/${id}/edit`} className="btn btn-ghost text-xs rounded-xl">
            <Pencil size={14} /> Edit
          </Link>
          <button onClick={handleDelete} className="btn btn-danger text-xs rounded-xl">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Main Details ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="card p-6 animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-5 pointer-events-none" style={{ background: 'var(--color-accent)' }} />
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className="flex gap-2 mb-3">
                <SchemeTag scheme={proposal.scheme} />
                <StatusBadge value={proposal.status} />
              </div>
              <div className="text-xs font-mono px-2.5 py-1 rounded-md" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-soft)' }}>
                ID: {proposal.spark_id}
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
              {proposal.title || <span style={{ color: 'var(--color-text-faint)' }}>No title provided</span>}
            </h1>
            {proposal.research_area && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-primary)' }}>
                <FlaskConical size={13} style={{ color: 'var(--color-text-muted)' }} /> {proposal.research_area}
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FIELD_GROUPS.map((group, idx) => (
              <div key={group.title} className="card p-5 animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                  <group.icon size={15} style={{ color: 'var(--color-accent)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{group.title}</span>
                </div>
                <div className="space-y-4">
                  {group.fields.map(({ key, label, isTag }) => (
                    <div key={key}>
                      <div className="text-xs mb-1 font-medium" style={{ color: 'var(--color-text-faint)' }}>{label}</div>
                      {isTag ? (
                        <SchemeTag scheme={proposal[key]} small />
                      ) : (
                        <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {proposal[key] || '—'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Documents Sidebar ─── */}
        <div className="space-y-4">
          {/* Proposal Document */}
          <div className="card p-5 animate-slide-in-left sticky top-6">
            <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
              <div className="flex items-center gap-2">
                <FileText size={16} style={{ color: 'var(--color-accent)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Synopsis Document</span>
              </div>
            </div>

            {pdfUrl ? (
              <>
                <div
                  className="rounded-xl overflow-hidden mb-4 bg-surface-2 relative group flex items-start justify-center p-2"
                  style={{ height: 300, border: '1px solid var(--color-border-soft)', overflowY: 'auto', background: 'rgba(0,0,0,0.03)' }}
                >
                  <Document
                    file={pdfUrl}
                    loading={<div className="flex flex-col items-center justify-center h-full text-muted mt-20"><Loader2 className="animate-spin mb-2" size={24} /></div>}
                    error={<div className="text-xs text-danger text-center mt-20 px-4">Could not load preview.</div>}
                  >
                    <div className="shadow-lg" style={{ maxWidth: '100%' }}>
                      <Page pageNumber={1} width={260} renderTextLayer={false} renderAnnotationLayer={false} />
                    </div>
                  </Document>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="text-white text-xs font-medium px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">Preview (Page 1)</span>
                  </div>
                </div>
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full justify-center">
                  <ExternalLink size={14} /> Open Full PDF
                </a>
              </>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center rounded-xl mb-4" style={{ background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)' }}>
                <FileText size={24} style={{ color: 'var(--color-text-faint)' }} className="mb-2" />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No document uploaded</span>
              </div>
            )}

            <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--color-border-soft)' }}>
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-faint)' }}>Text Extraction Status</div>
              <StatusBadge value={proposal.extraction_status} />
            </div>
          </div>

          {/* Final Report */}
          <div className="card p-5 animate-slide-in-left" style={{ animationDelay: '80ms' }}>
            <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
              <BookOpen size={16} style={{ color: 'var(--color-success)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Final Report</span>
            </div>

            {finalReportUrl ? (
              <a
                href={finalReportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)', border: '1px solid var(--color-success)' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <ExternalLink size={16} />
                <div>
                  <div className="text-sm font-semibold">Open Final Report</div>
                  <div className="text-xs opacity-70">Click to view PDF</div>
                </div>
              </a>
            ) : (
              <div className="h-24 flex flex-col items-center justify-center rounded-xl" style={{ background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)' }}>
                <BookOpen size={20} style={{ color: 'var(--color-text-faint)' }} className="mb-1" />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No final report uploaded</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}