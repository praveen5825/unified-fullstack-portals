import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../layout/Topbar';
import { proposalsApi } from '../api/duplicateCheck';
import { FilePlus2, CheckCircle2, ChevronRight, Loader2, FileText, User, GraduationCap } from 'lucide-react';

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
      setFeedback({ type: 'error', text: 'Could not save proposal. Please check the fields and try again.' });
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
        {/* STEP 1: Basic Info */}
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
                <label className={labelClass} style={labelStyle}>Spark ID</label>
                <input name="spark_id" value={form.spark_id} onChange={handleChange} required className={inputClass} placeholder="e.g. 2546/168" autoFocus />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Scheme</label>
                <select name="scheme" value={form.scheme} onChange={handleChange} className={inputClass}>
                  {SCHEMES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Student Name</label>
                <input name="student_name" value={form.student_name} onChange={handleChange} required className={inputClass} placeholder="Full name" />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Year / Batch</label>
                <input name="year" value={form.year} onChange={handleChange} required className={inputClass} placeholder="e.g. 3rd year" />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass} style={labelStyle}>College / Institution Name</label>
                <input name="college_name" value={form.college_name} onChange={handleChange} required className={inputClass} placeholder="Full institution name" />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Guide / Mentor Name</label>
                <input name="guide_name" value={form.guide_name} onChange={handleChange} required className={inputClass} placeholder="Dr. or Prof. name" />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>State</label>
                <input name="state" value={form.state} onChange={handleChange} required className={inputClass} placeholder="e.g. Kerala, Delhi" />
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button type="submit" className="btn btn-primary px-6 py-2.5 flex items-center gap-2">
                Continue to Research Details <ChevronRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Research & Document */}
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
                <textarea
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  rows={2}
                  className={`${inputClass} resize-none`}
                  placeholder="Enter the full research title..."
                />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Research Area / Specialization</label>
                <input name="research_area" value={form.research_area} onChange={handleChange} required className={inputClass} placeholder="e.g. Kayachikitsa, Shalya Tantra" />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Initial Status</label>
                <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                  {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 mt-2">
                <label className={labelClass} style={labelStyle}>Proposal Document (PDF)</label>
                <div 
                  className="border-2 border-dashed rounded-xl p-6 text-center transition-colors"
                  style={{ 
                    borderColor: form.document ? 'var(--color-success)' : 'var(--color-border)',
                    background: form.document ? 'var(--color-success-soft)' : 'var(--color-surface-2)' 
                  }}
                >
                  <input
                    type="file"
                    name="document"
                    accept="application/pdf"
                    onChange={handleChange}
                    required={!form.document} // required if not already selected
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: form.document ? 'var(--color-success)' : 'var(--color-surface-3)', color: form.document ? 'white' : 'var(--color-text-muted)' }}>
                      {form.document ? <CheckCircle2 size={20} /> : <FilePlus2 size={20} />}
                    </div>
                    {form.document ? (
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{form.document.name} selected</div>
                        <div className="text-xs mt-1" style={{ color: 'var(--color-success)' }}>Click to replace file</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Click to upload PDF</div>
                        <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Max file size: 20MB</div>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {feedback?.type === 'error' && (
              <div className="mt-5 text-sm rounded-xl px-4 py-3 flex items-center gap-2 animate-fade-in" style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-danger)' }} />
                {feedback.text}
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary px-8 py-2.5 flex items-center gap-2 text-sm"
              >
                {submitting ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving Proposal...</>
                ) : (
                  <><CheckCircle2 size={16} /> Submit Proposal</>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Success */}
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
              <button 
                onClick={() => navigate('/duplicate-check')}
                className="btn btn-ghost px-6 py-2.5 text-sm"
              >
                Go to Pending Queue
              </button>
              <button 
                onClick={resetForm}
                className="btn btn-primary px-6 py-2.5 text-sm"
              >
                Add Another Proposal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
