import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Nav from './components/Nav.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import TeamMatching from './pages/TeamMatching.jsx';
import Submission from './pages/Submission.jsx';
import Judging from './pages/Judging.jsx';

function Protected({ children, need }) {
  const { user, loading, isAdmin, isJudge } = useAuth();
  if (loading) return <div className="container">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (need === 'admin' && !isAdmin) return <div className="container">Admins only.</div>;
  if (need === 'judge' && !isJudge) return <div className="container">You are not authorised to view projects.</div>;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="/" element={<Protected><Dashboard /></Protected>} />
        <Route path="/matching" element={<Protected><TeamMatching /></Protected>} />
        <Route path="/submit" element={<Protected><Submission /></Protected>} />
        <Route path="/judging" element={<Protected need="judge"><Judging /></Protected>} />
        <Route path="/admin" element={<Protected need="admin"><AdminPanel /></Protected>} />
        <Route path="*" element={<div className="container">Not found. {loading ? '' : ''}</div>} />
      </Routes>
    </>
  );
}
