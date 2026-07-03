import { useState, useRef } from 'react';
import { UploadCloud, Loader2, ScanSearch, FileText, X, CheckCircle } from 'lucide-react';
import Topbar from '../../layout/Topbar';
import MatchCard from '../../components/MatchCard';
import EmptyState from '../../components/EmptyState';
import { duplicateCheckApi } from '../../api/duplicateCheck';

const STEPS = ['Upload Document', 'Analysis', 'Results'];

export default function DuplicateCheck() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [studentName, setStudentName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const step = results !== null ? 2 : checking ? 1 : 0;

  const handleFile = (f) => {
    if (f && f.type === 'application/pdf') {
      setFile(f);
      setResults(null);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!file) return;
    setChecking(true);
    setError(null);
    setResults(null);
    try {
      const formData = new FormData();
      formData.append('document', file);
      if (title) formData.append('title', title);
      if (studentName) formData.append('student_name', studentName);
      if (collegeName) formData.append('college_name', collegeName);
      const res = await duplicateCheckApi.checkSynopsis(formData);
      setResults(res.data.matches ?? []);
    } catch {
      setError('Could not check this document. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const reset = () => {
    setFile(null);
    setTitle('');
    setStudentName('');
    setCollegeName('');
    setResults(null);
    setError(null);
  };

  return (
    <div>
      <Topbar
        title="Duplicate Check"
        subtitle="Upload a research synopsis to find duplicate proposals"
      />

      {/* ─── Step Indicator ─── */}
      <div className="flex items-center gap-0 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={
                  i < step
                    ? { background: 'var(--color-success)', color: 'white' }
                    : i === step
                    ? { background: 'var(--color-accent)', color: 'white', boxShadow: '0 0 12px var(--color-accent-soft)' }
                    : { background: 'var(--color-surface-3)', color: 'var(--color-text-faint)' }
                }
              >
                {i < step ? <CheckCircle size={13} /> : i + 1}
              </div>
              <span
                className="text-xs font-medium hidden sm:block"
                style={{ color: i === step ? 'var(--color-text-primary)' : 'var(--color-text-faint)' }}
              >
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="mx-3 flex-1 h-px w-12 transition-all duration-500"
                style={{ background: i < step ? 'var(--color-success)' : 'var(--color-border-soft)' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* ─── Upload Form ─── */}
      {step < 2 && (
        <form onSubmit={handleCheck} className="card p-6 mb-6 animate-fade-in">
          {/* Drop Zone */}
          <div
            className={`drop-zone mb-5 p-8 text-center cursor-pointer transition-all duration-200 ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {file ? (
              <div className="flex flex-col items-center gap-2 animate-fade-in">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--color-success-soft)' }}
                >
                  <FileText size={22} style={{ color: 'var(--color-success)' }} />
                </div>
                <div className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {file.name}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {(file.size / 1024).toFixed(1)} KB · PDF
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="flex items-center gap-1 text-xs mt-1 px-2.5 py-1 rounded-lg transition-colors"
                  style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}
                >
                  <X size={11} /> Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--color-accent-soft)' }}
                >
                  <UploadCloud size={26} style={{ color: 'var(--color-accent)' }} />
                </div>
                <div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    Drop your PDF here, or <span style={{ color: 'var(--color-accent)' }}>browse</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Supports PDF format · Max 20MB
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Optional fields */}
          <div className="mb-4">
            <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Optional details <span style={{ color: 'var(--color-text-faint)' }}>(improves matching accuracy)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: 'Title', value: title, setter: setTitle, placeholder: 'Research title...' },
                { label: 'Student Name', value: studentName, setter: setStudentName, placeholder: 'Student name...' },
                { label: 'College Name', value: collegeName, setter: setCollegeName, placeholder: 'College name...' },
              ].map(({ label, value, setter, placeholder }) => (
                <div key={label}>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-faint)' }}>{label}</label>
                  <input
                    className="input text-sm"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div
              className="text-sm rounded-xl px-3.5 py-2.5 mb-4 animate-fade-in"
              style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}
            >
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={checking || !file}
              className="btn btn-primary px-6 py-2.5"
            >
              {checking ? (
                <><Loader2 size={15} className="animate-spin" /> Analysing...</>
              ) : (
                <><ScanSearch size={15} /> Check for Duplicates</>
              )}
            </button>
            {checking && (
              <div className="text-sm animate-fade-in" style={{ color: 'var(--color-text-muted)' }}>
                Extracting text and computing similarity scores...
              </div>
            )}
          </div>
        </form>
      )}

      {/* ─── Results ─── */}
      {results !== null && (
        <div className="animate-slide-up">
          {/* Results header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {results.length === 0
                  ? '✅ No duplicates found'
                  : `⚠️ ${results.length} potential match${results.length > 1 ? 'es' : ''} found`}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {results.length === 0
                  ? 'This proposal appears to be original.'
                  : 'Review the matches below and take action.'}
              </div>
            </div>
            <button onClick={reset} className="btn btn-ghost text-xs px-3 py-1.5">
              <X size={13} /> New Check
            </button>
          </div>

          {results.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No duplicates detected"
              description="No similar proposals were found in the database. This submission appears to be original."
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {results.map((m, i) => (
                <MatchCard
                  key={i}
                  match={m}
                  onMarkReviewed={() => {}}
                  onFlag={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}