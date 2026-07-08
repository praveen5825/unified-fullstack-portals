import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Topbar from '../layout/Topbar';
import { proposalsApi } from '../api/duplicateCheck';
import { SCHEMES, STATUSES, SESSIONS, RESEARCH_TYPES, INDIAN_STATES, UNION_TERRITORIES } from '../constants/proposals';
import CustomDropdown from '../components/CustomDropdown';
import { Sparkles, Calendar, MapPin, FlaskConical, Activity } from 'lucide-react';

export default function EditProposal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [newDocument, setNewDocument] = useState(null);
  const [newFinalReport, setNewFinalReport] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    proposalsApi.detail(id).then((res) => {
      const { document, final_report, extraction_status, review_status, created_at, updated_at, id: _id, ...rest } = res.data;
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
      if (newFinalReport) data.append('final_report', newFinalReport);

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
  const labelClass = "text-xs text-text-muted mb-1.5 block font-semibold";

  return (
    <div>
      <Topbar title="Edit Proposal" subtitle={form.spark_id} />

      <form onSubmit={handleSubmit} className="max-w-3xl rounded-2xl bg-surface border border-border-soft p-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Spark ID — only required field */}
          <div>
            <label className={labelClass}>
              Spark ID <span className="text-danger">*</span>
            </label>
            <input name="spark_id" value={form.spark_id} onChange={handleChange} required className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Scheme</label>
            <CustomDropdown
              value={form.scheme || ''}
              onChange={(val) => handleChange({ target: { name: 'scheme', value: val } })}
              options={SCHEMES.map((s) => ({ label: s, value: s }))}
              placeholder="— Select Scheme —"
              icon={Sparkles}
            />
          </div>

          <div>
            <label className={labelClass}>Session</label>
            <CustomDropdown
              value={form.session || ''}
              onChange={(val) => handleChange({ target: { name: 'session', value: val } })}
              options={SESSIONS.map((s) => ({ label: s, value: s }))}
              placeholder="— Select Session —"
              icon={Calendar}
            />
          </div>

          <div>
            <label className={labelClass}>Year</label>
            <input name="year" value={form.year || ''} onChange={handleChange} className={inputClass} />
          </div>

          <div className="col-span-2">
            <label className={labelClass}>State / Union Territory</label>
            <CustomDropdown
              value={form.state || ''}
              onChange={(val) => handleChange({ target: { name: 'state', value: val } })}
              options={[
                { group: 'States', items: INDIAN_STATES.map((s) => ({ label: s, value: s })) },
                { group: 'Union Territories', items: UNION_TERRITORIES.map((s) => ({ label: s, value: s })) },
              ]}
              placeholder="— Select State / UT —"
              searchable={true}
              icon={MapPin}
            />
          </div>

          <div className="col-span-2">
            <label className={labelClass}>College Name</label>
            <input name="college_name" value={form.college_name || ''} onChange={handleChange} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Student Name</label>
            <input name="student_name" value={form.student_name || ''} onChange={handleChange} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Guide Name</label>
            <input name="guide_name" value={form.guide_name || ''} onChange={handleChange} className={inputClass} />
          </div>

          <div className="col-span-2">
            <label className={labelClass}>Topic / Project Title</label>
            <textarea name="title" value={form.title || ''} onChange={handleChange} rows={2} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Research Type</label>
            <CustomDropdown
              value={form.research_area || ''}
              onChange={(val) => handleChange({ target: { name: 'research_area', value: val } })}
              options={RESEARCH_TYPES.map((r) => ({ label: r, value: r }))}
              placeholder="— Select Research Type —"
              icon={FlaskConical}
              searchable={true}
            />
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <CustomDropdown
              value={form.status || 'received'}
              onChange={(val) => handleChange({ target: { name: 'status', value: val } })}
              options={STATUSES.map((s) => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }))}
              placeholder="— Select Status —"
              icon={Activity}
            />
          </div>

          <div className="col-span-2">
            <label className={labelClass}>Replace Proposal Document (leave empty to keep existing)</label>
            <input type="file" accept="application/pdf" onChange={(e) => setNewDocument(e.target.files[0])} className={inputClass} />
          </div>

          <div className="col-span-2">
            <label className={labelClass}>Replace Final Report (leave empty to keep existing)</label>
            <input type="file" accept="application/pdf" onChange={(e) => setNewFinalReport(e.target.files[0])} className={inputClass} />
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