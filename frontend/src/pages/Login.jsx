import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand" style={{ fontSize: 26, justifyContent: 'center' }}><span className="brand-dot" />SUBLET</div>
          <p className="muted" style={{ marginTop: 6 }}>Hackathon team matching, submissions &amp; judging</p>
        </div>
        <form onSubmit={onSubmit} className="card" style={{ boxShadow: 'var(--shadow)' }}>
          <h2 style={{ marginTop: 0 }}>Welcome back</h2>
          <label>Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
          </label>
          <label>Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy} style={{ width: '100%', marginTop: 8 }}>{busy ? 'Signing in…' : 'Log in'}</button>
          <p className="muted small" style={{ textAlign: 'center', marginBottom: 0, marginTop: 16 }}>
            No account? <Link to="/register">Create one</Link>
          </p>
          <p className="faint small" style={{ textAlign: 'center', marginBottom: 0 }}>
            Admin demo: <span className="kbd">admin123</span> / <span className="kbd">admin123</span>
          </p>
        </form>
      </div>
    </div>
  );
}
