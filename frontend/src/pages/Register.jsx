import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await register(email, password, linkedin);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container narrow">
      <h1>Register</h1>
      <form onSubmit={onSubmit} className="card">
        <label>Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label>Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min 6 characters" />
        </label>
        <label>LinkedIn URL
          <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/you" />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Create account</button>
      </form>
      <p className="muted">Already have an account? <Link to="/login">Log in</Link></p>
    </div>
  );
}
