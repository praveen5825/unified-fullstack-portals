import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Loader2, Eye, EyeOff, Shield, Leaf } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const { login, error, loading } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(username, password);
    if (ok) {
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    }
  };

  return (
    <div className="min-h-screen login-bg flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated blobs */}
      <div
        className="absolute top-[-15%] left-[-10%] w-96 h-96 rounded-full opacity-20 animate-float"
        style={{ background: 'radial-gradient(circle, var(--color-accent-from), transparent 70%)', filter: 'blur(40px)' }}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] w-80 h-80 rounded-full opacity-15 animate-float"
        style={{ background: 'radial-gradient(circle, var(--color-accent-to), transparent 70%)', filter: 'blur(40px)', animationDelay: '1.5s' }}
      />
      <div
        className="absolute top-[40%] right-[15%] w-48 h-48 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)', filter: 'blur(30px)' }}
      />

      {/* Theme toggle top right */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center transition-all z-10"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-soft)', color: 'var(--color-text-muted)' }}
      >
        {isDark ? <Leaf size={16} /> : <Shield size={16} />}
      </button>

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        {/* Logo section */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="accent-gradient w-16 h-16 rounded-2xl flex items-center justify-center mb-5 animate-pulse-glow"
            style={{ boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)' }}
          >
            <Sparkles size={28} color="white" />
          </div>
          <div className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            CCRAS Portal
          </div>
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Central Council for Research in Ayurvedic Sciences
          </div>
          <div
            className="mt-2 text-xs px-3 py-1 rounded-full flex items-center gap-1"
            style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}
          >
            <Shield size={10} /> Government of India · Ministry of AYUSH
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-soft)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03)',
          }}
        >
          <div className="text-base font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            Sign in to continue
          </div>
          <div className="text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
            Enter your credentials to access the portal
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>
                Username
              </label>
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  className="input pr-11"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-faint)' }}
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="text-sm rounded-xl px-3.5 py-2.5 animate-fade-in flex items-center gap-2"
                style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--color-danger)' }} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-3 text-sm rounded-xl mt-2"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--color-text-faint)' }}>
          Authorised personnel only · CCRAS Research Management System
        </p>
      </div>
    </div>
  );
}
