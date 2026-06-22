import { useEffect, useRef, useState } from 'react';
import { get } from '../api.js';

/**
 * Search-as-you-type user picker.
 *
 * Props:
 *   endpoint     — API path to search, e.g. '/api/meta/users' or '/api/admin/users'
 *   onSelect     — called with the chosen user object { id, email }
 *   excludeIds   — Set of user IDs to hide from results
 *   placeholder  — input placeholder text
 */
export default function UserSearchInput({
  endpoint = '/api/meta/users',
  onSelect,
  excludeIds = new Set(),
  placeholder = 'Search by email…',
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const wrapper = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapper.current && !wrapper.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleChange(e) {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const rows = await get(`${endpoint}?search=${encodeURIComponent(q)}`);
      setResults(rows.filter((u) => !excludeIds.has(u.id)));
      setOpen(true);
    }, 280);
  }

  function pick(user) {
    setQuery(''); setResults([]); setOpen(false);
    onSelect(user);
  }

  const hasResults = results.length > 0;
  const noResults = !hasResults && query.trim();

  return (
    <div ref={wrapper} style={{ position: 'relative', flex: 1 }}>
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => hasResults && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        style={{ width: '100%', marginTop: 0 }}
      />
      {open && (hasResults || noResults) && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,.15)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {hasResults
            ? results.map((u) => (
                <div key={u.id}
                  onMouseDown={(e) => { e.preventDefault(); pick(u); }}
                  style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 14 }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = ''}
                >
                  {u.email}
                  {u.role && u.role !== 'user' && (
                    <span className="badge" style={{ marginLeft: 6 }}>{u.role}</span>
                  )}
                </div>
              ))
            : (
              <div style={{ padding: '8px 12px', fontSize: 14, color: 'var(--muted)' }}>
                No users found
              </div>
            )
          }
        </div>
      )}
    </div>
  );
}
