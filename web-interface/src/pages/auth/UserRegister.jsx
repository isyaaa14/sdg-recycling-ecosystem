import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../services/ecosystemApi';
import { isStudentApiRole, mapApiRoleToFrontend, parseLoginResponse } from '../../services/roleMap';
import LogoMark from '../../components/LogoMark';
import styles from '../../components/DevLogin.module.css';

export default function UserRegister() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginWithSession } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter them.');
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      const { token, student4Token, role, name: sessionName, email: sessionEmail } =
        parseLoginResponse(data);

      if (!isStudentApiRole(role)) {
        setError('Registration succeeded, but this account is not a student account.');
        return;
      }

      loginWithSession({
        token,
        student4Token,
        role: mapApiRoleToFrontend(role),
        name: sessionName,
        email: sessionEmail || email,
      });

      navigate('/dashboard');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to register. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <LogoMark size={44} color="#dfff00" animate className={styles.logo} />
        <h1 className={styles.title}>Student Register</h1>
        <p className={styles.subtitle}>Create your SDG Recycling account</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="register-name">Full Name</label>
            <input
              id="register-name"
              type="text"
              className={styles.select}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="register-email">Student Email</label>
            <input
              id="register-email"
              type="email"
              className={styles.select}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              className={styles.select}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="register-confirm-password">Confirm Password</label>
            <input
              id="register-confirm-password"
              type="password"
              className={styles.select}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
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
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className={styles.hint}>
          Already registered?{' '}
          <Link
            to="/login"
            style={{ color: 'var(--signal)', borderBottom: '1px solid var(--signal)' }}
          >
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
