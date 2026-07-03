import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { get } from '../api.js';

const AWARD_ICONS = {
  '1st place': '🥇',
  '2nd place': '🥈',
  '3rd place': '🥉',
  finalist: '🏆',
};
const AWARD_ORDER = ['1st place', '2nd place', '3rd place', 'finalist'];

function awardIcon(tag) {
  const low = tag.toLowerCase();
  for (const [k, v] of Object.entries(AWARD_ICONS)) {
    if (low.startsWith(k)) return v;
  }
  return '🎖';
}

function awardSort(a, b) {
  const ai = AWARD_ORDER.findIndex((o) => a.toLowerCase().startsWith(o));
  const bi = AWARD_ORDER.findIndex((o) => b.toLowerCase().startsWith(o));
  const an = ai === -1 ? 99 : ai;
  const bn = bi === -1 ? 99 : bi;
  return an !== bn ? an - bn : a.localeCompare(b);
}

export default function Winners() {
  const { hid } = useOutletContext();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    get(`/api/hackathons/${hid}/projects/winners`)
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [hid]);

  if (loading) return <div className="page muted">Loading…</div>;
  if (error) return <div className="page"><p className="error">{error}</p></div>;

  if (projects.length === 0) {
    return (
      <div className="stack">
        <h1>Winners</h1>
        <div className="card"><p className="muted">No awards have been announced yet.</p></div>
      </div>
    );
  }

  // Group by award_tag
  const byTag = {};
  for (const p of projects) {
    const tag = p.award_tag || 'Other';
    if (!byTag[tag]) byTag[tag] = [];
    byTag[tag].push(p);
  }
  const tags = Object.keys(byTag).sort(awardSort);

  return (
    <div className="stack">
      <h1 style={{ marginBottom: 4 }}>🏆 Winners</h1>
      <p className="muted" style={{ marginBottom: 8 }}>{projects.length} award{projects.length !== 1 ? 's' : ''} announced</p>

      {tags.map((tag) => (
        <div key={tag} className="card">
          <h2 style={{ marginTop: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>{awardIcon(tag)}</span>
            <span>{tag}</span>
          </h2>
          <div className="stack" style={{ gap: 10 }}>
            {byTag[tag].map((p) => (
              <div key={p.id} style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 8, borderLeft: '4px solid var(--accent)' }}>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{p.name}</div>
                {p.short_description && (
                  <div className="muted small" style={{ marginBottom: 6 }}>{p.short_description}</div>
                )}
                {p.participants && p.participants.length > 0 && (
                  <div className="small" style={{ color: 'var(--accent)' }}>
                    {p.participants.map((u) => u.email).join(', ')}
                  </div>
                )}
                {p.demo_video_link && (
                  <a href={p.demo_video_link} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-block', marginTop: 8, fontSize: 13 }}>
                    Watch demo ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
