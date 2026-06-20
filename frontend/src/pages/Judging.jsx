import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { get, post } from '../api.js';

const SHORT = { presentation: 'Pres', execution: 'Exec', innovation: 'Innov', impact: 'Impact', implementation: 'Impl' };
const money = (n) => '$' + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const moneyCompact = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
const INVEST_UNITS = [
  { label: 'Exact ($)', mult: 1 },
  { label: 'Thousand (K)', mult: 1e3 },
  { label: 'Lakh', mult: 1e5 },
  { label: 'Million (M)', mult: 1e6 },
  { label: 'Crore', mult: 1e7 },
  { label: 'Billion (B)', mult: 1e9 },
];

export default function Judging() {
  const { meta, hid } = useOutletContext();
  const criteria = meta.score_criteria;
  const [view, setView] = useState('score'); // 'score' | 'results' | 'invest'
  const [projects, setProjects] = useState([]);
  const [sponsorFilter, setSponsorFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null); // project shown in the modal
  const [scoreData, setScoreData] = useState(null);
  const [form, setForm] = useState({});
  const [investAmt, setInvestAmt] = useState(0);
  const [investUnit, setInvestUnit] = useState(1);
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
    setInvestAmt(data.mine ? data.mine.investment : 0);
    setInvestUnit(1);
    setComments(data.mine ? data.mine.comments : '');
  }

  async function submitScore(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      const investment = Number(investAmt || 0) * investUnit;
      await post(`/api/hackathons/${hid}/projects/${selected.id}/score`, { ...form, investment, comments });
      setMsg('Score saved!');
      setScoreData(await get(`/api/hackathons/${hid}/projects/${selected.id}/scores`));
      loadProjects();
    } catch (err) { setError(err.message); }
  }

  const liveTotal = criteria.length
    ? Math.round((criteria.reduce((a, c) => a + (Number(form[c.key]) || 0), 0) / criteria.length) * 10) / 10
    : 0;

  const byScore = [...projects].sort((a, b) => (b.average_score ?? -1) - (a.average_score ?? -1));
  const byInvestment = [...projects].sort((a, b) => (b.total_investment ?? 0) - (a.total_investment ?? 0));

  return (
    <div className="stack">
      <div className="spread" style={{ flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Judging</h1>
        <div className="tabs">
          <button type="button" className={`tab ${view === 'score' ? 'active' : ''}`} onClick={() => setView('score')}>Score projects</button>
          <button type="button" className={`tab ${view === 'results' ? 'active' : ''}`} onClick={() => setView('results')}>Results &amp; averages</button>
          <button type="button" className={`tab ${view === 'invest' ? 'active' : ''}`} onClick={() => setView('invest')}>Investments</button>
        </div>
      </div>

      <div className="toolbar" style={{ marginBottom: 0 }}>
        <label className="row" style={{ margin: 0, gap: 8 }}>
          <span className="small muted">Sponsor</span>
          <select style={{ width: 'auto', marginTop: 0 }} value={sponsorFilter} onChange={(e) => setSponsorFilter(e.target.value)}>
            <option value="">All projects</option>
            {meta.sponsors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>

      {view === 'score' && (
        <ScoreView {...{ projects, selected, openProject, scoreData, criteria, form, setForm, investAmt, setInvestAmt, investUnit, setInvestUnit, comments, setComments, submitScore, liveTotal, error, msg, isAdmin: meta.is_admin }} />
      )}
      {view === 'results' && <ResultsView ranked={byScore} onOpen={setDetail} />}
      {view === 'invest' && <InvestmentsView ranked={byInvestment} onOpen={setDetail} />}

      {detail && <DetailModal project={detail} criteria={criteria} onClose={() => setDetail(null)} />}
    </div>
  );
}

/* ---------------- Shared: tracks/sponsors cells ---------------- */
function TrackTags({ tracks }) {
  if (!tracks.length) return <span className="faint small">—</span>;
  return <div className="tags">{tracks.map((t) => <span key={t.id} className="badge accent">{t.name}</span>)}</div>;
}
function SponsorTags({ sponsors }) {
  if (!sponsors.length) return <span className="faint small">—</span>;
  return <div className="tags">{sponsors.map((s) => <span key={s.id} className="badge">{s.name}</span>)}</div>;
}

/* ---------------- Shared project body (links + tracks + sponsors + team) ---------------- */
function ProjectBody({ p }) {
  return (
    <div>
      <p className="muted" style={{ marginTop: 0 }}>{p.short_description || 'No description provided.'}</p>
      <div className="row" style={{ gap: 12, marginTop: 6 }}>
        {p.demo_video_link
          ? <a className="btn" style={{ flex: 1, minWidth: 200 }} href={p.demo_video_link} target="_blank" rel="noreferrer">▶ Watch Demo Video</a>
          : <span className="badge" style={{ flex: 1, justifyContent: 'center', minWidth: 200 }}>No demo video</span>}
        {p.git_link
          ? <a className="btn secondary" style={{ flex: 1, minWidth: 200 }} href={p.git_link} target="_blank" rel="noreferrer">⌥ View GitHub Repository</a>
          : <span className="badge" style={{ flex: 1, justifyContent: 'center', minWidth: 200 }}>No repository</span>}
      </div>

      <div style={{ marginTop: 18 }}>
        <div className="field-label" style={{ margin: '0 0 4px' }}>Tracks</div>
        <div className="help" style={{ marginTop: 0, marginBottom: 8 }}>The themed challenge categories this project is competing in.</div>
        <TrackTags tracks={p.tracks} />
      </div>
      <div style={{ marginTop: 18 }}>
        <div className="field-label" style={{ margin: '0 0 4px' }}>Sponsors used</div>
        <div className="help" style={{ marginTop: 0, marginBottom: 8 }}>Sponsor tools, APIs or platforms the team built with.</div>
        <SponsorTags sponsors={p.sponsors} />
      </div>

      <p className="faint small" style={{ marginTop: 18, marginBottom: 0 }}>Team: {p.participants.map((x) => x.email).join(', ')}</p>
    </div>
  );
}

/* ---------------- Details modal (click a leaderboard row) ---------------- */
function DetailModal({ project, criteria, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2 style={{ margin: 0 }}>{project.name}</h2>
            <div className="row small" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {project.average_score != null && <span className="badge green">Avg {project.average_score}/100 · {project.judge_count} judge(s)</span>}
              {project.total_investment > 0 && <span className="badge accent" title={money(project.total_investment)}>{moneyCompact(project.total_investment)} invested</span>}
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} title="Close">✕</button>
        </div>
        <div className="modal-body">
          <ProjectBody p={project} />
          {project.category_averages && (
            <div style={{ marginTop: 18 }}>
              <div className="field-label" style={{ margin: '0 0 6px' }}>Category averages</div>
              <div className="cat-averages">
                {criteria.map((c) => <span key={c.key} className="cat-pill">{SHORT[c.key] || c.label}: {project.category_averages[c.key]}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- View 1: score your projects ---------------- */
function ScoreView({ projects, selected, openProject, scoreData, criteria, form, setForm, investAmt, setInvestAmt, investUnit, setInvestUnit, comments, setComments, submitScore, liveTotal, error, msg, isAdmin }) {
  const investTotal = Number(investAmt || 0) * investUnit;
  return (
    <div className="split">
      <div className="list-pick">
        <p className="small faint" style={{ margin: '0 0 2px' }}>Pick a project to give your score.</p>
        {projects.length === 0 && <div className="card empty"><p>No projects.</p></div>}
        {projects.map((p) => (
          <button type="button" key={p.id} className={`item ${selected?.id === p.id ? 'active' : ''}`} onClick={() => openProject(p)}>
            <div className="spread">
              <strong style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</strong>
              {p.my_score != null ? <span className="badge green">✓ {p.my_score}</span> : <span className="badge amber">to score</span>}
            </div>
            <div className="tags" style={{ marginTop: 4 }}>
              {p.tracks.map((t) => <span key={t.id} className="badge accent">{t.name}</span>)}
              {p.sponsors.map((s) => <span key={s.id} className="badge">{s.name}</span>)}
              {!p.tracks.length && !p.sponsors.length && <span className="faint small">No tracks / sponsors</span>}
            </div>
          </button>
        ))}
      </div>

      <div>
        {!selected ? (
          <div className="card empty"><div className="big">★</div><p>Select a project to review and score.</p></div>
        ) : (
          <div className="stack">
            <div className="card">
              <h2 style={{ marginTop: 0, marginBottom: 8 }}>{selected.name}</h2>
              <ProjectBody p={selected} />
            </div>

            <form onSubmit={submitScore} className="card">
              <div className="spread"><h3 style={{ margin: 0 }}>Your score</h3><span className="total-pill">{liveTotal}/100</span></div>
              <p className="help" style={{ marginTop: 4 }}>Rate each category 0–100. Your total is their average.</p>
              <div style={{ marginTop: 8 }}>
                {criteria.map((c) => (
                  <div key={c.key} className="score-row">
                    <span>{c.label} <span className="faint small">(0–100)</span></span>
                    <input type="number" min={0} max={100} value={form[c.key] ?? 0}
                      onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))} />
                  </div>
                ))}
              </div>

              <div className="card flat" style={{ background: 'var(--surface-2)', marginTop: 16, marginBottom: 0 }}>
                <div className="field-label" style={{ margin: 0 }}>💰 Investment</div>
                <p className="help" style={{ marginTop: 2 }}>If you were an investor, how much would you invest? Pick a unit or enter an exact amount.</p>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <span className="muted" style={{ fontWeight: 700 }}>$</span>
                  <input type="number" min={0} step="any" value={investAmt} onChange={(e) => setInvestAmt(e.target.value)} placeholder="0" style={{ maxWidth: 150, marginTop: 0 }} />
                  <select value={investUnit} onChange={(e) => setInvestUnit(Number(e.target.value))} style={{ width: 'auto', marginTop: 0 }}>
                    {INVEST_UNITS.map((u) => <option key={u.label} value={u.mult}>{u.label}</option>)}
                  </select>
                </div>
                {investTotal > 0 && <p className="small muted" style={{ marginTop: 8, marginBottom: 0 }}>= {money(investTotal)} <span className="faint">({moneyCompact(investTotal)})</span></p>}
              </div>

              <label style={{ marginTop: 14 }}>Comments
                <textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Feedback for the team…" />
              </label>
              {error && <p className="error">{error}</p>}
              {msg && <p className="success">{msg}</p>}
              <button type="submit" style={{ marginTop: 8 }}>{scoreData?.mine ? 'Update score' : 'Save score'}</button>
            </form>

            {isAdmin && scoreData?.scores?.length > 0 && (
              <div className="card">
                <h3 style={{ marginTop: 0 }}>All judges' scores</h3>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Judge</th>{criteria.map((c) => <th key={c.key}>{c.label}</th>)}<th>Total</th><th>Investment</th><th>Comments</th></tr></thead>
                    <tbody>
                      {scoreData.scores.map((s) => (
                        <tr key={s.id}>
                          <td>{s.judge_email}</td>
                          {criteria.map((c) => <td key={c.key}>{s[c.key]}</td>)}
                          <td><strong>{s.total}</strong></td>
                          <td>{money(s.investment)}</td>
                          <td className="small muted">{s.comments}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- View 2: average results ---------------- */
function ResultsView({ ranked, onOpen }) {
  const scored = ranked.filter((p) => p.average_score != null);
  return (
    <div className="card">
      <div className="spread" style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>Leaderboard</h3>
        <span className="muted small">Average /100 across all judges · click a row for full details</span>
      </div>
      {ranked.length === 0 ? <div className="empty"><p>No projects yet.</p></div> : (
        <div className="table-wrap">
          <table className="lb">
            <thead><tr><th>#</th><th className="col-name">Project</th><th>Tracks</th><th>Sponsors</th><th className="col-num">Avg /100</th><th className="col-num">Judges</th></tr></thead>
            <tbody>
              {ranked.map((p) => {
                const rank = p.average_score != null ? scored.indexOf(p) + 1 : null;
                return (
                  <tr key={p.id} className="row-click" onClick={() => onOpen(p)}>
                    <td className={`rank ${rank && rank <= 3 ? `medal-${rank}` : ''}`}>{rank ? (rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank) : '–'}</td>
                    <td className="col-name"><strong className="link-strong">{p.name}</strong></td>
                    <td><TrackTags tracks={p.tracks} /></td>
                    <td><SponsorTags sponsors={p.sponsors} /></td>
                    <td className="col-num">{p.average_score != null ? <span className="score-big">{p.average_score}</span> : <span className="faint">—</span>}</td>
                    <td className="col-num">{p.judge_count || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------- View 3: investments ---------------- */
function InvestmentsView({ ranked, onOpen }) {
  const invested = ranked.filter((p) => (p.total_investment ?? 0) > 0);
  const grandTotal = ranked.reduce((a, p) => a + (p.total_investment || 0), 0);
  return (
    <div className="card">
      <div className="spread" style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>Investment leaderboard</h3>
        <span className="muted small" title={money(grandTotal)}>Total across all judges · {moneyCompact(grandTotal)} overall · click a row for details</span>
      </div>
      {ranked.length === 0 ? <div className="empty"><p>No projects yet.</p></div> : (
        <div className="table-wrap">
          <table className="lb">
            <thead><tr><th>#</th><th className="col-name">Project</th><th>Tracks</th><th>Sponsors</th><th className="col-num">Total invested</th><th className="col-num">Investors</th></tr></thead>
            <tbody>
              {ranked.map((p) => {
                const rank = (p.total_investment ?? 0) > 0 ? invested.indexOf(p) + 1 : null;
                return (
                  <tr key={p.id} className="row-click" onClick={() => onOpen(p)}>
                    <td className={`rank ${rank && rank <= 3 ? `medal-${rank}` : ''}`}>{rank ? (rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank) : '–'}</td>
                    <td className="col-name"><strong className="link-strong">{p.name}</strong></td>
                    <td><TrackTags tracks={p.tracks} /></td>
                    <td><SponsorTags sponsors={p.sponsors} /></td>
                    <td className="col-num"><span className="score-big" title={money(p.total_investment)}>{moneyCompact(p.total_investment)}</span></td>
                    <td className="col-num">{p.investor_count || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
