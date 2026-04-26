import { useState } from 'react';
import styles from './LoginScreen.module.css';
import heroImage from '../../assets/images/noerrebropar.png';
import { updatePassword } from '../services/auth';

interface ResetPasswordScreenProps {
  onDone?: () => void;
}

export default function ResetPasswordScreen({ onDone }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Kodeordene matcher ikke');
      return;
    }
    if (password.length < 6) {
      setError('Kodeordet skal være mindst 6 tegn');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
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
          {done ? (
            <>
              <h1 className={styles.title}>Kodeord opdateret</h1>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--color-text)', marginBottom: 28 }}>
                Dit kodeord er nu ændret. Du kan logge ind med dit nye kodeord.
              </p>
              <button type="button" className={styles.loginButton} onClick={onDone}>
                Gå til login
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <h1 className={styles.title}>Nyt kodeord</h1>

              <input
                className={styles.input}
                type="password"
                placeholder="Nyt kodeord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />

              <input
                className={styles.input}
                type="password"
                placeholder="Gentag kodeord"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />

              {error && <p className={styles.error}>{error}</p>}

              <button type="submit" className={styles.loginButton} disabled={loading}>
                {loading ? 'Gemmer...' : 'Gem nyt kodeord'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
