import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Hackathons() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', details: '' });
  const [error, setError] = useState('');

  function load() { get('/api/hackathons').then(setList).catch(() => {}); }
  useEffect(load, []);

  async function create(e) {
    e.preventDefault();
    setError('');
    try {
      const h = await post('/api/hackathons', form);
      setForm({ name: '', details: '' });
      setCreating(false);
      load();
      navigate(`/h/${h.id}/admin`);
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="page">
      <div className="hero">
        <div className="eyebrow">SUBLET</div>
        <h1>Hackathons</h1>
        <p>Pick a hackathon to join team matching, submit your project, or judge. Admins can create and configure new hackathons.</p>
      </div>

      <div className="spread" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{list.length} hackathon{list.length === 1 ? '' : 's'}</h2>
        {isAdmin && !creating && <button onClick={() => setCreating(true)}>+ New hackathon</button>}
      </div>

      {creating && (
        <form onSubmit={create} className="card" style={{ boxShadow: 'var(--shadow)' }}>
          <h3 style={{ marginTop: 0 }}>Create a hackathon</h3>
          <label>Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ziward Hackathon" autoFocus />
          </label>
          <label>Details
            <textarea rows={3} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Theme, dates, rules…" />
          </label>
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button type="submit">Create</button>
            <button type="button" className="secondary" onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </form>
      )}

      {list.length === 0 && !creating ? (
        <div className="card empty">
          <div className="big">🗓️</div>
          <p>No hackathons yet.{isAdmin ? ' Create your first one.' : ' Check back soon.'}</p>
        </div>
      ) : (
        <div className="grid">
          {list.map((h) => (
            <div key={h.id} className="card card-hover" onClick={() => navigate(`/h/${h.id}`)}>
              <div className="spread">
                <h3 style={{ margin: 0 }}>{h.name}</h3>
                {h.is_judge && <span className="badge accent">Judge</span>}
              </div>
              <p className="muted small" style={{ minHeight: 36 }}>{h.details || 'No description provided.'}</p>
              <div className="row small faint" style={{ gap: 16 }}>
                <span>{h.project_count} project{h.project_count === 1 ? '' : 's'}</span>
                <span>{h.judge_count} judge{h.judge_count === 1 ? '' : 's'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
