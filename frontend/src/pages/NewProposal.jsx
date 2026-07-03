import { useState } from 'react';
import Topbar from '../layout/Topbar';
import { proposalsApi } from '../api/duplicateCheck';

const SCHEMES = ['SPARK', 'PG-STAR', 'PDF-STAR'];
const STATUSES = ['received', 'selected', 'awarded'];

const emptyForm = {
  spark_id: '', scheme: 'SPARK', state: '', college_name: '', guide_name: '',
  student_name: '', year: '', title: '', research_area: '', status: 'received', document: null,
};

export default function NewProposal() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm((prev) => ({ ...prev, [name]: files ? files[0] : value }));
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
      // Plain save -- no extraction/matching triggered here by design.
      await proposalsApi.create(data);
      setFeedback({ type: 'success', text: 'Proposal saved. It now appears in the Duplicate Check pending queue.' });
      setForm(emptyForm);
    } catch (err) {
      setFeedback({ type: 'error', text: 'Could not save proposal. Check the fields and try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full bg-surface-2 border border-border-soft rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-text-faint";
  const labelClass = "text-xs text-text-muted mb-1.5 block";

  return (
    <div>
      <Topbar title="New Proposal" subtitle="Add a research proposal record" />

      <form onSubmit={handleSubmit} className="max-w-3xl rounded-2xl bg-surface border border-border-soft p-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Spark ID</label>
            <input name="spark_id" value={form.spark_id} onChange={handleChange} required className={inputClass} placeholder="e.g. 2546/168" />
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
            <input name="year" value={form.year} onChange={handleChange} required className={inputClass} placeholder="e.g. 3rd year" />
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
            <label className={labelClass}>Proposal Document (PDF)</label>
            <input type="file" name="document" accept="application/pdf" onChange={handleChange} className={inputClass} />
          </div>
        </div>

        {feedback && (
          <div className={`text-sm rounded-xl px-3.5 py-2.5 mb-4 ${feedback.type === 'success' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
            {feedback.text}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="accent-gradient text-white text-sm font-medium px-5 py-2.5 rounded-xl disabled:opacity-60"
        >
          {submitting ? 'Saving...' : 'Save Proposal'}
        </button>
      </form>
    </div>
  );
}
