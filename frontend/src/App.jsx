import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import TopNav from './components/TopNav.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Hackathons from './pages/Hackathons.jsx';
import Users from './pages/Users.jsx';
import Profile from './pages/Profile.jsx';
import HackathonLayout from './pages/HackathonLayout.jsx';
import Overview from './pages/Overview.jsx';
import TeamMatching from './pages/TeamMatching.jsx';
import Submission from './pages/Submission.jsx';
import Judging from './pages/Judging.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import Schedule from './pages/Schedule.jsx';
import JudgingGroups from './pages/JudgingGroups.jsx';
import DemoSchedule from './pages/DemoSchedule.jsx';
import Winners from './pages/Winners.jsx';

function Protected({ children, need }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="page">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (need === 'admin' && !isAdmin) return <div className="page">Admins only.</div>;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <>
      <TopNav />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="/" element={<Protected><Hackathons /></Protected>} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />
        <Route path="/users" element={<Protected need="admin"><Users /></Protected>} />
        <Route path="/h/:hid" element={<Protected><HackathonLayout /></Protected>}>
          <Route index element={<Overview />} />
          <Route path="matching" element={<TeamMatching />} />
          <Route path="submit" element={<Submission />} />
          <Route path="judging" element={<Judging />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="judging-groups" element={<JudgingGroups />} />
          <Route path="demo" element={<DemoSchedule />} />
          <Route path="winners" element={<Winners />} />
          <Route path="admin" element={<Protected need="admin"><AdminPanel /></Protected>} />
        </Route>
        <Route path="*" element={<div className="page">Not found.</div>} />
      </Routes>
    </>
  );
}
