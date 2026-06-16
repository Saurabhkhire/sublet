import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { get } from '../api.js';

export default function Overview() {
  const { meta, hid } = useOutletContext();
  const [match, setMatch] = useState(null);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    get(`/api/hackathons/${hid}/matching/me`).then(setMatch).catch(() => {});
    get(`/api/hackathons/${hid}/projects`).then(setProjects).catch(() => {});
  }, [hid]);

  return (
    <div className="stack">
      <div className="hero">
        <div className="eyebrow">Overview</div>
        <h1>{meta.hackathon.name}</h1>
        <p>{meta.hackathon.details || 'Welcome — build something amazing.'}</p>
      </div>

      <div className="grid">
        <div className="card">
          <div className="spread"><h3 style={{ margin: 0 }}>Team Matching</h3><span className="badge">optional</span></div>
          {match?.profile ? (
            match.profile.matched ? (
              <>
                <p className="small muted">You've been matched! Your team:</p>
                <div className="stack" style={{ marginTop: 4 }}>
                  {match.group.map((m) => (
                    <div key={m.id} className="row" style={{ justifyContent: 'space-between' }}>
                      <span>{m.email}</span><span className="badge">{m.role}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted small">You've opted in — waiting for the admin to run matching. <Link to={`/h/${hid}/matching`}>Edit profile</Link></p>
            )
          ) : (
            <p className="muted small">Looking for a team? <Link to={`/h/${hid}/matching`}>Opt into team matching →</Link></p>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>My Project</h3>
          {projects.length === 0 ? (
            <p className="muted small">No submission yet. <Link to={`/h/${hid}/submit`}>Submit a project →</Link></p>
          ) : (
            <div className="stack">
              {projects.map((p) => (
                <div key={p.id}>
                  <strong>{p.name}</strong>
                  <div className="muted small">{p.short_description || 'No description'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {meta.is_judge && (
          <div className="card">
            <div className="spread"><h3 style={{ margin: 0 }}>Judging</h3><span className="badge accent">judge</span></div>
            <p className="muted small">You can review and score projects. <Link to={`/h/${hid}/judging`}>Open judging →</Link></p>
          </div>
        )}
      </div>
    </div>
  );
}
