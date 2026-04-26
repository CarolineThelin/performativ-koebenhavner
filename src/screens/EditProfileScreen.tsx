import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import TabBar from '../components/TabBar';
import styles from './EditProfileScreen.module.css';

export default function EditProfileScreen() {
  const navigate = useNavigate();

  const [newUsername, setNewUsername] = useState('');
  const [usernameMessage, setUsernameMessage] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleUsernameChange() {
    if (!newUsername.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.auth.updateUser({
      data: { username: newUsername.trim() },
    });
    if (!error) {
      await supabase.from('profiles').upsert({ id: user.id, username: newUsername.trim() });
      await supabase.from('user_activities').update({ username: newUsername.trim() }).eq('user_id', user.id);
      await supabase.from('activity_comments').update({ username: newUsername.trim() }).eq('user_id', user.id);
      setUsernameMessage('Brugernavn opdateret!');
      setNewUsername('');
    } else {
      setUsernameMessage('Noget gik galt. Prøv igen.');
    }
    setSaving(false);
    setTimeout(() => setUsernameMessage(''), 3000);
  }

  async function handlePasswordChange() {
    if (!newPassword.trim()) return;
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Koderne matcher ikke.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage('Koden skal være mindst 6 tegn.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      setPasswordMessage('Kode opdateret!');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordMessage('Noget gik galt. Prøv igen.');
    }
    setSaving(false);
    setTimeout(() => setPasswordMessage(''), 3000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  async function handleDeleteProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_activities').delete().eq('user_id', user.id);
    await supabase.from('friendships').delete().eq('user_id', user.id);
    await supabase.from('friend_requests').delete().eq('from_user_id', user.id);
    await supabase.from('profiles').delete().eq('id', user.id);
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>REDIGER PROFIL</h1>
      </header>

      <main className={styles.content}>
        <button className={styles.backButton} onClick={() => navigate('/profil')}>← Tilbage</button>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Skift brugernavn</h2>
          <input
            className={styles.input}
            type="text"
            placeholder="Nyt brugernavn"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUsernameChange()}
          />
          <button className={styles.saveButton} onClick={handleUsernameChange} disabled={saving || !newUsername.trim()}>
            Gem brugernavn
          </button>
          {usernameMessage && <p className={styles.message}>{usernameMessage}</p>}
        </section>

        <div className={styles.divider} />

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Skift kode</h2>
          <input
            className={styles.input}
            type="password"
            placeholder="Ny kode"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <input
            className={styles.input}
            type="password"
            placeholder="Bekræft ny kode"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePasswordChange()}
          />
          <button className={styles.saveButton} onClick={handlePasswordChange} disabled={saving || !newPassword.trim()}>
            Gem kode
          </button>
          {passwordMessage && <p className={styles.message}>{passwordMessage}</p>}
        </section>

        <div className={styles.divider} />

        <section className={styles.section}>
          <button className={styles.logoutButton} onClick={handleLogout}>
            Log ud
          </button>
          <button className={styles.deleteButton} onClick={() => setShowDeleteConfirm(true)}>
            Slet profil
          </button>
        </section>

      </main>

      <TabBar />

      {showDeleteConfirm && (
        <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}>
          <div className={styles.confirmCard}>
            <p className={styles.confirmTitle}>Er du sikker?</p>
            <p className={styles.confirmText}>Alle dine aktiviteter og data bliver slettet permanent. Dette kan ikke fortrydes.</p>
            <button className={styles.confirmDelete} onClick={handleDeleteProfile}>
              Ja, slet min profil
            </button>
            <button className={styles.confirmCancel} onClick={() => setShowDeleteConfirm(false)}>
              Annuller
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
