import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { get, post } from '../api.js';
import MultiSelect from '../components/MultiSelect.jsx';

export default function TeamMatching() {
  const { meta, hid } = useOutletContext();
  const [existing, setExisting] = useState(null);
  const [group, setGroup] = useState([]);
  const [role, setRole] = useState('');
  const [plan, setPlan] = useState('');
  const [tracks, setTracks] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    get(`/api/hackathons/${hid}/matching/me`).then((d) => {
      if (d.profile) {
        setExisting(d.profile);
        setRole(d.profile.role);
        setPlan(d.profile.plan_to_build);
        setTracks(d.profile.tracks);
        setSponsors(d.profile.sponsors);
        setGroup(d.group || []);
      }
    });
  }, [hid]);

  const matched = existing?.matched === 1;

  async function submit(e) {
    e.preventDefault();
    setMsg(''); setError('');
    try {
      await post(`/api/hackathons/${hid}/matching/profile`, { role, plan_to_build: plan, tracks, sponsors });
      setMsg('Saved! You\'ll be placed in a team when the admin runs matching.');
      setExisting({ ...(existing || {}), role, plan_to_build: plan, tracks, sponsors, matched: 0 });
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="stack">
      <div>
        <h1>Team Matching <span className="badge">optional</span></h1>
        <p className="muted">
          Tell us your role, the tracks/sponsors you're interested in, and what you plan to build.
          We form teams of up to 4 using track &amp; sponsor overlap, AI similarity of your idea, and a healthy mix of roles.
        </p>
      </div>

      {matched && (
        <div className="card" style={{ borderColor: 'var(--accent)' }}>
          <div className="spread"><h3 style={{ margin: 0 }}>✅ You've been matched</h3><span className="badge accent">Team #{existing.group_id}</span></div>
          <div className="stack" style={{ marginTop: 10 }}>
            {group.map((m) => (
              <div key={m.id} className="row" style={{ justifyContent: 'space-between' }}>
                <span>{m.email} {m.linkedin && <a className="small" href={m.linkedin} target="_blank" rel="noreferrer">· LinkedIn</a>}</span>
                <span className="badge">{m.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="card">
        <h3 style={{ marginTop: 0 }}>{existing ? 'Your profile' : 'Opt in'}</h3>
        <label>Your role
          <select value={role} onChange={(e) => setRole(e.target.value)} disabled={matched}>
            <option value="">— select a role —</option>
            {meta.roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label>What do you plan to build?
          <textarea rows={4} value={plan} disabled={matched} onChange={(e) => setPlan(e.target.value)} placeholder="Describe your idea…" />
        </label>
        <span className="field-label">Tracks of interest</span>
        <MultiSelect options={meta.tracks.map((t) => ({ value: t.id, label: t.name }))} value={tracks} onChange={setTracks} disabled={matched} />
        <span className="field-label">Sponsors of interest</span>
        <MultiSelect options={meta.sponsors.map((s) => ({ value: s.id, label: s.name }))} value={sponsors} onChange={setSponsors} disabled={matched} />

        {error && <p className="error" style={{ marginTop: 14 }}>{error}</p>}
        {msg && <p className="success" style={{ marginTop: 14 }}>{msg}</p>}
        {!matched && <button type="submit" style={{ marginTop: 16 }}>{existing ? 'Update profile' : 'Opt in'}</button>}
      </form>
    </div>
  );
}
