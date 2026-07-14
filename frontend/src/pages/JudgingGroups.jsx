import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { get, post, del } from '../api.js';
import { useAuth } from '../auth.jsx';

const GROUP_COLORS = { A: '#ef4444', B: '#3b82f6', C: '#22c55e', D: '#f59e0b', E: '#a855f7', F: '#06b6d4', G: '#ec4899', H: '#84cc16' };
const gc = (g) => GROUP_COLORS[g] || '#6b7280';

function fmtTime(h, m) {
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

// All groups start at the same time (parallel rooms).
// Within each group, projects are sequential: project idx starts at base + idx × pp.
function computeGroupSchedule(groupKeys, groups, startStr, pp) {
  if (!startStr || !pp) return {};
  const [hh, mm] = startStr.split(':').map(Number);
  const baseMins = hh * 60 + mm;
  const result = {};
  for (const g of groupKeys) {
    const projs = groups[g]?.projects || [];
    const endMins = baseMins + projs.length * pp;
    const projectSlots = projs.map((_, idx) => {
      const sm = baseMins + idx * pp;
      const em = sm + pp;
      return `${fmtTime(Math.floor(sm / 60) % 24, sm % 60)} – ${fmtTime(Math.floor(em / 60) % 24, em % 60)}`;
    });
    result[g] = {
      window: projs.length > 0
        ? `${fmtTime(Math.floor(baseMins / 60) % 24, baseMins % 60)} – ${fmtTime(Math.floor(endMins / 60) % 24, endMins % 60)}`
        : null,
      projectSlots,
    };
  }
  return result;
}

function fmtActual(iso) {
  if (!iso) return null;
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return null; }
}

function computeDemoTimes(slots, startTimeStr) {
  if (!startTimeStr) return slots.map((s) => ({ ...s, estStart: fmtActual(s.actual_start), estEnd: fmtActual(s.actual_end) }));
  const [hh, mm] = startTimeStr.split(':').map(Number);
  let cursor = hh * 60 + mm;
  return slots.map((s) => {
    const sStart = fmtActual(s.actual_start) || fmtTime(Math.floor(cursor / 60) % 24, cursor % 60);
    const eEnd = fmtActual(s.actual_end) || fmtTime(Math.floor((cursor + (s.duration_minutes || 10)) / 60) % 24, (cursor + (s.duration_minutes || 10)) % 60);
    cursor += (s.duration_minutes || 10) + (s.break_after_minutes || 0);
    return { ...s, estStart: sStart, estEnd: eEnd };
  });
}

export default function JudgingGroups() {
  const { meta, hid } = useOutletContext();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isJudge = meta.is_judge;

  const [data, setData] = useState(null);
  const [demoSlots, setDemoSlots] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  async function load() {
    try { const d = await get(`/api/hackathons/${hid}/judging-groups`); setData(d); } catch (e) { setError(e.message); }
    try { const slots = await get(`/api/hackathons/${hid}/demo-slots`); setDemoSlots(slots); } catch (_) {}
  }
  useEffect(() => { load(); }, [hid]);

  async function attend() {
    setBusy(true); setMsg(''); setError('');
    try {
      const r = await post(`/api/hackathons/${hid}/judging-groups/attend`);
      if (r.pending && r.already) setMsg("You're already checked in. You'll be placed in a group once groups are assigned.");
      else if (r.pending) setMsg("Checked in! You'll be placed in a group once the admin assigns groups.");
      else if (r.already) setMsg(`You're already in Group ${r.group}.`);
      else setMsg(`Checked in! You're in Group ${r.group}.`);
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  if (!data) return <div className="page muted">Loading…</div>;

  const groups = data.groups || {};
  const groupKeys = Object.keys(groups).sort();
  const assigned = data.config?.assigned_at;
  const pp = data.config?.per_project_minutes;
  const nowHHMM = (() => { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })();
  // Use actual_start from the first demo slot when available (demos have begun).
  // Otherwise anchor to current clock time + any admin preview buffer.
  const firstActual = demoSlots.find((s) => s.actual_start);
  const baseStr = (() => {
    if (firstActual) {
      const d = new Date(firstActual.actual_start);
      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }
    return nowHHMM;
  })();
  const startStr = baseStr;
  const groupSchedule = computeGroupSchedule(groupKeys, groups, startStr, pp);
  const timedSlots = computeDemoTimes(demoSlots, startStr);
  const demoByGroup = {};
  for (const s of timedSlots) {
    const grp = s.project_judge_group || s.judge_group || '_none';
    if (!demoByGroup[grp]) demoByGroup[grp] = [];
    demoByGroup[grp].push(s);
  }

  const myProject = data.my_project;
  const myDemoSlot = myProject ? timedSlots.find((s) => s.project_id === myProject.id) : null;

  const myGroupProjects = myProject?.judge_group ? (groups[myProject.judge_group]?.projects || []) : [];
  const myProjectPosInGroup = myGroupProjects.findIndex((p) => p.id === myProject?.id);

  return (
    <div className="stack">
      <h1 style={{ marginBottom: 4 }}>Project Demo Groups</h1>
      {error && <p className="error">{error}</p>}
      {msg && <p className="success">{msg}</p>}

      {/* ── Participant: my project card ── */}
      {myProject && (
        <div className="card" style={{ borderLeft: `4px solid ${myProject.judge_group ? gc(myProject.judge_group) : 'var(--border)'}` }}>
          <div className="small faint" style={{ textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Your Project</div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{myProject.name}</div>
          {myProject.judge_group ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14 }}>
                Demo Group:{' '}
                <strong style={{ color: gc(myProject.judge_group), fontSize: 18 }}>{myProject.judge_group}</strong>
              </span>
              {groupSchedule[myProject.judge_group]?.window && (
                <span className="badge" style={{ background: gc(myProject.judge_group) + '22', color: gc(myProject.judge_group), fontWeight: 600, fontSize: 13 }}>
                  {groupSchedule[myProject.judge_group].window}
                </span>
              )}
              {myProjectPosInGroup >= 0 && groupSchedule[myProject.judge_group]?.projectSlots[myProjectPosInGroup] && (
                <span className="muted small">
                  Your slot: <strong>{groupSchedule[myProject.judge_group].projectSlots[myProjectPosInGroup]}</strong>
                </span>
              )}
              {myDemoSlot && (
                <span className="muted small">
                  Demo: <strong>{myDemoSlot.estStart}{myDemoSlot.estEnd ? ` – ${myDemoSlot.estEnd}` : ''}</strong>
                </span>
              )}
            </div>
          ) : (
            <span className="muted small">Demo groups haven't been assigned yet — check back soon.</span>
          )}
        </div>
      )}

      {/* ── Judge: self-attend button + group info ── */}
      {isJudge && !isAdmin && (
        <div className="card">
          <div className="small faint" style={{ textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Your Judge Schedule</div>
          {data.my_judge_group ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 14 }}>
                  You are in{' '}
                  <strong style={{ color: gc(data.my_judge_group), fontSize: 20 }}>Group {data.my_judge_group}</strong>
                </span>
                {groupSchedule[data.my_judge_group]?.window && (
                  <span className="badge" style={{ background: gc(data.my_judge_group) + '22', color: gc(data.my_judge_group), fontWeight: 600, fontSize: 13 }}>
                    {groupSchedule[data.my_judge_group].window}
                  </span>
                )}
              </div>
              {groups[data.my_judge_group] && (
                <div className="stack" style={{ gap: 6 }}>
                  <div className="small faint">Projects to review ({groups[data.my_judge_group].projects.length}):</div>
                  {groups[data.my_judge_group].projects.map((p, idx) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 6 }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                        {groupSchedule[data.my_judge_group]?.projectSlots[idx] && (
                          <div className="small muted">{groupSchedule[data.my_judge_group].projectSlots[idx]}</div>
                        )}
                      </div>
                      <Link to={`/h/${hid}/judging`}>
                        <button style={{ fontSize: 12, padding: '4px 12px' }}>Score ↗</button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : data.my_judge_attended ? (
            <div style={{ padding: '10px 14px', background: '#fef9c3', borderRadius: 8, border: '1px solid #fde68a' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>✓ You are checked in</div>
              <div className="muted small">You'll be placed in a group once the admin assigns groups. Check back soon.</div>
            </div>
          ) : (
            <div>
              <p className="muted" style={{ marginBottom: 10 }}>
                {assigned ? 'Mark your attendance to receive your group assignment.' : "Check in now — you'll be placed in a group once the admin assigns groups."}
              </p>
              <button onClick={attend} disabled={busy}>
                {busy ? 'Processing…' : '✓ Mark My Attendance'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Demo Schedule (visible to all once slots exist) ── */}
      {timedSlots.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: 4 }}>🎬 Final Demos Schedule</h3>
          {myDemoSlot && (
            <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: gc(myProject?.judge_group || 'A') + '22', border: `1.5px solid ${gc(myProject?.judge_group || 'A')}` }}>
              <span style={{ fontWeight: 600 }}>Your project</span>
              {' '}presents at{' '}
              <strong>{myDemoSlot.estStart}</strong>
              {myDemoSlot.estEnd && <> – <strong>{myDemoSlot.estEnd}</strong></>}
              {myProject?.judge_group && (
                <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, background: gc(myProject.judge_group), color: '#fff', fontSize: 12, fontWeight: 700 }}>
                  Group {myProject.judge_group}
                </span>
              )}
            </div>
          )}
          {groupKeys.filter((g) => (demoByGroup[g] || []).length > 0).map((g) => (
            <div key={g} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: gc(g) }}>Group {g}</span>
                {groupSchedule[g]?.window && <span className="muted small">{groupSchedule[g].window}</span>}
              </div>
              <div className="stack" style={{ gap: 4 }}>
                {(demoByGroup[g] || []).map((s) => {
                  const isMe = myProject && s.project_id === myProject.id;
                  return (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: 6, background: isMe ? gc(g) + '22' : 'var(--surface-2)', border: isMe ? `1.5px solid ${gc(g)}` : '1.5px solid transparent', fontWeight: isMe ? 600 : 400 }}>
                      <div style={{ fontSize: 13 }}>
                        {s.custom_name || s.project_name || 'Demo'}
                        {isMe && <span style={{ marginLeft: 8, fontSize: 11, color: gc(g) }}>← yours</span>}
                      </div>
                      <div className="small muted" style={{ flexShrink: 0, marginLeft: 12 }}>
                        {s.estStart}{s.estEnd ? ` – ${s.estEnd}` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {(demoByGroup['_none'] || []).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--muted)', marginBottom: 6 }}>Other Slots</div>
              <div className="stack" style={{ gap: 4 }}>
                {demoByGroup['_none'].map((s) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: 6, background: 'var(--surface-2)', fontSize: 13 }}>
                    <span>{s.custom_name || s.project_name || 'Demo'}</span>
                    <span className="small muted">{s.estStart}{s.estEnd ? ` – ${s.estEnd}` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── All groups view (everyone) ── */}
      {groupKeys.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: 14 }}>All Demo Groups</h3>
          <div className="grid">
            {groupKeys.map((g) => (
              <div key={g} className="card flat" style={{ border: `2px solid ${gc(g)}`, background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 22, color: gc(g) }}>Group {g}</div>
                  {groupSchedule[g]?.window && (
                    <div className="small muted" style={{ textAlign: 'right', lineHeight: 1.3, marginTop: 4 }}>{groupSchedule[g].window}</div>
                  )}
                </div>
                {groups[g].judges.length > 0 && (
                  <div className="small" style={{ marginBottom: 8, color: gc(g), fontWeight: 500 }}>
                    {groups[g].judges.map((j) => j.email).join(', ')}
                  </div>
                )}
                <div className="stack" style={{ gap: 4 }}>
                  {groups[g].projects.map((p, idx) => (
                    <div key={p.id} style={{ fontSize: 13, padding: '5px 8px', background: 'var(--surface)', borderRadius: 5 }}>
                      <div>{p.name}</div>
                      {groupSchedule[g]?.projectSlots[idx] && (
                        <div className="small muted">{groupSchedule[g].projectSlots[idx]}</div>
                      )}
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

      {groupKeys.length === 0 && (
        <div className="card">
          <p className="muted">Project demo groups haven't been configured yet. The admin will set this up in the Admin panel.</p>
        </div>
      )}
    </div>
  );
}
