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
  const [showConfirmation, setShowConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signUp(email, password, username);
      setShowConfirmation(true);
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
      {showConfirmation && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--color-white)', borderRadius: 20, padding: '32px 28px', width: 'calc(390px - 64px)', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 10px 24px rgba(0,0,0,0.2)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 22, color: 'var(--color-text)', textAlign: 'center', margin: 0 }}>Tjek din email</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--color-text)', textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
              Vi har sendt en bekræftelsesmail til <strong>{email}</strong>. Klik på linket i mailen for at aktivere din profil.
            </p>
            <button
              className={styles.loginButton}
              onClick={() => { setShowConfirmation(false); onCreated?.(); }}
            >
              Forstået
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
