import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { get, post, put, del } from '../api.js';

export default function AdminPanel() {
  const { meta, reload, hid } = useOutletContext();
  return (
    <div className="stack">
      <h1>Admin · {meta.hackathon.name}</h1>
      <DetailsSection hid={hid} meta={meta} reload={reload} />
      <TracksEditor hid={hid} reload={reload} />
      <SponsorsEditor hid={hid} reload={reload} />
      <JudgesSection hid={hid} />
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
  const [users, setUsers] = useState([]);
  const [pick, setPick] = useState('');
  function load() {
    get(`/api/hackathons/${hid}/judges`).then(setJudges);
    get('/api/admin/users').then((u) => setUsers(u.filter((x) => x.role !== 'admin')));
  }
  useEffect(load, [hid]);
  async function add() {
    if (!pick) return;
    await post(`/api/hackathons/${hid}/judges`, { user_id: Number(pick) });
    setPick(''); load();
  }
  async function remove(uid) { await del(`/api/hackathons/${hid}/judges/${uid}`); load(); }

  const judgeIds = new Set(judges.map((j) => j.id));
  const available = users.filter((u) => !judgeIds.has(u.id));

  return (
    <section className="card">
      <h3 style={{ marginTop: 0 }}>Judges · who can view &amp; score projects</h3>
      <p className="muted small">Select people who may see project details and submit judging scores in this hackathon.</p>
      <div className="row" style={{ marginBottom: 14 }}>
        <select style={{ flex: 1, marginTop: 0 }} value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">— select a user —</option>
          {available.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
        </select>
        <button onClick={add} disabled={!pick}>Add judge</button>
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
