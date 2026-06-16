import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { get, post } from '../api.js';

export default function Judging() {
  const { meta, hid } = useOutletContext();
  const criteria = meta.score_criteria;
  const [projects, setProjects] = useState([]);
  const [sponsorFilter, setSponsorFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [form, setForm] = useState({});
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  function loadProjects() {
    const q = sponsorFilter ? `?sponsor=${sponsorFilter}` : '';
    get(`/api/hackathons/${hid}/projects${q}`).then(setProjects);
  }
  useEffect(loadProjects, [sponsorFilter, hid]);

  async function openProject(p) {
    setSelected(p); setError(''); setMsg('');
    const data = await get(`/api/hackathons/${hid}/projects/${p.id}/scores`);
    setScoreData(data);
    const base = {};
    for (const c of criteria) base[c.key] = data.mine ? data.mine[c.key] : 0;
    setForm(base);
    setComments(data.mine ? data.mine.comments : '');
  }

  async function submitScore(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await post(`/api/hackathons/${hid}/projects/${selected.id}/score`, { ...form, comments });
      setMsg('Score saved!');
      setScoreData(await get(`/api/hackathons/${hid}/projects/${selected.id}/scores`));
    } catch (err) { setError(err.message); }
  }

  const total = criteria.reduce((a, c) => a + (Number(form[c.key]) || 0), 0);

  return (
    <div className="stack">
      <div className="spread">
        <h1 style={{ margin: 0 }}>Judging</h1>
        <label className="row" style={{ margin: 0, gap: 8 }}>
          <span className="small muted">Sponsor</span>
          <select style={{ width: 'auto', marginTop: 0 }} value={sponsorFilter} onChange={(e) => setSponsorFilter(e.target.value)}>
            <option value="">All projects</option>
            {meta.sponsors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>

      <div className="split">
        <div className="list-pick">
          {projects.length === 0 && <div className="card empty"><p>No projects.</p></div>}
          {projects.map((p) => (
            <button key={p.id} className={`item ${selected?.id === p.id ? 'active' : ''}`} onClick={() => openProject(p)}>
              <strong>{p.name}</strong>
              <span className="faint small">{p.sponsors.map((s) => s.name).join(', ') || 'No sponsors'}</span>
            </button>
          ))}
        </div>

        <div>
          {!selected ? (
            <div className="card empty"><div className="big">★</div><p>Select a project to review and score.</p></div>
          ) : (
            <div className="stack">
              <div className="card">
                <h2 style={{ marginTop: 0 }}>{selected.name}</h2>
                <p className="muted">{selected.short_description}</p>
                <div className="row small" style={{ gap: 14 }}>
                  {selected.demo_video_link && <a href={selected.demo_video_link} target="_blank" rel="noreferrer">▶ Demo</a>}
                  {selected.git_link && <a href={selected.git_link} target="_blank" rel="noreferrer">⌥ Git</a>}
                </div>
                <div className="multiselect" style={{ marginTop: 12 }}>
                  {selected.tracks.map((t) => <span key={t.id} className="badge accent">{t.name}</span>)}
                  {selected.sponsors.map((s) => <span key={s.id} className="badge">{s.name}</span>)}
                </div>
                <p className="faint small" style={{ marginTop: 12, marginBottom: 0 }}>Team: {selected.participants.map((x) => x.email).join(', ')}</p>
                {scoreData?.average != null && (
                  <div className="badge green" style={{ marginTop: 12 }}>Avg {scoreData.average}/100 across {scoreData.judge_count} judge(s)</div>
                )}
              </div>

              <form onSubmit={submitScore} className="card">
                <div className="spread"><h3 style={{ margin: 0 }}>Your score</h3><span className="total-pill">{total}/100</span></div>
                <div style={{ marginTop: 8 }}>
                  {criteria.map((c) => (
                    <div key={c.key} className="score-row">
                      <span>{c.label} <span className="faint small">(0–{c.max})</span></span>
                      <input type="number" min={0} max={c.max} value={form[c.key] ?? 0}
                        onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <label style={{ marginTop: 12 }}>Comments
                  <textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Feedback for the team…" />
                </label>
                {error && <p className="error">{error}</p>}
                {msg && <p className="success">{msg}</p>}
                <button type="submit" style={{ marginTop: 8 }}>Save score</button>
              </form>

              {scoreData?.scores?.length > 0 && meta.is_admin && (
                <div className="card">
                  <h3 style={{ marginTop: 0 }}>All judges' scores</h3>
                  <table>
                    <thead><tr><th>Judge</th><th>Total</th><th>Comments</th></tr></thead>
                    <tbody>
                      {scoreData.scores.map((s) => (
                        <tr key={s.id}><td>{s.judge_email}</td><td><strong>{s.total}</strong></td><td className="small muted">{s.comments}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
