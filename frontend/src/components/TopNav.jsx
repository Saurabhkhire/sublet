import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useTheme } from '../theme.jsx';

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button className="icon-btn" onClick={toggle} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}

export default function TopNav() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) {
    return (
      <div className="topnav">
        <Link to="/" className="brand"><span className="brand-dot" />SUBLET</Link>
        <ThemeToggle />
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
        <Link to="/profile" className="muted small" title="Account settings">{user.email}</Link>
        <Link to="/profile" title="Account settings"><div className="avatar">{initial}</div></Link>
        <ThemeToggle />
        <button className="ghost sm" onClick={() => { logout(); navigate('/login'); }}>Logout</button>
      </div>
    </div>
  );
}
