import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/helpers';
import examBackground from '../assets/exam-bg.jpg';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginSuccess } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        throw new Error('Please enter a valid email address.');
      }

      const response = await login({ email, password });
      if (response?.success === false) {
        throw new Error(response.message || 'Invalid credentials. Please try again.');
      }
      const user = loginSuccess(response);
      if (!user?.id) {
        throw new Error('Login succeeded but no user id was returned by the server.');
      }
      navigate(user.role === 'admin' ? '/admin' : '/student');
    } catch (err) {
      setError(
        err?.response
          ? getErrorMessage(err, 'Invalid credentials. Please try again.')
          : err.message || 'Invalid credentials. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="landing-page landing-auth-page">
      <header className="landing-nav">
        <div className="landing-nav-brand">
          <span>Examora</span>
        </div>
      </header>

      <main className="landing-register-main landing-login-main">
        <div className="landing-login-visual" aria-hidden="true">
          <img src={examBackground} alt="" />
        </div>
        <div className="landing-register-wrap">
          <div className="landing-register-header">
            <h1 className="landing-register-title account-auth-title">Sign in to your account</h1>
            <p className="landing-register-sub">
              Access your examinations and results.
            </p>
          </div>

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleSubmit} className="landing-register-form">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-secondary" style={{ fontSize: 15, padding: '5px 20px' }}>
              {loading ? <Loader2 size={16} className="spin-icon" /> : null}
              {loading ? 'Signing in…' : 'Log in'}
            </button>
          </form>

          <p className="auth-switch" style={{ marginTop: 20 }}>
            No account yet? <Link to="/register">Create one</Link>
          </p>
        </div>
      </main>

      <footer className="landing-footer">
        <p>Examora</p>
      </footer>
    </div>
  );
}
