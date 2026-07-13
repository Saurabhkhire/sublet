import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { get } from '../api.js';
import { useAuth } from '../auth.jsx';

const pre = { whiteSpace: 'pre-wrap' };
const firstUrl = (t) => (String(t || '').match(/https?:\/\/[^\s]+/) || [])[0];

// Render an event date (YYYY-MM-DD) as "Friday, 19 June 2026"; falls back to the raw value.
function formatEventDate(date) {
  if (!date) return '';
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Convert a 24-hour "HH:MM" string to "h:MM AM/PM".
function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

// Parse text and wrap URLs in <a> tags.
function linkify(text) {
  if (!text) return null;
  const parts = String(text).split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noreferrer">{part}</a>
      : part
  );
}

export default function Overview() {
  const { meta, hid } = useOutletContext();
  const { user } = useAuth();
  const h = meta.hackathon;
  const [match, setMatch] = useState(null);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (!user) return;
    get(`/api/hackathons/${hid}/matching/me`).then(setMatch).catch(() => {});
    get(`/api/hackathons/${hid}/projects`).then(setProjects).catch(() => {});
  }, [hid, user]);

  const sponsorsWithAccess = meta.sponsors.filter((s) => (s.access_instructions || '').trim());
  const sponsorsWithPrizes = meta.sponsors.filter((s) => (s.prizes || '').trim());
  const supportUrl = firstUrl(h.support_info);

  return (
    <div className="stack">
      <div className="hero">
        <div className="eyebrow">Overview</div>
        <h1>{h.name}</h1>
        {h.details && <p style={pre}>{h.details}</p>}
        {supportUrl && <a className="btn secondary" style={{ marginTop: 14 }} href={supportUrl} target="_blank" rel="noreferrer">💬 Join the community</a>}
      </div>

      {/* When & Where */}
      {(h.event_date || h.start_time || h.end_time || h.location) && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>When &amp; Where</h2>
          {(h.event_date || h.start_time || h.end_time) && (
            <p style={{ marginTop: 0 }}>
              📅 {formatEventDate(h.event_date)}
              {(h.start_time || h.end_time) && ` · ${[h.start_time, h.end_time].filter(Boolean).map(formatTime).join(' – ')}`}
            </p>
          )}
          {h.location && <p style={{ ...pre, marginBottom: 0 }}>📍 {h.location}</p>}
          {h.event_date && <p className="muted small" style={{ marginBottom: 0 }}>Projects can only be submitted on this day.</p>}
        </section>
      )}

      {/* Community & Support */}
      {(h.support_info || '').trim() && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Community &amp; Support</h2>
          <p className="muted small" style={{ marginTop: 0 }}>Join the channel for announcements and help.</p>
          <p style={pre}>{linkify(h.support_info)}</p>
        </section>
      )}

      {/* Schedule */}
      {(h.schedule || '').trim() && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Schedule</h2>
          <p style={pre}>{h.schedule}</p>
        </section>
      )}

      {/* Tracks / themes */}
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Tracks &amp; Themes</h2>
        {meta.tracks.length === 0 ? <p className="muted small">No tracks announced yet.</p> : (
          <div className="stack">
            {meta.tracks.map((t) => (
              <div key={t.id}>
                <span className="badge accent">{t.name}</span>
                {t.description && <p className="muted small" style={{ ...pre, marginTop: 6, marginBottom: 0 }}>{t.description}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sponsors */}
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Sponsors</h2>
        {meta.sponsors.length === 0 ? <p className="muted small">No sponsors announced yet.</p> : (
          <div className="stack">
            {meta.sponsors.map((s) => (
              <div key={s.id}>
                <strong>{s.name}</strong>
                {s.description && <p className="muted small" style={{ ...pre, marginTop: 4, marginBottom: 0 }}>{s.description}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tool access & credits (per sponsor) */}
      {sponsorsWithAccess.length > 0 && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Tool Access &amp; Credits</h2>
          <p className="muted small" style={{ marginTop: 0 }}>How to access each sponsor's tools, APIs and credits.</p>
          <div className="stack">
            {sponsorsWithAccess.map((s) => (
              <div key={s.id} className="card flat" style={{ background: 'var(--surface-2)', marginBottom: 0 }}>
                <strong>{s.name}</strong>
                <p className="small" style={{ ...pre, marginTop: 4, marginBottom: 0 }}>{s.access_instructions}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Prizes (per sponsor) */}
      {sponsorsWithPrizes.length > 0 && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Prizes</h2>
          <div className="stack">
            {sponsorsWithPrizes.map((s) => (
              <div key={s.id} className="card flat" style={{ background: 'var(--surface-2)', marginBottom: 0 }}>
                <strong>🏆 {s.name}</strong>
                <p className="small" style={{ ...pre, marginTop: 4, marginBottom: 0 }}>{s.prizes}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Submission Rules */}
      {(h.submission_rules || '').trim() && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>📋 Submission Rules</h2>
          <p style={pre}>{linkify(h.submission_rules)}</p>
        </section>
      )}

      {/* Judging Rules */}
      {(h.judging_rules || '').trim() && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>⚖️ Judging Rules</h2>
          <p style={pre}>{linkify(h.judging_rules)}</p>
        </section>
      )}

      {/* Judges */}
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Judges</h2>
        {meta.judges.length === 0 ? <p className="muted small">Judges will be announced soon.</p> : (
          <div className="stack">
            {meta.judges.map((j) => (
              <div key={j.id} className="row" style={{ justifyContent: 'space-between' }}>
                <span>{j.email}</span>
                {j.linkedin ? <a href={j.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a> : <span className="faint small">no LinkedIn</span>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Your personal status — only shown to logged-in users */}
      {user && (
        <div className="grid">
          <div className="card">
            <div className="spread"><h3 style={{ margin: 0 }}>Team Matching</h3><span className="badge">optional</span></div>
            {match?.profile ? (
              match.profile.matched ? (
                <>
                  <p className="small muted">You've been matched! Your team:</p>
                  <div className="stack" style={{ marginTop: 4 }}>
                    {match.group.map((m) => (
                      <div key={m.id} className="row" style={{ justifyContent: 'space-between' }}><span>{m.email}</span><span className="badge">{m.role}</span></div>
                    ))}
                  </div>
                </>
              ) : <p className="muted small">You've opted in — waiting for the admin to run matching. <Link to={`/h/${hid}/matching`}>Edit profile</Link></p>
            ) : <p className="muted small">Looking for a team? <Link to={`/h/${hid}/matching`}>Opt into team matching →</Link></p>}
          </div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>My Project</h3>
            {projects.length === 0 ? <p className="muted small">No submission yet. <Link to={`/h/${hid}/submit`}>Submit a project →</Link></p> : (
              <div className="stack">{projects.map((p) => (<div key={p.id}><strong>{p.name}</strong><div className="muted small">{p.short_description || 'No description'}</div></div>))}</div>
            )}
          </div>
          {meta.is_judge && (
            <div className="card">
              <div className="spread"><h3 style={{ margin: 0 }}>Judging</h3><span className="badge accent">judge</span></div>
              <p className="muted small">You can review and score projects. <Link to={`/h/${hid}/judging`}>Open judging →</Link></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
