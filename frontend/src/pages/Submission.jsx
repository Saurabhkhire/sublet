import { useEffect, useState } from 'react';
import { get, post } from '../api.js';
import { useAuth } from '../auth.jsx';
import MultiSelect from '../components/MultiSelect.jsx';

export default function Submission() {
  const { user } = useAuth();
  const [meta, setMeta] = useState(null);
  const [users, setUsers] = useState([]);
  const [mine, setMine] = useState([]);
  const [form, setForm] = useState({
    name: '', short_description: '', demo_video_link: '', git_link: '',
    participants: [], tracks: [], sponsors: [],
  });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  function reload() {
    get('/api/projects').then(setMine).catch(() => {});
  }
  useEffect(() => {
    get('/api/meta').then(setMeta);
    get('/api/meta/users').then(setUsers);
    reload();
  }, []);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await post('/api/projects', form);
      setMsg('Project submitted!');
      setForm({ name: '', short_description: '', demo_video_link: '', git_link: '', participants: [], tracks: [], sponsors: [] });
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!meta) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <h1>Submit a Project</h1>
      <p className="muted">
        You are automatically added as a participant. Each person can only be part of one project.
      </p>

      <form onSubmit={submit} className="card">
        <label>Project name
          <input value={form.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label>Short description
          <textarea rows={2} value={form.short_description} onChange={(e) => set('short_description', e.target.value)} />
        </label>
        <label>Demo video link
          <input value={form.demo_video_link} onChange={(e) => set('demo_video_link', e.target.value)} placeholder="https://…" />
        </label>
        <label>Git repository link
          <input value={form.git_link} onChange={(e) => set('git_link', e.target.value)} placeholder="https://github.com/…" />
        </label>

        <div>
          <span className="field-label">Team members (besides you) — select multiple</span>
          <MultiSelect
            options={users.filter((u) => u.id !== user.id).map((u) => ({ value: u.id, label: u.email }))}
            value={form.participants}
            onChange={(v) => set('participants', v)}
          />
        </div>
        <div>
          <span className="field-label">Tracks — select multiple</span>
          <MultiSelect options={meta.tracks.map((t) => ({ value: t.id, label: t.name }))}
            value={form.tracks} onChange={(v) => set('tracks', v)} />
        </div>
        <div>
          <span className="field-label">Sponsors used — select multiple</span>
          <MultiSelect options={meta.sponsors.map((s) => ({ value: s.id, label: s.name }))}
            value={form.sponsors} onChange={(v) => set('sponsors', v)} />
        </div>

        {error && <p className="error">{error}</p>}
        {msg && <p className="success">{msg}</p>}
        <button type="submit">Submit project</button>
      </form>

      <h2>My Projects</h2>
      {mine.length === 0 ? <p className="muted">No projects yet.</p> : (
        <div className="grid">
          {mine.map((p) => (
            <div key={p.id} className="card">
              <h3>{p.name}</h3>
              <p>{p.short_description}</p>
              <p className="muted small">
                Team: {p.participants.map((x) => x.email).join(', ')}
              </p>
              <p className="muted small">
                Tracks: {p.tracks.map((t) => t.name).join(', ') || '—'} · Sponsors: {p.sponsors.map((s) => s.name).join(', ') || '—'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
