import { useState } from 'react';
import { UploadCloud, FileSpreadsheet, Download, Info, CheckCircle2, AlertTriangle, ListFilter } from 'lucide-react';
import Topbar from '../layout/Topbar';

const EXCEL_COLUMNS = [
  { name: 'Spark ID', req: true, desc: 'Unique identifier (e.g. SPARK-2023-001)' },
  { name: 'Student Name', req: true, desc: 'Full name of the student' },
  { name: 'Title', req: true, desc: 'Full title of the research proposal' },
  { name: 'State', req: false, desc: 'Name of the state (e.g. Delhi)' },
  { name: 'College Name', req: false, desc: 'Name of the institution' },
  { name: 'Guide Name', req: false, desc: 'Name of the guide/mentor' },
  { name: 'Year', req: false, desc: 'Submission year (e.g. 2023)' },
  { name: 'Session', req: false, desc: 'Academic session (e.g. 2023-24)' },
  { name: 'Research Area', req: false, desc: 'e.g. Clinical Research, Pharmacological' },
  { name: 'Status', req: false, desc: 'received, selected, or awarded (defaults to received)' },
  { name: 'Synopsis Text', req: false, desc: 'Plain text synopsis for duplicate checking' },
];

const SCHEME_OPTIONS = ['SPARK', 'PG-STAR', 'PDF-STAR'];

export default function BulkImport() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState('SPARK');

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    alert(`File uploaded! Data will be saved under the ${selectedScheme} scheme.`);
  };

  return (
    <div className="p-6 max-w-[1000px] mx-auto animate-fade-in">
      <Topbar title="Bulk Import" subtitle="Upload multiple proposals instantly via Excel or CSV" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Left Column: Upload Area */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          
          {/* Target Scheme Selector */}
          <div className="card p-5" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <h4 className="flex items-center gap-2 text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
              <ListFilter size={16} style={{ color: 'var(--color-accent)' }}/>
              1. Select Target Scheme
            </h4>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
              All proposals in your uploaded file will be assigned to this scheme.
            </p>
            <div className="flex flex-col gap-2">
              {SCHEME_OPTIONS.map(scheme => (
                <button
                  key={scheme}
                  onClick={() => setSelectedScheme(scheme)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between"
                  style={{ 
                    background: selectedScheme === scheme ? 'var(--color-accent)' : 'var(--color-surface-3)', 
                    color: selectedScheme === scheme ? '#fff' : 'var(--color-text-muted)',
                    border: `1px solid ${selectedScheme === scheme ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  {scheme}
                  {selectedScheme === scheme && <CheckCircle2 size={14} />}
                </button>
              ))}
            </div>
          </div>

          <div 
            className={`card p-6 flex flex-col items-center justify-center text-center transition-all duration-200 border-2 border-dashed ${isDragging ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]' : 'border-[var(--color-border)]'}`}
            style={{ minHeight: '220px' }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
              style={{ background: 'var(--color-surface-3)', color: 'var(--color-accent)' }}
            >
              <UploadCloud size={24} />
            </div>
            <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>
              2. Upload File
            </h3>
            <p className="text-xs mb-4 px-2" style={{ color: 'var(--color-text-faint)' }}>
              Drag & Drop your Excel/CSV here
            </p>
            
            <button 
              className="px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all hover:scale-105"
              style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
              onClick={() => alert(`File selection logic will be implemented here! Selected scheme: ${selectedScheme}`)}
            >
              Browse Files
            </button>
          </div>

          <div className="card p-5" style={{ background: 'var(--color-surface-3)' }}>
            <h4 className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              <Download size={14} style={{ color: 'var(--color-success)' }}/>
              Download Template
            </h4>
            <p className="text-[11px] mb-3 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Download a pre-formatted template with all the correct column headers.
            </p>
            <button 
              className="w-full py-2 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-2"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              <FileSpreadsheet size={13} /> Download .XLSX
            </button>
          </div>
        </div>

        {/* Right Column: Format Guide */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden h-full">
            <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <FileSpreadsheet size={20} style={{ color: 'var(--color-accent)' }} />
                Excel File Format Guide
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Because you select the target scheme above, the <strong>Scheme column is no longer needed</strong> in the Excel file!
              </p>
            </div>

            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border-soft)' }}>
                    <th className="px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>Column Name</th>
                    <th className="px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>Requirement</th>
                    <th className="px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {EXCEL_COLUMNS.map((col, i) => (
                    <tr 
                      key={col.name} 
                      className="group transition-colors hover:bg-[var(--color-surface-2)]"
                      style={{ borderBottom: '1px solid var(--color-border-soft)' }}
                    >
                      <td className="px-5 py-2.5 whitespace-nowrap">
                        <span className="font-semibold text-xs" style={{ color: 'var(--color-text-primary)' }}>{col.name}</span>
                      </td>
                      <td className="px-5 py-2.5">
                        {col.req ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" 
                            style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
                            <AlertTriangle size={10} /> Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" 
                            style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-faint)' }}>
                            <CheckCircle2 size={10} /> Optional
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {col.desc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-[var(--color-surface-3)] border-t border-[var(--color-border-soft)] flex items-start gap-3">
              <Info size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--color-accent)' }} />
              <div className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                <strong style={{ color: 'var(--color-text-primary)' }}>Note:</strong> If you upload 1,000 rows while having <strong style={{ color: 'var(--color-accent)' }}>{selectedScheme}</strong> selected, all 1,000 proposals will be imported as {selectedScheme} proposals.
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
