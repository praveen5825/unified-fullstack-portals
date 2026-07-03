import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, error, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(username, password);
    if (ok) {
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    }
  };

  const inputClass = "w-full bg-surface-2 border border-border-soft rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-text-faint";

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl accent-gradient flex items-center justify-center mb-4">
            <Sparkles size={22} className="text-white" />
          </div>
          <div className="text-lg font-semibold">CCRAS Unified Portal</div>
          <div className="text-sm text-text-muted">Sign in to continue</div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-surface border border-border-soft p-6 space-y-4">
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          {error && (
            <div className="text-sm bg-danger-soft text-danger rounded-xl px-3.5 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full accent-gradient text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
