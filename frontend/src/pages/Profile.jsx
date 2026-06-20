import { useEffect, useState } from 'react';
import { put } from '../api.js';
import { useAuth } from '../auth.jsx';

// Self-service account settings: any logged-in user can update their LinkedIn URL and password.
export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [linkedin, setLinkedin] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setLinkedin(user?.linkedin || ''); }, [user]);

  async function saveLinkedin(e) {
    e.preventDefault();
    setError(''); setMsg(''); setBusy(true);
    try {
      await put('/api/auth/profile', { linkedin });
      await refreshUser();
      setMsg('LinkedIn updated.');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function savePassword(e) {
    e.preventDefault();
    setError(''); setMsg('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      await put('/api/auth/profile', { password });
      setPassword(''); setConfirm('');
      setMsg('Password changed.');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="page narrow">
      <h1>Account settings</h1>
      <p className="muted">Signed in as <strong>{user?.email}</strong>{user?.role === 'admin' ? ' (admin)' : ''}.</p>

      <form onSubmit={saveLinkedin} className="card">
        <h3 style={{ marginTop: 0 }}>LinkedIn</h3>
        <label>LinkedIn URL
          <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/you" />
        </label>
        <button type="submit" disabled={busy}>Save LinkedIn</button>
      </form>

      <form onSubmit={savePassword} className="card">
        <h3 style={{ marginTop: 0 }}>Change password</h3>
        <label>New password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
        </label>
        <label>Confirm new password
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter new password" />
        </label>
        <button type="submit" disabled={busy || !password}>Change password</button>
      </form>

      {error && <p className="error">{error}</p>}
      {msg && <p className="success">{msg}</p>}
    </div>
  );
}
