import { useState } from 'react';
import { UploadCloud, Loader2, ScanSearch } from 'lucide-react';
import Topbar from '../../layout/Topbar';
import MatchCard from '../../components/MatchCard';
import { duplicateCheckApi } from '../../api/duplicateCheck';

export default function DuplicateCheck() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [studentName, setStudentName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const inputClass = "w-full bg-surface-2 border border-border-soft rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-text-faint";

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
    } catch (err) {
      setError('Could not check this document. Try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <Topbar title="Duplicate Check" subtitle="Upload a synopsis to check for matches against existing proposals" />

      <form onSubmit={handleCheck} className="rounded-2xl bg-surface border border-border-soft p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Title (optional, improves accuracy)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Student Name (optional)</label>
            <input value={studentName} onChange={(e) => setStudentName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">College Name (optional)</label>
            <input value={collegeName} onChange={(e) => setCollegeName(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs text-text-muted mb-1.5 block">Synopsis / Proposal PDF</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files[0])}
            required
            className={inputClass}
          />
        </div>

        {error && <div className="text-sm bg-danger-soft text-danger rounded-xl px-3.5 py-2.5 mb-4">{error}</div>}

        <button
          type="submit"
          disabled={checking || !file}
          className="flex items-center gap-2 accent-gradient text-white text-sm font-medium px-5 py-2.5 rounded-xl disabled:opacity-60"
        >
          {checking ? <Loader2 size={15} className="animate-spin" /> : <ScanSearch size={15} />}
          {checking ? 'Checking...' : 'Check for Duplicates'}
        </button>
      </form>

      {results !== null && (
        results.length === 0 ? (
          <div className="rounded-2xl bg-surface border border-border-soft p-10 text-center text-success text-sm">
            No matching proposals found. This looks original.
          </div>
        ) : (
          <div>
            <div className="text-sm text-text-muted mb-3">{results.length} potential match(es) found</div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {results.map((m, i) => (
                <MatchCard key={i} match={m} onMarkReviewed={() => {}} onFlag={() => {}} />
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}