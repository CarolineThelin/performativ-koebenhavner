import { useState } from 'react';
import styles from './LoginScreen.module.css';
import heroImage from '../../assets/images/noerrebropar.png';
import { signUp } from '../services/auth';

interface CreateProfileScreenProps {
  onCreated?: () => void;
  onGoToLogin?: () => void;
}

export default function CreateProfileScreen({
  onCreated,
  onGoToLogin,
}: CreateProfileScreenProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signUp(email, password, username);
      onCreated?.();
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
          <form onSubmit={handleSubmit}>
            <h1 className={styles.title}>Opret profil</h1>

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
              type="text"
              placeholder="Brugernavn"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />

            <input
              className={styles.input}
              type="password"
              placeholder="Kodeord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.buttonRow}>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                className={styles.buttonOutlined}
                onClick={onGoToLogin}
                style={{ flex: 'none', padding: '13px 24px' }}
              >
                Gå til login
              </button>
            </div>

            <button type="submit" className={styles.loginButton} disabled={loading}>
              {loading ? 'Opretter...' : 'Opret profil'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
