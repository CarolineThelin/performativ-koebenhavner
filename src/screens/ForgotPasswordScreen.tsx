import { useState } from 'react';
import styles from './LoginScreen.module.css';
import heroImage from '../../assets/images/noerrebropar.png';
import { resetPassword } from '../services/auth';

interface ForgotPasswordScreenProps {
  onBack?: () => void;
}

export default function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
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
          {sent ? (
            <>
              <h1 className={styles.title}>Tjek din email</h1>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--color-text)', marginBottom: 28 }}>
                Vi har sendt et link til <strong>{email}</strong>. Følg linket for at nulstille dit kodeord.
              </p>
              <button type="button" className={styles.loginButton} onClick={onBack}>
                Tilbage til login
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <h1 className={styles.title}>Glemt kodeord</h1>

              <input
                className={styles.input}
                type="email"
                placeholder="Din email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              {error && <p className={styles.error}>{error}</p>}

              <button type="submit" className={styles.loginButton} disabled={loading} style={{ marginBottom: 16 }}>
                {loading ? 'Sender...' : 'Send nulstillingslink'}
              </button>

              <button type="button" className={styles.buttonOutlined} style={{ width: '100%' }} onClick={onBack}>
                Tilbage
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
