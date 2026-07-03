import { useEffect, useState } from 'react';
import { get, post, put, del } from '../api.js';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ email: '', password: '', linkedin: '' });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  function load() { get('/api/admin/users').then(setUsers); }
  useEffect(load, []);

  async function addUser(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await post('/api/admin/users', form);
      setForm({ email: '', password: '', linkedin: '' });
      setMsg('User added.');
      load();
    } catch (err) { setError(err.message); }
  }

  async function removeUser(u) {
    if (!confirm(`Remove ${u.email}? This deletes their submissions, matching profile and scores.`)) return;
    try { await del(`/api/admin/users/${u.id}`); load(); }
    catch (err) { alert(err.message); }
  }

  async function removeAll() {
    if (!confirm('Delete ALL non-admin users? This also removes their submissions, matching profiles, scores, and any projects left with no participants. This cannot be undone.')) return;
    try {
      const res = await del('/api/admin/users');
      setMsg(`Deleted ${res.deleted_users} user(s) and ${res.deleted_projects} orphaned project(s).`);
      load();
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="page">
      <div className="spread">
        <h1 style={{ margin: 0 }}>Users</h1>
        {users.filter((u) => u.role !== 'admin').length > 0 && (
          <button className="danger outline" onClick={removeAll}>Delete all users</button>
        )}
      </div>
      <p className="muted">Global accounts. To let someone view &amp; judge projects, open a hackathon → Admin → Judges.</p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add a user</h3>
        <form onSubmit={addUser} className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <span className="field-label" style={{ margin: '0 0 6px' }}>Email</span>
            <input placeholder="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <span className="field-label" style={{ margin: '0 0 6px' }}>Password</span>
            <input placeholder="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <span className="field-label" style={{ margin: '0 0 6px' }}>LinkedIn (optional)</span>
            <input placeholder="https://…" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
          </div>
          <button type="submit">Add</button>
        </form>
        {error && <p className="error">{error}</p>}
        {msg && <p className="success">{msg}</p>}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>LinkedIn</th>
              <th>Password</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow key={u.id} user={u} onRemove={removeUser} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRow({ user: u, onRemove }) {
  const [resetting, setResetting] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');

  async function savePassword(e) {
    e.preventDefault();
    setPwMsg(''); setPwErr('');
    if (!newPw.trim()) { setPwErr('Enter a new password.'); return; }
    try {
      await put(`/api/admin/users/${u.id}`, { password: newPw });
      setPwMsg('Password updated.');
      setNewPw('');
      setTimeout(() => { setPwMsg(''); setResetting(false); }, 1500);
    } catch (err) { setPwErr(err.message); }
  }

  return (
    <>
      <tr>
        <td>{u.email}</td>
        <td>{u.role === 'admin' ? <span className="badge accent">admin</span> : <span className="badge">user</span>}</td>
        <td className="small">{u.linkedin ? <a href={u.linkedin} target="_blank" rel="noreferrer">profile</a> : <span className="faint">—</span>}</td>
        <td className="small">
          {resetting ? (
            <form onSubmit={savePassword} className="row" style={{ gap: 6, margin: 0 }}>
              <input
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="new password"
                style={{ minWidth: 130, marginTop: 0 }}
                autoFocus
              />
              <button type="submit" className="sm">Set</button>
              <button type="button" className="btn-outline sm" onClick={() => { setResetting(false); setNewPw(''); setPwErr(''); }}>Cancel</button>
            </form>
          ) : (
            <button className="link sm" onClick={() => setResetting(true)}>Reset password</button>
          )}
          {pwMsg && <span className="success small" style={{ marginLeft: 8 }}>{pwMsg}</span>}
          {pwErr && <span className="error small" style={{ marginLeft: 8 }}>{pwErr}</span>}
        </td>
        <td style={{ textAlign: 'right' }}>
          {u.role !== 'admin' && <button className="link danger" onClick={() => onRemove(u)}>remove</button>}
        </td>
      </tr>
    </>
  );
}
