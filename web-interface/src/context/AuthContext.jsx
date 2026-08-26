import { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const ROLES = {
  END_USER: 'end_user',
  MODERATOR: 'moderator',
  CONTENT_MANAGER: 'content_manager',
  REWARDS_MANAGER: 'rewards_manager',
  DATA_ANALYST: 'data_analyst',
  SYSTEM_ADMIN: 'system_admin',
};

export const ROLE_LABELS = {
  end_user: 'End User',
  moderator: 'Moderator',
  content_manager: 'Content Manager',
  rewards_manager: 'Rewards Manager',
  data_analyst: 'Data Analyst',
  system_admin: 'System Admin',
};

export const ROLE_ROUTES = {
  end_user: [
    '/dashboard',
    '/leaderboard',
    '/rewards',
    '/badges',
    '/content',
    '/quizzes',
    '/missions',
    '/qr-claim',
    '/point-rates',
    '/settings',
  ],
  moderator: ['/admin', '/admin/deposits', '/admin/qr', '/admin/settings'],
  content_manager: [
    '/admin',
    '/admin/content',
    '/admin/badges',
    '/admin/mission-reviews',
    '/admin/settings',
  ],
  rewards_manager: [
    '/admin',
    '/admin/rewards',
    '/admin/redemptions',
    '/admin/settings',
  ],
  data_analyst: ['/admin', '/admin/analytics', '/admin/settings'],
  system_admin: [
    '/admin',
    '/admin/deposits',
    '/admin/qr',
    '/admin/content',
    '/admin/badges',
    '/admin/mission-reviews',
    '/admin/rewards',
    '/admin/redemptions',
    '/admin/analytics',
    '/admin/audit-logs',
    '/admin/settings',
  ],
};

const DEFAULT_USERNAMES = {
  end_user: 'Aaron Tan Wen Zhuan',
  moderator: 'Sarah Lim',
  content_manager: 'James Wong',
  rewards_manager: 'Emily Chen',
  data_analyst: 'David Ng',
  system_admin: 'Admin Kumar',
};

function readStoredSession() {
  const token = localStorage.getItem('sdg_token');
  const role = localStorage.getItem('sdg_role');
  const name = localStorage.getItem('sdg_name');
  const email = localStorage.getItem('sdg_email');

  if (token && role && name) {
    return { role, username: name, email: email || '' };
  }

  return { role: null, username: '', email: '' };
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(readStoredSession);

  const login = (role) => {
    setUser({
      role,
      username: DEFAULT_USERNAMES[role] || 'User',
      email: '',
    });
  };

  const loginWithSession = ({ token, role, name, email = '', student4Token = null }) => {
    localStorage.setItem('sdg_token', token);
    localStorage.setItem('sdg_role', role);
    localStorage.setItem('sdg_name', name);
    if (email) {
      localStorage.setItem('sdg_email', email);
    } else {
      localStorage.removeItem('sdg_email');
    }
    if (student4Token) {
      localStorage.setItem('sdg_student4_token', student4Token);
    } else {
      localStorage.removeItem('sdg_student4_token');
    }
    setUser({ role, username: name, email: email || '' });
  };

  const logout = () => {
    const role = localStorage.getItem('sdg_role');

    localStorage.removeItem('sdg_token');
    localStorage.removeItem('sdg_student4_token');
    localStorage.removeItem('sdg_role');
    localStorage.removeItem('sdg_name');
    localStorage.removeItem('sdg_email');
    setUser({ role: null, username: '', email: '' });

    const adminRoles = new Set([
      ROLES.MODERATOR,
      ROLES.CONTENT_MANAGER,
      ROLES.REWARDS_MANAGER,
      ROLES.DATA_ANALYST,
      ROLES.SYSTEM_ADMIN,
    ]);

    if (role === ROLES.END_USER || !role) {
      navigate('/login');
    } else if (adminRoles.has(role)) {
      navigate('/admin-login');
    } else {
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function isRouteAllowed(role, path) {
  if (!role) return false;
  const allowed = ROLE_ROUTES[role] || [];
  return allowed.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );
}

export function isAdminRole(role) {
  return role && role !== ROLES.END_USER;
}

export function getDashboardPath(role) {
  return role === ROLES.END_USER ? '/dashboard' : '/admin';
}
