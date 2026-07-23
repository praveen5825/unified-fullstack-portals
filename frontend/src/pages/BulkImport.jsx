import { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, Download, FileSpreadsheet, AlertTriangle, Check, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import Topbar from '../layout/Topbar';
import { proposalsApi } from '../api/duplicateCheck';

const SCHEMES = ['SPARK', 'PG-STAR', 'PDF-STAR'];

const FORMAT_GUIDE = [
  { col: 'Spark ID', req: true, desc: 'Unique identifier (e.g. SPARK-2023-001)' },
  { col: 'Student Name', req: true, desc: 'Full name of the student' },
  { col: 'Title', req: true, desc: 'Full title of the research proposal' },
  { col: 'State', req: false, desc: 'Name of the state (e.g. Delhi)' },
  { col: 'College Name', req: false, desc: 'Name of the institution' },
  { col: 'Guide Name', req: false, desc: 'Name of the guide/mentor' },
  { col: 'Year', req: false, desc: 'Submission year (e.g. 2023)' },
  { col: 'Session', req: false, desc: 'Academic session (e.g. 2023-24)' },
  { col: 'Research Area', req: false, desc: 'e.g. Clinical Research, Pharmacological' },
  { col: 'Status', req: false, desc: 'received, selected, or awarded (defaults to received)' },
  { col: 'Synopsis Text', req: false, desc: 'Plain text synopsis for duplicate checking' },
];

export default function BulkImport() {
  const [selectedScheme, setSelectedScheme] = useState('SPARK');
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile) => {
    setUploadResult(null);
    const validTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (['csv', 'xlsx'].includes(ext) || validTypes.includes(selectedFile.type)) {
      setFile(selectedFile);
      toast.success(`File selected. Scheme: ${selectedScheme}`);
    } else {
      toast.error("Please upload a valid .csv or .xlsx file.");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await proposalsApi.bulkImport(selectedScheme, formData);
      setUploadResult({
        success: true,
        imported: res.data.imported,
        skipped: res.data.skipped,
        failed: res.data.failed,
        errors: res.data.errors,
      });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setUploadResult({
        success: false,
        message: err.response?.data?.detail || "An error occurred during upload."
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = FORMAT_GUIDE.map(item => item.col);
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'CCRAS_Bulk_Import_Template.xlsx');
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto min-h-screen">
      <Topbar title="Bulk Import" subtitle="Upload multiple proposals instantly via Excel or CSV" />

      <div className="grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-6 mt-6">
        
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-6">
          
          {/* Step 1: Scheme Selection */}
          <div className="p-6 rounded-2xl" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>1</span>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Select Target Scheme</h3>
            </div>
            <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>
              All proposals in your uploaded file will be assigned to this scheme.
            </p>
            <div className="flex flex-col gap-3">
              {SCHEMES.map(scheme => (
                <button
                  key={scheme}
                  onClick={() => setSelectedScheme(scheme)}
                  className="flex items-center justify-between p-4 rounded-xl border transition-all"
                  style={{
                    background: selectedScheme === scheme ? 'var(--color-accent)' : 'var(--color-surface)',
                    borderColor: selectedScheme === scheme ? 'var(--color-accent)' : 'var(--color-border)',
                    color: selectedScheme === scheme ? '#fff' : 'var(--color-text-primary)',
                    boxShadow: selectedScheme === scheme ? '0 4px 15px rgba(99,102,241,0.2)' : 'none'
                  }}
                >
                  <span className="font-semibold text-sm">{scheme}</span>
                  {selectedScheme === scheme && <CheckCircle2 size={18} />}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Upload File */}
          <div className="p-6 rounded-2xl flex flex-col items-center justify-center text-center" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-2 mb-4 self-start">
              <span className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>2</span>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Upload File</h3>
            </div>
            
            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer ${isDragging ? 'scale-[1.02]' : ''}`}
              style={{
                borderColor: isDragging ? 'var(--color-accent)' : 'var(--color-border)',
                background: isDragging ? 'rgba(99,102,241,0.05)' : 'var(--color-surface)',
                position: 'relative'
              }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-accent)' }}>
                <UploadCloud size={24} />
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Drag & Drop your Excel/CSV here
              </p>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                {file ? file.name : "or click to browse"}
              </p>
              <div
                className="px-6 py-2 rounded-xl text-xs font-bold transition-all hover:-translate-y-0.5 inline-block cursor-pointer"
                style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
              >
                Browse Files
              </div>
              <input
                type="file"
                onChange={(e) => {
                  handleFileChange(e);
                  e.target.value = null; // Clear value to allow picking same file again
                }}
                accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  padding: 0,
                  margin: '-1px',
                  overflow: 'hidden',
                  clip: 'rect(0, 0, 0, 0)',
                  whiteSpace: 'nowrap',
                  border: 0
                }}
              />
            </label>

            {file && (
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full mt-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                {isUploading ? 'Uploading...' : 'Confirm Upload'}
              </button>
            )}

            {/* Status Messages */}
            {uploadResult && (
              <div className="w-full mt-4 p-4 rounded-xl text-left" style={{ background: uploadResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${uploadResult.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                {uploadResult.success ? (
                  <>
                    <div className="flex items-center gap-2 mb-2" style={{ color: '#10b981' }}>
                      <Check size={18} />
                      <span className="font-bold text-sm">Upload Successful</span>
                    </div>
                    <ul className="text-xs space-y-1" style={{ color: 'var(--color-text-primary)' }}>
                      <li><span className="font-semibold text-green-500">{uploadResult.imported}</span> records imported</li>
                      <li><span className="font-semibold text-yellow-500">{uploadResult.skipped}</span> duplicates skipped</li>
                      <li><span className="font-semibold text-red-500">{uploadResult.failed}</span> rows failed</li>
                    </ul>
                    {uploadResult.errors?.length > 0 && (
                      <div className="mt-3 text-xs" style={{ color: '#ef4444' }}>
                        <span className="font-bold">Errors:</span>
                        <ul className="list-disc pl-4 mt-1 opacity-90">
                          {uploadResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2" style={{ color: '#ef4444' }}>
                    <AlertTriangle size={18} />
                    <span className="font-semibold text-xs">{uploadResult.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Download Template Card */}
          <div className="p-6 rounded-2xl flex flex-col items-center justify-center text-center" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
             <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
               <FileSpreadsheet size={20} />
             </div>
             <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>Download Template</h3>
             <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>
               Download a pre-formatted template with all the correct column headers.
             </p>
             <button
               onClick={downloadTemplate}
               className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:bg-opacity-80"
               style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
             >
               <Download size={14} /> Download .XLSX
             </button>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="p-8 rounded-2xl h-fit sticky top-6" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-3 mb-6">
            <FileSpreadsheet style={{ color: 'var(--color-accent)' }} size={24} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Excel File Format Guide</h2>
          </div>
          
          <p className="text-xs mb-6 font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Because you select the target scheme above, the <strong style={{ color: 'var(--color-text-primary)' }}>Scheme column is no longer needed</strong> in the Excel file!
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-faint)' }}>
                  <th className="pb-3 font-semibold w-1/3">COLUMN NAME</th>
                  <th className="pb-3 font-semibold w-1/4">REQUIREMENT</th>
                  <th className="pb-3 font-semibold">DESCRIPTION</th>
                </tr>
              </thead>
              <tbody style={{ color: 'var(--color-text-primary)' }}>
                {FORMAT_GUIDE.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                    <td className="py-4 font-semibold">{item.col}</td>
                    <td className="py-4">
                      {item.req ? (
                         <span className="px-2 py-1 rounded text-[9px] font-bold tracking-wider" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                           ⚠ REQUIRED
                         </span>
                      ) : (
                         <span className="px-2 py-1 rounded text-[9px] font-bold tracking-wider" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-faint)' }}>
                           ⊝ OPTIONAL
                         </span>
                      )}
                    </td>
                    <td className="py-4" style={{ color: 'var(--color-text-muted)' }}>{item.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 rounded-xl flex gap-3 text-xs" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}>
            <AlertTriangle size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
            <p style={{ color: 'var(--color-text-primary)' }}>
              <strong style={{ color: 'var(--color-accent)' }}>Note:</strong> If you upload 1,000 rows while having <strong style={{ color: 'var(--color-text-primary)' }}>SPARK</strong> selected, all 1,000 proposals will be imported as SPARK proposals.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
