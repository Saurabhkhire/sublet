import { useEffect, useState } from 'react';
import { get, post } from '../api.js';

export default function Judging() {
  const [meta, setMeta] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sponsorFilter, setSponsorFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [form, setForm] = useState({});
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    get('/api/meta').then(setMeta);
    get('/api/judging/criteria').then((d) => setCriteria(d.criteria));
  }, []);

  function loadProjects() {
    const q = sponsorFilter ? `?sponsor=${sponsorFilter}` : '';
    get('/api/projects' + q).then(setProjects);
  }
  useEffect(loadProjects, [sponsorFilter]);

  async function openProject(p) {
    setSelected(p);
    setError(''); setMsg('');
    const data = await get(`/api/judging/${p.id}/scores`);
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
      await post(`/api/judging/${selected.id}/score`, { ...form, comments });
      setMsg('Score saved!');
      const data = await get(`/api/judging/${selected.id}/scores`);
      setScoreData(data);
    } catch (err) {
      setError(err.message);
    }
  }

  const total = criteria.reduce((a, c) => a + (Number(form[c.key]) || 0), 0);

  return (
    <div className="container">
      <h1>Judging</h1>
      <div className="toolbar">
        <label className="inline">Filter by sponsor:&nbsp;
          <select value={sponsorFilter} onChange={(e) => setSponsorFilter(e.target.value)}>
            <option value="">All projects</option>
            {meta?.sponsors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>

      <div className="split">
        <div className="list">
          {projects.length === 0 && <p className="muted">No projects.</p>}
          {projects.map((p) => (
            <button key={p.id} className={`list-item ${selected?.id === p.id ? 'active' : ''}`} onClick={() => openProject(p)}>
              <strong>{p.name}</strong>
              <span className="muted small">{p.sponsors.map((s) => s.name).join(', ')}</span>
            </button>
          ))}
        </div>

        <div className="detail">
          {!selected ? <p className="muted">Select a project to review and score.</p> : (
            <>
              <h2>{selected.name}</h2>
              <p>{selected.short_description}</p>
              <p className="small">
                {selected.demo_video_link && <a href={selected.demo_video_link} target="_blank" rel="noreferrer">Demo</a>}
                {selected.git_link && <> · <a href={selected.git_link} target="_blank" rel="noreferrer">Git</a></>}
              </p>
              <p className="muted small">Team: {selected.participants.map((x) => x.email).join(', ')}</p>
              <p className="muted small">
                Tracks: {selected.tracks.map((t) => t.name).join(', ') || '—'} · Sponsors: {selected.sponsors.map((s) => s.name).join(', ') || '—'}
              </p>
              {scoreData?.average != null && (
                <p className="banner">Average score across {scoreData.judge_count} judge(s): <strong>{scoreData.average}/100</strong></p>
              )}

              <form onSubmit={submitScore} className="card">
                <h3>Your score (total: {total}/100)</h3>
                {criteria.map((c) => (
                  <label key={c.key} className="score-row">
                    <span>{c.label} <span className="muted small">(0–{c.max})</span></span>
                    <input
                      type="number" min={0} max={c.max}
                      value={form[c.key] ?? 0}
                      onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}
                    />
                  </label>
                ))}
                <label>Comments
                  <textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} />
                </label>
                {error && <p className="error">{error}</p>}
                {msg && <p className="success">{msg}</p>}
                <button type="submit">Save score</button>
              </form>

              {scoreData?.scores?.length > 0 && (
                <div className="card">
                  <h3>All scores</h3>
                  <table>
                    <thead><tr><th>Judge</th><th>Total</th><th>Comments</th></tr></thead>
                    <tbody>
                      {scoreData.scores.map((s) => (
                        <tr key={s.id}><td>{s.judge_email}</td><td>{s.total}</td><td>{s.comments}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
