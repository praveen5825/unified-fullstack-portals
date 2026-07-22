import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewProposal from './pages/NewProposal';
import DuplicateCheck from './pages/DuplicateCheck';
import CompareViewer from './pages/DuplicateCheck/CompareViewer';
import Placeholder from './pages/Placeholder';
import BulkImport from './pages/BulkImport';
import Spark from './pages/Spark';
import Pdfstar from './pages/Pdfstar';
import Pgstar from './pages/Pgstar';
import ProposalDetail from './pages/ProposalDetail';
import EditProposal from './pages/EditProposal';
import Analytics from './pages/Analytics';
import GlobalSearch from './pages/GlobalSearch';

export default function App() {
  return (
    <ThemeProvider>
      <Toaster 
        position="bottom-right" 
        toastOptions={{ 
          style: { background: 'var(--color-surface-2)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' } 
        }} 
      />
      <BrowserRouter basename="/p3">
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="proposals/new" element={<NewProposal />} />
              <Route path="bulk-import" element={<BulkImport />} />
              <Route path="duplicate-check" element={<DuplicateCheck />} />
              <Route path="duplicate-check/compare/:checkId/:matchedProposalId" element={<CompareViewer />} />
              <Route path="spark" element={<Spark />} />
              <Route path="pdfstar" element={<Pdfstar />} />
              <Route path="pgstar" element={<Pgstar />} />
              <Route path="proposals/:id" element={<ProposalDetail />} />
              <Route path="proposals/:id/edit" element={<EditProposal />} />
              {/* ── New Features ─────────────────────────────────────── */}
              <Route path="analytics" element={<Analytics />} />
              <Route path="search" element={<GlobalSearch />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}