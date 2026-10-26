import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { register, sendVerificationCode, verifyEmail } from '../api/auth';
import { getErrorMessage } from '../utils/helpers';
import welcomeImage from '../assets/welcome.jpg';

const RESEND_COOLDOWN_SECONDS = 60;

function getRegistrationError(error, fallback) {
  const detail = error?.response?.data?.detail;

  if (error?.response?.status === 502) {
    return 'The email service could not send this code. With Resend testing mode, use the Resend account email or configure a verified sender domain.';
  }
  if (detail === 'Email is already registered') return 'This email is already registered. Please log in instead.';
  if (detail === 'Invalid verification code') return 'Invalid verification code.';
  if (detail === 'Verification code has expired' || detail === 'Email verification has expired') {
    return 'That verification code has expired. Please request a new code.';
  }
  if (detail === 'Please wait before requesting another verification code') {
    return 'Please wait before requesting another verification code.';
  }

  return getErrorMessage(error, fallback);
}

export default function Register() {
  const [step, setStep] = useState('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setInterval(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  useEffect(() => {
    if (step !== 'success') return undefined;
    const timer = window.setTimeout(() => navigate('/signin', { replace: true }), 1500);
    return () => window.clearTimeout(timer);
  }, [navigate, step]);

  function validateDetails() {
    if (!name.trim()) return 'Name is required.';
    if (!email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email address.';
    return '';
  }

  async function handleSendCode(event) {
    event.preventDefault();
    const validationError = validateDetails();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    try {
      await sendVerificationCode(normalizedEmail);
      setEmail(normalizedEmail);
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setStep('verify');
    } catch (requestError) {
      setError(getRegistrationError(requestError, 'Unable to send the verification code. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(event) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await verifyEmail(email, code);
      setStep('password');
    } catch (requestError) {
      setError(getRegistrationError(requestError, 'Unable to verify the code. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (loading || resendSeconds > 0) return;
    setLoading(true);
    setError('');
    try {
      await sendVerificationCode(email);
      setCode('');
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
    } catch (requestError) {
      setError(getRegistrationError(requestError, 'Unable to resend the verification code. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAccount(event) {
    event.preventDefault();
    setError('');
    if (!password) return setError('Password is required.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (!confirmPassword) return setError('Please confirm your password.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    try {
      const response = await register({ name: name.trim(), email, password });
      if (response?.success === false) throw new Error(response.message || 'Registration failed. Please try again.');
      setStep('success');
    } catch (requestError) {
      setError(
        requestError instanceof Error && !requestError.response
          ? requestError.message
          : getRegistrationError(requestError, 'Unable to create your account. Please try again.'),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="landing-page landing-auth-page landing-register-page">
      <header className="landing-nav">
        <div className="landing-nav-brand">
          <span>Examora</span></div>
      </header>

      <main className="landing-register-main landing-register-page-main">
        <div className="landing-register-wrap">
          {step === 'success' ? (
            <div style={{ textAlign: 'center' }}>
              <div className="registration-success-icon"><CheckCircle size={32} /></div>
              <h1 className="landing-register-title account-auth-title">Account created successfully</h1>
              <p className="landing-register-sub">Redirecting you to sign in...</p>
            </div>
          ) : (
            <>
              <div className="landing-register-header">
                <h1 className="landing-register-title account-auth-title">
                  {step === 'verify' ? 'Verify Your Email' : step === 'password' ? 'Create Your Account' : 'Create your account'}
                </h1>
                <p className="landing-register-sub">
                  {step === 'verify'
                    ? 'Enter the 6-digit code we sent to your email.'
                    : step === 'password'
                      ? 'Set a password to finish creating your student account.'
                      : 'Register to access your examinations and results.'}
                </p>
              </div>

              {error ? <div className="form-error">{error}</div> : null}

              {step === 'details' ? (
                <form onSubmit={handleSendCode} className="landing-register-form">
                  <div className="field"><label htmlFor="name">Full Name</label><input id="name" type="text" className="input" placeholder="Your full name" value={name} onChange={(event) => setName(event.target.value)} autoFocus required /></div>
                  <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" className="input" placeholder="Your email id" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
                  <button type="submit" className="btn-secondary" style={{ fontSize: 15, padding: '10px 20px' }} disabled={loading}>{loading ? <Loader2 size={16} className="spin-icon" /> : null}{loading ? 'Sending code...' : 'Send Verification Code'}</button>
                </form>
              ) : null}

              {step === 'verify' ? (
                <form onSubmit={handleVerify} className="landing-register-form">
                  <p className="verification-copy">We sent a 6-digit verification code to:</p>
                  <p className="verification-email">{email}</p>
                  <div className="field"><label htmlFor="verification-code">Verification code</label><input id="verification-code" type="text" className="input verification-code-input" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} autoFocus required /></div>
                  <button type="submit" className="btn btn-primary btn-block" disabled={loading}>{loading ? <Loader2 size={16} className="spin-icon" /> : null}{loading ? 'Verifying...' : 'Verify Email'}</button>
                  <button type="button" className="btn btn-ghost btn-block" onClick={handleResend} disabled={loading || resendSeconds > 0}>{resendSeconds > 0 ? `Resend available in ${resendSeconds}s` : 'Resend Code'}</button>
                </form>
              ) : null}

              {step === 'password' ? (
                <form onSubmit={handleCreateAccount} className="landing-register-form">
                  <div className="field"><label htmlFor="account-name">Full Name</label><input id="account-name" type="text" className="input" value={name} readOnly /></div>
                  <div className="field"><label htmlFor="verified-email">Verified Email</label><input id="verified-email" type="text" className="input" value={`${email} ✓`} readOnly /></div>
                  <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" className="input" placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus required /></div>
                  <div className="field"><label htmlFor="confirmPassword">Confirm Password</label><input id="confirmPassword" type="password" className="input" placeholder="Repeat your password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></div>
                  <button type="submit" className="btn-secondary"  style={{ fontSize: 15, padding: '10px 20px' }} disabled={loading}>{loading ? <Loader2 size={16} className="spin-icon" /> : null}{loading ? 'Creating account...' : 'Create Account'}</button>
                </form>
              ) : null}

              <p className="auth-switch" style={{ marginTop: 20 }}>Already have an account? <Link to="/signin">Sign in</Link></p>
            </>
          )}
        </div>
        <div className="landing-login-visual landing-register-visual" aria-hidden="true"><img src={welcomeImage} alt="" /></div>
      </main>

      <footer className="landing-footer"><p>Examora</p></footer>
    </div>
  );
}
