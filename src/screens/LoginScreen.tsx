import { useState } from 'react';
import styles from './LoginScreen.module.css';
import heroImage from '../../assets/images/noerrebropar.png';
import { signIn } from '../services/auth';

interface LoginScreenProps {
  onLogin?: () => void;
  onForgotPassword?: () => void;
  onCreateProfile?: () => void;
}

export default function LoginScreen({
  onLogin,
  onForgotPassword,
  onCreateProfile,
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      onLogin?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noget gik galt');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.wrapper}>
        <img src={heroImage} alt="" className={styles.heroImage} />
        <div className={styles.card}>
          <form onSubmit={handleLogin}>
            <h1 className={styles.title}>Login på din profil</h1>

            <input
              className={styles.input}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <input
              className={styles.input}
              type="password"
              placeholder="Kodeord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.buttonRow}>
              <button
                type="button"
                className={styles.buttonOutlined}
                onClick={onForgotPassword}
              >
                Glemt kodeord
              </button>
              <button
                type="button"
                className={styles.buttonFilled}
                onClick={onCreateProfile}
              >
                Opret ny profil
              </button>
            </div>

            <button type="submit" className={styles.loginButton} disabled={loading}>
              {loading ? 'Logger ind...' : 'Log ind'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
