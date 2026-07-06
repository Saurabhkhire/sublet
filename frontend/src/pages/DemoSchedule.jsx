import { useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { get, put, post } from '../api.js';
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

function getReadyVoices() {
  return new Promise((resolve) => {
    try {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) return resolve(v);
      window.speechSynthesis.onvoiceschanged = () => resolve(window.speechSynthesis.getVoices());
    } catch (_) { resolve([]); }
  });
}
function applyVoiceMode(u, voiceMode, voices = []) {
  if (voiceMode === 'rene') {
    u.pitch = 2.0; u.rate = 1.3;
  } else if (voiceMode === 'female') {
    u.pitch = 1.4; u.rate = 1.0;
  } else {
    u.pitch = 0.7; u.rate = 0.85;
  }
  const enVoices = voices.filter((v) => v.lang.startsWith('en'));
  if (enVoices.length > 0) {
    if (voiceMode === 'female') {
      u.voice = enVoices.find((v) => /female|samantha|victoria|karen|allison|susan|zira/i.test(v.name))
             || enVoices[enVoices.length - 1];
    } else {
      u.voice = enVoices.find((v) => /male|david|mark|daniel|fred|ralph/i.test(v.name))
             || enVoices[0];
    }
  }
}
async function speakVoice(text, voiceMode) {
  try {
    if (!window.speechSynthesis || !voiceMode || voiceMode === 'off') return;
    const voices = await getReadyVoices();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    applyVoiceMode(u, voiceMode, voices);
    await new Promise((resolve) => { u.onend = resolve; u.onerror = resolve; window.speechSynthesis.speak(u); });
  } catch (_) {}
}

function fmtSecs(secs) {
  const a = Math.abs(Math.round(secs));
  return `${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}
function fmtActualTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const hh = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh % 12 || 12}:${mm}:${ss} ${hh >= 12 ? 'PM' : 'AM'}`;
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

function slotIntroText(s, isFirst, voiceMode) {
  const verb   = isFirst ? 'Our first demo is' : 'Next we have';
  const closer = voiceMode === 'rene' ? '... Get your ass up here!' : '... Please welcome them on stage.';
  if (s.project_name && s.custom_name) {
    return `${verb} project ${s.project_name}, ${s.custom_name}. ${closer}`;
  }
  if (s.project_name) {
    return `${verb} project ${s.project_name}. ${closer}`;
  }
  return `${verb} ${slotName(s)}. ${voiceMode === 'rene' ? '... Get your ass up here!' : '... Please welcome the team.'}`;
}
function slotOutroText(s) {
  const name = s.project_name || s.custom_name || 'the team';
  return `Thank you ${name} for an amazing demo!`;
}

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
  const autoStart = meta.hackathon.auto_advance_demo !== 0;
  const [manualStep, setManualStep] = useState(null); // null | 'speech' | 'timer' | 'outro'
  const [manualText, setManualText] = useState('');
  const [manualNextId, setManualNextId] = useState(null); // pending slot after outro
  const [aiQuestion, setAiQuestion]   = useState('');
  const [aiLoading, setAiLoading]     = useState(false);

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
    setIsLive(true); setIsPaused(false);
    setCurrentId(first.id); setPendingId(null);
    setElapsed(0);

    // Mark speaking first so UI shows LIVE during announcement
    await put(`${base}/${first.id}`, { status: 'speaking', actual_start: new Date().toISOString() });
    await load();

    const voiceMode = meta.hackathon.voice_mode || 'off';
    if (voiceMode !== 'off' && !autoStart) {
      setManualText(slotIntroText(first, true, voiceMode));
      setManualStep('speech');
      return; // admin clicks 🎙 Speak Intro then ▶ Start Timer
    }

    await speakVoice(slotIntroText(first, true, voiceMode), voiceMode);

    const now = Date.now();
    setLiveStartedAt(now);
    startTimer(now);
    if (first.voice_agent && first.voice_agent !== 'none' && first.voice_script) {
      speakVoice(first.voice_script, first.voice_agent);
    }
  }

  async function askQuestion() {
    const cur = currentSlot();
    if (!cur) return;
    setAiLoading(true); setAiQuestion('');
    try {
      const res = await post(`/api/hackathons/${hid}/ai/question`, {
        project_id: cur.project_id || undefined,
        project_description: cur.project_description || '',
        project_name: cur.project_name || cur.custom_name || '',
      });
      setAiQuestion(res.question || '');
    } catch (e) { setAiQuestion('⚠ ' + e.message); }
    finally { setAiLoading(false); }
  }

  async function advance(wasSkipped = false) {
    if (!currentId) return;
    setAiQuestion('');
    const cur = currentSlot();
    const eligible = slots.filter((s) => s.id !== currentId && isEligible(s));
    const next = eligible[0] || null;
    setManualStep(null); setManualText('');
    const voiceMode = meta.hackathon.voice_mode || 'off';
    if (autoStart || !next) {
      if (cur) await put(`${base}/${cur.id}`, { status: 'completed', actual_end: new Date().toISOString() });

      // Thank-you announcement only when demo finishes normally (not skipped)
      if (cur && !wasSkipped && voiceMode !== 'off') {
        await speakVoice(slotOutroText(cur), voiceMode);
      }

      if (next) {
        setCurrentId(next.id); setPendingId(null);
        setElapsed(0);

        await put(`${base}/${next.id}`, { status: 'speaking', actual_start: new Date().toISOString() });
        await load();

        if (voiceMode !== 'off' && !autoStart) {
          setManualText(slotIntroText(next, false, voiceMode));
          setManualStep('speech');
          return;
        }

        await speakVoice(slotIntroText(next, false, voiceMode), voiceMode);

        const now = Date.now();
        setLiveStartedAt(now);
        startTimer(now);
        if (next.voice_agent && next.voice_agent !== 'none' && next.voice_script) {
          speakVoice(next.voice_script, next.voice_agent);
        }
      } else {
        stopTimer(); setIsLive(false); setCurrentId(null); setPendingId(null);
        await load();
      }
    } else {
      if (cur) await put(`${base}/${cur.id}`, { status: 'completed', actual_end: new Date().toISOString() });
      stopTimer();
      if (cur && !wasSkipped && voiceMode !== 'off') {
        // In manual mode: show "Speak Outro" button first, then proceed to pending
        setManualText(slotOutroText(cur));
        setManualStep('outro');
        setManualNextId(next.id);
        await load();
        return;
      }
      setPendingId(next.id); setCurrentId(null); setElapsed(0);
      await load();
    }
  }

  async function doManualSpeech() {
    const text = manualText;
    const voiceMode = meta.hackathon.voice_mode || 'off';
    if (text && voiceMode !== 'off') await speakVoice(text, voiceMode);
    setManualStep('timer');
  }

  async function doManualOutro() {
    const text = manualText;
    const nextId = manualNextId;
    const voiceMode = meta.hackathon.voice_mode || 'off';
    setManualStep(null); setManualText(''); setManualNextId(null);
    if (text && voiceMode !== 'off') await speakVoice(text, voiceMode);
    setPendingId(nextId); setCurrentId(null); setElapsed(0);
  }

  function doManualTimer() {
    setManualStep(null);
    setManualText('');
    const now = Date.now();
    setLiveStartedAt(now);
    startTimer(now);
    const cur = currentSlot();
    if (cur?.voice_agent && cur.voice_agent !== 'none' && cur.voice_script) {
      speakVoice(cur.voice_script, cur.voice_agent);
    }
  }

  async function startPending() {
    if (!pendingId) return;
    const pending = pendingSlot();
    setCurrentId(pendingId); setPendingId(null);
    setElapsed(0);

    await put(`${base}/${pendingId}`, { status: 'speaking', actual_start: new Date().toISOString() });
    await load();

    const voiceMode = meta.hackathon.voice_mode || 'off';
    if (voiceMode !== 'off' && !autoStart) {
      if (pending) setManualText(slotIntroText(pending, false, voiceMode));
      setManualStep('speech');
      return;
    }

    if (pending) {
      await speakVoice(slotIntroText(pending, false, voiceMode), voiceMode);
    }

    const now = Date.now();
    setLiveStartedAt(now);
    startTimer(now);
    if (pending?.voice_agent && pending.voice_agent !== 'none' && pending.voice_script) {
      speakVoice(pending.voice_script, pending.voice_agent);
    }
  }

  async function skipCurrent() {
    if (!currentId) return;
    await put(`${base}/${currentId}`, { status: 'skipped', actual_end: new Date().toISOString() });
    await advance(true); // wasSkipped=true — no thank-you announcement
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

  // When live, anchor the schedule to the actual clock time the event started.
  // Base time for the schedule cascade:
  // 1. liveStartedAt (set when Start is pressed this session)
  // 2. first slot's actual_start from DB (survives page reloads)
  // 3. current PC clock time (never fall back to the configured 9 AM)
  const toHHMM = (d) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  const liveBase = (() => {
    if (liveStartedAt) return toHHMM(new Date(liveStartedAt));
    const first = slots.find((s) => s.actual_start);
    if (first) return toHHMM(new Date(first.actual_start));
    return toHHMM(new Date());
  })();
  const times = calcTimes(
    isLive ? slots.map((s) => ({ ...s, scheduled_start: '' })) : slots,
    liveBase,
  );
  // Build a quick lookup: slot.id → display time
  const slotTimeMap = {};
  slots.forEach((s, i) => { slotTimeMap[s.id] = times[i]; });

  // ── Non-admin read-only view (participants & judges) ──────────────────────
  if (!isAdmin) {
    const myEmail = user?.email || '';
    const liveSlot = slots.find((s) => s.status === 'speaking');

    // Group by project's judge_group
    const groupMap = {};
    slots.forEach((s) => {
      const g = s.project_judge_group || '—';
      if (!groupMap[g]) groupMap[g] = [];
      groupMap[g].push(s);
    });
    const groupKeys = Object.keys(groupMap).sort((a, b) => {
      if (a === '—') return 1;
      if (b === '—') return -1;
      return a.localeCompare(b);
    });
    const myGroupKey = groupKeys.find((g) => groupMap[g].some((s) => (s.team || []).includes(myEmail)));

    return (
      <div className="stack">
        <h1 style={{ marginBottom: 4 }}>🎬 Final Demos</h1>

        {/* Now Presenting banner */}
        {liveSlot && (
          <div style={{ padding: 18, borderRadius: 12, background: 'var(--accent)', color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,.16)' }}>
            <div style={{ fontSize: 12, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>🎬 Now Presenting</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{liveSlot.project_name || liveSlot.custom_name || 'Demo'}</div>
            {liveSlot.custom_name && liveSlot.project_name && (
              <div style={{ fontSize: 14, opacity: 0.9, marginTop: 2 }}>{liveSlot.custom_name}</div>
            )}
            {liveSlot.team?.length > 0 && (
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{liveSlot.team.map((e) => e.split('@')[0]).join(', ')}</div>
            )}
            {liveSlot.project_award && (
              <div style={{ display: 'inline-block', marginTop: 6, background: 'rgba(255,255,255,.2)', borderRadius: 6, padding: '2px 10px', fontSize: 12 }}>
                {liveSlot.project_award}
              </div>
            )}
          </div>
        )}

        {/* Your group highlight */}
        {myGroupKey && (
          <div style={{ padding: 16, borderRadius: 10, border: '2px solid var(--accent)', background: 'var(--surface)' }}>
            <div className="faint small" style={{ marginBottom: 2 }}>Your group</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Group {myGroupKey}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {groupMap[myGroupKey].map((s, i) => {
                const isMe = (s.team || []).includes(myEmail);
                const st = STATUS[s.status] || STATUS.scheduled;
                return (
                  <div key={s.id} style={{
                    display: 'flex', gap: 12, alignItems: 'center',
                    padding: '8px 0',
                    borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                    background: isMe ? 'rgba(99,102,241,.04)' : 'transparent',
                  }}>
                    <div style={{ minWidth: 58, color: 'var(--muted)', fontSize: 12, textAlign: 'right' }}>
                      <div>{slotTimeMap[s.id] || '—'}</div>
                      <div style={{ fontSize: 11 }}>{s.duration_minutes} min</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: isMe ? 700 : 500, color: isMe ? 'var(--accent)' : 'inherit' }}>
                        {s.project_name || s.custom_name || 'Demo'}
                        {isMe && <span style={{ marginLeft: 8, fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'var(--accent)', color: '#fff' }}>Your team</span>}
                      </div>
                      {s.custom_name && s.project_name && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{s.custom_name}</div>
                      )}
                      {st.label && <div style={{ fontSize: 11, color: st.color, marginTop: 1 }}>{st.label}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Full schedule grouped by judge group */}
        {groupKeys.length === 0 ? (
          <div className="card"><p className="faint small">No demo schedule published yet.</p></div>
        ) : (
          groupKeys.map((groupKey) => (
            <div key={groupKey} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
                {groupKey === '—' ? 'Unassigned' : `Group ${groupKey}`}
              </div>
              {groupMap[groupKey].map((s, i) => {
                const isMe = (s.team || []).includes(myEmail);
                const st = STATUS[s.status] || STATUS.scheduled;
                return (
                  <div key={s.id} style={{
                    display: 'flex', gap: 12, alignItems: 'center',
                    padding: '10px 16px',
                    borderBottom: i < groupMap[groupKey].length - 1 ? '1px solid var(--border)' : 'none',
                    background: isMe ? 'rgba(99,102,241,.06)' : s.status === 'speaking' ? 'rgba(99,102,241,.04)' : 'transparent',
                    borderLeft: isMe ? '4px solid var(--accent)' : s.status === 'speaking' ? '4px solid var(--accent)' : '4px solid transparent',
                  }}>
                    <div style={{ minWidth: 58, color: 'var(--muted)', fontSize: 12, textAlign: 'right' }}>
                      <div>{slotTimeMap[s.id] || '—'}</div>
                      <div style={{ fontSize: 11 }}>{s.duration_minutes} min</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: isMe ? 700 : 500 }}>
                        {s.project_name || s.custom_name || 'Demo'}
                        {isMe && <span style={{ marginLeft: 8, fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'var(--accent)', color: '#fff' }}>Your team</span>}
                        {s.project_award && <span style={{ marginLeft: 6, fontSize: 11, padding: '1px 6px', borderRadius: 4, background: '#d97706', color: '#fff' }}>{s.project_award}</span>}
                      </div>
                      {s.custom_name && s.project_name && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{s.custom_name}</div>
                      )}
                      {s.team?.length > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.team.map((e) => e.split('@')[0]).join(', ')}</div>
                      )}
                      {st.label && <div style={{ fontSize: 11, color: st.color, fontWeight: st.bold ? 700 : 400, marginTop: 1 }}>{st.label}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    );
  }

  const cur = currentSlot();
  const pend = pendingSlot();
  const onDeckSlot = !cur && pend ? pend : slots.filter(isEligible).find((s) => s.id !== currentId && s.id !== pendingId) || null;
  const overTime = remaining < 0;

  return (
    <div className="stack">
      <h1 style={{ marginBottom: 4 }}>🎬 Final Demos</h1>

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
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 2 }}>{cur.project_name || slotName(cur)}</div>
          {cur.custom_name && cur.project_name && (
            <div style={{ fontSize: 15, opacity: 0.85, marginBottom: 6 }}>{cur.custom_name}</div>
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
              {manualStep === 'speech' && (
                <button style={{ ...B_SM, padding: '7px 18px', fontSize: 14 }} onClick={doManualSpeech}>🎙 Speak Intro</button>
              )}
              {manualStep === 'outro' && (
                <button style={{ ...B_SM, padding: '7px 18px', fontSize: 14, background: '#16a34a' }} onClick={doManualOutro}>🎙 Thank You</button>
              )}
              {manualStep === 'timer' && (
                <button style={{ ...B_SM, padding: '7px 18px', fontSize: 14 }} onClick={doManualTimer}>▶ Start Timer</button>
              )}
              {!manualStep && (
                <>
                  <button style={B_GRY_SM} onClick={togglePause}>{isPaused ? '▶ Resume' : '⏸ Pause'}</button>
                  <button style={B_SM} onClick={advance}>Next ▶</button>
                  <button style={B_AMB_SM} onClick={skipCurrent}>Skip ⏭</button>
                  <button
                    style={{ ...B_GRY_SM, background: '#7c3aed' }}
                    onClick={askQuestion}
                    disabled={aiLoading}
                  >{aiLoading ? '⏳ Thinking…' : '🤔 Ask Question'}</button>
                </>
              )}
            </div>
          )}
          {aiQuestion && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(4px)' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4, opacity: 0.8 }}>🤔 Suggested Judge Question</div>
              <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.45 }}>{aiQuestion}</div>
              <button onClick={() => setAiQuestion('')} style={{ marginTop: 6, fontSize: 11, opacity: 0.7, background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}>✕ dismiss</button>
            </div>
          )}
        </div>
      )}

      {/* On deck */}
      {isLive && !cur && pend && (
        <div style={{ padding: 16, borderRadius: 10, border: '2px solid var(--accent)', background: 'var(--surface)' }}>
          <div className="faint small" style={{ textTransform: 'uppercase', marginBottom: 4 }}>On Deck</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{pend.project_name || slotName(pend)}</div>
          {pend.custom_name && pend.project_name && <div className="small muted">{pend.custom_name}</div>}
          {isAdmin && <button style={{ ...B_SM, marginTop: 10 }} onClick={startPending}>▶ Start Now</button>}
        </div>
      )}

      {/* Controls row */}
      {isAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 0' }}>
          {!isLive ? (
            <button style={B} onClick={startDemo} disabled={!slots.some(isEligible)}>▶ Start Final Demos</button>
          ) : (
            <button style={B_RED} onClick={async () => { stopTimer(); setIsLive(false); setCurrentId(null); setPendingId(null); }}>■ End</button>
          )}
          {slots.some((s) => s.status !== 'scheduled') && (
            <button style={B_GRY} onClick={async () => {
              if (!confirm('Reset all demo slots back to Scheduled? This clears live event progress.')) return;
              stopTimer(); setIsLive(false); setCurrentId(null); setPendingId(null); setElapsed(0);
              for (const s of slots) {
                if (s.status !== 'scheduled') await put(`${base}/${s.id}`, { status: 'scheduled', actual_start: '', actual_end: '' });
              }
              await load();
            }}>↺ Reset All</button>
          )}
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
                <div style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                  {s.actual_start ? (
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{fmtActualTime(s.actual_start)}</span>
                  ) : (
                    <span style={{ color: 'var(--muted)' }}>{times[idx] || '—'}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.duration_minutes} min</div>
              </div>
              <div>
                <div style={{ fontWeight: isCurrent ? 700 : 500, fontSize: 14 }}>
                  {s.project_name || slotName(s)}
                  {s.project_award && (
                    <span style={{ marginLeft: 8, fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'var(--accent)', color: '#fff' }}>
                      {s.project_award}
                    </span>
                  )}
                </div>
                {s.custom_name && s.project_name && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.custom_name}</div>
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
