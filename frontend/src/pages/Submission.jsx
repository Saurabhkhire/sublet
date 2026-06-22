import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { get, post } from '../api.js';
import { useAuth } from '../auth.jsx';
import MultiSelect from '../components/MultiSelect.jsx';
import UserSearchInput from '../components/UserSearchInput.jsx';

export default function Submission() {
  const { meta, hid } = useOutletContext();
  const { user } = useAuth();
  const [mine, setMine] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [form, setForm] = useState({
    name: '', short_description: '', demo_video_link: '', git_link: '',
    tracks: [], sponsors: [],
  });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  function reload() { get(`/api/hackathons/${hid}/projects`).then(setMine).catch(() => {}); }
  useEffect(() => { reload(); }, [hid]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Submissions are only allowed within the hackathon's 48-hour UTC window.
  const eventDate = (meta.hackathon.event_date || '').trim();
  const todayUTC = new Date().toISOString().slice(0, 10);
  const submissionOpen = (() => {
    if (!eventDate) return true;
    const deadline = new Date(eventDate + 'T00:00:00Z');
    deadline.setDate(deadline.getDate() + 1);
    const deadlineStr = deadline.toISOString().slice(0, 10);
    return todayUTC >= eventDate && todayUTC <= deadlineStr;
  })();

  function addParticipant(u) {
    if (participants.some((p) => p.id === u.id)) return;
    setParticipants((prev) => [...prev, { id: u.id, email: u.email }]);
  }
  function removeParticipant(id) { setParticipants((prev) => prev.filter((p) => p.id !== id)); }

  async function submit(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await post(`/api/hackathons/${hid}/projects`, {
        ...form,
        participants: participants.map((p) => p.id),
      });
      setMsg('Project submitted!');
      setForm({ name: '', short_description: '', demo_video_link: '', git_link: '', tracks: [], sponsors: [] });
      setParticipants([]);
      reload();
    } catch (err) { setError(err.message); }
  }

  const participantIds = new Set([user.id, ...participants.map((p) => p.id)]);

  return (
    <div className="stack">
      <div>
        <h1>Submit a Project</h1>
        <p className="muted">You're automatically added as a participant. Each person can be on only one project per hackathon.</p>
      </div>

      {eventDate && !submissionOpen && (
        <div className="card" style={{ borderColor: 'var(--warn, #b45309)' }}>
          <p style={{ margin: 0 }}>⏳ Submissions open only on the day of the hackathon (<strong>{eventDate}</strong>). Please come back then.</p>
        </div>
      )}

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

        <div>
          <span className="field-label">Team members (besides you)</span>
          <p className="muted small" style={{ marginTop: 2, marginBottom: 8 }}>Type an email to search and add teammates one at a time.</p>
          <div className="multiselect" style={{ marginBottom: 8 }}>
            {participants.map((p) => (
              <span key={p.id} className="badge" style={{ paddingRight: 4 }}>
                {p.email}
                <button
                  type="button"
                  className="link danger sm"
                  style={{ padding: '0 4px' }}
                  onClick={() => removeParticipant(p.id)}
                >✕</button>
              </span>
            ))}
            {participants.length === 0 && <span className="faint small">No teammates added yet — search below to add some.</span>}
          </div>
          <UserSearchInput
            endpoint="/api/meta/users"
            onSelect={addParticipant}
            excludeIds={participantIds}
            placeholder="Search teammates by email…"
          />
        </div>

        <span className="field-label">Tracks</span>
        <MultiSelect options={meta.tracks.map((t) => ({ value: t.id, label: t.name }))} value={form.tracks} onChange={(v) => set('tracks', v)} />
        <span className="field-label">Sponsors used</span>
        <MultiSelect options={meta.sponsors.map((s) => ({ value: s.id, label: s.name }))} value={form.sponsors} onChange={(v) => set('sponsors', v)} />

        {error && <p className="error" style={{ marginTop: 14 }}>{error}</p>}
        {msg && <p className="success" style={{ marginTop: 14 }}>{msg}</p>}
        <button type="submit" style={{ marginTop: 16 }} disabled={!submissionOpen}>Submit project</button>
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
