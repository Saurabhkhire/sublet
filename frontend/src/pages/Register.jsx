import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', linkedin: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await register(form.email, form.password, form.linkedin);
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
          <p className="muted" style={{ marginTop: 6 }}>Create your participant account</p>
        </div>
        <form onSubmit={onSubmit} className="card" style={{ boxShadow: 'var(--shadow)' }}>
          <h2 style={{ marginTop: 0 }}>Sign up</h2>
          <label>Email
            <input value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" autoFocus />
          </label>
          <label>Password
            <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="At least 6 characters" />
          </label>
          <label>LinkedIn URL
            <input value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="https://linkedin.com/in/you" />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy} style={{ width: '100%', marginTop: 8 }}>{busy ? 'Creating…' : 'Create account'}</button>
          <p className="muted small" style={{ textAlign: 'center', marginBottom: 0, marginTop: 16 }}>
            Already registered? <Link to="/login">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
