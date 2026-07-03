import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Topbar from '../layout/Topbar';
import { proposalsApi } from '../api/duplicateCheck';

const SCHEMES = ['SPARK', 'PG-STAR', 'PDF-STAR'];
const STATUSES = ['received', 'selected', 'awarded'];

export default function EditProposal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [newDocument, setNewDocument] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    proposalsApi.detail(id).then((res) => {
      const { document, extraction_status, review_status, created_at, updated_at, id: _id, ...rest } = res.data;
      setForm(rest);
    });
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val !== null && val !== '') data.append(key, val);
      });
      if (newDocument) data.append('document', newDocument);

      await proposalsApi.update(id, data);
      setFeedback({ type: 'success', text: 'Proposal updated.' });
      setTimeout(() => navigate(`/proposals/${id}`), 800);
    } catch {
      setFeedback({ type: 'error', text: 'Could not update proposal. Check the fields.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!form) return <div className="text-text-faint text-sm p-10 text-center">Loading...</div>;

  const inputClass = "w-full bg-surface-2 border border-border-soft rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-text-faint";
  const labelClass = "text-xs text-text-muted mb-1.5 block";

  return (
    <div>
      <Topbar title="Edit Proposal" subtitle={form.spark_id} />

      <form onSubmit={handleSubmit} className="max-w-3xl rounded-2xl bg-surface border border-border-soft p-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Spark ID</label>
            <input name="spark_id" value={form.spark_id} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Scheme</label>
            <select name="scheme" value={form.scheme} onChange={handleChange} className={inputClass}>
              {SCHEMES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input name="state" value={form.state} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Year</label>
            <input name="year" value={form.year} onChange={handleChange} required className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>College Name</label>
            <input name="college_name" value={form.college_name} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Student Name</label>
            <input name="student_name" value={form.student_name} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Guide Name</label>
            <input name="guide_name" value={form.guide_name} onChange={handleChange} required className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Topic / Project Title</label>
            <textarea name="title" value={form.title} onChange={handleChange} required rows={2} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Research Area</label>
            <input name="research_area" value={form.research_area} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
              {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Replace Document (optional — leave empty to keep existing)</label>
            <input type="file" accept="application/pdf" onChange={(e) => setNewDocument(e.target.files[0])} className={inputClass} />
          </div>
        </div>

        {feedback && (
          <div className={`text-sm rounded-xl px-3.5 py-2.5 mb-4 ${feedback.type === 'success' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
            {feedback.text}
          </div>
        )}

        <button type="submit" disabled={submitting} className="accent-gradient text-white text-sm font-medium px-5 py-2.5 rounded-xl disabled:opacity-60">
          {submitting ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}