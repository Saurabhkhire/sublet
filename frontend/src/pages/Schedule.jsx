import { useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { get, put } from '../api.js';
import { useAuth } from '../auth.jsx';

// ── helpers ──────────────────────────────────────────────────────────────────

function playBeep(frequency = 440, duration = 0.35, vol = 0.3) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.01);
  } catch (_) {}
}

function play2Min() {
  playBeep(660, 0.3);
  setTimeout(() => playBeep(660, 0.3), 400);
}
function playTimeUp() {
  playBeep(880, 0.25);
  setTimeout(() => playBeep(440, 0.25), 320);
  setTimeout(() => playBeep(880, 0.25), 640);
}

function fmtSecs(secs) {
  const a = Math.abs(Math.round(secs));
  const m = Math.floor(a / 60);
  const s = a % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Given speakers (in order) + an event start string "HH:MM", compute
// the scheduled start label for each speaker.
function calcScheduledTimes(speakers, startStr) {
  if (!startStr) return speakers.map(() => '');
  const [hh, mm] = startStr.split(':').map(Number);
  let totalMins = hh * 60 + mm;
  return speakers.map((sp) => {
    const h = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const label = `${h12}:${String(m).padStart(2, '0')} ${period}`;
    totalMins += sp.duration_minutes;
    return label;
  });
}

const STATUS_LABEL = {
  scheduled: '',
  speaking: '🎤 LIVE',
  completed: '✅',
  missed: '⚠ Missed',
  skipped: '⏭ Skipped',
};

// ── component ─────────────────────────────────────────────────────────────────

export default function Schedule() {
  const { meta, hid } = useOutletContext();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [speakers, setSpeakers] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  // currentId: the id of the speaker currently speaking (null if none)
  const [currentId, setCurrentId] = useState(null);
  const [elapsed, setElapsed] = useState(0);   // seconds since current speaker started

  const timerRef = useRef(null);
  const alerted2Ref = useRef(false);   // 2-min warning fired this speaker
  const alertedEndRef = useRef(false); // time-up alert fired this speaker

  // ── drag state for admin reorder ─────────────────────────────────────────
  const [dragSrc, setDragSrc] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  // ── derived ───────────────────────────────────────────────────────────────
  const current = speakers.find((s) => s.id === currentId) || null;
  const currentIdx = current ? speakers.indexOf(current) : -1;
  const timeLeft = current ? current.duration_minutes * 60 - elapsed : 0;
  const isOvertime = timeLeft < 0;

  const completed = speakers.filter((s) => s.status === 'completed').length;
  const missed    = speakers.filter((s) => s.status === 'missed').length;
  const skipped   = speakers.filter((s) => s.status === 'skipped').length;
  const remaining = speakers.filter((s) => s.status === 'scheduled').length;
  const total     = speakers.length;

  const prevSpeaker = speakers.slice(0, currentIdx).filter((s) => s.status === 'completed').slice(-1)[0] || null;
  const nextSpeaker = speakers.find((s, i) => i > currentIdx && s.status === 'scheduled') || null;

  const scheduledTimes = calcScheduledTimes(speakers, meta.hackathon.start_time || '');

  const timerColor = isOvertime ? '#dc2626' : timeLeft <= 60 ? '#d97706' : 'inherit';

  // ── load ──────────────────────────────────────────────────────────────────
  const load = useCallback(() => {
    get(`/api/hackathons/${hid}/speakers`).then(setSpeakers).catch(() => {});
  }, [hid]);

  useEffect(() => { load(); }, [load]);

  // ── timer ─────────────────────────────────────────────────────────────────
  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }
  function startTimer() {
    stopTimer();
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }
  useEffect(() => () => stopTimer(), []);

  // ── sound alerts ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLive || !current || isPaused) return;
    if (!alerted2Ref.current && timeLeft <= 120 && timeLeft > 0) {
      alerted2Ref.current = true;
      play2Min();
    }
    if (!alertedEndRef.current && timeLeft <= 0) {
      alertedEndRef.current = true;
      playTimeUp();
    }
  }, [timeLeft, isLive, current, isPaused]);

  // ── actions ───────────────────────────────────────────────────────────────
  async function activateSpeaker(list, id) {
    alerted2Ref.current = false;
    alertedEndRef.current = false;
    setCurrentId(id);
    setElapsed(0);
    setIsPaused(false);
    startTimer();
    await put(`/api/hackathons/${hid}/speakers/${id}`, {
      status: 'speaking',
      actual_start: new Date().toISOString(),
    });
    // Optimistic update so UI doesn't wait for a reload
    setSpeakers((prev) => prev.map((s) => s.id === id ? { ...s, status: 'speaking' } : s));
  }

  async function startEvent() {
    const first = speakers.find((s) => s.status === 'scheduled');
    if (!first) return;
    setIsLive(true);
    await activateSpeaker(speakers, first.id);
  }

  async function stopEvent() {
    stopTimer();
    setIsLive(false);
    setCurrentId(null);
  }

  function pause() { setIsPaused(true); stopTimer(); }
  function resume() { setIsPaused(false); startTimer(); }

  // Finish current speaker with the given status, then move to next scheduled.
  async function finishAndAdvance(status) {
    stopTimer();
    if (!current) return;
    await put(`/api/hackathons/${hid}/speakers/${current.id}`, {
      status,
      actual_end: new Date().toISOString(),
    });
    setSpeakers((prev) => prev.map((s) => s.id === current.id ? { ...s, status } : s));

    // Find next scheduled (after current in order)
    const nextIdx = speakers.findIndex((s, i) => i > currentIdx && s.status === 'scheduled');
    if (nextIdx >= 0) {
      await activateSpeaker(speakers, speakers[nextIdx].id);
    } else {
      setIsLive(false);
      setCurrentId(null);
    }
  }

  async function missSpeaker() {
    // Mark as missed, bump to end of list, reload, continue.
    stopTimer();
    if (!current) return;
    const maxOrder = speakers.reduce((m, s) => Math.max(m, s.order_index), 0);
    await put(`/api/hackathons/${hid}/speakers/${current.id}`, {
      status: 'missed',
      actual_end: new Date().toISOString(),
      order_index: maxOrder + 1,
    });
    const fresh = await get(`/api/hackathons/${hid}/speakers`);
    setSpeakers(fresh);
    // After reload, find next scheduled from the same position (currentIdx)
    // but fresh list may have shifted, so find by position
    const nextSp = fresh.find((s, i) => i >= currentIdx && s.status === 'scheduled');
    if (nextSp) {
      await activateSpeaker(fresh, nextSp.id);
    } else {
      setIsLive(false);
      setCurrentId(null);
    }
  }

  function addTime(mins) {
    setElapsed((e) => Math.max(0, e - mins * 60));
  }

  // ── drag-and-drop reorder (admin, non-live) ───────────────────────────────
  async function commitReorder(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    const list = [...speakers];
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    const patch = list.map((s, i) => ({ id: s.id, order_index: i }));
    setSpeakers(list);
    await put(`/api/hackathons/${hid}/speakers/reorder`, patch);
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="stack">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0 }}>🎤 Speaker Schedule</h1>
          <p className="muted" style={{ marginTop: 4, marginBottom: 0 }}>{meta.hackathon.name}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isLive && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 13 }}>
              ● LIVE
            </span>
          )}
          {isAdmin && !isLive && speakers.some((s) => s.status === 'scheduled') && (
            <button onClick={startEvent} style={{ background: 'var(--accent)', color: '#fff' }}>
              ▶ Start Event
            </button>
          )}
          {isAdmin && isLive && (
            <button className="btn-outline" onClick={stopEvent} style={{ color: '#dc2626', borderColor: '#dc2626' }}>
              ■ End Event
            </button>
          )}
        </div>
      </div>

      {/* Dashboard stats */}
      <div className="card">
        <div className="stat-row">
          <div className="stat"><div className="n">{total}</div><div className="l">Total</div></div>
          <div className="stat"><div className="n" style={{ color: 'var(--green,#16a34a)' }}>{completed}</div><div className="l">Done</div></div>
          <div className="stat"><div className="n">{remaining}</div><div className="l">Remaining</div></div>
          <div className="stat"><div className="n" style={{ color: '#d97706' }}>{missed}</div><div className="l">Missed</div></div>
          <div className="stat"><div className="n" style={{ color: 'var(--muted)' }}>{skipped}</div><div className="l">Skipped</div></div>
        </div>
        {(prevSpeaker || current || nextSpeaker) && (
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 14, display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            {prevSpeaker && (
              <div>
                <div className="faint" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em' }}>Previous</div>
                <div className="small muted">{prevSpeaker.name}</div>
              </div>
            )}
            {current && (
              <div>
                <div className="faint" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em' }}>Now speaking</div>
                <div style={{ fontWeight: 700 }}>{current.name}{current.title ? <span className="muted" style={{ fontWeight: 400 }}> · {current.title}</span> : ''}</div>
              </div>
            )}
            {nextSpeaker && (
              <div>
                <div className="faint" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em' }}>Up next</div>
                <div className="small">{nextSpeaker.name}</div>
              </div>
            )}
            {total > 0 && (
              <div style={{ marginLeft: 'auto' }}>
                <div className="faint" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em' }}>Progress</div>
                <div className="small">{completed} of {total} completed</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live timer + controls */}
      {isLive && current && (
        <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div className="faint" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
            Now speaking
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 2 }}>{current.name}</div>
          {current.title && <div className="muted small" style={{ marginBottom: 20 }}>{current.title}</div>}

          {/* Big timer */}
          <div style={{
            fontSize: 80, fontWeight: 900, lineHeight: 1, letterSpacing: '-2px',
            fontVariantNumeric: 'tabular-nums', color: timerColor, marginBottom: 6,
          }}>
            {isOvertime ? '+' : ''}{fmtSecs(Math.abs(timeLeft))}
          </div>
          <div className="faint small" style={{ marginBottom: 28 }}>
            {isOvertime
              ? `${fmtSecs(Math.abs(timeLeft))} overtime`
              : `of ${current.duration_minutes} min`}
          </div>

          {/* Pause / Resume / End Early / Next */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {isPaused
              ? <button onClick={resume}>▶ Resume</button>
              : <button onClick={pause}>⏸ Pause</button>
            }
            <button className="btn-outline" onClick={() => finishAndAdvance('completed')}>✅ End Early</button>
            <button className="btn-outline" onClick={() => finishAndAdvance('completed')}>⏭ Next Speaker</button>
          </div>

          {/* Add time */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <span className="faint small">Add time:</span>
            {[1, 2, 5].map((m) => (
              <button key={m} className="btn-outline" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => addTime(m)}>
                +{m} min
              </button>
            ))}
          </div>

          {/* Miss / Skip */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn-outline"
              style={{ borderColor: '#d97706', color: '#d97706', padding: '5px 14px', fontSize: 13 }}
              onClick={missSpeaker}
            >
              ⚠ Miss Speaker
            </button>
            <button
              className="btn-outline"
              style={{ borderColor: 'var(--muted)', color: 'var(--muted)', padding: '5px 14px', fontSize: 13 }}
              onClick={() => finishAndAdvance('skipped')}
            >
              ⏭ Skip Speaker
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Timeline</h3>
          {isAdmin && !isLive && speakers.length > 1 && (
            <span className="faint small">Drag rows to reorder</span>
          )}
        </div>

        {speakers.length === 0 && (
          <p className="faint small" style={{ margin: 0 }}>
            No speakers yet. Admins can add speakers in the Admin panel.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {speakers.map((sp, idx) => {
            const isCurrent = sp.id === currentId;
            const isDragging = dragSrc === idx;
            const isDropTarget = dragOver === idx && dragSrc !== null && dragSrc !== idx;
            return (
              <div
                key={sp.id}
                draggable={isAdmin && !isLive}
                onDragStart={() => setDragSrc(idx)}
                onDragEnd={() => { setDragSrc(null); setDragOver(null); }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(idx); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => { commitReorder(dragSrc, idx); setDragSrc(null); setDragOver(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '9px 12px', borderRadius: 7,
                  border: isCurrent
                    ? '1.5px solid var(--accent)'
                    : isDropTarget
                    ? '1.5px dashed var(--accent)'
                    : '1.5px solid transparent',
                  background: isCurrent ? 'var(--surface-2)' : 'transparent',
                  opacity: (sp.status === 'skipped' || isDragging) ? 0.4 : 1,
                  cursor: isAdmin && !isLive ? 'grab' : 'default',
                  transition: 'background 0.15s',
                }}
              >
                {/* Time */}
                <div style={{ width: 64, fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>
                  {scheduledTimes[idx] || '—'}
                </div>

                {/* Speaker info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: isCurrent ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sp.name}
                  </div>
                  {sp.title && (
                    <div className="faint small" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sp.title}
                    </div>
                  )}
                </div>

                {/* Duration */}
                <div style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>
                  {sp.duration_minutes} min
                </div>

                {/* Status badge */}
                <div style={{ fontSize: 13, flexShrink: 0, minWidth: 70, textAlign: 'right',
                  color: sp.status === 'speaking' ? 'var(--accent)'
                    : sp.status === 'completed' ? 'var(--green,#16a34a)'
                    : sp.status === 'missed' ? '#d97706'
                    : 'var(--muted)',
                  fontWeight: sp.status === 'speaking' ? 700 : 400,
                }}>
                  {STATUS_LABEL[sp.status] || ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
