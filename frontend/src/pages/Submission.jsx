import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { get, post, put } from '../api.js';
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
    app_url: '',
    tracks: [], sponsors: [],
  });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [editingId, setEditingId] = useState(null);

  function reload() { get(`/api/hackathons/${hid}/projects?mine=1`).then(setMine).catch(() => {}); }
  useEffect(() => { reload(); }, [hid]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const eventDate = (meta.hackathon.event_date || '').trim();
  const todayUTC = new Date().toISOString().slice(0, 10);
  const submissionOpen = (() => {
    if (!eventDate) return true;
    const deadline = new Date(eventDate + 'T00:00:00Z');
    deadline.setDate(deadline.getDate() + 1);
    return todayUTC >= eventDate && todayUTC <= deadline.toISOString().slice(0, 10);
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
      setForm({ name: '', short_description: '', demo_video_link: '', git_link: '', app_url: '', tracks: [], sponsors: [] });
      setParticipants([]);
      reload();
    } catch (err) { setError(err.message); }
  }

  const participantIds = new Set([user.id, ...participants.map((p) => p.id)]);
  const alreadyOnProject = mine.length > 0;

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

      {alreadyOnProject && (
        <div className="card" style={{ borderColor: 'var(--accent)' }}>
          <p style={{ margin: 0 }}>✅ You're already on a project for this hackathon. Use the <strong>Edit</strong> button below to make changes.</p>
        </div>
      )}

      {!alreadyOnProject && (
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
          <div className="row" style={{ gap: 16 }}>
            <label style={{ flex: 1, minWidth: 220 }}>Live app URL
              <input value={form.app_url} onChange={(e) => set('app_url', e.target.value)} placeholder="https://yourapp.com" />
            </label>
          </div>

          <div>
            <span className="field-label">Team members (besides you)</span>
            <p className="muted small" style={{ marginTop: 2, marginBottom: 8 }}>Type an email to search and add teammates one at a time.</p>
            <div className="multiselect" style={{ marginBottom: 8 }}>
              {participants.map((p) => (
                <span key={p.id} className="badge" style={{ paddingRight: 4 }}>
                  {p.email}
                  <button type="button" className="link danger sm" style={{ padding: '0 4px' }}
                    onClick={() => removeParticipant(p.id)}>✕</button>
                </span>
              ))}
              {participants.length === 0 && <span className="faint small">No teammates added yet — search below to add some.</span>}
            </div>
            <UserSearchInput endpoint="/api/meta/users" onSelect={addParticipant} excludeIds={participantIds} placeholder="Search teammates by email…" />
          </div>

          <span className="field-label">Tracks</span>
          <MultiSelect options={meta.tracks.map((t) => ({ value: t.id, label: t.name }))} value={form.tracks} onChange={(v) => set('tracks', v)} />
          <span className="field-label">Sponsors used</span>
          <MultiSelect options={meta.sponsors.map((s) => ({ value: s.id, label: s.name }))} value={form.sponsors} onChange={(v) => set('sponsors', v)} />

          {error && <p className="error" style={{ marginTop: 14 }}>{error}</p>}
          {msg && <p className="success" style={{ marginTop: 14 }}>{msg}</p>}
          <button type="submit" style={{ marginTop: 16 }} disabled={!submissionOpen}>Submit project</button>
        </form>
      )}

      <h2>My Projects</h2>
      {mine.length === 0 ? (
        <div className="card empty"><p>No projects yet.</p></div>
      ) : (
        <div className="stack">
          {mine.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              hid={hid}
              currentUserId={user.id}
              meta={meta}
              isEditing={editingId === p.id}
              onStartEdit={() => setEditingId(p.id)}
              onCancelEdit={() => setEditingId(null)}
              onSaved={(updated) => {
                setMine((prev) => prev.map((x) => x.id === updated.id ? updated : x));
                setEditingId(null);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, hid, currentUserId, meta, isEditing, onStartEdit, onCancelEdit, onSaved }) {
  const [editForm, setEditForm] = useState({});
  const [editParticipants, setEditParticipants] = useState([]);
  const [editTracks, setEditTracks] = useState([]);
  const [editSponsors, setEditSponsors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  function startEdit() {
    setEditForm({
      name: project.name,
      short_description: project.short_description || '',
      demo_video_link: project.demo_video_link || '',
      git_link: project.git_link || '',
      app_url: project.app_url || '',
    });
    setEditParticipants(project.participants.map((p) => ({ id: p.id, email: p.email })));
    setEditTracks(project.tracks.map((t) => t.id));
    setEditSponsors(project.sponsors.map((s) => s.id));
    setEditError('');
    onStartEdit();
  }

  function cancel() { setEditError(''); onCancelEdit(); }

  const eSet = (k, v) => setEditForm((f) => ({ ...f, [k]: v }));

  function addEditParticipant(u) {
    if (editParticipants.some((p) => p.id === u.id)) return;
    setEditParticipants((prev) => [...prev, { id: u.id, email: u.email }]);
  }
  function removeEditParticipant(id) {
    setEditParticipants((prev) => prev.filter((p) => p.id !== id));
  }

  async function save(e) {
    e.preventDefault();
    setEditError('');
    if (editParticipants.length === 0) {
      setEditError('A project must have at least one team member.');
      return;
    }
    setSaving(true);
    try {
      const updated = await put(`/api/hackathons/${hid}/projects/${project.id}`, {
        ...editForm,
        participants: editParticipants.map((p) => p.id),
        tracks: editTracks,
        sponsors: editSponsors,
      });
      onSaved(updated);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const editParticipantIds = new Set(editParticipants.map((p) => p.id));

  if (!isEditing) {
    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ marginTop: 0, marginBottom: 4 }}>{project.name}</h3>
            <p className="muted small" style={{ marginTop: 0 }}>{project.short_description}</p>
            <div className="multiselect" style={{ marginBottom: 6 }}>
              {project.tracks.map((t) => <span key={t.id} className="badge accent">{t.name}</span>)}
              {project.sponsors.map((s) => <span key={s.id} className="badge">{s.name}</span>)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 4 }}>
              {project.demo_video_link && (
                <a href={project.demo_video_link} target="_blank" rel="noreferrer" className="small">▶ Demo video</a>
              )}
              {project.git_link && (
                <a href={project.git_link} target="_blank" rel="noreferrer" className="small">⌥ Git repo</a>
              )}
              {project.app_url && (
                <a href={project.app_url} target="_blank" rel="noreferrer" className="small">🌐 Live app</a>
              )}
            </div>
            <p className="faint small" style={{ marginTop: 8, marginBottom: 0 }}>
              Team: {project.participants.map((x) => x.email).join(', ')}
            </p>
          </div>
          <button type="button" className="btn-outline sm" style={{ flexShrink: 0 }} onClick={startEdit}>Edit</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ borderColor: 'var(--accent)' }}>
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>Edit project</h3>
      <form onSubmit={save} className="stack" style={{ gap: 14 }}>
        <label>Project name
          <input value={editForm.name} onChange={(e) => eSet('name', e.target.value)} placeholder="Project name" required />
        </label>
        <label>Short description
          <textarea rows={2} value={editForm.short_description} onChange={(e) => eSet('short_description', e.target.value)} placeholder="One or two sentences" />
        </label>
        <div className="row" style={{ gap: 16 }}>
          <label style={{ flex: 1, minWidth: 180 }}>Demo video link
            <input value={editForm.demo_video_link} onChange={(e) => eSet('demo_video_link', e.target.value)} placeholder="https://…" />
          </label>
          <label style={{ flex: 1, minWidth: 180 }}>Git repository link
            <input value={editForm.git_link} onChange={(e) => eSet('git_link', e.target.value)} placeholder="https://github.com/…" />
          </label>
        </div>
        <div className="row" style={{ gap: 16 }}>
          <label style={{ flex: 1, minWidth: 180 }}>Live app URL
            <input value={editForm.app_url} onChange={(e) => eSet('app_url', e.target.value)} placeholder="https://yourapp.com" />
          </label>
        </div>

        <div>
          <span className="field-label">Team members</span>
          <p className="muted small" style={{ marginTop: 2, marginBottom: 8 }}>All team members can edit. Remove anyone or search to add more.</p>
          <div className="multiselect" style={{ marginBottom: 8 }}>
            {editParticipants.map((p) => (
              <span key={p.id} className="badge" style={{ paddingRight: 4 }}>
                {p.email}
                <button type="button" className="link danger sm" style={{ padding: '0 4px' }}
                  onClick={() => removeEditParticipant(p.id)}>✕</button>
              </span>
            ))}
            {editParticipants.length === 0 && (
              <span className="faint small">No team members — add at least one.</span>
            )}
          </div>
          <UserSearchInput
            endpoint="/api/meta/users"
            onSelect={addEditParticipant}
            excludeIds={editParticipantIds}
            placeholder="Search teammates by email…"
          />
        </div>

        <div>
          <span className="field-label">Tracks</span>
          <MultiSelect
            options={meta.tracks.map((t) => ({ value: t.id, label: t.name }))}
            value={editTracks}
            onChange={setEditTracks}
          />
        </div>

        <div>
          <span className="field-label">Sponsors used</span>
          <MultiSelect
            options={meta.sponsors.map((s) => ({ value: s.id, label: s.name }))}
            value={editSponsors}
            onChange={setEditSponsors}
          />
        </div>

        {editError && <p className="error" style={{ margin: 0 }}>{editError}</p>}

        <div className="row" style={{ gap: 10, marginTop: 4 }}>
          <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          <button type="button" className="btn-outline" onClick={cancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
