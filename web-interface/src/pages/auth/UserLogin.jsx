import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../services/ecosystemApi';
import { isStudentApiRole, mapApiRoleToFrontend, parseLoginResponse } from '../../services/roleMap';
import LogoMark from '../../components/LogoMark';
import styles from '../../components/DevLogin.module.css';

export default function UserLogin() {
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
      const { data } = await api.post('/auth/student-login', { email, password });
      const { token, student4Token, role, name, email: sessionEmail } = parseLoginResponse(data);

      if (!isStudentApiRole(role)) {
        setError('Invalid student email or password');
        return;
      }

      loginWithSession({
        token,
        student4Token,
        role: mapApiRoleToFrontend(role),
        name,
        email: sessionEmail || email,
      });

      navigate('/dashboard');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Invalid student email or password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <LogoMark size={44} color="#dfff00" animate className={styles.logo} />
        <h1 className={styles.title}>User Login</h1>
        <p className={styles.subtitle}>SDG Recycling System — UOW Malaysia</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="student-email">Student Email</label>
            <input
              id="student-email"
              type="email"
              className={styles.select}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="student-password">Password</label>
            <input
              id="student-password"
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
            {loading ? 'Signing in…' : 'Student Login'}
          </button>
        </form>

        <p className={styles.hint}>
          No account?{' '}
          <Link
            to="/register"
            style={{ color: 'var(--signal)', borderBottom: '1px solid var(--signal)' }}
          >
            Register here
          </Link>
        </p>

        <p className={styles.hint}>
          <Link
            to="/admin-login"
            style={{ color: 'var(--signal)', borderBottom: '1px solid var(--signal)' }}
          >
            Admin? Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
