import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function TopNav() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) {
    return (
      <div className="topnav">
        <Link to="/" className="brand"><span className="brand-dot" />SUBLET</Link>
      </div>
    );
  }
  const initial = (user.email || '?')[0].toUpperCase();
  return (
    <div className="topnav">
      <div className="links">
        <Link to="/" className="brand"><span className="brand-dot" />SUBLET</Link>
        <Link to="/">Hackathons</Link>
        {isAdmin && <Link to="/users">Users</Link>}
      </div>
      <div className="right">
        {isAdmin && <span className="badge accent">Admin</span>}
        <span className="muted small">{user.email}</span>
        <div className="avatar" title={user.email}>{initial}</div>
        <button className="ghost sm" onClick={() => { logout(); navigate('/login'); }}>Logout</button>
      </div>
    </div>
  );
}
