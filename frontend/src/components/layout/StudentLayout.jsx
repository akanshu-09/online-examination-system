import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutGrid, ClipboardList, History, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_LINKS = [
  { to: '/student', end: true, label: 'Dashboard', icon: LayoutGrid },
  { to: '/student/exams', end: false, label: 'Exams', icon: ClipboardList },
  { to: '/student/results', end: false, label: 'Results', icon: History },
];

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell app-shell-student">
      <header className="topbar">
        <div className="topbar-brand">
          <span>Examora</span>
        </div>

        <div className="topbar-user">
          <span className="topbar-username">{user?.name}</span>
          <button className="btn btn-ghost btn-sm topbar-logout" onClick={handleLogout}>
            <LogOut size={15} /> Log out
          </button>
        </div>
      </header>

      <aside className="student-sidebar">
        <nav className="sidebar-nav">
          {NAV_LINKS.map(({ to, end, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={end} className="sidebar-link">
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="app-main student-main">
        <Outlet />
      </main>
    </div>
  );
}
