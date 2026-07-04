import { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { get, post, put, del } from '../api.js';
import UserSearchInput from '../components/UserSearchInput.jsx';

export default function AdminPanel() {
  const { meta, reload, hid } = useOutletContext();
  return (
    <div className="stack">
      <h1>Admin · {meta.hackathon.name}</h1>
      <DetailsSection hid={hid} meta={meta} reload={reload} />
      <TracksEditor hid={hid} reload={reload} />
      <SponsorsEditor hid={hid} reload={reload} />
      <JudgesSection hid={hid} />
      <JudgeAssignmentSection hid={hid} meta={meta} />
      <SpeakersSection hid={hid} />
      <DemoSlotsSection hid={hid} />
      <AwardsSection hid={hid} />
      <VoiceRulesSection hid={hid} meta={meta} reload={reload} />
      <SmtpConfigSection />
      <EmailsSection hid={hid} meta={meta} />
      <ProjectsSection hid={hid} meta={meta} />
      <MatchingSection hid={hid} />
      <DangerZone hid={hid} name={meta.hackathon.name} />
      <SystemSection />
    </div>
  );
}

function DetailsSection({ hid, meta, reload }) {
  const h = meta.hackathon;
  const [form, setForm] = useState({
    name: h.name, details: h.details, support_info: h.support_info || '', schedule: h.schedule || '',
    event_date: h.event_date || '', start_time: h.start_time || '', end_time: h.end_time || '', location: h.location || '',
    voice_mode: h.voice_mode || 'off', submission_deadline: h.submission_deadline || '',
    auto_stop_speaker: h.auto_stop_speaker !== 0, auto_advance_demo: h.auto_advance_demo !== 0,
  });
  const [msg, setMsg] = useState('');
  async function save(e) {
    e.preventDefault();
    await put(`/api/hackathons/${hid}`, form);
    await reload();
    setMsg('Saved!'); setTimeout(() => setMsg(''), 1500);
  }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <section className="card">
      <h3 style={{ marginTop: 0 }}>Hackathon details</h3>
      <form onSubmit={save}>
        <label>Name<input value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
        <label>Description<textarea rows={3} value={form.details} onChange={(e) => set('details', e.target.value)} /></label>
        <label>Date <span className="faint small">(projects can only be submitted on this day)</span>
          <input type="date" value={form.event_date} onChange={(e) => set('event_date', e.target.value)} />
        </label>
        <div className="row" style={{ gap: 16 }}>
          <label style={{ flex: 1, minWidth: 110 }}>Start time
            <input type="time" value={form.start_time} onChange={(e) => set('start_time', e.target.value)} />
          </label>
          <label style={{ flex: 1, minWidth: 110 }}>End time
            <input type="time" value={form.end_time} onChange={(e) => set('end_time', e.target.value)} />
          </label>
          <label style={{ flex: 1, minWidth: 130 }}>Submission deadline <span className="faint small">(UTC, +30 min grace)</span>
            <input type="time" value={form.submission_deadline} onChange={(e) => set('submission_deadline', e.target.value)} />
          </label>
        </div>
        <label>Voice announcements <span className="faint small">(browser text-to-speech for speaker &amp; demo day intros)</span>
          <select value={form.voice_mode} onChange={(e) => set('voice_mode', e.target.value)}>
            <option value="off">No voice</option>
            <option value="male">Male voice</option>
            <option value="female">Female voice</option>
          </select>
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2, marginBottom: 6 }}>
          <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 0 }}>
            <input type="checkbox" checked={!!form.auto_stop_speaker} onChange={(e) => set('auto_stop_speaker', e.target.checked)} style={{ width: 'auto', margin: 0 }} />
            <span>Auto-start next speaker when current finishes <span className="faint small">(Speaker Schedule)</span></span>
          </label>
          <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 0 }}>
            <input type="checkbox" checked={!!form.auto_advance_demo} onChange={(e) => set('auto_advance_demo', e.target.checked)} style={{ width: 'auto', margin: 0 }} />
            <span>Auto-advance to next demo when current finishes <span className="faint small">(Demo Day)</span></span>
          </label>
        </div>
        <label>Location
          <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Venue address or online link" />
        </label>
        <label>Community &amp; Support <span className="faint small">(Discord/Slack invite & how to get help — shown to everyone)</span>
          <textarea rows={2} value={form.support_info} onChange={(e) => set('support_info', e.target.value)} placeholder="https://discord.gg/… — join for announcements and support" />
        </label>
        <label>Schedule
          <textarea rows={3} value={form.schedule} onChange={(e) => set('schedule', e.target.value)} placeholder="Kickoff, checkpoints, submission deadline, judging…" />
        </label>
        <div className="row"><button type="submit">Save</button>{msg && <span className="success">{msg}</span>}</div>
      </form>
    </section>
  );
}

function TracksEditor({ hid, reload }) {
  const base = `/api/hackathons/${hid}/tracks`;
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState({ name: '', description: '' });
  function load() { get(base).then(setItems); }
  useEffect(load, [hid]);
  function setItem(id, k, v) { setItems((arr) => arr.map((it) => (it.id === id ? { ...it, [k]: v } : it))); }
  async function add(e) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    await post(base, draft); setDraft({ name: '', description: '' }); load(); reload();
  }
  async function save(it) { await put(`${base}/${it.id}`, { name: it.name, description: it.description }); load(); reload(); }
  async function remove(id) { if (confirm('Delete this track?')) { await del(`${base}/${id}`); load(); reload(); } }
  return (
    <section className="card">
      <h3 style={{ marginTop: 0 }}>Tracks (themes) <span className="faint small">({items.length})</span></h3>
      <div className="stack">
        {items.map((it) => (
          <div key={it.id} className="card flat" style={{ background: 'var(--surface-2)', marginBottom: 0 }}>
            <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
              <input style={{ flex: 1, minWidth: 160 }} value={it.name} onChange={(e) => setItem(it.id, 'name', e.target.value)} placeholder="Track name" />
              <button className="sm" onClick={() => save(it)}>Save</button>
              <button className="sm danger outline" onClick={() => remove(it.id)}>Delete</button>
            </div>
            <textarea rows={2} value={it.description || ''} onChange={(e) => setItem(it.id, 'description', e.target.value)} placeholder="Track description (what this theme is about)" />
          </div>
        ))}
        {items.length === 0 && <span className="faint small">No tracks yet.</span>}
      </div>
      <form onSubmit={add} style={{ marginTop: 14 }}>
        <div className="row" style={{ gap: 8 }}>
          <input style={{ flex: 1 }} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="New track name" />
          <button type="submit">Add track</button>
        </div>
        <textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="New track description (optional)" />
      </form>
    </section>
  );
}

function SponsorsEditor({ hid, reload }) {
  const base = `/api/hackathons/${hid}/sponsors`;
  const [items, setItems] = useState([]);
  const empty = { name: '', description: '', access_instructions: '', prizes: '' };
  const [draft, setDraft] = useState(empty);
  function load() { get(base).then(setItems); }
  useEffect(load, [hid]);
  function setItem(id, k, v) { setItems((arr) => arr.map((it) => (it.id === id ? { ...it, [k]: v } : it))); }
  async function add(e) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    await post(base, draft); setDraft(empty); load(); reload();
  }
  async function save(it) {
    await put(`${base}/${it.id}`, { name: it.name, description: it.description, access_instructions: it.access_instructions, prizes: it.prizes });
    load(); reload();
  }
  async function remove(id) { if (confirm('Delete this sponsor?')) { await del(`${base}/${id}`); load(); reload(); } }
  return (
    <section className="card">
      <h3 style={{ marginTop: 0 }}>Sponsors <span className="faint small">({items.length})</span></h3>
      <p className="muted small" style={{ marginTop: 0 }}>Each sponsor has a description, tool access &amp; credits instructions, and prizes — all shown to participants.</p>
      <div className="stack">
        {items.map((it) => (
          <div key={it.id} className="card flat" style={{ background: 'var(--surface-2)', marginBottom: 0 }}>
            <div className="row" style={{ gap: 8 }}>
              <input style={{ flex: 1, minWidth: 160 }} value={it.name} onChange={(e) => setItem(it.id, 'name', e.target.value)} placeholder="Sponsor name" />
              <button className="sm" onClick={() => save(it)}>Save</button>
              <button className="sm danger outline" onClick={() => remove(it.id)}>Delete</button>
            </div>
            <label className="small">Description<textarea rows={2} value={it.description || ''} onChange={(e) => setItem(it.id, 'description', e.target.value)} placeholder="What the sponsor does / their challenge" /></label>
            <label className="small">Tool Access &amp; Credits<textarea rows={2} value={it.access_instructions || ''} onChange={(e) => setItem(it.id, 'access_instructions', e.target.value)} placeholder="How to access their tool, API keys, credits…" /></label>
            <label className="small">Prizes<textarea rows={2} value={it.prizes || ''} onChange={(e) => setItem(it.id, 'prizes', e.target.value)} placeholder="Prizes this sponsor is offering" /></label>
          </div>
        ))}
        {items.length === 0 && <span className="faint small">No sponsors yet.</span>}
      </div>
      <form onSubmit={add} style={{ marginTop: 14 }}>
        <div className="row" style={{ gap: 8 }}>
          <input style={{ flex: 1 }} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="New sponsor name" />
          <button type="submit">Add sponsor</button>
        </div>
        <label className="small">Description<textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description (optional)" /></label>
        <label className="small">Tool Access &amp; Credits<textarea rows={2} value={draft.access_instructions} onChange={(e) => setDraft({ ...draft, access_instructions: e.target.value })} placeholder="Access instructions & credits (optional)" /></label>
        <label className="small">Prizes<textarea rows={2} value={draft.prizes} onChange={(e) => setDraft({ ...draft, prizes: e.target.value })} placeholder="Prizes (optional)" /></label>
      </form>
    </section>
  );
}

function JudgesSection({ hid }) {
  const [judges, setJudges] = useState([]);
  function load() { get(`/api/hackathons/${hid}/judges`).then(setJudges); }
  useEffect(load, [hid]);
  async function add(user) {
    await post(`/api/hackathons/${hid}/judges`, { user_id: user.id });
    load();
  }
  async function remove(uid) { await del(`/api/hackathons/${hid}/judges/${uid}`); load(); }

  const judgeIds = new Set(judges.map((j) => j.id));

  return (
    <section className="card">
      <h3 style={{ marginTop: 0 }}>Judges · who can view &amp; score projects</h3>
      <p className="muted small">Search and add people who may see project details and submit judging scores.</p>
      <div className="row" style={{ marginBottom: 14 }}>
        <UserSearchInput endpoint="/api/admin/users" onSelect={add} excludeIds={judgeIds} placeholder="Search users by email to add as judge…" />
      </div>
      {judges.length === 0 ? <span className="faint small">No judges assigned yet.</span> : (
        <div className="multiselect">
          {judges.map((j) => (
            <span key={j.id} className="badge accent" style={{ paddingRight: 6 }}>
              {j.email}
              <button className="link danger sm" style={{ padding: '0 4px' }} onClick={() => remove(j.id)}>✕</button>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

// Admin section to view and fully edit any project in this hackathon.
function ProjectsSection({ hid, meta }) {
  const [projects, setProjects] = useState([]);
  const [expanded, setExpanded] = useState(null);

  function load() {
    get(`/api/hackathons/${hid}/projects`).then(setProjects).catch(() => {});
  }
  useEffect(load, [hid]);

  function toggle(id) { setExpanded((prev) => (prev === id ? null : id)); }

  return (
    <section className="card">
      <h3 style={{ marginTop: 0 }}>Projects <span className="faint small">({projects.length})</span></h3>
      {projects.length === 0
        ? <span className="faint small">No projects submitted yet.</span>
        : (
          <div className="stack">
            {projects.map((p) => (
              <ProjectRow
                key={p.id}
                project={p}
                hid={hid}
                meta={meta}
                expanded={expanded === p.id}
                onToggle={() => toggle(p.id)}
                onSaved={(updated) => {
                  setProjects((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                  setExpanded(null);
                }}
                onDeleted={() => { setProjects((prev) => prev.filter((x) => x.id !== p.id)); setExpanded(null); }}
              />
            ))}
          </div>
        )
      }
    </section>
  );
}

function ProjectRow({ project, hid, meta, expanded, onToggle, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    name: project.name,
    short_description: project.short_description || '',
    demo_video_link: project.demo_video_link || '',
    git_link: project.git_link || '',
  });
  const [participants, setParticipants] = useState(project.participants || []);
  const [tracks, setTracks] = useState((project.tracks || []).map((t) => t.id));
  const [sponsors, setSponsors] = useState((project.sponsors || []).map((s) => s.id));
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Reset local state when expanding
  useEffect(() => {
    if (expanded) {
      setForm({ name: project.name, short_description: project.short_description || '', demo_video_link: project.demo_video_link || '', git_link: project.git_link || '' });
      setParticipants(project.participants || []);
      setTracks((project.tracks || []).map((t) => t.id));
      setSponsors((project.sponsors || []).map((s) => s.id));
      setMsg(''); setErr('');
    }
  }, [expanded]);

  function setF(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function addParticipant(user) {
    if (participants.some((p) => p.id === user.id)) return;
    setParticipants((prev) => [...prev, { id: user.id, email: user.email }]);
  }
  function removeParticipant(uid) { setParticipants((prev) => prev.filter((p) => p.id !== uid)); }

  function toggleTrack(id) {
    setTracks((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function toggleSponsor(id) {
    setSponsors((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg(''); setErr('');
    try {
      const updated = await put(`/api/hackathons/${hid}/projects/${project.id}`, {
        ...form,
        participants: participants.map((p) => p.id),
        tracks,
        sponsors,
      });
      setMsg('Saved!');
      setTimeout(() => { setMsg(''); onSaved(updated); }, 1000);
    } catch (e) {
      setErr(e.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function deleteProject() {
    if (!confirm(`Delete project "${project.name}"? This also removes all scores.`)) return;
    await del(`/api/hackathons/${hid}/projects/${project.id}`);
    onDeleted();
  }

  const participantIds = new Set(participants.map((p) => p.id));

  return (
    <div className="card flat" style={{ background: 'var(--surface-2)', marginBottom: 0 }}>
      <div className="spread" style={{ cursor: 'pointer' }} onClick={onToggle}>
        <div>
          <strong>{project.name}</strong>
          <span className="faint small" style={{ marginLeft: 10 }}>
            {(project.participants || []).map((p) => p.email).join(', ')}
          </span>
        </div>
        <span className="faint small">{expanded ? '▲ collapse' : '▼ edit'}</span>
      </div>

      {expanded && (
        <form onSubmit={save} style={{ marginTop: 14 }} className="stack">
          <label className="small">Project name
            <input value={form.name} onChange={(e) => setF('name', e.target.value)} required />
          </label>
          <label className="small">Short description
            <textarea rows={2} value={form.short_description} onChange={(e) => setF('short_description', e.target.value)} placeholder="One-liner about the project" />
          </label>
          <label className="small">Demo video link
            <input type="url" value={form.demo_video_link} onChange={(e) => setF('demo_video_link', e.target.value)} placeholder="https://…" />
          </label>
          <label className="small">Git / repo link
            <input type="url" value={form.git_link} onChange={(e) => setF('git_link', e.target.value)} placeholder="https://github.com/…" />
          </label>

          <div>
            <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>Participants</div>
            <div className="multiselect" style={{ marginBottom: 8 }}>
              {participants.map((p) => (
                <span key={p.id} className="badge" style={{ paddingRight: 4 }}>
                  {p.email}
                  <button type="button" className="link danger sm" style={{ padding: '0 4px' }} onClick={() => removeParticipant(p.id)}>✕</button>
                </span>
              ))}
              {participants.length === 0 && <span className="faint small">No participants</span>}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <UserSearchInput endpoint="/api/admin/users" onSelect={addParticipant} excludeIds={participantIds} placeholder="Search to add participant…" />
            </div>
          </div>

          {meta.tracks.length > 0 && (
            <div>
              <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>Tracks</div>
              <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                {meta.tracks.map((t) => (
                  <label key={t.id} className="small" style={{ display: 'flex', alignItems: 'center', gap: 4, margin: 0 }}>
                    <input type="checkbox" checked={tracks.includes(t.id)} onChange={() => toggleTrack(t.id)} style={{ width: 'auto', margin: 0 }} />
                    {t.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {meta.sponsors.length > 0 && (
            <div>
              <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>Sponsors used</div>
              <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                {meta.sponsors.map((s) => (
                  <label key={s.id} className="small" style={{ display: 'flex', alignItems: 'center', gap: 4, margin: 0 }}>
                    <input type="checkbox" checked={sponsors.includes(s.id)} onChange={() => toggleSponsor(s.id)} style={{ width: 'auto', margin: 0 }} />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="row" style={{ gap: 8, marginTop: 4 }}>
            <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
            <button type="button" className="danger outline sm" onClick={deleteProject}>Delete project</button>
            {msg && <span className="success small">{msg}</span>}
            {err && <span className="error small">{err}</span>}
          </div>
        </form>
      )}
    </div>
  );
}

function MatchingSection({ hid }) {
  const base = `/api/hackathons/${hid}/matching`;
  const [profiles, setProfiles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [runs, setRuns] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    get(`${base}/profiles`).then(setProfiles);
    get(`${base}/groups`).then(setGroups);
    get(`${base}/runs`).then(setRuns);
  }
  useEffect(load, [hid]);

  async function runMatching() {
    setMsg(''); setError(''); setBusy(true);
    try {
      const res = await post(`${base}/run`);
      setMsg(`Matched ${res.groups.reduce((a, g) => a + g.members.length, 0)} new people into ${res.groups.length} team(s).`);
      load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  const waiting = profiles.filter((p) => p.matched === 0);

  return (
    <section className="card">
      <h3 style={{ marginTop: 0 }}>Team matching</h3>
      <p className="muted small">Matching only runs for people who opted in since the last run — existing teams are never reshuffled.</p>
      <div className="stat-row" style={{ margin: '14px 0' }}>
        <div className="stat"><div className="n">{profiles.length}</div><div className="l">opted in</div></div>
        <div className="stat"><div className="n">{waiting.length}</div><div className="l">waiting (new)</div></div>
        <div className="stat"><div className="n">{runs.length}</div><div className="l">runs</div></div>
      </div>
      <button onClick={runMatching} disabled={busy || waiting.length === 0}>
        {busy ? 'Matching…' : `Run matching for ${waiting.length} new ${waiting.length === 1 ? 'person' : 'people'}`}
      </button>
      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <h4 style={{ marginBottom: 6 }}>People who opted in</h4>
      <table>
        <thead><tr><th>Email</th><th>Role</th><th>Plans to build</th><th>Status</th></tr></thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.id}>
              <td>{p.email}</td><td>{p.role}</td><td className="small muted">{p.plan_to_build}</td>
              <td>{p.matched ? <span className="badge green">Team #{p.group_id}</span> : <span className="badge amber">Waiting</span>}</td>
            </tr>
          ))}
          {profiles.length === 0 && <tr><td colSpan={4} className="faint small">Nobody has opted in yet.</td></tr>}
        </tbody>
      </table>

      {groups.length > 0 && (
        <>
          <h4 style={{ marginBottom: 10 }}>Formed teams</h4>
          <div className="grid">
            {groups.map((g) => (
              <div key={g.group_id} className="card flat" style={{ background: 'var(--surface-2)' }}>
                <strong>Team #{g.group_id}</strong>
                <div className="stack" style={{ marginTop: 8 }}>
                  {g.members.map((m) => (
                    <div key={m.user_id} className="spread"><span className="small">{m.email}</span><span className="badge">{m.role}</span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// Blue-filled button helpers for the speakers admin section
const spBtn    = { background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 600, padding: '3px 10px', fontSize: 13, borderRadius: 6, cursor: 'pointer' };
const spBtnSm  = { ...spBtn, padding: '2px 8px', fontSize: 12 };
const spBtnRed = { ...spBtnSm, background: '#dc2626' };
const spBtnGry = { ...spBtnSm, background: '#6b7280' };

function SpeakersSection({ hid }) {
  const base = `/api/hackathons/${hid}/speakers`;
  const [speakers, setSpeakers] = useState([]);
  const [error, setError]       = useState('');

  // add-form state
  const EMPTY = { time: '', segment: '', speaker: '', notes: '', duration: '15', breakAfter: '' };
  const [add, setAdd]       = useState(EMPTY);
  const [addBusy, setAddBusy] = useState(false);

  // inline edit state
  const [editing, setEditing] = useState(null);

  // drag state
  const [dragSrc, setDragSrc]   = useState(null);
  const [dragOver, setDragOver] = useState(null);

  async function load() {
    try { setSpeakers(await get(base)); } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, [hid]);

  async function addSpeaker(e) {
    e.preventDefault();
    if (!add.speaker.trim() && !add.segment.trim()) return;
    setAddBusy(true); setError('');
    try {
      await post(base, {
        name: add.speaker.trim() || add.segment.trim(),
        title: add.segment.trim(),
        scheduled_start: add.time || '',
        notes: add.notes.trim(),
        duration_minutes: Math.max(1, Number(add.duration) || 15),
        break_after_minutes: Math.max(0, Number(add.breakAfter) || 0),
      });
      setAdd(EMPTY);
      await load();
    } catch (err) { setError(err.message); } finally { setAddBusy(false); }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await put(`${base}/${editing.id}`, {
        name: editing.speaker.trim() || editing.segment.trim() || editing.name,
        title: editing.segment.trim(),
        scheduled_start: editing.time || '',
        notes: editing.notes || '',
        duration_minutes: Math.max(1, Number(editing.duration) || 15),
        break_after_minutes: Math.max(0, Number(editing.breakAfter) || 0),
      });
      setEditing(null);
      await load();
    } catch (err) { setError(err.message); }
  }

  function startEdit(sp) {
    setEditing({
      id: sp.id,
      time: sp.scheduled_start || '',
      segment: sp.title || '',
      speaker: sp.name || '',
      notes: sp.notes || '',
      duration: String(sp.duration_minutes || 15),
      breakAfter: String(sp.break_after_minutes || 0),
    });
  }

  async function deleteSpeaker(id) {
    try { await del(`${base}/${id}`); await load(); } catch (err) { setError(err.message); }
  }

  async function move(idx, dir) {
    const to = idx + dir;
    if (to < 0 || to >= speakers.length) return;
    const list = [...speakers];
    [list[idx], list[to]] = [list[to], list[idx]];
    setSpeakers(list);
    await put(`${base}/reorder`, list.map((s, i) => ({ id: s.id, order_index: i })));
  }

  async function commitDrag(from, to) {
    if (from === to) return;
    const list = [...speakers];
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    setSpeakers(list);
    await put(`${base}/reorder`, list.map((s, i) => ({ id: s.id, order_index: i })));
  }

  async function resetAllScheduled() {
    if (!confirm('Reset all statuses to Scheduled? This clears live event progress so you can run again.')) return;
    try {
      for (const sp of speakers) {
        if (sp.status !== 'scheduled') {
          await put(`${base}/${sp.id}`, { status: 'scheduled', actual_start: '', actual_end: '' });
        }
      }
      await load();
    } catch (err) { setError(err.message); }
  }

  const statusColor = (s) => s === 'speaking' ? 'var(--accent)'
    : s === 'completed'   ? 'var(--green,#16a34a)'
    : s === 'rescheduled' ? '#d97706'
    : s === 'skipped'     ? '#6b7280'
    : 'transparent';

  return (
    <section className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h3 style={{ marginTop: 0, marginBottom: 0 }}>🎤 Speaker Schedule</h3>
        {speakers.some((s) => s.status !== 'scheduled') && (
          <button style={spBtn} onClick={resetAllScheduled}>↺ Reset all to Scheduled</button>
        )}
      </div>
      <p className="muted small" style={{ marginTop: 4 }}>
        Build the agenda below — drag rows or use ↑↓ to reorder. Open the <strong>Schedule</strong> tab to run the live event.
      </p>
      {error && <p className="error">{error}</p>}

      {/* ── Column headers ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr 55px 70px auto', gap: 6, padding: '4px 10px', marginBottom: 2 }}>
        {['Start (opt.)', 'Segment / Topic', 'Speaker', 'What happens', 'Min', 'Break after ☕', ''].map((h) => (
          <div key={h} className="faint" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em' }}>{h}</div>
        ))}
      </div>

      {/* ── Add row ── */}
      <form onSubmit={addSpeaker} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr 55px 70px auto', gap: 6, marginBottom: 12, alignItems: 'center' }}>
        <input type="time" value={add.time}      onChange={(e) => setAdd({ ...add, time: e.target.value })}      style={{ fontSize: 13, padding: '5px 6px' }} />
        <input placeholder="Opening remarks…"    value={add.segment}    onChange={(e) => setAdd({ ...add, segment: e.target.value })}    style={{ fontSize: 13 }} />
        <input placeholder="Alice Smith"         value={add.speaker}    onChange={(e) => setAdd({ ...add, speaker: e.target.value })}    style={{ fontSize: 13 }} />
        <input placeholder="Keynote talk on AI…" value={add.notes}      onChange={(e) => setAdd({ ...add, notes: e.target.value })}      style={{ fontSize: 13 }} />
        <input type="number" min={1} max={300}   value={add.duration}   onChange={(e) => setAdd({ ...add, duration: e.target.value })}   style={{ fontSize: 13, padding: '5px 4px' }} />
        <input type="number" min={0} max={120} placeholder="0 min" value={add.breakAfter} onChange={(e) => setAdd({ ...add, breakAfter: e.target.value })} style={{ fontSize: 13, padding: '5px 4px' }} />
        <button type="submit" style={spBtn} disabled={addBusy || (!add.speaker.trim() && !add.segment.trim())}>
          {addBusy ? '…' : '+ Add'}
        </button>
      </form>

      {/* ── Schedule list ── */}
      {speakers.length === 0 && <p className="faint small">No items yet. Fill in the row above and click + Add.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {speakers.map((sp, idx) => {
          const isEdit     = editing?.id === sp.id;
          const isDragging = dragSrc === idx;
          const isDropTarget = dragOver === idx && dragSrc !== null && dragSrc !== idx;

          return (
            <div
              key={sp.id}
              draggable={!isEdit}
              onDragStart={() => setDragSrc(idx)}
              onDragEnd={() => { setDragSrc(null); setDragOver(null); }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(idx); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => { commitDrag(dragSrc, idx); setDragSrc(null); setDragOver(null); }}
              style={{
                display: 'grid',
                gridTemplateColumns: '24px 80px 1fr 1fr 1fr 55px 70px auto',
                gap: 6, alignItems: 'center',
                padding: '7px 10px', borderRadius: 6,
                border: isDropTarget ? '1.5px dashed var(--accent)' : '1.5px solid var(--border)',
                background: 'var(--surface-2)',
                opacity: isDragging ? 0.4 : 1,
                cursor: isEdit ? 'default' : 'grab',
              }}
            >
              {/* drag handle */}
              <span style={{ color: 'var(--muted)', fontSize: 13, cursor: 'grab', userSelect: 'none' }}>⠿</span>

              {isEdit ? (
                <>
                  <input type="time" value={editing.time}    onChange={(e) => setEditing({ ...editing, time: e.target.value })}      style={{ fontSize: 12, padding: '3px 4px' }} />
                  <input value={editing.segment}             onChange={(e) => setEditing({ ...editing, segment: e.target.value })}    style={{ fontSize: 12, padding: '3px 6px' }} placeholder="Segment / Topic" />
                  <input value={editing.speaker}             onChange={(e) => setEditing({ ...editing, speaker: e.target.value })}    style={{ fontSize: 12, padding: '3px 6px' }} placeholder="Speaker" />
                  <input value={editing.notes}               onChange={(e) => setEditing({ ...editing, notes: e.target.value })}      style={{ fontSize: 12, padding: '3px 6px' }} placeholder="What happens" />
                  <input type="number" min={1} max={300} value={editing.duration}   onChange={(e) => setEditing({ ...editing, duration: e.target.value })}   style={{ fontSize: 12, padding: '3px 4px' }} />
                  <input type="number" min={0} max={120} value={editing.breakAfter} onChange={(e) => setEditing({ ...editing, breakAfter: e.target.value })} style={{ fontSize: 12, padding: '3px 4px' }} placeholder="0" />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button style={spBtn} onClick={saveEdit}>Save</button>
                    <button style={spBtnGry} onClick={() => setEditing(null)}>✕</button>
                  </div>
                </>
              ) : (
                <>
                  {/* Start time */}
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {sp.scheduled_start || '—'}
                  </div>
                  {/* Segment */}
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13 }}>{sp.title || '—'}</div>
                  </div>
                  {/* Speaker */}
                  <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sp.name}</div>
                  {/* What happens */}
                  <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sp.notes || '—'}</div>
                  {/* Duration + status */}
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {sp.duration_minutes} min
                    {sp.status !== 'scheduled' && (
                      <div style={{ fontSize: 11, color: statusColor(sp.status), fontWeight: 600, marginTop: 1 }}>
                        {sp.status.charAt(0).toUpperCase() + sp.status.slice(1)}
                      </div>
                    )}
                  </div>
                  {/* Break after */}
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {sp.break_after_minutes > 0 ? `${sp.break_after_minutes} min` : <span style={{ opacity: 0.35 }}>—</span>}
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 3 }}>
                    <button style={spBtnGry} title="Move up"   onClick={() => move(idx, -1)} disabled={idx === 0}>↑</button>
                    <button style={spBtnGry} title="Move down" onClick={() => move(idx, 1)} disabled={idx === speakers.length - 1}>↓</button>
                    <button style={spBtnSm}  onClick={() => startEdit(sp)}>✏</button>
                    <button style={spBtnRed} onClick={() => deleteSpeaker(sp.id)}>✕</button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Judge Assignment (config + attendance; full group map on /judging-groups) ─────────────

const JA_GC = { A: '#ef4444', B: '#3b82f6', C: '#22c55e', D: '#f59e0b', E: '#a855f7', F: '#06b6d4', G: '#ec4899', H: '#84cc16' };
const jagc = (g) => JA_GC[g] || '#6b7280';

function JudgeAssignmentSection({ hid }) {
  const base = `/api/hackathons/${hid}/judging-groups`;
  const [data, setData] = useState(null);
  const [params, setParams] = useState({ judge_time_minutes: 60, per_project_minutes: 5 });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const d = await get(base);
      setData(d);
      if (d.config?.judge_time_minutes) setParams({ judge_time_minutes: d.config.judge_time_minutes, per_project_minutes: d.config.per_project_minutes });
    } catch (e) { setError(e.message); }
  }
  useEffect(load, [hid]);

  async function saveParams(e) {
    e.preventDefault();
    setBusy(true); setMsg(''); setError('');
    try {
      await put(base + '/config', params);
      setMsg('Saved!'); setTimeout(() => setMsg(''), 1500);
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function assign() {
    if (!confirm('Assign all projects to judging groups now? Existing assignments will be overwritten.')) return;
    setBusy(true); setMsg(''); setError('');
    try {
      const r = await post(base + '/assign');
      let m = `Assigned ${r.projects_assigned} project(s) into ${r.group_count} group(s).`;
      if (r.judges_assigned > 0) m += ` Also assigned ${r.judges_assigned} pre-checked-in judge(s).`;
      setMsg(m);
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function resetAll() {
    if (!confirm('Reset ALL assignments? This will clear every judge group, project group, and attendance. Cannot be undone.')) return;
    setBusy(true); setMsg(''); setError('');
    try {
      await post(base + '/reset');
      setMsg('Reset complete — all assignments cleared.');
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function toggleAutoAssign() {
    setBusy(true); setError('');
    try {
      await post(base + '/toggle-auto');
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function toggleAttend(j) {
    setBusy(true); setError('');
    try {
      if (j.attended_at) {
        await del(`${base}/attend/${j.user_id}`);
      } else {
        await post(`${base}/attend/${j.user_id}`);
      }
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const ppg = data?.projects_per_group || 0;
  const need = data?.group_count_needed || 0;
  const assigned = data?.config?.assigned_at;
  const stopped = data?.auto_assign_stopped;
  const groupKeys = data?.groups ? Object.keys(data.groups).sort() : [];
  const total = groupKeys.reduce((a, k) => a + data.groups[k].projects.length, 0) + (data?.unassigned_projects || 0);

  return (
    <section className="card">
      <h3 style={{ marginTop: 0, marginBottom: 4 }}>⚖️ Judge Assignment</h3>
      <p className="muted small" style={{ marginTop: 0, marginBottom: 12 }}>
        Set judging parameters, assign groups, and track judge attendance here.
      </p>
      {error && <p className="error">{error}</p>}

      <form onSubmit={saveParams}>
        <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
          <label style={{ flex: 1, minWidth: 140 }}>
            Total judge time (min)
            <input type="number" min={1} max={480} value={params.judge_time_minutes}
              onChange={(e) => setParams({ ...params, judge_time_minutes: Number(e.target.value) })} />
          </label>
          <label style={{ flex: 1, minWidth: 140 }}>
            Time per project (min)
            <input type="number" min={1} max={120} value={params.per_project_minutes}
              onChange={(e) => setParams({ ...params, per_project_minutes: Number(e.target.value) })} />
          </label>
        </div>
        {ppg > 0 && (
          <div className="muted small" style={{ padding: '6px 10px', background: 'var(--surface-2)', borderRadius: 6, margin: '8px 0' }}>
            → {ppg} project(s) per group · {need} group(s) needed for {total} project(s) total
          </div>
        )}
        <div className="row" style={{ gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          <button type="submit" disabled={busy}>Save params</button>
          <button type="button" className="outline" onClick={assign} disabled={busy}>
            {assigned ? '↺ Re-assign Groups' : '▶ Assign Groups'}
          </button>
          {assigned && (
            <>
              <button type="button" className="outline" onClick={toggleAutoAssign} disabled={busy}
                style={{ color: stopped ? '#16a34a' : '#dc2626', borderColor: stopped ? '#16a34a' : '#dc2626' }}>
                {stopped ? '▶ Resume Auto-assign' : '⏸ Stop Auto-assign'}
              </button>
              <button type="button" className="outline" onClick={resetAll} disabled={busy}
                style={{ color: '#dc2626', borderColor: '#dc2626' }}>
                ↺ Reset All
              </button>
            </>
          )}
          {msg && <span className="success small">{msg}</span>}
        </div>
      </form>

      {assigned && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--green,#16a34a)', fontSize: 13 }}>✓ Groups assigned</span>
          <span className="muted small">{groupKeys.length} group(s) · {data?.all_judges?.filter((j) => j.judge_group).length || 0} / {data?.all_judges?.length || 0} judges placed · {data?.all_judges?.filter((j) => j.attended_at && !j.judge_group).length || 0} awaiting group</span>
          {stopped ? (
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#fef2f2', color: '#dc2626', fontWeight: 600 }}>⏸ Auto-assign paused</span>
          ) : (
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#f0fdf4', color: '#16a34a', fontWeight: 600 }}>● Auto-assigning new joins</span>
          )}
        </div>
      )}

      {/* ── Judge attendance list ── */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
          Judge Attendance
          {!assigned && <span className="faint" style={{ fontWeight: 400, marginLeft: 6 }}>— judges can check in now; groups assigned when you press ▶ Assign Groups</span>}
        </div>
        {(data?.all_judges || []).length === 0
          ? <p className="faint small">No judges added yet — add them in the Judges section above.</p>
          : (
            <div className="stack" style={{ gap: 5 }}>
              {(data.all_judges).map((j) => (
                <label key={j.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 7, cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={!!j.attended_at}
                    disabled={busy}
                    onChange={() => toggleAttend(j)}
                    style={{ width: 17, height: 17, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}>{j.email}</div>
                  </div>
                  {j.judge_group
                    ? <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 5, background: jagc(j.judge_group), color: '#fff', fontWeight: 700, flexShrink: 0 }}>Group {j.judge_group}</span>
                    : j.attended_at
                      ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#fef9c3', color: '#854d0e', fontWeight: 600, flexShrink: 0 }}>✓ Present · awaiting group</span>
                      : <span className="badge" style={{ fontSize: 11, flexShrink: 0 }}>not checked in</span>}
                </label>
              ))}
            </div>
          )}
      </div>
    </section>
  );
}

// ── Demo Slots (admin CRUD for demo day schedule) ─────────────────────────────

function DemoSlotsSection({ hid }) {
  const base = `/api/hackathons/${hid}/demo-slots`;
  const [slots, setSlots] = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const EMPTY = { projectId: '', customName: '', duration: '10', breakAfter: '' };
  const [add, setAdd] = useState(EMPTY);
  const [editing, setEditing] = useState(null);

  async function load() {
    try { setSlots(await get(base)); } catch (e) { setError(e.message); }
  }
  async function loadProjects() {
    try { setProjects(await get(`/api/hackathons/${hid}/projects`)); } catch (_) {}
  }
  useEffect(() => { load(); loadProjects(); }, [hid]);

  async function addSlot(e) {
    e.preventDefault();
    if (!add.projectId && !add.customName.trim()) return;
    setBusy(true); setError('');
    try {
      await post(base, {
        project_id: add.projectId ? Number(add.projectId) : null,
        custom_name: add.customName.trim(),
        duration_minutes: Math.max(1, Number(add.duration) || 10),
        break_after_minutes: Math.max(0, Number(add.breakAfter) || 0),
      });
      setAdd(EMPTY); await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await put(`${base}/${editing.id}`, {
        project_id: editing.projectId ? Number(editing.projectId) : null,
        custom_name: editing.customName || '',
        duration_minutes: Math.max(1, Number(editing.duration) || 10),
        break_after_minutes: Math.max(0, Number(editing.breakAfter) || 0),
      });
      setEditing(null); await load();
    } catch (err) { setError(err.message); }
  }

  async function deleteSlot(id) {
    try { await del(`${base}/${id}`); await load(); } catch (err) { setError(err.message); }
  }

  async function move(idx, dir) {
    const to = idx + dir;
    if (to < 0 || to >= slots.length) return;
    const list = [...slots];
    [list[idx], list[to]] = [list[to], list[idx]];
    setSlots(list);
    await put(`${base}/reorder`, list.map((s, i) => ({ id: s.id, order_index: i })));
  }

  async function resetAll() {
    if (!confirm('Reset all demo slot statuses? This clears live event progress.')) return;
    for (const s of slots) {
      if (s.status !== 'scheduled') await put(`${base}/${s.id}`, { status: 'scheduled', actual_start: '', actual_end: '' });
    }
    await load();
  }

  const statusColor = (s) => s === 'speaking' ? 'var(--accent)' : s === 'completed' ? 'var(--green,#16a34a)' : s === 'skipped' ? '#6b7280' : 'transparent';

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h3 style={{ marginTop: 0, marginBottom: 0 }}>🎬 Demo Day Schedule</h3>
        {slots.some((s) => s.status !== 'scheduled') && (
          <button style={spBtn} onClick={resetAll}>↺ Reset all</button>
        )}
      </div>
      <p className="muted small" style={{ marginTop: 4, marginBottom: 12 }}>
        Add finalist projects to the demo schedule. Open <strong>Demo Day</strong> tab to run the live event.
      </p>
      {error && <p className="error">{error}</p>}

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 55px 65px auto', gap: 6, padding: '4px 10px', marginBottom: 2 }}>
        {['Project / Name', 'Custom label', 'Min', 'Break ☕', ''].map((h) => (
          <div key={h} className="faint" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em' }}>{h}</div>
        ))}
      </div>

      {/* Add row */}
      <form onSubmit={addSlot} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 55px 65px auto', gap: 6, marginBottom: 12, alignItems: 'center' }}>
        <select value={add.projectId} onChange={(e) => setAdd({ ...add, projectId: e.target.value })} style={{ fontSize: 13, padding: '5px 6px' }}>
          <option value="">— Custom slot —</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input placeholder="Opening, Awards…" value={add.customName} onChange={(e) => setAdd({ ...add, customName: e.target.value })} style={{ fontSize: 13 }} />
        <input type="number" min={1} max={120} value={add.duration} onChange={(e) => setAdd({ ...add, duration: e.target.value })} style={{ fontSize: 13, padding: '5px 4px' }} />
        <input type="number" min={0} max={60} placeholder="0" value={add.breakAfter} onChange={(e) => setAdd({ ...add, breakAfter: e.target.value })} style={{ fontSize: 13, padding: '5px 4px' }} />
        <button type="submit" style={spBtn} disabled={busy || (!add.projectId && !add.customName.trim())}>+ Add</button>
      </form>

      {slots.length === 0 && <p className="faint small">No demo slots yet.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {slots.map((s, idx) => {
          const isEdit = editing?.id === s.id;
          const name = s.custom_name || s.project_name || 'Demo';
          return (
            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr 55px 65px auto', gap: 6, alignItems: 'center', padding: '7px 10px', borderRadius: 6, border: '1.5px solid var(--border)', background: 'var(--surface-2)' }}>
              <span style={{ color: 'var(--muted)', fontSize: 13, userSelect: 'none' }}>⠿</span>
              {isEdit ? (
                <>
                  <select value={editing.projectId || ''} onChange={(e) => setEditing({ ...editing, projectId: e.target.value })} style={{ fontSize: 12, padding: '3px 4px' }}>
                    <option value="">— Custom —</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input value={editing.customName} onChange={(e) => setEditing({ ...editing, customName: e.target.value })} style={{ fontSize: 12, padding: '3px 6px' }} placeholder="Label" />
                  <input type="number" min={1} max={120} value={editing.duration} onChange={(e) => setEditing({ ...editing, duration: e.target.value })} style={{ fontSize: 12, padding: '3px 4px' }} />
                  <input type="number" min={0} max={60} value={editing.breakAfter} onChange={(e) => setEditing({ ...editing, breakAfter: e.target.value })} style={{ fontSize: 12, padding: '3px 4px' }} />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button style={spBtn} onClick={saveEdit}>Save</button>
                    <button style={spBtnGry} onClick={() => setEditing(null)}>✕</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name}
                    {s.project_award && <span style={{ marginLeft: 6, fontSize: 11, padding: '1px 5px', borderRadius: 4, background: 'var(--accent)', color: '#fff' }}>{s.project_award}</span>}
                  </div>
                  <div className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.team?.join(', ') || (s.custom_name && s.project_name ? s.project_name : '—')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {s.duration_minutes} min
                    {s.status !== 'scheduled' && (
                      <div style={{ fontSize: 11, color: statusColor(s.status), fontWeight: 600, marginTop: 1 }}>
                        {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {s.break_after_minutes > 0 ? `${s.break_after_minutes} min` : <span style={{ opacity: 0.35 }}>—</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    <button style={spBtnGry} onClick={() => move(idx, -1)} disabled={idx === 0}>↑</button>
                    <button style={spBtnGry} onClick={() => move(idx, 1)} disabled={idx === slots.length - 1}>↓</button>
                    <button style={spBtnSm} onClick={() => setEditing({ id: s.id, projectId: s.project_id ? String(s.project_id) : '', customName: s.custom_name || '', duration: String(s.duration_minutes), breakAfter: String(s.break_after_minutes || 0) })}>✏</button>
                    <button style={spBtnRed} onClick={() => deleteSlot(s.id)}>✕</button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Awards Section (mark projects with award tags) ────────────────────────────

function AwardsSection({ hid }) {
  const [projects, setProjects] = useState([]);
  const [tags, setTags] = useState({});
  const [msg, setMsg] = useState({});
  const [error, setError] = useState('');

  async function load() {
    try {
      const all = await get(`/api/hackathons/${hid}/projects`);
      setProjects(all);
      const t = {};
      for (const p of all) t[p.id] = p.award_tag || '';
      setTags(t);
    } catch (e) { setError(e.message); }
  }
  useEffect(load, [hid]);

  async function saveTag(pid) {
    try {
      await put(`/api/hackathons/${hid}/projects/${pid}/award`, { award_tag: tags[pid] || '' });
      setMsg((m) => ({ ...m, [pid]: '✓' }));
      setTimeout(() => setMsg((m) => ({ ...m, [pid]: '' })), 1500);
    } catch (e) { setError(e.message); }
  }

  const PRESETS = ['Finalist', '1st Place', '2nd Place', '3rd Place'];

  return (
    <section className="card">
      <h3 style={{ marginTop: 0, marginBottom: 4 }}>🏆 Awards</h3>
      <p className="muted small" style={{ marginTop: 0, marginBottom: 12 }}>
        Tag projects with award labels. These appear on the <strong>Winners</strong> page and in the demo schedule.
      </p>
      {error && <p className="error">{error}</p>}
      {projects.length === 0 && <p className="faint small">No projects submitted yet.</p>}
      <div className="stack" style={{ gap: 6 }}>
        {projects.map((p) => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 200px 80px auto', gap: 8, alignItems: 'center', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 6 }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
              {p.participants?.length > 0 && <div className="small muted">{p.participants.map((u) => u.email).join(', ')}</div>}
            </div>
            <input
              value={tags[p.id] || ''}
              onChange={(e) => setTags((t) => ({ ...t, [p.id]: e.target.value }))}
              placeholder="e.g. 1st Place, Finalist…"
              list={`presets-${p.id}`}
              style={{ fontSize: 13, padding: '5px 8px' }}
            />
            <datalist id={`presets-${p.id}`}>
              {PRESETS.map((pr) => <option key={pr} value={pr} />)}
            </datalist>
            <button style={spBtn} onClick={() => saveTag(p.id)}>
              {msg[p.id] || 'Save'}
            </button>
            {tags[p.id] && (
              <button style={spBtnRed} title="Clear award" onClick={async () => {
                setTags((t) => ({ ...t, [p.id]: '' }));
                try {
                  await put(`/api/hackathons/${hid}/projects/${p.id}/award`, { award_tag: '' });
                  setMsg((m) => ({ ...m, [p.id]: '✓' }));
                  setTimeout(() => setMsg((m) => ({ ...m, [p.id]: '' })), 1500);
                } catch (e) { setError(e.message); }
              }}>✕</button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Voice & Rules Section ─────────────────────────────────────────────────────
function applyVoiceMode(u, voiceMode) {
  u.pitch = voiceMode === 'female' ? 1.4 : 0.7;
  u.rate  = voiceMode === 'female' ? 1.0 : 0.85;
  try {
    const voices   = window.speechSynthesis.getVoices();
    const enVoices = voices.filter((v) => v.lang.startsWith('en'));
    if (enVoices.length > 0) {
      if (voiceMode === 'male') {
        const mv = enVoices.find((v) => /male|david|mark|daniel|fred|ralph/i.test(v.name)) || enVoices[0];
        u.voice = mv;
      } else {
        const fv = enVoices.find((v) => /female|samantha|victoria|karen|allison|susan|zira/i.test(v.name)) || enVoices[Math.min(1, enVoices.length - 1)];
        u.voice = fv;
      }
    }
  } catch (_) {}
}
function speak(text, voiceMode = 'female') {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    applyVoiceMode(u, voiceMode);
    window.speechSynthesis.speak(u);
  } catch (_) {}
}
function stopSpeak() { try { window.speechSynthesis?.cancel(); } catch (_) {} }

function defaultSubmissionRules(meta) {
  const h = meta.hackathon;
  const tracks = (meta.tracks || []).map((t) => t.name).join(', ');
  const sponsors = (meta.sponsors || []).map((s) => s.name).join(', ');
  const deadline = h.submission_deadline ? ` by ${h.submission_deadline} UTC` : '';
  return `Welcome to ${h.name}!

Submissions: Submit your project through the platform. Include your project name, a short description, team members, and a demo video link if available.

Deadline: Please submit your project${deadline}. There is a 30-minute grace period after the deadline. Late submissions may not be assigned a judging group.
${tracks ? `\nTracks: This hackathon has the following themed tracks: ${tracks}. Select the track(s) that best represent your project.\n` : ''}${sponsors ? `\nSponsors: Our sponsors have special prizes. Build using their tools or APIs to be eligible for sponsor awards: ${sponsors}.\n` : ''}
Judging Groups: Projects will be organized into judging groups (A, B, C…) based on submission order. Your group determines your demo time slot during judging.

Demo Day: Each team will present their project to a panel of judges. Prepare a short demo — the time per project is limited, so be concise and focused.

After submitting, you can still edit your project details until judging begins.

Good luck and have fun building!`.trim();
}

function defaultJudgingRules(meta) {
  const h = meta.hackathon;
  const jcfg = meta.judging_config;
  const perProject = jcfg?.per_project_minutes ? `${jcfg.per_project_minutes} minutes` : 'a few minutes';
  const total = jcfg?.judge_time_minutes ? `${jcfg.judge_time_minutes} minutes` : 'a set amount of time';
  return `Welcome, Judges! Thank you for participating at ${h.name}.

Group Assignment: You will be assigned to a judging group (A, B, C…) when you mark your attendance. Each group evaluates a specific set of projects during a dedicated time slot.

Scoring: Rate each project on 5 criteria — Presentation, Execution, Innovation, Impact, and Implementation — on a scale of 0 to 100. The total score is the average of all five criteria.

Investment: You can also indicate how much you would invest in a project (in thousands). This is tracked separately from the score and helps identify the most promising projects.

Time: You have ${perProject} per project and ${total} in total for your group. Please manage your time carefully and be concise with your questions.

Comments: Please leave constructive written feedback for each team. Participants greatly value your insights and suggestions.

Fair Judging: Evaluate all projects honestly and independently. If you have a personal connection to a team, please declare it to the organiser.

Thank you for making this event possible!`.trim();
}

function VoiceRulesSection({ hid, meta, reload }) {
  const h = meta.hackathon;
  const [subRules, setSubRules] = useState(h.submission_rules || '');
  const [judgeRules, setJudgeRules] = useState(h.judging_rules || '');
  const [msg, setMsg] = useState('');

  async function save() {
    await put(`/api/hackathons/${hid}`, {
      name: h.name, details: h.details || '', support_info: h.support_info || '',
      schedule: h.schedule || '', event_date: h.event_date || '',
      start_time: h.start_time || '', end_time: h.end_time || '', location: h.location || '',
      voice_mode: h.voice_mode || 'off', submission_deadline: h.submission_deadline || '',
      submission_rules: subRules, judging_rules: judgeRules,
    });
    await reload();
    setMsg('Saved!'); setTimeout(() => setMsg(''), 1500);
  }

  return (
    <section className="card">
      <h3 style={{ marginTop: 0 }}>📢 Announcement Rules</h3>
      <p className="faint small" style={{ marginTop: 0 }}>Write the rules to be read out loud to participants and judges. Voices must be enabled (in Hackathon Details above).</p>

      <label>
        Participant Submission Rules
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          <button type="button" className="outline" style={{ padding: '3px 10px', fontSize: 12 }}
            onClick={() => speak(subRules || 'No submission rules written yet.', meta.hackathon.voice_mode || 'female')}>▶ Play</button>
          <button type="button" className="outline" style={{ padding: '3px 10px', fontSize: 12 }}
            onClick={stopSpeak}>■ Stop</button>
          {!subRules && (
            <button type="button" className="outline" style={{ padding: '3px 10px', fontSize: 12 }}
              onClick={() => setSubRules(defaultSubmissionRules(meta))}>✨ Generate default</button>
          )}
        </div>
        <textarea rows={8} value={subRules} onChange={(e) => setSubRules(e.target.value)}
          placeholder="Write the submission rules here. Click 'Generate default' for a starting point." />
      </label>

      <label style={{ marginTop: 12 }}>
        Judging Rules
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          <button type="button" className="outline" style={{ padding: '3px 10px', fontSize: 12 }}
            onClick={() => speak(judgeRules || 'No judging rules written yet.', meta.hackathon.voice_mode || 'female')}>▶ Play</button>
          <button type="button" className="outline" style={{ padding: '3px 10px', fontSize: 12 }}
            onClick={stopSpeak}>■ Stop</button>
          {!judgeRules && (
            <button type="button" className="outline" style={{ padding: '3px 10px', fontSize: 12 }}
              onClick={() => setJudgeRules(defaultJudgingRules(meta))}>✨ Generate default</button>
          )}
        </div>
        <textarea rows={8} value={judgeRules} onChange={(e) => setJudgeRules(e.target.value)}
          placeholder="Write the judging rules here. Click 'Generate default' for a starting point." />
      </label>

      <div className="row" style={{ marginTop: 12 }}><button type="button" onClick={save}>Save rules</button>{msg && <span className="success">{msg}</span>}</div>
    </section>
  );
}

// ── SMTP Config Section ───────────────────────────────────────────────────────
function SmtpConfigSection() {
  const EMPTY = { host: '', port: '587', secure: false, smtp_user: '', smtp_pass: '', from_name: '', from_email: '' };
  const [form, setForm] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    get('/api/smtp-config').then((cfg) => {
      if (cfg) setForm({ ...cfg, smtp_pass: cfg.smtp_pass || '', port: String(cfg.port || 587) });
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e) {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      await put('/api/smtp-config', { ...form, port: Number(form.port) || 587 });
      setMsg('SMTP config saved!'); setTimeout(() => setMsg(''), 2000);
    } catch (e) { setErr(e.message); }
  }

  if (!loaded) return null;

  return (
    <section className="card">
      <h3 style={{ marginTop: 0 }}>📧 Email / SMTP Configuration</h3>
      <p className="faint small" style={{ marginTop: 0 }}>Configure your email server to send announcements, invites, and reminders. Use Gmail, SendGrid, or any SMTP provider.</p>
      <form onSubmit={save}>
        <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
          <label style={{ flex: 3, minWidth: 180 }}>SMTP Host
            <input value={form.host} onChange={(e) => set('host', e.target.value)} placeholder="smtp.gmail.com" />
          </label>
          <label style={{ flex: 1, minWidth: 80 }}>Port
            <input type="number" value={form.port} onChange={(e) => set('port', e.target.value)} placeholder="587" />
          </label>
          <label style={{ flex: 1, minWidth: 80, justifyContent: 'center', paddingTop: 24 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!form.secure} onChange={(e) => set('secure', e.target.checked)} style={{ width: 'auto', margin: 0 }} />
              SSL/TLS
            </span>
          </label>
        </div>
        <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
          <label style={{ flex: 1, minWidth: 160 }}>SMTP Username / Email
            <input value={form.smtp_user} onChange={(e) => set('smtp_user', e.target.value)} placeholder="you@gmail.com" autoComplete="off" />
          </label>
          <label style={{ flex: 1, minWidth: 160 }}>SMTP Password / App Password
            <input type="password" value={form.smtp_pass} onChange={(e) => set('smtp_pass', e.target.value)} placeholder="App password or SMTP key" autoComplete="new-password" />
          </label>
        </div>
        <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
          <label style={{ flex: 1, minWidth: 140 }}>From Name
            <input value={form.from_name} onChange={(e) => set('from_name', e.target.value)} placeholder="Hackathon Team" />
          </label>
          <label style={{ flex: 1, minWidth: 180 }}>From Email
            <input type="email" value={form.from_email} onChange={(e) => set('from_email', e.target.value)} placeholder="noreply@yourhackathon.com" />
          </label>
        </div>
        <div className="row"><button type="submit">Save SMTP config</button>{msg && <span className="success">{msg}</span>}{err && <span className="error">{err}</span>}</div>
      </form>
    </section>
  );
}

// ── Emails Section ────────────────────────────────────────────────────────────
const EMAIL_TYPES = [
  { type: 'judge_invite',         label: '📨 Invite judges + judging instructions',     audience: 'judges' },
  { type: 'participant_rules',    label: '📋 Participant submission instructions',        audience: 'participants' },
  { type: 'participant_schedule', label: '🗓 Participant demo schedule & group',          audience: 'participants' },
  { type: 'judge_schedule',       label: '🗓 Judge group & project schedule',             audience: 'judges' },
  { type: 'judge_thankyou',       label: '🙏 Thank-you email to judges',                 audience: 'judges' },
  { type: 'participant_reminder', label: '🔔 Reminder: submit your project',             audience: 'participants' },
  { type: 'deadline_reminder',    label: '⚠️ Urgent deadline reminder (participants)',   audience: 'participants' },
];

function EmailsSection({ hid, meta }) {
  const [results, setResults] = useState({});
  const [busy, setBusy] = useState({});

  async function send(type) {
    setBusy((b) => ({ ...b, [type]: true }));
    setResults((r) => ({ ...r, [type]: null }));
    try {
      const res = await post(`/api/hackathons/${hid}/emails/${type}`, {});
      setResults((r) => ({ ...r, [type]: { ok: true, msg: `Sent to ${res.sent} recipient${res.sent !== 1 ? 's' : ''}${res.errors?.length ? ` (${res.errors.length} failed)` : ''}.` } }));
    } catch (e) {
      setResults((r) => ({ ...r, [type]: { ok: false, msg: e.message } }));
    } finally {
      setBusy((b) => ({ ...b, [type]: false }));
    }
  }

  return (
    <section className="card">
      <h3 style={{ marginTop: 0 }}>✉️ Send Emails</h3>
      <p className="faint small" style={{ marginTop: 0 }}>Configure SMTP above before sending. Emails are sent immediately to all matching recipients.</p>
      <div className="stack" style={{ gap: 10 }}>
        {EMAIL_TYPES.map(({ type, label, audience }) => (
          <div key={type} className="spread" style={{ flexWrap: 'wrap', gap: 8, padding: '10px 12px', background: 'var(--surface,#f8f8f8)', borderRadius: 8 }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{label}</div>
              <div className="faint small">Sends to all {audience} of this hackathon</div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              {results[type] && (
                <span className={results[type].ok ? 'success' : 'error'} style={{ fontSize: 13 }}>{results[type].msg}</span>
              )}
              <button type="button" style={{ padding: '5px 14px', fontSize: 13 }} disabled={!!busy[type]} onClick={() => send(type)}>
                {busy[type] ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DangerZone({ hid, name }) {
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');
  async function reset() {
    if (!confirm('Delete ALL projects and judging scores for this hackathon? This cannot be undone.')) return;
    const res = await post(`/api/hackathons/${hid}/reset`);
    setMsg(`Deleted ${res.deleted_projects} project(s) and all judging data.`);
  }
  async function destroy() {
    if (!confirm(`Permanently delete the entire "${name}" hackathon and everything in it?`)) return;
    await del(`/api/hackathons/${hid}`);
    navigate('/');
  }
  return (
    <section className="card" style={{ borderColor: '#f4c4c4' }}>
      <h3 style={{ marginTop: 0, color: 'var(--red)' }}>Danger zone</h3>
      <div className="spread" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div>
          <strong>Reset projects &amp; judging</strong>
          <div className="muted small">Delete every project and all judge scores. Tracks, sponsors, judges and matching stay.</div>
        </div>
        <button className="danger outline" onClick={reset}>Delete all projects &amp; judge data</button>
      </div>
      <div className="divider" />
      <div className="spread" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div>
          <strong>Delete hackathon</strong>
          <div className="muted small">Remove this hackathon and all of its data permanently.</div>
        </div>
        <button className="danger" onClick={destroy}>Delete hackathon</button>
      </div>
      {msg && <p className="success" style={{ marginTop: 12 }}>{msg}</p>}
    </section>
  );
}

function SystemSection() {
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function reseedCredentials() {
    if (!confirm('Apply admin credentials from environment variables (ADMIN_EMAIL / ADMIN_PASSWORD) now? You will need to log in again with the new credentials.')) return;
    setBusy(true); setMsg(''); setErr('');
    try {
      const res = await post('/api/admin/reseed-credentials');
      setMsg(`Done — admin login is now "${res.email}". Please log out and log back in.`);
    } catch (e) {
      setErr('Failed to apply credentials. Check the server logs.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" style={{ borderColor: '#c4d4f4' }}>
      <h3 style={{ marginTop: 0 }}>System</h3>
      <div className="spread" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div>
          <strong>Apply admin credentials from environment</strong>
          <div className="muted small">Updates the admin email &amp; password to match the current <code>ADMIN_EMAIL</code> / <code>ADMIN_PASSWORD</code> secrets — useful after changing them without resetting the database.</div>
        </div>
        <button className="outline" onClick={reseedCredentials} disabled={busy}>
          {busy ? 'Applying…' : 'Apply credentials'}
        </button>
      </div>
      {msg && <p className="success" style={{ marginTop: 12 }}>{msg}</p>}
      {err && <p className="error" style={{ marginTop: 12 }}>{err}</p>}
    </section>
  );
}
