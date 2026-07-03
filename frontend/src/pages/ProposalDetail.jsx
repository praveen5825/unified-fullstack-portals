import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, FileText, ExternalLink } from 'lucide-react';
import Topbar from '../layout/Topbar';
import StatusBadge from '../components/StatusBadge';
import { proposalsApi } from '../api/duplicateCheck';

const FIELD_ROWS = [
  ['spark_id', 'Spark ID'],
  ['scheme', 'Scheme'],
  ['status', 'Status'],
  ['state', 'State'],
  ['year', 'Year'],
  ['college_name', 'College Name'],
  ['guide_name', 'Guide Name'],
  ['student_name', 'Student Name'],
  ['research_area', 'Research Area'],
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
    if (!window.confirm('Delete this proposal? This cannot be undone.')) return;
    await proposalsApi.delete(id).catch(() => {});
    navigate(-1);
  };

  if (loading) {
    return <div className="text-text-faint text-sm p-10 text-center">Loading...</div>;
  }
  if (!proposal) {
    return <div className="text-text-faint text-sm p-10 text-center">Proposal not found.</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex items-center gap-2">
          <Link
            to={`/proposals/${id}/edit`}
            className="flex items-center gap-1.5 text-sm bg-surface-2 border border-border-soft px-3.5 py-2 rounded-xl hover:bg-surface-3"
          >
            <Pencil size={14} /> Edit
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-sm bg-danger-soft text-danger px-3.5 py-2 rounded-xl hover:opacity-80"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-surface border border-border-soft p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs text-text-faint mb-1">{proposal.spark_id} · {proposal.scheme}</div>
              <h1 className="text-xl font-semibold">{proposal.title}</h1>
            </div>
            <StatusBadge value={proposal.status} />
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-6">
            {FIELD_ROWS.map(([key, label]) => (
              <div key={key}>
                <div className="text-xs text-text-faint mb-1">{label}</div>
                <div className="text-sm capitalize">{proposal[key] || '—'}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-surface border border-border-soft p-6">
          <div className="text-sm font-semibold mb-4 flex items-center gap-2">
            <FileText size={15} className="text-accent" /> Synopsis Document
          </div>

          {proposal.document ? (
            <>
              <div className="rounded-xl overflow-hidden border border-border-soft mb-3 bg-surface-2" style={{ height: 420 }}>
                <iframe src={proposal.document} title="Synopsis" className="w-full h-full" />
              </div>
              <a
                href={proposal.document}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-sm bg-surface-2 border border-border-soft px-3.5 py-2 rounded-xl hover:bg-surface-3"
              >
                <ExternalLink size={14} /> Open in new tab
              </a>
            </>
          ) : (
            <div className="text-sm text-text-faint">No document uploaded.</div>
          )}

          <div className="mt-4 text-xs text-text-faint">
            Extraction status: <span className="text-text-muted capitalize">{proposal.extraction_status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}