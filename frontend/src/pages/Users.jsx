import { useEffect, useState } from 'react';
import { get, post, del } from '../api.js';

// Global user accounts (admin). Per-hackathon view/judge access is set inside each hackathon's
// admin panel.
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
            <input type="password" placeholder="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
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
          <thead><tr><th>Email</th><th>Role</th><th>LinkedIn</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.role === 'admin' ? <span className="badge accent">admin</span> : <span className="badge">user</span>}</td>
                <td className="small">{u.linkedin ? <a href={u.linkedin} target="_blank" rel="noreferrer">profile</a> : <span className="faint">—</span>}</td>
                <td style={{ textAlign: 'right' }}>
                  {u.role !== 'admin' && <button className="link danger" onClick={() => removeUser(u)}>remove</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
