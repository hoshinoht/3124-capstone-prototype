import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/calendar', label: 'Calendar', icon: '📅' },
    { path: '/equipment', label: 'Equipment', icon: '🛠️' },
    { path: '/tasks', label: 'Tasks', icon: '✓' },
    { path: '/personnel', label: 'Personnel', icon: '👥' },
    { path: '/quick-links', label: 'Quick Links', icon: '🔗' },
    { path: '/glossary', label: 'Glossary', icon: '📚' },
  ];

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>🏢 Dashboard</h2>
        </div>

        <ul className="nav-menu">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={location.pathname === item.path ? 'active' : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.full_name?.charAt(0) || 'U'}</div>
            <div className="user-details">
              <div className="user-name">{user?.full_name}</div>
              <div className="user-role">{user?.department}</div>
            </div>
          </div>
          <button onClick={logout} className="btn btn-secondary btn-block">
            Logout
          </button>
        </div>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
