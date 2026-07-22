import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Topbar from '../layout/Topbar';
import { proposalsApi } from '../api/duplicateCheck';
import { FilePlus2, CheckCircle2, ChevronRight, Loader2, FileText, User, MapPin, FlaskConical, Calendar, Sparkles, Activity } from 'lucide-react';
import { SCHEMES, STATUSES, SESSIONS, RESEARCH_TYPES, INDIAN_STATES, UNION_TERRITORIES } from '../constants/proposals';
import CustomDropdown from '../components/CustomDropdown';

const emptyForm = {
  spark_id: '', scheme: 'SPARK', state: '', college_name: '', guide_name: '',
  student_name: '', year: '', session: '', title: '', research_area: '', status: 'received',
  document: null, final_report: null,
};

export default function NewProposal() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm((prev) => ({ ...prev, [name]: files ? files[0] : value }));
  };

  const handleNext = (e) => {
    e.preventDefault();
    setStep(2);
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
      await proposalsApi.create(data);
      setFeedback({ type: 'success', text: 'Proposal saved successfully. It has been added to the Duplicate Check pending queue.' });
      setStep(3);
    } catch (err) {
      toast.error('Could not save proposal. Please check the fields and try again.');
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setFeedback(null);
    setStep(1);
  };

  const inputClass = "input transition-all duration-200";
  const labelClass = "text-xs font-semibold mb-1.5 block";
  const labelStyle = { color: 'var(--color-text-muted)' };

  return (
    <div>
      <Topbar title="New Proposal" subtitle="Add a research proposal record" />

      {/* Stepper */}
      <div className="flex items-center max-w-3xl mx-auto mb-8">
        {[
          { num: 1, label: 'Basic Info', icon: User },
          { num: 2, label: 'Research & Doc', icon: FileText },
          { num: 3, label: 'Complete', icon: CheckCircle2 }
        ].map((s, i) => (
          <div key={s.num} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center relative">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 z-10"
                style={
                  step > s.num
                    ? { background: 'var(--color-success)', color: 'white' }
                    : step === s.num
                    ? { background: 'var(--color-accent)', color: 'white', boxShadow: '0 0 0 4px var(--color-accent-soft)' }
                    : { background: 'var(--color-surface-3)', color: 'var(--color-text-faint)' }
                }
              >
                {step > s.num ? <CheckCircle2 size={18} /> : <s.icon size={16} />}
              </div>
              <div
                className="absolute top-12 text-[10px] font-semibold whitespace-nowrap"
                style={{ color: step >= s.num ? 'var(--color-text-primary)' : 'var(--color-text-faint)' }}
              >
                {s.label}
              </div>
            </div>
            {i < 2 && (
              <div
                className="flex-1 h-1 mx-2 rounded-full transition-all duration-500"
                style={{ background: step > s.num ? 'var(--color-success)' : 'var(--color-surface-3)' }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="max-w-3xl mx-auto mt-12 relative min-h-[400px]">
        {/* STEP 1 */}
        {step === 1 && (
          <form onSubmit={handleNext} className="card p-8 animate-slide-up">
            <div className="flex items-center gap-3 mb-6 pb-4" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                <User size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Student & Institution Details</h2>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Enter the researcher's background information</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div>
                <label className={labelClass} style={labelStyle}>
                  Spark ID <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input name="spark_id" value={form.spark_id} onChange={handleChange} required className={inputClass} placeholder="e.g. 2546/168" autoFocus />
              </div>

              <div>
                <label className={labelClass} style={labelStyle}>Scheme</label>
                <CustomDropdown
                  value={form.scheme}
                  onChange={(val) => handleChange({ target: { name: 'scheme', value: val } })}
                  options={SCHEMES.map(s => ({ label: s, value: s }))}
                  placeholder="— Select Scheme —"
                  icon={Sparkles}
                />
              </div>

              <div>
                <label className={labelClass} style={labelStyle}>Session</label>
                <CustomDropdown
                  value={form.session}
                  onChange={(val) => handleChange({ target: { name: 'session', value: val } })}
                  options={SESSIONS.map(s => ({ label: s, value: s }))}
                  placeholder="— Select Session —"
                  icon={Calendar}
                />
              </div>

              <div>
                <label className={labelClass} style={labelStyle}>Year / Batch</label>
                <input name="year" value={form.year} onChange={handleChange} className={inputClass} placeholder="e.g. 3rd year" />
              </div>

              <div>
                <label className={labelClass} style={labelStyle}>Student Name</label>
                <input name="student_name" value={form.student_name} onChange={handleChange} className={inputClass} placeholder="Full name" />
              </div>

              <div>
                <label className={labelClass} style={labelStyle}>Guide / Mentor Name</label>
                <input name="guide_name" value={form.guide_name} onChange={handleChange} className={inputClass} placeholder="Dr. or Prof. name" />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass} style={labelStyle}>College / Institution Name</label>
                <input name="college_name" value={form.college_name} onChange={handleChange} className={inputClass} placeholder="Full institution name" />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass} style={labelStyle}>State / Union Territory</label>
                <CustomDropdown
                  value={form.state}
                  onChange={(val) => handleChange({ target: { name: 'state', value: val } })}
                  options={[
                    { group: 'States', items: INDIAN_STATES.map(s => ({ label: s, value: s })) },
                    { group: 'Union Territories', items: UNION_TERRITORIES.map(s => ({ label: s, value: s })) }
                  ]}
                  placeholder="— Select State / UT —"
                  searchable={true}
                  icon={MapPin}
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button type="submit" className="btn btn-primary px-6 py-2.5 flex items-center gap-2">
                Continue to Research Details <ChevronRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="card p-8 animate-slide-in-left">
            <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Research Details</h2>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Upload the synopsis and classify the research</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-surface-2)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              >
                Back to Step 1
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="md:col-span-2">
                <label className={labelClass} style={labelStyle}>Project Title</label>
                <textarea name="title" value={form.title} onChange={handleChange} rows={2} className={`${inputClass} resize-none`} placeholder="Enter the full research title..." />
              </div>

              <div>
                <label className={labelClass} style={labelStyle}>Research Type</label>
                <CustomDropdown
                  value={form.research_area}
                  onChange={(val) => handleChange({ target: { name: 'research_area', value: val } })}
                  options={RESEARCH_TYPES.map(r => ({ label: r, value: r }))}
                  placeholder="— Select Research Type —"
                  icon={FlaskConical}
                  searchable={true}
                />
              </div>

              <div>
                <label className={labelClass} style={labelStyle}>Initial Status</label>
                <CustomDropdown
                  value={form.status}
                  onChange={(val) => handleChange({ target: { name: 'status', value: val } })}
                  options={STATUSES.map(s => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }))}
                  placeholder="— Select Status —"
                  icon={Activity}
                />
              </div>

              {/* Proposal Document */}
              <div className="md:col-span-2 mt-2">
                <label className={labelClass} style={labelStyle}>Proposal Document (PDF) — Optional</label>
                <FileUploadBox name="document" file={form.document} id="pdf-upload" onChange={handleChange} label="Click to upload Proposal PDF" />
              </div>

              {/* Final Report */}
              <div className="md:col-span-2 mt-2">
                <label className={labelClass} style={labelStyle}>Final Report (PDF) — Optional</label>
                <FileUploadBox name="final_report" file={form.final_report} id="final-report-upload" onChange={handleChange} label="Click to upload Final Report" />
              </div>
            </div>

            {/* Error feedback handled by toast */}

            <div className="mt-8 flex justify-end">
              <button type="submit" disabled={submitting} className="btn btn-primary px-8 py-2.5 flex items-center gap-2 text-sm">
                {submitting ? (<><Loader2 size={16} className="animate-spin" /> Saving Proposal...</>) : (<><CheckCircle2 size={16} /> Submit Proposal</>)}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="card p-10 text-center animate-slide-up flex flex-col items-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Proposal Saved!</h2>
            <p className="text-sm mb-8 max-w-md" style={{ color: 'var(--color-text-muted)' }}>
              {feedback?.text} The background processor is currently extracting the text from the PDF.
            </p>
            <div className="flex gap-4">
              <button onClick={() => navigate('/duplicate-check')} className="btn btn-ghost px-6 py-2.5 text-sm">Go to Pending Queue</button>
              <button onClick={resetForm} className="btn btn-primary px-6 py-2.5 text-sm">Add Another Proposal</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared File Upload Box ────────────────────────────────────────────────
function FileUploadBox({ name, file, id, onChange, label }) {
  return (
    <div
      className="border-2 border-dashed rounded-xl p-6 text-center transition-colors"
      style={{
        borderColor: file ? 'var(--color-success)' : 'var(--color-border)',
        background: file ? 'var(--color-success-soft)' : 'var(--color-surface-2)',
      }}
    >
      <input type="file" name={name} accept="application/pdf" onChange={onChange} className="hidden" id={id} />
      <label htmlFor={id} className="cursor-pointer flex flex-col items-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{ background: file ? 'var(--color-success)' : 'var(--color-surface-3)', color: file ? 'white' : 'var(--color-text-muted)' }}>
          {file ? <CheckCircle2 size={20} /> : <FilePlus2 size={20} />}
        </div>
        {file ? (
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{file.name} selected</div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-success)' }}>Click to replace file</div>
          </div>
        ) : (
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{label}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Max file size: 20MB</div>
          </div>
        )}
      </label>
    </div>
  );
}
