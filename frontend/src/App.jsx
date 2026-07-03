import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewProposal from './pages/NewProposal';
import DuplicateCheck from './pages/DuplicateCheck';
import Placeholder from './pages/Placeholder';
import Spark from './pages/Spark';
import Pdfstar from './pages/Pdfstar';
import Pgstar from './pages/Pgstar';

export default function App() {
  return (
    <BrowserRouter>
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
            <Route path="bulk-import" element={<Placeholder title="Bulk Import" subtitle="Import proposals from Excel" />} />
            <Route path="duplicate-check" element={<DuplicateCheck />} />
            <Route path="spark" element={<Spark />} />
            <Route path="pdfstar" element={<Pdfstar />} />
            <Route path="pgstar" element={<Pgstar />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}