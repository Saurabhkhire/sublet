import { useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { get, put } from '../api.js';
import { useAuth } from '../auth.jsx';

function playBeep(frequency = 440, duration = 0.35, vol = 0.3) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + duration + 0.01);
  } catch (_) {}
}
function play2Min() { playBeep(660, 0.3); setTimeout(() => playBeep(660, 0.3), 400); }
function playTimeUp() {
  playBeep(880, 0.25);
  setTimeout(() => playBeep(440, 0.25), 320);
  setTimeout(() => playBeep(880, 0.25), 640);
}

function fmtSecs(secs) {
  const a = Math.abs(Math.round(secs));
  return `${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}
function fmtTime(hhmm) {
  if (!hhmm) return '';
  const [hh, mm] = hhmm.split(':').map(Number);
  if (isNaN(hh)) return hhmm;
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
}
function addMinsRaw(totalMins, add) {
  const t = totalMins + add;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
function calcTimes(slots, startStr) {
  const noBase = !startStr && slots.every((s) => !s.scheduled_start);
  if (noBase) return slots.map(() => '');
  let totalMins = 0;
  if (startStr) { const [hh, mm] = startStr.split(':').map(Number); totalMins = hh * 60 + mm; }
  return slots.map((s) => {
    if (s.scheduled_start) {
      const parts = s.scheduled_start.split(':');
      if (parts.length === 2) totalMins = Number(parts[0]) * 60 + Number(parts[1]);
    }
    const label = fmtTime(addMinsRaw(totalMins, 0));
    totalMins += s.duration_minutes + (Number(s.break_after_minutes) || 0);
    return label;
  });
}

const isEligible = (s) => s.status === 'scheduled' || s.status === 'rescheduled';

const B     = { background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 600 };
const B_RED = { background: '#dc2626',       color: '#fff', border: 'none', fontWeight: 600 };
const B_AMB = { background: '#d97706',       color: '#fff', border: 'none', fontWeight: 600 };
const B_GRY = { background: '#6b7280',       color: '#fff', border: 'none', fontWeight: 600 };
const B_SM     = { ...B,     padding: '5px 14px', fontSize: 13 };
const B_RED_SM = { ...B_RED, padding: '5px 14px', fontSize: 13 };
const B_AMB_SM = { ...B_AMB, padding: '5px 14px', fontSize: 13 };
const B_GRY_SM = { ...B_GRY, padding: '5px 12px', fontSize: 13 };

const STATUS = {
  scheduled:   { label: '',               color: 'var(--muted)' },
  speaking:    { label: '🎬 LIVE',        color: 'var(--accent)', bold: true },
  completed:   { label: '✅ Done',        color: 'var(--green,#16a34a)' },
  rescheduled: { label: '↩ Rescheduled', color: '#d97706' },
  skipped:     { label: '⏭ Skipped',     color: 'var(--muted)' },
};

function slotName(s) { return s.custom_name || s.project_name || 'Demo'; }

export default function DemoSchedule() {
  const { meta, hid } = useOutletContext();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [slots, setSlots]           = useState([]);
  const [isLive, setIsLive]         = useState(false);
  const [isPaused, setIsPaused]     = useState(false);
  const [currentId, setCurrentId]   = useState(null);
  const [pendingId, setPendingId]   = useState(null);
  const [elapsed, setElapsed]       = useState(0);
  const [liveStartedAt, setLiveStartedAt] = useState(null);
  const [autoStart, setAutoStart]   = useState(() => {
    try { return localStorage.getItem('demoAutoStart') !== 'false'; } catch { return true; }
  });

  const timerRef   = useRef(null);
  const alerted2   = useRef(false);
  const alertedEnd = useRef(false);

  const base = `/api/hackathons/${hid}/demo-slots`;

  async function load() {
    const rows = await get(base);
    setSlots(rows);
  }
  useEffect(() => { load(); }, [hid]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback((startMs) => {
    stopTimer();
    alerted2.current = false; alertedEnd.current = false;
    timerRef.current = setInterval(() => setElapsed(Date.now() - startMs), 250);
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  function currentSlot() { return slots.find((s) => s.id === currentId) || null; }
  function pendingSlot() { return slots.find((s) => s.id === pendingId) || null; }

  const duration = (currentSlot()?.duration_minutes || 0) * 60;
  const remaining = duration - elapsed / 1000;

  useEffect(() => {
    if (!isLive || isPaused || !currentId) return;
    if (remaining <= 120 && remaining > 119 && !alerted2.current) { alerted2.current = true; play2Min(); }
    if (remaining <= 0 && !alertedEnd.current) { alertedEnd.current = true; playTimeUp(); }
  }, [remaining, isLive, isPaused, currentId]);

  async function startDemo() {
    const first = slots.find(isEligible);
    if (!first) return;
    const now = Date.now();
    setIsLive(true); setIsPaused(false);
    setCurrentId(first.id); setPendingId(null);
    setElapsed(0); setLiveStartedAt(now);
    startTimer(now);
    await put(`${base}/${first.id}`, { status: 'speaking', actual_start: new Date().toISOString() });
    await load();
  }

  async function advance() {
    if (!currentId) return;
    const cur = currentSlot();
    const eligible = slots.filter((s) => s.id !== currentId && isEligible(s));
    const next = eligible[0] || null;
    if (autoStart || !next) {
      if (cur) await put(`${base}/${cur.id}`, { status: 'completed', actual_end: new Date().toISOString() });
      if (next) {
        const now = Date.now();
        setCurrentId(next.id); setPendingId(null);
        setElapsed(0); setLiveStartedAt(now);
        startTimer(now);
        await put(`${base}/${next.id}`, { status: 'speaking', actual_start: new Date().toISOString() });
      } else {
        stopTimer(); setIsLive(false); setCurrentId(null); setPendingId(null);
      }
      await load();
    } else {
      if (cur) await put(`${base}/${cur.id}`, { status: 'completed', actual_end: new Date().toISOString() });
      stopTimer(); setPendingId(next.id); setCurrentId(null); setElapsed(0);
      await load();
    }
  }

  async function startPending() {
    if (!pendingId) return;
    const now = Date.now();
    setCurrentId(pendingId); setPendingId(null);
    setElapsed(0); setLiveStartedAt(now);
    startTimer(now);
    await put(`${base}/${pendingId}`, { status: 'speaking', actual_start: new Date().toISOString() });
    await load();
  }

  async function skipCurrent() {
    if (!currentId) return;
    await put(`${base}/${currentId}`, { status: 'skipped', actual_end: new Date().toISOString() });
    await advance();
  }

  async function reschedule(id) {
    await put(`${base}/${id}`, { status: 'rescheduled', actual_start: '', actual_end: '' });
    await load();
  }

  function togglePause() {
    if (isPaused) {
      const now = Date.now();
      const resumedAt = now - elapsed;
      setLiveStartedAt(resumedAt);
      startTimer(resumedAt);
      setIsPaused(false);
    } else {
      stopTimer(); setIsPaused(true);
    }
  }

  function handleAutoStart(v) {
    setAutoStart(v);
    try { localStorage.setItem('demoAutoStart', v ? 'true' : 'false'); } catch (_) {}
  }

  const times = calcTimes(slots, meta.hackathon?.start_time);
  const cur = currentSlot();
  const pend = pendingSlot();
  const onDeckSlot = !cur && pend ? pend : slots.filter(isEligible).find((s) => s.id !== currentId && s.id !== pendingId) || null;
  const overTime = remaining < 0;

  return (
    <div className="stack">
      <h1 style={{ marginBottom: 4 }}>Demo Day Schedule</h1>

      {/* ── Live timer card ── */}
      {isLive && cur && (
        <div style={{
          padding: 24, borderRadius: 12,
          background: 'var(--accent)', color: '#fff',
          boxShadow: '0 4px 24px rgba(0,0,0,.18)',
        }}>
          <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.08em' }}>
            🎬 Now Presenting
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 2 }}>{slotName(cur)}</div>
          {cur.team && cur.team.length > 0 && (
            <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 6 }}>{cur.team.join(', ')}</div>
          )}
          {cur.project_award && (
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,.2)', borderRadius: 6, padding: '2px 10px', fontSize: 13, marginBottom: 8 }}>
              {cur.project_award}
            </div>
          )}
          <div style={{ fontSize: 60, fontVariantNumeric: 'tabular-nums', fontWeight: 900, lineHeight: 1, margin: '12px 0', color: overTime ? '#fde68a' : '#fff' }}>
            {overTime ? '+' : ''}{fmtSecs(Math.abs(remaining))}
          </div>
          {isPaused && <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>⏸ Paused</div>}
          {isAdmin && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <button style={B_GRY_SM} onClick={togglePause}>{isPaused ? '▶ Resume' : '⏸ Pause'}</button>
              <button style={B_SM} onClick={advance}>Next ▶</button>
              <button style={B_AMB_SM} onClick={skipCurrent}>Skip ⏭</button>
            </div>
          )}
        </div>
      )}

      {/* On deck */}
      {isLive && !cur && pend && (
        <div style={{ padding: 16, borderRadius: 10, border: '2px solid var(--accent)', background: 'var(--surface)' }}>
          <div className="faint small" style={{ textTransform: 'uppercase', marginBottom: 4 }}>On Deck</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{slotName(pend)}</div>
          {pend.team && pend.team.length > 0 && <div className="small muted">{pend.team.join(', ')}</div>}
          {isAdmin && <button style={{ ...B_SM, marginTop: 10 }} onClick={startPending}>▶ Start Now</button>}
        </div>
      )}

      {/* Controls row */}
      {isAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 0' }}>
          {!isLive ? (
            <button style={B} onClick={startDemo} disabled={!slots.some(isEligible)}>▶ Start Demo Day</button>
          ) : (
            <button style={B_RED} onClick={async () => { stopTimer(); setIsLive(false); setCurrentId(null); setPendingId(null); }}>■ End</button>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={autoStart} onChange={(e) => handleAutoStart(e.target.checked)} />
            Auto-advance to next demo
          </label>
        </div>
      )}

      {/* ── Timeline ── */}
      <div className="card" style={{ padding: '10px 0' }}>
        {slots.length === 0 && (
          <div className="faint small" style={{ padding: '16px 20px' }}>
            No demos scheduled. Add projects via the <strong>Admin → Demo Schedule</strong> section.
          </div>
        )}
        {slots.map((s, idx) => {
          const isCurrent = s.id === currentId;
          const isOnDeck = !isCurrent && s.id === onDeckSlot?.id;
          const st = STATUS[s.status] || STATUS.scheduled;
          return (
            <div key={s.id} style={{
              display: 'grid', gridTemplateColumns: '60px 1fr auto',
              gap: 10, alignItems: 'center',
              padding: '10px 18px',
              borderLeft: isCurrent ? '4px solid var(--accent)' : isOnDeck ? '4px solid #f59e0b' : '4px solid transparent',
              background: isCurrent ? 'rgba(99,102,241,.07)' : 'transparent',
              borderBottom: idx < slots.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{times[idx] || '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.duration_minutes} min</div>
              </div>
              <div>
                <div style={{ fontWeight: isCurrent ? 700 : 500, fontSize: 14 }}>
                  {slotName(s)}
                  {s.project_award && (
                    <span style={{ marginLeft: 8, fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'var(--accent)', color: '#fff' }}>
                      {s.project_award}
                    </span>
                  )}
                </div>
                {s.team && s.team.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.team.join(', ')}</div>
                )}
                {st.label && (
                  <div style={{ fontSize: 11, color: st.color, fontWeight: st.bold ? 700 : 400, marginTop: 2 }}>{st.label}</div>
                )}
                {s.break_after_minutes > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>☕ {s.break_after_minutes} min break after</div>
                )}
              </div>
              {isAdmin && s.status !== 'speaking' && (s.status === 'completed' || s.status === 'skipped') && (
                <button style={B_GRY_SM} onClick={() => reschedule(s.id)} title="Re-queue">↩</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
