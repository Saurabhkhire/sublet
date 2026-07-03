import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { get, post, put, del } from '../api.js';
import { useAuth } from '../auth.jsx';

const GROUP_COLORS = { A: '#ef4444', B: '#3b82f6', C: '#22c55e', D: '#f59e0b', E: '#a855f7', F: '#06b6d4', G: '#ec4899', H: '#84cc16' };
const gc = (g) => GROUP_COLORS[g] || '#6b7280';

function fmtTime(h, m) {
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function groupWindow(g, startStr, judgeTimeMins) {
  if (!startStr || !judgeTimeMins) return null;
  const [hh, mm] = startStr.split(':').map(Number);
  const idx = g.charCodeAt(0) - 65;
  const startMins = hh * 60 + mm + idx * judgeTimeMins;
  const endMins = startMins + judgeTimeMins;
  return `${fmtTime(Math.floor(startMins / 60) % 24, startMins % 60)} – ${fmtTime(Math.floor(endMins / 60) % 24, endMins % 60)}`;
}

export default function JudgingGroups() {
  const { meta, hid } = useOutletContext();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isJudge = meta.is_judge;

  const [data, setData] = useState(null);
  const [params, setParams] = useState({ judge_time_minutes: 60, per_project_minutes: 5 });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const d = await get(`/api/hackathons/${hid}/judging-groups`);
      setData(d);
      if (d.config && d.config.judge_time_minutes) {
        setParams({ judge_time_minutes: d.config.judge_time_minutes, per_project_minutes: d.config.per_project_minutes });
      }
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, [hid]);

  async function saveParams(e) {
    e.preventDefault();
    setBusy(true); setMsg(''); setError('');
    try {
      await put(`/api/hackathons/${hid}/judging-groups/config`, params);
      setMsg('Saved!'); setTimeout(() => setMsg(''), 2000);
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function assign() {
    if (!confirm('Assign all projects to judging groups? Existing group assignments will be overwritten.')) return;
    setBusy(true); setMsg(''); setError('');
    try {
      const r = await post(`/api/hackathons/${hid}/judging-groups/assign`);
      setMsg(`Assigned ${r.projects_assigned} project(s) into ${r.group_count} group(s).`);
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function attend() {
    setBusy(true); setMsg(''); setError('');
    try {
      const r = await post(`/api/hackathons/${hid}/judging-groups/attend`);
      setMsg(r.already ? `You're already in Group ${r.group}.` : `Checked in! You're in Group ${r.group}.`);
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function adminMarkAttend(uid) {
    setBusy(true); setError('');
    try { await post(`/api/hackathons/${hid}/judging-groups/attend/${uid}`); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function adminClearAttend(uid) {
    setBusy(true); setError('');
    try { await del(`/api/hackathons/${hid}/judging-groups/attend/${uid}`); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  if (!data) return <div className="page muted">Loading…</div>;

  const groups = data.groups || {};
  const groupKeys = Object.keys(groups).sort();
  const assigned = data.config?.assigned_at;
  const jt = data.config?.judge_time_minutes;
  const startStr = meta.hackathon?.start_time;
  const ppg = data.projects_per_group;

  const totalProjectCount = groupKeys.reduce((a, k) => a + groups[k].projects.length, 0) + (data.unassigned_projects || 0);

  return (
    <div className="stack">
      <h1 style={{ marginBottom: 4 }}>Judging Groups</h1>
      {error && <p className="error">{error}</p>}
      {msg && <p className="success">{msg}</p>}

      {/* ── My project card (for participants) ── */}
      {data.my_project && (
        <div className="card" style={{ borderLeft: `4px solid ${data.my_project.judge_group ? gc(data.my_project.judge_group) : 'var(--border)'}` }}>
          <div className="small faint" style={{ textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Your Project</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{data.my_project.name}</div>
          {data.my_project.judge_group ? (
            <div>
              <span>Assigned to </span>
              <strong style={{ color: gc(data.my_project.judge_group), fontSize: 16 }}>Group {data.my_project.judge_group}</strong>
              {groupWindow(data.my_project.judge_group, startStr, jt) && (
                <span className="muted"> · {groupWindow(data.my_project.judge_group, startStr, jt)}</span>
              )}
            </div>
          ) : (
            <span className="muted small">Groups not assigned yet</span>
          )}
        </div>
      )}

      {/* ── Judge: attendance + group ── */}
      {isJudge && !isAdmin && (
        <div className="card">
          <div className="small faint" style={{ textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Your Judge Assignment</div>
          {data.my_judge_group ? (
            <>
              <div style={{ marginBottom: 8 }}>
                You are in <strong style={{ color: gc(data.my_judge_group), fontSize: 18 }}>Group {data.my_judge_group}</strong>
                {groupWindow(data.my_judge_group, startStr, jt) && (
                  <span className="muted"> · {groupWindow(data.my_judge_group, startStr, jt)}</span>
                )}
              </div>
              {groups[data.my_judge_group] && (
                <div className="stack" style={{ gap: 6 }}>
                  <div className="small faint">Projects to review ({groups[data.my_judge_group].projects.length}):</div>
                  {groups[data.my_judge_group].projects.map((p) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 6 }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                        {p.team_emails && <div className="small muted">{p.team_emails.split(',').join(', ')}</div>}
                      </div>
                      <Link to={`/h/${hid}/judging`}>
                        <button style={{ fontSize: 12, padding: '4px 12px' }}>Judge ↗</button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div>
              <p className="muted" style={{ marginBottom: 10 }}>
                {assigned ? 'Mark your attendance to receive your group assignment.' : 'The admin has not assigned groups yet.'}
              </p>
              <button onClick={attend} disabled={busy || !assigned}>
                {busy ? 'Processing…' : '✓ Mark My Attendance'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Admin config + assignment ── */}
      {isAdmin && (
        <>
          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>⚙ Judging Parameters</h3>
            <form onSubmit={saveParams}>
              <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
                <label style={{ flex: 1, minWidth: 150 }}>
                  Total judge time (min)
                  <input type="number" min={1} max={480} value={params.judge_time_minutes}
                    onChange={(e) => setParams({ ...params, judge_time_minutes: Number(e.target.value) })} />
                </label>
                <label style={{ flex: 1, minWidth: 150 }}>
                  Time per project (min)
                  <input type="number" min={1} max={120} value={params.per_project_minutes}
                    onChange={(e) => setParams({ ...params, per_project_minutes: Number(e.target.value) })} />
                </label>
              </div>
              {ppg > 0 && (
                <div className="muted small" style={{ marginTop: 8, padding: '6px 10px', background: 'var(--surface-2)', borderRadius: 6 }}>
                  → <strong>{ppg}</strong> project(s) per group · <strong>{data.group_count_needed}</strong> groups needed for <strong>{totalProjectCount}</strong> projects
                </div>
              )}
              <div className="row" style={{ gap: 10, marginTop: 12 }}>
                <button type="submit" disabled={busy}>Save</button>
                <button type="button" className="outline" onClick={assign} disabled={busy}>
                  {assigned ? '↺ Re-assign Groups' : '▶ Assign Groups Now'}
                </button>
                {msg && <span className="success small">{msg}</span>}
              </div>
            </form>
            {assigned && (
              <p className="small" style={{ marginTop: 8, color: 'var(--green,#16a34a)' }}>
                ✓ Last assigned {new Date(assigned).toLocaleString()}
              </p>
            )}
          </div>

          {/* Judge attendance table */}
          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: 10 }}>👩‍⚖️ Judge Attendance</h3>
            <p className="muted small" style={{ marginBottom: 10 }}>
              Judges can check in themselves from this page. You can also mark or clear on their behalf.
            </p>
            {(data.all_judges || []).length === 0 ? (
              <p className="faint small">No judges added yet.</p>
            ) : (
              <table>
                <thead>
                  <tr><th>Judge</th><th>Group</th><th>Checked in</th><th></th></tr>
                </thead>
                <tbody>
                  {(data.all_judges || []).map((j) => (
                    <tr key={j.user_id}>
                      <td className="small">{j.email}</td>
                      <td>
                        {j.judge_group
                          ? <span className="badge" style={{ background: gc(j.judge_group), color: '#fff' }}>Group {j.judge_group}</span>
                          : <span className="badge">—</span>}
                      </td>
                      <td className="small muted">
                        {j.attended_at ? new Date(j.attended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td>
                        {j.judge_group ? (
                          <button className="outline" style={{ fontSize: 12, padding: '2px 8px' }} disabled={busy}
                            onClick={() => adminClearAttend(j.user_id)}>Clear</button>
                        ) : (
                          <button style={{ fontSize: 12, padding: '2px 8px' }} disabled={busy || !assigned}
                            onClick={() => adminMarkAttend(j.user_id)}>Mark In</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── All groups view (all users) ── */}
      {groupKeys.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: 14 }}>All Groups</h3>
          <div className="grid">
            {groupKeys.map((g) => (
              <div key={g} className="card flat" style={{ border: `2px solid ${gc(g)}`, background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 22, color: gc(g) }}>Group {g}</div>
                  {groupWindow(g, startStr, jt) && (
                    <div className="small muted" style={{ textAlign: 'right', lineHeight: 1.3, marginTop: 4 }}>{groupWindow(g, startStr, jt)}</div>
                  )}
                </div>
                {groups[g].judges.length > 0 && (
                  <div className="small" style={{ marginBottom: 8, color: gc(g), fontWeight: 500 }}>
                    {groups[g].judges.map((j) => j.email).join(', ')}
                  </div>
                )}
                <div className="stack" style={{ gap: 4 }}>
                  {groups[g].projects.map((p) => (
                    <div key={p.id} style={{ fontSize: 13, padding: '5px 8px', background: 'var(--surface)', borderRadius: 5 }}>
                      {p.name}
                    </div>
                  ))}
                  {groups[g].projects.length === 0 && <div className="faint small">No projects yet</div>}
                </div>
              </div>
            ))}
          </div>
          {data.unassigned_projects > 0 && (
            <p className="small muted" style={{ marginTop: 10 }}>+ {data.unassigned_projects} project(s) pending assignment.</p>
          )}
        </div>
      )}

      {groupKeys.length === 0 && !isAdmin && (
        <div className="card"><p className="muted">Judging groups haven't been set up yet.</p></div>
      )}
    </div>
  );
}
