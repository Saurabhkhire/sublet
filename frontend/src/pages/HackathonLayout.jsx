import { useCallback, useEffect, useState } from 'react';
import { Outlet, useParams, NavLink, useLocation } from 'react-router-dom';
import { get } from '../api.js';

// Loads hackathon-scoped meta once and shares it (plus a reload fn) with all sub-pages
// via the router Outlet context. Renders the section sidebar.
export default function HackathonLayout() {
  const { hid } = useParams();
  const location = useLocation();
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      setMeta(await get(`/api/hackathons/${hid}`));
    } catch (e) {
      setError(e.message);
    }
  }, [hid]);

  useEffect(() => { reload(); }, [reload]);

  if (error) return <div className="page"><div className="card"><p className="error">{error}</p></div></div>;
  if (!meta) return <div className="page muted">Loading hackathon…</div>;

  const sections = [
    { to: `/h/${hid}`, label: 'Overview', icon: '◆', end: true },
    { to: `/h/${hid}/matching`, label: 'Team Matching', icon: '⚇' },
    { to: `/h/${hid}/submit`, label: 'Submit Project', icon: '➜' },
    { to: `/h/${hid}/schedule`, label: 'Schedule', icon: '🎤' },
    ...(meta.is_judge ? [{ to: `/h/${hid}/judging`, label: 'Judging', icon: '★' }] : []),
    ...(meta.is_admin ? [{ to: `/h/${hid}/admin`, label: 'Admin', icon: '⚙' }] : []),
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="card">
          <div className="small faint" style={{ textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Hackathon</div>
          <div style={{ fontWeight: 700, marginBottom: 14, lineHeight: 1.3 }}>{meta.hackathon.name}</div>
          {sections.map((s) => (
            <NavLink key={s.to} to={s.to} end={s.end} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
              <span className="ico">{s.icon}</span>{s.label}
            </NavLink>
          ))}
        </div>
      </aside>
      <main>
        <Outlet key={location.pathname} context={{ meta, reload, hid }} />
      </main>
    </div>
  );
}
