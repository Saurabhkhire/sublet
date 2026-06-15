import { useEffect, useState } from 'react';
import { get, post } from '../api.js';
import MultiSelect from '../components/MultiSelect.jsx';

export default function TeamMatching() {
  const [meta, setMeta] = useState(null);
  const [existing, setExisting] = useState(null);
  const [role, setRole] = useState('');
  const [plan, setPlan] = useState('');
  const [tracks, setTracks] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    get('/api/meta').then(setMeta);
    get('/api/matching/me').then((d) => {
      if (d.profile) {
        setExisting(d.profile);
        setRole(d.profile.role);
        setPlan(d.profile.plan_to_build);
        setTracks(d.profile.tracks);
        setSponsors(d.profile.sponsors);
      }
    });
  }, []);

  const matched = existing?.matched === 1;

  async function submit(e) {
    e.preventDefault();
    setMsg(''); setError('');
    try {
      await post('/api/matching/profile', { role, plan_to_build: plan, tracks, sponsors });
      setMsg('Saved! You will be placed in a team when the admin runs matching.');
      setExisting({ ...(existing || {}), role, plan_to_build: plan, tracks, sponsors, matched: 0 });
    } catch (err) {
      setError(err.message);
    }
  }

  if (!meta) return <div className="container">Loading…</div>;

  return (
    <div className="container narrow">
      <h1>Team Matching <span className="muted small">(optional)</span></h1>
      <p className="muted">
        Tell us your role, the tracks/sponsors you're interested in, and what you plan to build.
        We match people into teams of up to 4 using track &amp; sponsor overlap, similarity of your
        idea (via AI), and a healthy mix of roles.
      </p>

      {matched && (
        <div className="banner">You've already been matched — your profile is locked.</div>
      )}

      <form onSubmit={submit} className="card">
        <label>Your role
          <select value={role} onChange={(e) => setRole(e.target.value)} disabled={matched}>
            <option value="">— select a role —</option>
            {meta.roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>

        <label>What do you plan to build?
          <textarea
            rows={4}
            value={plan}
            disabled={matched}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="Describe your idea…"
          />
        </label>

        <div>
          <span className="field-label">Tracks (select multiple)</span>
          <MultiSelect
            options={meta.tracks.map((t) => ({ value: t.id, label: t.name }))}
            value={tracks}
            onChange={matched ? () => {} : setTracks}
          />
        </div>

        <div>
          <span className="field-label">Sponsors (select multiple)</span>
          <MultiSelect
            options={meta.sponsors.map((s) => ({ value: s.id, label: s.name }))}
            value={sponsors}
            onChange={matched ? () => {} : setSponsors}
          />
        </div>

        {error && <p className="error">{error}</p>}
        {msg && <p className="success">{msg}</p>}
        {!matched && <button type="submit">{existing ? 'Update profile' : 'Opt in'}</button>}
      </form>
    </div>
  );
}
