import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Dashboard() {
  const { user, isJudge } = useAuth();
  const [meta, setMeta] = useState(null);
  const [match, setMatch] = useState(null);
  const [myProjects, setMyProjects] = useState([]);

  useEffect(() => {
    get('/api/meta').then(setMeta).catch(() => {});
    get('/api/matching/me').then(setMatch).catch(() => {});
    get('/api/projects').then(setMyProjects).catch(() => {});
  }, []);

  return (
    <div className="container">
      <header className="hero">
        <h1>{meta?.config?.hackathon_name || 'Hackathon'}</h1>
        <p className="muted">{meta?.config?.details}</p>
      </header>

      <div className="grid">
        <section className="card">
          <h2>Team Matching</h2>
          {match?.profile ? (
            match.profile.matched ? (
              <>
                <p>You have been matched! Your team:</p>
                <ul>
                  {match.group.map((m) => (
                    <li key={m.id}>
                      {m.email} — <span className="muted">{m.role}</span>
                      {m.linkedin && <> · <a href={m.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></>}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>You've opted in. Waiting for the admin to run matching. <Link to="/matching">Edit profile</Link></p>
            )
          ) : (
            <p>Looking for a team? <Link to="/matching">Opt into team matching</Link> (optional).</p>
          )}
        </section>

        <section className="card">
          <h2>My Project</h2>
          {myProjects.length === 0 ? (
            <p>You haven't submitted a project. <Link to="/submit">Submit one</Link>.</p>
          ) : (
            <ul>
              {myProjects.map((p) => (
                <li key={p.id}><strong>{p.name}</strong> — {p.short_description}</li>
              ))}
            </ul>
          )}
        </section>

        {isJudge && (
          <section className="card">
            <h2>Judging</h2>
            <p>You're a selected judge. <Link to="/judging">Review & score projects</Link>.</p>
          </section>
        )}
      </div>
    </div>
  );
}
