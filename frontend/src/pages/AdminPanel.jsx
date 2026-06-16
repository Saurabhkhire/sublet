import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { get, post, put, del } from '../api.js';

export default function AdminPanel() {
  const { meta, reload, hid } = useOutletContext();
  return (
    <div className="stack">
      <h1>Admin · {meta.hackathon.name}</h1>
      <DetailsSection hid={hid} meta={meta} reload={reload} />
      <div className="grid">
        <ListSection title="Tracks" hid={hid} kind="tracks" reload={reload} />
        <ListSection title="Sponsors" hid={hid} kind="sponsors" reload={reload} />
      </div>
      <JudgesSection hid={hid} />
      <MatchingSection hid={hid} />
      <DangerZone hid={hid} name={meta.hackathon.name} />
    </div>
  );
}

function DetailsSection({ hid, meta, reload }) {
  const [form, setForm] = useState({ name: meta.hackathon.name, details: meta.hackathon.details });
  const [msg, setMsg] = useState('');
  async function save(e) {
    e.preventDefault();
    await put(`/api/hackathons/${hid}`, form);
    await reload();
    setMsg('Saved!'); setTimeout(() => setMsg(''), 1500);
  }
  return (
    <section className="card">
      <h3 style={{ marginTop: 0 }}>Hackathon details</h3>
      <form onSubmit={save}>
        <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Details<textarea rows={3} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} /></label>
        <div className="row"><button type="submit">Save</button>{msg && <span className="success">{msg}</span>}</div>
      </form>
    </section>
  );
}

function ListSection({ title, hid, kind, reload }) {
  const base = `/api/hackathons/${hid}/${kind}`;
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  function load() { get(base).then(setItems); }
  useEffect(load, [hid]);
  async function add(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await post(base, { name }); setName(''); load(); reload();
  }
  async function rename(id, current) {
    const v = prompt(`Rename`, current);
    if (v && v.trim()) { await put(`${base}/${id}`, { name: v.trim() }); load(); reload(); }
  }
  async function remove(id) {
    if (confirm('Delete this entry?')) { await del(`${base}/${id}`); load(); reload(); }
  }
  return (
    <section className="card">
      <h3 style={{ marginTop: 0 }}>{title} <span className="faint small">({items.length})</span></h3>
      <div className="stack" style={{ marginBottom: 14 }}>
        {items.map((it) => (
          <div key={it.id} className="spread" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <span>{it.name}</span>
            <span>
              <button className="link" onClick={() => rename(it.id, it.name)}>edit</button>
              <button className="link danger" onClick={() => remove(it.id)}>delete</button>
            </span>
          </div>
        ))}
        {items.length === 0 && <span className="faint small">None yet.</span>}
      </div>
      <form onSubmit={add} className="row">
        <input style={{ flex: 1 }} value={name} onChange={(e) => setName(e.target.value)} placeholder={`Add ${title.slice(0, -1).toLowerCase()}`} />
        <button type="submit">Add</button>
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
