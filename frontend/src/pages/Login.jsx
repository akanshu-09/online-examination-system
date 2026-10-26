import { Link } from 'react-router-dom';
import mainImage from '../assets/main.jpg';
import logoImage from '../assets/logo.png';

export default function Login() {
  return (
    <div className="landing-page landing-auth-page">
      <header className="landing-nav">
        <div className="landing-nav-brand">
          <span>Examora</span></div>
      </header>

      <main className="landing-hero landing-login-landing-main">
        <div className="landing-hero-content">
          <span className="landing-desc"></span>
          <h1 className="landing-headline">
            Examora
            <span className="landing-headline-sub">Student Assessment System</span>
          </h1>
          <p className="landing-desc">
            A secure, timed online examination platform for students and faculty.
            Give exams, save answers in real time, and receive your results instantly.
          </p>
          <div className="landing-cta-row">
            <Link to="/signin" className="btn-secondary" style={{ fontSize: 15, padding: '12px 20px' }}>
              Sign In to Portal
            </Link>
            <Link to="/register" className=" btn-secondary" style={{ fontSize: 15, padding: '12px 20px' }}>
              Create Account
            </Link>
          </div>
          <p className="landing-disclaimer">
            The best platform for the very best students.
          </p>
        </div>
        <div className="landing-login-visual landing-login-landing-visual" >
          <img src={mainImage} alt="" />
        </div>
      </main>


      <footer className="landing-footer">
        <p>Examora  </p>
      </footer>
    </div>
  );
}
