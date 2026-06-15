import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Nav() {
  const { user, isAdmin, isJudge, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <nav className="nav">
      <div className="nav-left">
        <Link to="/" className="brand">⚡ Hackathon</Link>
        <Link to="/">Dashboard</Link>
        <Link to="/matching">Team Matching</Link>
        <Link to="/submit">Submit Project</Link>
        {isJudge && <Link to="/judging">Judging</Link>}
        {isAdmin && <Link to="/admin">Admin</Link>}
      </div>
      <div className="nav-right">
        <span className="muted">{user.email}{isAdmin ? ' (admin)' : isJudge ? ' (judge)' : ''}</span>
        <button onClick={() => { logout(); navigate('/login'); }}>Logout</button>
      </div>
    </nav>
  );
}
