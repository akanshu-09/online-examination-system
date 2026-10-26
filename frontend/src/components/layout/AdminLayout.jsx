import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  FileText,
  FilePlus2,
  ListPlus,
  BarChart3,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/admin', end: true, icon: LayoutGrid, label: 'Dashboard' },
  { to: '/admin/exams', end: true, icon: FileText, label: 'Exams' },
  { to: '/admin/exams/create', end: true, icon: FilePlus2, label: 'Create Exam' },
  { to: '/admin/questions/create', end: true, icon: ListPlus, label: 'Add Questions' },
  { to: '/admin/results', end: true, icon: BarChart3, label: 'Results' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell app-shell-admin">
      <header className="admin-topbar">
        <div className="sidebar-brand">
          <span>Examora</span>
        </div>

        <div className="sidebar-footer">
          <span className="sidebar-username">{user?.name}</span>
          <button className="btn btn-ghost btn-sm admin-logout" onClick={handleLogout}>
            <LogOut size={15} /> Log out
          </button>
        </div>
      </header>

      <aside className="admin-sidebar">
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="sidebar-link"
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="app-main admin-main">
        <Outlet />
      </main>
    </div>
  );
}
