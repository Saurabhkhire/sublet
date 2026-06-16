import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { get, post } from '../api.js';
import { useAuth } from '../auth.jsx';
import MultiSelect from '../components/MultiSelect.jsx';

export default function Submission() {
  const { meta, hid } = useOutletContext();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [mine, setMine] = useState([]);
  const [form, setForm] = useState({
    name: '', short_description: '', demo_video_link: '', git_link: '',
    participants: [], tracks: [], sponsors: [],
  });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  function reload() { get(`/api/hackathons/${hid}/projects`).then(setMine).catch(() => {}); }
  useEffect(() => { get('/api/meta/users').then(setUsers); reload(); }, [hid]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await post(`/api/hackathons/${hid}/projects`, form);
      setMsg('Project submitted!');
      setForm({ name: '', short_description: '', demo_video_link: '', git_link: '', participants: [], tracks: [], sponsors: [] });
      reload();
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="stack">
      <div>
        <h1>Submit a Project</h1>
        <p className="muted">You're automatically added as a participant. Each person can be on only one project per hackathon.</p>
      </div>

      <form onSubmit={submit} className="card">
        <label>Project name
          <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Your project name" />
        </label>
        <label>Short description
          <textarea rows={2} value={form.short_description} onChange={(e) => set('short_description', e.target.value)} placeholder="One or two sentences" />
        </label>
        <div className="row" style={{ gap: 16 }}>
          <label style={{ flex: 1, minWidth: 220 }}>Demo video link
            <input value={form.demo_video_link} onChange={(e) => set('demo_video_link', e.target.value)} placeholder="https://…" />
          </label>
          <label style={{ flex: 1, minWidth: 220 }}>Git repository link
            <input value={form.git_link} onChange={(e) => set('git_link', e.target.value)} placeholder="https://github.com/…" />
          </label>
        </div>
        <span className="field-label">Team members (besides you)</span>
        <MultiSelect options={users.filter((u) => u.id !== user.id).map((u) => ({ value: u.id, label: u.email }))} value={form.participants} onChange={(v) => set('participants', v)} />
        <span className="field-label">Tracks</span>
        <MultiSelect options={meta.tracks.map((t) => ({ value: t.id, label: t.name }))} value={form.tracks} onChange={(v) => set('tracks', v)} />
        <span className="field-label">Sponsors used</span>
        <MultiSelect options={meta.sponsors.map((s) => ({ value: s.id, label: s.name }))} value={form.sponsors} onChange={(v) => set('sponsors', v)} />

        {error && <p className="error" style={{ marginTop: 14 }}>{error}</p>}
        {msg && <p className="success" style={{ marginTop: 14 }}>{msg}</p>}
        <button type="submit" style={{ marginTop: 16 }}>Submit project</button>
      </form>

      <h2>My Projects</h2>
      {mine.length === 0 ? (
        <div className="card empty"><p>No projects yet.</p></div>
      ) : (
        <div className="grid">
          {mine.map((p) => (
            <div key={p.id} className="card">
              <h3 style={{ marginTop: 0 }}>{p.name}</h3>
              <p className="muted small">{p.short_description}</p>
              <div className="multiselect">
                {p.tracks.map((t) => <span key={t.id} className="badge accent">{t.name}</span>)}
                {p.sponsors.map((s) => <span key={s.id} className="badge">{s.name}</span>)}
              </div>
              <p className="faint small" style={{ marginTop: 10, marginBottom: 0 }}>Team: {p.participants.map((x) => x.email).join(', ')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
