import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Hackathons() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', details: '', support_info: '', schedule: '', event_date: '', start_time: '', end_time: '', location: '' });
  const [error, setError] = useState('');

  function load() { get('/api/hackathons').then(setList).catch(() => {}); }
  useEffect(load, []);

  async function create(e) {
    e.preventDefault();
    setError('');
    try {
      const h = await post('/api/hackathons', form);
      setForm({ name: '', details: '', support_info: '', schedule: '', event_date: '', start_time: '', end_time: '', location: '' });
      setCreating(false);
      load();
      navigate(`/h/${h.id}/admin`);
    } catch (err) { setError(err.message); }
  }

  const today = new Date().toISOString().slice(0, 10);
  const active = list.filter((h) => !h.event_date || h.event_date >= today);
  const past   = list.filter((h) => h.event_date && h.event_date < today);

  return (
    <div className="page">
      <div className="hero">
        <div className="eyebrow">SUBLET</div>
        <h1>Hackathons</h1>
        <p>Pick a hackathon to join team matching, submit your project, or judge. Admins can create and configure new hackathons.</p>
      </div>

      <div className="spread" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{active.length} active hackathon{active.length === 1 ? '' : 's'}</h2>
        {isAdmin && !creating && <button onClick={() => setCreating(true)}>+ New hackathon</button>}
      </div>

      {creating && (
        <form onSubmit={create} className="card" style={{ boxShadow: 'var(--shadow)' }}>
          <h3 style={{ marginTop: 0 }}>Create a hackathon</h3>
          <label>Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ziward Hackathon" autoFocus />
          </label>
          <label>Description
            <textarea rows={3} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="What is this hackathon about?" />
          </label>
          <div className="row" style={{ gap: 16 }}>
            <label style={{ flex: 1, minWidth: 140 }}>Date
              <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
            </label>
            <label style={{ flex: 1, minWidth: 110 }}>Start time
              <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </label>
            <label style={{ flex: 1, minWidth: 110 }}>End time
              <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </label>
          </div>
          <label>Location
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Bengaluru — Tech Park Auditorium (or an online link)" />
          </label>
          <p className="help">Projects can only be submitted on the event date you set here.</p>
          <label>Community &amp; Support
            <textarea rows={2} value={form.support_info} onChange={(e) => setForm({ ...form, support_info: e.target.value })} placeholder="Discord / Slack invite link & how to get help…" />
          </label>
          <label>Schedule
            <textarea rows={3} value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="Kickoff, checkpoints, submission deadline, judging…" />
          </label>
          <p className="help">You can add tracks, sponsors and judges (and edit everything) on the next screen.</p>
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button type="submit">Create</button>
            <button type="button" className="secondary" onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </form>
      )}

      {active.length === 0 && !creating ? (
        <div className="card empty">
          <div className="big">🗓️</div>
          <p>No active hackathons.{isAdmin ? ' Create your first one.' : ' Check back soon.'}</p>
        </div>
      ) : (
        <div className="grid">
          {active.map((h) => <HackathonCard key={h.id} h={h} onClick={() => navigate(`/h/${h.id}`)} />)}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 style={{ marginTop: 40, marginBottom: 16, color: 'var(--muted, #6b7280)' }}>Past hackathons</h2>
          <div className="grid" style={{ opacity: 0.72 }}>
            {past.map((h) => <HackathonCard key={h.id} h={h} onClick={() => navigate(`/h/${h.id}`)} past />)}
          </div>
        </>
      )}
    </div>
  );
}

function HackathonCard({ h, onClick, past }) {
  const fmtDate = (d) => {
    if (!d) return null;
    try { return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return d; }
  };

  return (
    <div className="card card-hover" onClick={onClick} style={{ position: 'relative' }}>
      {past && (
        <span className="badge" style={{ position: 'absolute', top: 12, right: 12, background: 'var(--muted, #6b7280)', color: '#fff', fontSize: 11 }}>Past</span>
      )}
      <div className="spread">
        <h3 style={{ margin: 0, paddingRight: past ? 52 : 0 }}>{h.name}</h3>
        {h.is_judge && <span className="badge accent">Judge</span>}
      </div>
      <p className="muted small" style={{ minHeight: 36 }}>{h.details || 'No description provided.'}</p>
      <div className="row small faint" style={{ gap: 16 }}>
        <span>{h.project_count} project{h.project_count === 1 ? '' : 's'}</span>
        <span>{h.judge_count} judge{h.judge_count === 1 ? '' : 's'}</span>
        {h.event_date && <span>📅 {fmtDate(h.event_date)}</span>}
      </div>
    </div>
  );
}
