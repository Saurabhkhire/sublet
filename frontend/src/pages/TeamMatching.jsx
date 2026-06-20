import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { get, post } from '../api.js';
import { useAuth } from '../auth.jsx';
import MultiSelect from '../components/MultiSelect.jsx';

export default function TeamMatching() {
  const { meta, hid } = useOutletContext();
  const { user } = useAuth();
  const [existing, setExisting] = useState(null);
  const [group, setGroup] = useState([]);
  const [role, setRole] = useState('');
  const [plan, setPlan] = useState('');
  const [tracks, setTracks] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [canSeeOthers, setCanSeeOthers] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const trackName = (id) => meta.tracks.find((t) => t.id === id)?.name;
  const sponsorName = (id) => meta.sponsors.find((s) => s.id === id)?.name;

  function loadParticipants() {
    get(`/api/hackathons/${hid}/matching/participants`)
      .then((rows) => { setParticipants(rows); setCanSeeOthers(true); })
      .catch(() => setCanSeeOthers(false));
  }

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
    loadParticipants();
  }, [hid]);

  const matched = existing?.matched === 1;

  async function submit(e) {
    e.preventDefault();
    setMsg(''); setError('');
    try {
      await post(`/api/hackathons/${hid}/matching/profile`, { role, plan_to_build: plan, tracks, sponsors });
      setMsg('Saved! You\'ll be placed in a team when the admin runs matching.');
      setExisting({ ...(existing || {}), role, plan_to_build: plan, tracks, sponsors, matched: 0 });
      loadParticipants(); // now visible to / including you
    } catch (err) { setError(err.message); }
  }

  const others = participants.filter((p) => p.user_id !== user.id);

  return (
    <div className="stack">
      <div>
        <h1>Team Matching <span className="badge">optional</span></h1>
        <p className="muted">
          Tell us your role, the tracks/sponsors you're interested in, and what you plan to build.
          We form teams of up to 4 using track &amp; sponsor overlap, AI similarity of your idea, and a healthy mix of roles.
          Everyone who opts in can browse the others below to find teammates directly.
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

      <div>
        <div className="spread">
          <h2 style={{ margin: 0 }}>Participants looking for a team</h2>
          {canSeeOthers && <span className="badge">{others.length} {others.length === 1 ? 'person' : 'people'}</span>}
        </div>
        {!canSeeOthers ? (
          <div className="card empty"><p>Opt into team matching above to see everyone else who's looking for a team.</p></div>
        ) : others.length === 0 ? (
          <div className="card empty"><p>Nobody else has opted in yet — check back soon.</p></div>
        ) : (
          <div className="grid">
            {others.map((p) => (
              <div key={p.user_id} className="card">
                <div className="spread">
                  <strong>{p.role}</strong>
                  {p.matched ? <span className="badge green">Team #{p.group_id}</span> : <span className="badge amber">Looking</span>}
                </div>
                <p className="muted small" style={{ minHeight: 36 }}>{p.plan_to_build}</p>
                <div className="multiselect">
                  {p.tracks.map((id) => trackName(id) && <span key={`t${id}`} className="badge accent">{trackName(id)}</span>)}
                  {p.sponsors.map((id) => sponsorName(id) && <span key={`s${id}`} className="badge">{sponsorName(id)}</span>)}
                </div>
                <p className="small" style={{ marginTop: 10, marginBottom: 0 }}>
                  {p.email}{p.linkedin && <> · <a href={p.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></>}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
