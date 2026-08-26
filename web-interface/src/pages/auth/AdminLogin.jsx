import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../services/ecosystemApi';
import { isAdminApiRole, mapApiRoleToFrontend, parseLoginResponse } from '../../services/roleMap';
import LogoMark from '../../components/LogoMark';
import styles from '../../components/DevLogin.module.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginWithSession } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { email, password });
      const { token, role, name, email: sessionEmail } = parseLoginResponse(data);

      if (!isAdminApiRole(role)) {
        setError('Invalid email or password');
        return;
      }

      loginWithSession({
        token,
        role: mapApiRoleToFrontend(role),
        name,
        email: sessionEmail || email,
      });

      navigate('/admin');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Invalid email or password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <LogoMark size={44} color="#dfff00" animate className={styles.logo} />
        <h1 className={styles.title}>Admin Login</h1>
        <p className={styles.subtitle}>SDG Recycling System — UOW Malaysia</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              className={styles.select}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              className={styles.select}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p
              className={styles.devNote}
              style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
            >
              {error}
            </p>
          )}

          <button type="submit" className={styles.loginBtn} disabled={loading}>
            {loading ? 'Signing in…' : 'Admin Login'}
          </button>
        </form>

        <p className={styles.hint}>
          <Link
            to="/login"
            style={{ color: 'var(--signal)', borderBottom: '1px solid var(--signal)' }}
          >
            Are you a student? Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
