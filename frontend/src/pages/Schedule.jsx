import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { get, put } from '../api.js';
import { useAuth } from '../auth.jsx';

// ── audio ─────────────────────────────────────────────────────────────────────

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
function play2Min() { playBeep(660, 0.3); setTimeout(() => playBeep(660, 0.3), 400); }
function playTimeUp() {
  playBeep(880, 0.25);
  setTimeout(() => playBeep(440, 0.25), 320);
  setTimeout(() => playBeep(880, 0.25), 640);
}

function applyVoiceMode(u, voiceMode) {
  u.pitch = voiceMode === 'female' ? 1.4 : 0.7;
  u.rate  = voiceMode === 'female' ? 1.0 : 0.85;
  try {
    const voices   = window.speechSynthesis.getVoices();
    const enVoices = voices.filter((v) => v.lang.startsWith('en'));
    if (enVoices.length > 0) {
      if (voiceMode === 'male') {
        u.voice = enVoices.find((v) => /male|david|mark|daniel|fred|ralph/i.test(v.name)) || enVoices[0];
      } else {
        u.voice = enVoices.find((v) => /female|samantha|victoria|karen|allison|susan|zira/i.test(v.name)) || enVoices[Math.min(1, enVoices.length - 1)];
      }
    }
  } catch (_) {}
}
function speakVoice(text, voiceMode) {
  return new Promise((resolve) => {
    try {
      if (!window.speechSynthesis || !voiceMode || voiceMode === 'off') { resolve(); return; }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      applyVoiceMode(u, voiceMode);
      u.onend  = resolve;
      u.onerror = resolve;
      window.speechSynthesis.speak(u);
    } catch (_) { resolve(); }
  });
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtSecs(secs) {
  const a = Math.abs(Math.round(secs));
  return `${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}

// Format HH:MM → 9:05 AM
function fmtTime(hhmm) {
  if (!hhmm) return '';
  const [hh, mm] = hhmm.split(':').map(Number);
  if (isNaN(hh)) return hhmm;
  const period = hh >= 12 ? 'PM' : 'AM';
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${period}`;
}

// Add minutes to a total-minutes value and return HH:MM string.
function addMinsRaw(totalMins, add) {
  const t = totalMins + add;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

// Returns [{start, end}] for each speaker.
// start/end are display strings like "9:05 AM". Both are tentative.
// Returns a display start-time string for each speaker (tentative).
// Uses the speaker's own scheduled_start if set, otherwise cascades from hackathon start_time.
// break_after_minutes on each row adds a gap before the NEXT slot.
function calcScheduledTimes(speakers, startStr) {
  const noBase = !startStr && speakers.every((s) => !s.scheduled_start);
  if (noBase) return speakers.map(() => '');

  let totalMins = 0;
  if (startStr) {
    const [hh, mm] = startStr.split(':').map(Number);
    totalMins = hh * 60 + mm;
  }

  return speakers.map((sp) => {
    if (sp.scheduled_start) {
      const parts = sp.scheduled_start.split(':');
      if (parts.length === 2) totalMins = Number(parts[0]) * 60 + Number(parts[1]);
    }
    const label = fmtTime(addMinsRaw(totalMins, 0));
    totalMins += sp.duration_minutes + (Number(sp.break_after_minutes) || 0);
    return label;
  });
}

// Eligible for speaking: scheduled OR rescheduled (missed speakers get a second chance)
const isEligible = (s) => s.status === 'scheduled' || s.status === 'rescheduled';

// ── button style ──────────────────────────────────────────────────────────────
const B     = { background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 600 };
const B_RED = { background: '#dc2626',       color: '#fff', border: 'none', fontWeight: 600 };
const B_AMB = { background: '#d97706',       color: '#fff', border: 'none', fontWeight: 600 };
const B_GRY = { background: '#6b7280',       color: '#fff', border: 'none', fontWeight: 600 };
const B_SM  = { ...B,     padding: '5px 14px', fontSize: 13 };
const B_RED_SM = { ...B_RED, padding: '5px 14px', fontSize: 13 };
const B_AMB_SM = { ...B_AMB, padding: '5px 14px', fontSize: 13 };
const B_GRY_SM = { ...B_GRY, padding: '5px 12px', fontSize: 13 };

// ── status display ────────────────────────────────────────────────────────────
const STATUS = {
  scheduled:   { label: '',               color: 'var(--muted)' },
  speaking:    { label: '🎤 LIVE',        color: 'var(--accent)', bold: true },
  completed:   { label: '✅ Done',        color: 'var(--green,#16a34a)' },
  rescheduled: { label: '↩ Rescheduled', color: '#d97706' },
  skipped:     { label: '⏭ Skipped',     color: 'var(--muted)' },
};

// ── component ─────────────────────────────────────────────────────────────────

export default function Schedule() {
  const { meta, hid } = useOutletContext();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [speakers, setSpeakers]     = useState([]);
  const [isLive, setIsLive]         = useState(false);
  const [isPaused, setIsPaused]     = useState(false);
  const [currentId, setCurrentId]   = useState(null);
  const [pendingId, setPendingId]   = useState(null); // on-deck: advanced but timer not started yet
  const [elapsed, setElapsed]       = useState(0);
  const [liveStartedAt, setLiveStartedAt] = useState(null);
  const autoStart = meta.hackathon.auto_stop_speaker !== 0;
  const [manualStep, setManualStep] = useState(null); // null | 'speech' | 'timer'
  const [manualText, setManualText] = useState('');

  const timerRef      = useRef(null);
  const alerted2      = useRef(false);
  const alertedEnd    = useRef(false);
  const activationRef = useRef(0);

  const [dragSrc, setDragSrc]   = useState(null);
  const [dragOver, setDragOver] = useState(null);

  // ── derived ───────────────────────────────────────────────────────────────
  const current    = speakers.find((s) => s.id === currentId) || null;
  const currentIdx = current ? speakers.indexOf(current) : -1;
  const timeLeft   = current ? current.duration_minutes * 60 - elapsed : 0;
  const isOvertime = timeLeft < 0;

  const completed    = speakers.filter((s) => s.status === 'completed').length;
  const rescheduled  = speakers.filter((s) => s.status === 'rescheduled').length;
  const skipped      = speakers.filter((s) => s.status === 'skipped').length;
  const remaining    = speakers.filter((s) => isEligible(s)).length;
  const total        = speakers.length;

  const pendingSpeaker = speakers.find((s) => s.id === pendingId) || null;
  const pendingIdx     = pendingSpeaker ? speakers.indexOf(pendingSpeaker) : -1;
  const prevSpeaker    = speakers.slice(0, currentIdx).filter((s) => s.status === 'completed').slice(-1)[0] || null;
  // "Up next" looks after the active speaker, or after the on-deck speaker if between slots
  const nextSpeaker = current
    ? speakers.find((s, i) => i > currentIdx && isEligible(s)) || null
    : pendingSpeaker
      ? speakers.find((s, i) => i > pendingIdx && isEligible(s)) || null
      : null;

  // When live, anchor all times to the actual clock time Start was pressed.
  // When not live, use the hackathon's configured start_time (tentative).
  const liveBase = liveStartedAt
    ? `${String(liveStartedAt.getHours()).padStart(2, '0')}:${String(liveStartedAt.getMinutes()).padStart(2, '0')}`
    : null;
  const scheduledTimes = calcScheduledTimes(
    // When live, ignore per-speaker scheduled_start overrides so everything cascades from the real start
    isLive ? speakers.map((s) => ({ ...s, scheduled_start: '' })) : speakers,
    liveBase ?? (meta.hackathon.start_time || ''),
  );
  const timerColor     = isOvertime ? '#dc2626' : timeLeft <= 60 ? '#d97706' : 'inherit';

  // ── data ──────────────────────────────────────────────────────────────────
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
    if (!alerted2.current && timeLeft <= 120 && timeLeft > 0) { alerted2.current = true; play2Min(); }
    if (!alertedEnd.current && timeLeft <= 0)                  { alertedEnd.current = true; playTimeUp(); }
  }, [timeLeft, isLive, current, isPaused]);

  // ── actions ───────────────────────────────────────────────────────────────
  async function activateSpeaker(list, id, isFirst = false) {
    const myActivation = ++activationRef.current;
    alerted2.current   = false;
    alertedEnd.current = false;
    setCurrentId(id);
    setElapsed(0);
    setIsPaused(false);

    // Mark speaking immediately so the LIVE badge shows during the announcement
    await put(`/api/hackathons/${hid}/speakers/${id}`, {
      status: 'speaking',
      actual_start: new Date().toISOString(),
    });
    setSpeakers((prev) => prev.map((s) => s.id === id ? { ...s, status: 'speaking' } : s));

    // Voice announcement — timer only starts AFTER the MC finishes speaking
    const voiceMode = meta.hackathon.voice_mode || 'off';
    const sp = (list || speakers).find((s) => s.id === id);

    if (voiceMode !== 'off' && !autoStart) {
      // Auto-advance is OFF — admin manually triggers each MC line and the timer
      if (sp) {
        const from  = sp.title ? ` from ${sp.title}` : '';
        const about = sp.notes ? ` They will be talking about ${sp.notes}.` : '';
        setManualText(`Our ${isFirst ? 'first' : 'next'} speaker is ${sp.name}${from}.${about} Please give them a warm welcome.`);
      } else {
        setManualText('');
      }
      setManualStep('speech');
      return; // timer starts when admin clicks ▶ Start Timer
    }

    if (voiceMode !== 'off' && sp) {
      const from  = sp.title ? ` from ${sp.title}` : '';
      const about = sp.notes ? ` They will be talking about ${sp.notes}.` : '';
      await speakVoice(
        `Our ${isFirst ? 'first' : 'next'} speaker is ${sp.name}${from}.${about} Please give them a warm welcome.`,
        voiceMode
      );
    }

    // Only start the timer if this is still the current activation (not superseded)
    if (activationRef.current === myActivation) {
      startTimer();
    }
  }

  async function startEvent() {
    const first = speakers.find(isEligible);
    if (!first) return;
    setIsLive(true);
    setLiveStartedAt(new Date());
    await activateSpeaker(speakers, first.id, true);
  }

  async function stopEvent() {
    stopTimer();
    setIsLive(false);
    setCurrentId(null);
    setPendingId(null);
    setLiveStartedAt(null);
  }

  async function restartEvent() {
    if (!confirm('Reset all speakers back to Scheduled? This clears live event progress so you can run the event again.')) return;
    stopTimer();
    setIsLive(false);
    setCurrentId(null);
    setPendingId(null);
    setElapsed(0);
    setLiveStartedAt(null);
    for (const sp of speakers) {
      if (sp.status !== 'scheduled') {
        await put(`/api/hackathons/${hid}/speakers/${sp.id}`, {
          status: 'scheduled',
          actual_start: '',
          actual_end: '',
        });
      }
    }
    await load();
  }

  function pause()  { setIsPaused(true);  stopTimer(); }
  function resume() { setIsPaused(false); startTimer(); }

  async function doManualSpeech() {
    const text = manualText;
    const voiceMode = meta.hackathon.voice_mode || 'off';
    setManualStep('timer');
    if (text && voiceMode !== 'off') await speakVoice(text, voiceMode);
  }

  function doManualTimer() {
    setManualStep(null);
    setManualText('');
    startTimer();
  }

  async function finishAndAdvance(status) {
    stopTimer();
    setManualStep(null); setManualText('');
    if (!current) return;
    await put(`/api/hackathons/${hid}/speakers/${current.id}`, {
      status,
      actual_end: new Date().toISOString(),
    });
    setSpeakers((prev) => prev.map((s) => s.id === current.id ? { ...s, status } : s));

    // Thank-you announcement only when speaker finishes (not when skipped/rescheduled)
    const voiceMode = meta.hackathon.voice_mode || 'off';
    if (status === 'completed' && voiceMode !== 'off') {
      await speakVoice(`Thank you ${current.name} for an amazing speech!`, voiceMode);
    }

    const nextSp = speakers.find((s, i) => i > currentIdx && isEligible(s));
    if (nextSp) {
      if (autoStart) {
        await activateSpeaker(speakers, nextSp.id);
      } else {
        setCurrentId(null);
        setPendingId(nextSp.id);
      }
    } else {
      setIsLive(false);
      setCurrentId(null);
      setPendingId(null);
    }
  }

  async function missSpeaker() {
    stopTimer();
    if (!current) return;
    const maxOrder = speakers.reduce((m, s) => Math.max(m, s.order_index), 0);
    await put(`/api/hackathons/${hid}/speakers/${current.id}`, {
      status: 'rescheduled',
      actual_end: '',
      order_index: maxOrder + 1,
    });
    const fresh = await get(`/api/hackathons/${hid}/speakers`);
    setSpeakers(fresh);
    const nextSp = fresh.find((s, i) => i >= currentIdx && isEligible(s) && s.id !== current.id);
    if (nextSp) {
      if (autoStart) {
        await activateSpeaker(fresh, nextSp.id);
      } else {
        setCurrentId(null);
        setPendingId(nextSp.id);
      }
    } else {
      setIsLive(false);
      setCurrentId(null);
      setPendingId(null);
    }
  }

  // Start the on-deck speaker's timer explicitly
  async function startPending() {
    if (!pendingId) return;
    const id = pendingId;
    setPendingId(null);
    await activateSpeaker(speakers, id);
  }

  // Miss or skip the on-deck speaker (before their timer starts)
  async function dismissPending(status) {
    if (!pendingId) return;
    const sp = speakers.find((s) => s.id === pendingId);
    if (!sp) return;
    const spIdx = speakers.indexOf(sp);
    if (status === 'rescheduled') {
      const maxOrder = speakers.reduce((m, s) => Math.max(m, s.order_index), 0);
      await put(`/api/hackathons/${hid}/speakers/${sp.id}`, { status: 'rescheduled', order_index: maxOrder + 1 });
      const fresh = await get(`/api/hackathons/${hid}/speakers`);
      setSpeakers(fresh);
      const nextSp = fresh.find((s, i) => i >= spIdx && isEligible(s) && s.id !== sp.id);
      if (nextSp) {
        if (autoStart) { setPendingId(null); await activateSpeaker(fresh, nextSp.id); }
        else setPendingId(nextSp.id);
      } else { setIsLive(false); setPendingId(null); }
    } else {
      await put(`/api/hackathons/${hid}/speakers/${sp.id}`, { status });
      setSpeakers((prev) => prev.map((s) => s.id === sp.id ? { ...s, status } : s));
      const nextSp = speakers.find((s, i) => i > spIdx && isEligible(s));
      if (nextSp) {
        if (autoStart) { setPendingId(null); await activateSpeaker(speakers, nextSp.id); }
        else setPendingId(nextSp.id);
      } else { setIsLive(false); setPendingId(null); }
    }
  }

  function addTime(mins) { setElapsed((e) => Math.max(0, e - mins * 60)); }

  async function commitReorder(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    const list = [...speakers];
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    setSpeakers(list);
    await put(`/api/hackathons/${hid}/speakers/reorder`, list.map((s, i) => ({ id: s.id, order_index: i })));
  }

  // ── render ────────────────────────────────────────────────────────────────
  const canStart   = isAdmin && !isLive && speakers.some(isEligible);
  const canRestart = isAdmin && !isLive && speakers.length > 0 && speakers.some((s) => s.status !== 'scheduled');

  return (
    <div className="stack">

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0 }}>🎤 Speaker Schedule</h1>
          <p className="muted" style={{ marginTop: 4, marginBottom: 0 }}>{meta.hackathon.name}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {isLive && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 13 }}>
              ● LIVE
            </span>
          )}
          {canStart    && <button style={B} onClick={startEvent}>▶ Start Event</button>}
          {canRestart  && <button style={B_GRY} onClick={restartEvent}>↺ Run Again</button>}
          {isAdmin && isLive && (
            <button style={B_RED} onClick={stopEvent}>■ End Event</button>
          )}
        </div>
      </div>

      {/* ── Stats dashboard ── */}
      <div className="card">
        <div className="stat-row">
          <div className="stat"><div className="n">{total}</div><div className="l">Total</div></div>
          <div className="stat"><div className="n" style={{ color: 'var(--green,#16a34a)' }}>{completed}</div><div className="l">Done</div></div>
          <div className="stat"><div className="n">{remaining}</div><div className="l">Remaining</div></div>
          <div className="stat"><div className="n" style={{ color: '#d97706' }}>{rescheduled}</div><div className="l">Rescheduled</div></div>
          <div className="stat"><div className="n" style={{ color: '#6b7280' }}>{skipped}</div><div className="l">Skipped</div></div>
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
                <div style={{ fontWeight: 700 }}>{current.name}
                  {current.title && <span className="muted" style={{ fontWeight: 400 }}> · {current.title}</span>}
                </div>
              </div>
            )}
            {pendingSpeaker && !current && (
              <div>
                <div className="faint" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em', color: '#d97706' }}>On deck</div>
                <div style={{ fontWeight: 700, color: '#d97706' }}>{pendingSpeaker.name}
                  {pendingSpeaker.title && <span style={{ fontWeight: 400, color: 'var(--muted)' }}> · {pendingSpeaker.title}</span>}
                </div>
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

      {/* ── On-deck card (between speakers, autoStart off) ── */}
      {isLive && pendingSpeaker && !current && isAdmin && (
        <div className="card" style={{ textAlign: 'center', padding: '28px 24px', borderColor: '#d97706' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: '#d97706', marginBottom: 6 }}>
            ⏸ On Deck — ready to start
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>{pendingSpeaker.name}</div>
          {pendingSpeaker.title && <div className="muted small" style={{ marginBottom: 2 }}>{pendingSpeaker.title}</div>}
          {pendingSpeaker.notes && <div className="faint small" style={{ marginBottom: 0 }}>{pendingSpeaker.notes}</div>}
          <div className="faint small" style={{ marginBottom: 20, marginTop: 4 }}>{pendingSpeaker.duration_minutes} min slot</div>

          <button style={{ ...B, fontSize: 16, padding: '10px 28px', marginBottom: 12 }} onClick={startPending}>
            ▶ Start — {pendingSpeaker.name}
          </button>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button style={B_AMB_SM} onClick={() => dismissPending('rescheduled')}>↩ Miss — Reschedule to Later</button>
            <button style={B_GRY_SM} onClick={() => dismissPending('skipped')}>⏭ Skip Permanently</button>
          </div>
          <div className="faint" style={{ fontSize: 11, marginTop: 8 }}>
            Miss = gets another slot at end · Skip = removed from today's run
          </div>
        </div>
      )}

      {/* ── Live timer + controls ── */}
      {isLive && current && (
        <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div className="faint" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
            Now speaking
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 2 }}>{current.name}</div>
          {current.title && <div className="muted small" style={{ marginBottom: 4 }}>{current.title}</div>}
          {current.notes && <div className="faint small" style={{ marginBottom: 18 }}>{current.notes}</div>}

          {/* Big timer */}
          <div style={{
            fontSize: 80, fontWeight: 900, lineHeight: 1, letterSpacing: '-2px',
            fontVariantNumeric: 'tabular-nums', color: timerColor, marginBottom: 6, marginTop: current.notes ? 0 : 18,
          }}>
            {isOvertime ? '+' : ''}{fmtSecs(Math.abs(timeLeft))}
          </div>
          <div className="faint small" style={{ marginBottom: 28 }}>
            {isOvertime ? `${fmtSecs(Math.abs(timeLeft))} overtime` : `of ${current.duration_minutes} min`}
          </div>

          {/* Primary controls — manual mode shows step-by-step MC buttons */}
          {isAdmin && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {manualStep === 'speech' && (
                <button style={{ ...B, fontSize: 15, padding: '10px 28px' }} onClick={doManualSpeech}>
                  🎙 Speak Intro
                </button>
              )}
              {manualStep === 'timer' && (
                <button style={{ ...B, fontSize: 15, padding: '10px 28px' }} onClick={doManualTimer}>
                  ▶ Start Timer
                </button>
              )}
              {!manualStep && (
                <>
                  {isPaused
                    ? <button style={B} onClick={resume}>▶ Resume</button>
                    : <button style={B} onClick={pause}>⏸ Pause</button>
                  }
                  <button style={B} onClick={() => finishAndAdvance('completed')}>
                    {autoStart ? '⏭ Done & Start Next' : '⏭ Done — Queue Next'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Add time + Miss / Skip — hidden during manual pending steps */}
          {isAdmin && !manualStep && (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <span className="faint small">Add time:</span>
                {[1, 2, 5].map((m) => (
                  <button key={m} style={B_SM} onClick={() => addTime(m)}>+{m} min</button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button style={B_AMB_SM} onClick={missSpeaker}>
                  ↩ Miss — Reschedule to Later
                </button>
                <button style={B_GRY_SM} onClick={() => finishAndAdvance('skipped')}>
                  ⏭ Skip Permanently
                </button>
              </div>
              <div className="faint" style={{ fontSize: 11, marginTop: 8 }}>
                Miss = speaker gets another slot at the end · Skip = removed from today's run
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Timeline ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>Schedule</h3>
          {isAdmin && speakers.length > 1 && (
            <span className="faint small">Drag rows to reorder{isLive ? ' (swap order live)' : ''}</span>
          )}
        </div>
        <p className="faint small" style={{ marginTop: 0, marginBottom: 12 }}>
          Times are tentative — they shift automatically based on when you actually start the event.
        </p>

        {speakers.length === 0 && (
          <p className="faint small" style={{ margin: 0 }}>
            No agenda items yet — an admin can add them in the Admin panel.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {speakers.map((sp, idx) => {
            const isCurrent  = sp.id === currentId;
            const isPending  = sp.id === pendingId;
            const isDragging = dragSrc === idx;
            const isDropTarget = dragOver === idx && dragSrc !== null && dragSrc !== idx;
            const st = STATUS[sp.status] || STATUS.scheduled;
            return (
              <Fragment key={sp.id}>
                <div
                  draggable={isAdmin}
                  onDragStart={() => setDragSrc(idx)}
                  onDragEnd={() => { setDragSrc(null); setDragOver(null); }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(idx); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => { commitReorder(dragSrc, idx); setDragSrc(null); setDragOver(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 7,
                    border: isCurrent    ? '1.5px solid var(--accent)'
                          : isPending   ? '1.5px solid #d97706'
                          : isDropTarget ? '1.5px dashed var(--accent)'
                          :               '1.5px solid transparent',
                    background: isCurrent ? 'var(--surface-2)' : isPending ? 'rgba(217,119,6,0.06)' : 'transparent',
                    opacity: (sp.status === 'skipped' || isDragging) ? 0.4 : 1,
                    cursor: isAdmin ? 'grab' : 'default',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Start time */}
                  <div style={{ width: 72, flexShrink: 0, fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {scheduledTimes[idx] || '—'}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: isCurrent ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sp.title || sp.name}
                    </div>
                    <div className="faint small" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sp.title ? sp.name : ''}{sp.notes ? (sp.title ? ' · ' : '') + sp.notes : ''}
                    </div>
                  </div>

                  {/* Duration */}
                  <div style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{sp.duration_minutes} min</div>

                  {/* Status */}
                  {st.label && (
                    <div style={{ fontSize: 13, color: st.color, fontWeight: st.bold ? 700 : 400, flexShrink: 0, minWidth: 80, textAlign: 'right' }}>
                      {st.label}
                    </div>
                  )}
                </div>

                {/* Break after this slot */}
                {sp.break_after_minutes > 0 && idx < speakers.length - 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 12px 2px 84px' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', opacity: 0.75 }}>
                      ☕ {sp.break_after_minutes} min break
                    </span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
