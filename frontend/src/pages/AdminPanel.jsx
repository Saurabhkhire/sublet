import { useEffect, useState } from 'react';
import { get, post, put, patch, del } from '../api.js';

export default function AdminPanel() {
  return (
    <div className="container">
      <h1>Admin Panel</h1>
      <ConfigSection />
      <div className="grid">
        <ListSection title="Tracks" base="/api/admin/tracks" />
        <ListSection title="Sponsors" base="/api/admin/sponsors" />
      </div>
      <UsersSection />
      <MatchingSection />
    </div>
  );
}

function ConfigSection() {
  const [cfg, setCfg] = useState({ hackathon_name: '', details: '' });
  const [msg, setMsg] = useState('');
  useEffect(() => { get('/api/admin/config').then(setCfg); }, []);
  async function save(e) {
    e.preventDefault();
    const updated = await put('/api/admin/config', cfg);
    setCfg(updated); setMsg('Saved!');
    setTimeout(() => setMsg(''), 1500);
  }
  return (
    <section className="card">
      <h2>Hackathon Details</h2>
      <form onSubmit={save}>
        <label>Hackathon name
          <input value={cfg.hackathon_name || ''} onChange={(e) => setCfg({ ...cfg, hackathon_name: e.target.value })} />
        </label>
        <label>Details
          <textarea rows={3} value={cfg.details || ''} onChange={(e) => setCfg({ ...cfg, details: e.target.value })} />
        </label>
        <button type="submit">Save</button> {msg && <span className="success">{msg}</span>}
      </form>
    </section>
  );
}

// Reusable CRUD list for tracks & sponsors.
function ListSection({ title, base }) {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  function load() { get(base).then(setItems); }
  useEffect(load, []);
  async function add(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await post(base, { name });
    setName(''); load();
  }
  async function rename(id, current) {
    const v = prompt(`Rename ${title.slice(0, -1)}`, current);
    if (v && v.trim()) { await put(`${base}/${id}`, { name: v.trim() }); load(); }
  }
  async function remove(id) {
    if (confirm('Delete this entry?')) { await del(`${base}/${id}`); load(); }
  }
  return (
    <section className="card">
      <h2>{title}</h2>
      <ul className="editable-list">
        {items.map((it) => (
          <li key={it.id}>
            <span>{it.name}</span>
            <span>
              <button className="link" onClick={() => rename(it.id, it.name)}>edit</button>
              <button className="link danger" onClick={() => remove(it.id)}>delete</button>
            </span>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="inline-form">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Add ${title.slice(0, -1)}`} />
        <button type="submit">Add</button>
      </form>
    </section>
  );
}

function UsersSection() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ email: '', password: '', linkedin: '' });
  const [error, setError] = useState('');
  function load() { get('/api/admin/users').then(setUsers); }
  useEffect(load, []);

  async function addUser(e) {
    e.preventDefault();
    setError('');
    try {
      await post('/api/admin/users', form);
      setForm({ email: '', password: '', linkedin: '' });
      load();
    } catch (err) { setError(err.message); }
  }
  async function toggleJudge(u) {
    await patch(`/api/admin/users/${u.id}`, { is_judge: u.is_judge ? 0 : 1 });
    load();
  }
  async function removeUser(u) {
    if (confirm(`Remove ${u.email}?`)) {
      try { await del(`/api/admin/users/${u.id}`); load(); }
      catch (err) { alert(err.message); }
    }
  }

  return (
    <section className="card">
      <h2>Users &amp; Access</h2>
      <p className="muted small">Toggle “Can view & judge” to let a person see project details and submit judging scores.</p>
      <table>
        <thead><tr><th>Email</th><th>Role</th><th>Can view & judge</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>
                {u.role === 'admin' ? '✓ (admin)' : (
                  <label className="switch">
                    <input type="checkbox" checked={u.is_judge === 1} onChange={() => toggleJudge(u)} />
                    {u.is_judge ? 'Yes' : 'No'}
                  </label>
                )}
              </td>
              <td>{u.role !== 'admin' && <button className="link danger" onClick={() => removeUser(u)}>remove</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Add a user</h3>
      <form onSubmit={addUser} className="inline-form">
        <input placeholder="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input placeholder="linkedin (optional)" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
        <button type="submit">Add user</button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  );
}

function MatchingSection() {
  const [profiles, setProfiles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [runs, setRuns] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  function load() {
    get('/api/matching/profiles').then(setProfiles);
    get('/api/matching/groups').then(setGroups);
    get('/api/matching/runs').then(setRuns);
  }
  useEffect(load, []);

  async function runMatching() {
    setMsg(''); setError('');
    try {
      const res = await post('/api/matching/run');
      setMsg(`Matched ${res.groups.reduce((a, g) => a + g.members.length, 0)} new people into ${res.groups.length} team(s).`);
      load();
    } catch (err) { setError(err.message); }
  }

  const waiting = profiles.filter((p) => p.matched === 0);

  return (
    <section className="card">
      <h2>Team Matching</h2>
      <p className="muted small">
        Matching only ever runs for people who opted in since the last run — existing teams are never reshuffled.
      </p>
      <div className="stat-row">
        <div className="stat"><strong>{profiles.length}</strong><span>opted in</span></div>
        <div className="stat"><strong>{waiting.length}</strong><span>waiting (new)</span></div>
        <div className="stat"><strong>{runs.length}</strong><span>runs so far</span></div>
      </div>
      <button onClick={runMatching} disabled={waiting.length === 0}>
        Run matching for {waiting.length} new {waiting.length === 1 ? 'person' : 'people'}
      </button>
      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <h3>People who opted in</h3>
      <table>
        <thead><tr><th>Email</th><th>Role</th><th>Plans to build</th><th>Status</th></tr></thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.id}>
              <td>{p.email}</td>
              <td>{p.role}</td>
              <td className="small">{p.plan_to_build}</td>
              <td>{p.matched ? `Team #${p.group_id}` : 'Waiting'}</td>
            </tr>
          ))}
          {profiles.length === 0 && <tr><td colSpan={4} className="muted">Nobody has opted in yet.</td></tr>}
        </tbody>
      </table>

      <h3>Formed teams</h3>
      <div className="grid">
        {groups.map((g) => (
          <div key={g.group_id} className="card">
            <h4>Team #{g.group_id}</h4>
            <ul>
              {g.members.map((m) => (
                <li key={m.user_id}>{m.email} — <span className="muted">{m.role}</span></li>
              ))}
            </ul>
          </div>
        ))}
        {groups.length === 0 && <p className="muted">No teams formed yet.</p>}
      </div>
    </section>
  );
}
