import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categories, type Activity } from '../data/activities';
import { supabase } from '../lib/supabase';
import TabBar from '../components/TabBar';
import styles from './AddActivityScreen.module.css';

interface Selection {
  categoryName: string;
  activity: Activity;
  selectedExtras: string[];
}

export default function AddActivityScreen() {
  const navigate = useNavigate();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openActivity, setOpenActivity] = useState<string | null>(null);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [saving, setSaving] = useState(false);
  const [showBioModal, setShowBioModal] = useState(false);
  const [bio, setBio] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showQualify, setShowQualify] = useState(false);
  const [qualifyText, setQualifyText] = useState('');
  const [qualifySaving, setQualifySaving] = useState(false);
  const [qualifyMessage, setQualifyMessage] = useState('');

  function toggleCategory(name: string) {
    if (openCategory === name) {
      setOpenCategory(null);
      setSelections((prev) => prev.filter((s) => s.categoryName !== name));
      setOpenActivity(null);
    } else {
      setOpenCategory(name);
      setOpenActivity(null);
    }
  }

  function toggleActivity(categoryName: string, activity: Activity) {
    const key = `${categoryName}__${activity.name}`;
    const already = selections.find(
      (s) => s.categoryName === categoryName && s.activity.name === activity.name
    );

    if (already) {
      setSelections((prev) => prev.filter(
        (s) => !(s.categoryName === categoryName && s.activity.name === activity.name)
      ));
      if (openActivity === key) setOpenActivity(null);
    } else {
      if (selections.length >= 3) return;
      setSelections((prev) => [...prev, { categoryName, activity, selectedExtras: [] }]);
      setOpenActivity(activity.extras?.length ? key : null);
    }
  }

  function toggleExtra(categoryName: string, activityName: string, extraName: string) {
    setSelections(selections.map((s) => {
      if (s.categoryName !== categoryName || s.activity.name !== activityName) return s;
      const has = s.selectedExtras.includes(extraName);
      return {
        ...s,
        selectedExtras: has
          ? s.selectedExtras.filter((e) => e !== extraName)
          : [...s.selectedExtras, extraName],
      };
    }));
  }

  function isSelected(categoryName: string, activityName: string) {
    return selections.some(
      (s) => s.categoryName === categoryName && s.activity.name === activityName
    );
  }

  function isExtraSelected(categoryName: string, activityName: string, extraName: string) {
    return selections.find(
      (s) => s.categoryName === categoryName && s.activity.name === activityName
    )?.selectedExtras.includes(extraName) ?? false;
  }

  function calcTotalPoints() {
    return selections.reduce((sum, s) => {
      const extraPoints = s.selectedExtras.reduce((ep, extraName) => {
        const extra = s.activity.extras?.find((e) => e.name === extraName);
        return ep + (extra?.points ?? 0);
      }, 0);
      return sum + s.activity.points + extraPoints;
    }, 0);
  }

  async function handleSubmit(submitBio?: string, submitPhoto?: File | null) {
    if (selections.length === 0) return;
    setSaving(true);
    const useBio = submitBio !== undefined ? submitBio : bio;
    const usePhoto = submitPhoto !== undefined ? submitPhoto : photoFile;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Ikke logget ind');

      const username = user.user_metadata?.username ?? user.email ?? '';

      const names = selections.map((s) => s.activity.name);
      const activityName = names.length <= 1
        ? names[0] ?? ''
        : names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
      const allExtras = selections.flatMap((s) => s.selectedExtras);
      const totalPoints = selections.reduce((sum, s) => {
        const extraPoints = s.selectedExtras.reduce((ep, extraName) => {
          const extra = s.activity.extras?.find((e) => e.name === extraName);
          return ep + (extra?.points ?? 0);
        }, 0);
        return sum + s.activity.points + extraPoints;
      }, 0);

      const { data: inserted, error } = await supabase.from('user_activities').insert({
        user_id: user.id,
        username,
        activity_name: activityName,
        extras: allExtras,
        points: totalPoints,
        bio: useBio.trim() || null,
      }).select('id').single();
      if (error) throw error;

      if (usePhoto && inserted?.id) {
        const path = `${user.id}/${Date.now()}_${usePhoto.name}`;
        await supabase.storage.from('activity-images').upload(path, usePhoto);
        const { data: urlData } = supabase.storage.from('activity-images').getPublicUrl(path);
        await supabase.from('user_activities').update({ image_url: urlData.publicUrl }).eq('id', inserted.id);
      }

      setSelections([]);
      setOpenCategory(null);
      setShowBioModal(false);
      setBio('');
      setPhotoFile(null);
      setPhotoPreview(null);
      setTimeout(() => navigate('/aktivitet'), 400);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleQualify() {
    if (!qualifyText.trim()) return;
    setQualifySaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('activity_suggestions').insert({
        user_id: user?.id ?? null,
        username: user?.user_metadata?.username ?? user?.email ?? null,
        suggestion: qualifyText.trim(),
      });
      if (error) throw error;
      setQualifyText('');
      setQualifyMessage('Tak! Din aktivitet er sendt til vurdering.');
      setTimeout(() => { setQualifyMessage(''); setShowQualify(false); }, 2500);
    } catch {
      setQualifyMessage('Noget gik galt. Prøv igen.');
    } finally {
      setQualifySaving(false);
    }
  }

  const totalPoints = calcTotalPoints();

  const canSubmit = selections.length > 0 && selections.every((s) =>
    !s.activity.extras?.length || s.selectedExtras.length > 0
  );

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>TILFØJ</h1>
      </header>

      <main className={styles.content}>
        <p className={styles.subtitle}>
          Her kan du registrere dine aktiviteter og optjene point.
        </p>

        <div className={styles.divider} />

        <ul className={styles.categoryList}>
          {categories.map((cat) => (
            <li key={cat.name}>
              <button
                className={styles.categoryRow}
                onClick={() => toggleCategory(cat.name)}
              >
                <span className={styles.categoryName}>{cat.name}</span>
                <span className={`${styles.categoryIcon} ${openCategory === cat.name ? styles.open : ''}`}>+</span>
              </button>
              <div className={styles.divider} />

              {openCategory === cat.name && (
                <ul className={styles.activityList}>
                  {cat.activities.map((act) => {
                    const selected = isSelected(cat.name, act.name);
                    const key = `${cat.name}__${act.name}`;
                    const extrasOpen = openActivity === key && selected;

                    return (
                      <li key={act.name}>
                        <button
                          className={styles.activityRow}
                          onClick={() => toggleActivity(cat.name, act)}
                        >
                          <span className={`${styles.checkbox} ${selected ? styles.checked : ''}`}>
                            {selected && <span className={styles.checkmark}>✓</span>}
                          </span>
                          <span className={styles.activityName}>{act.name}</span>
                          <span className={styles.points}>
                            {act.points > 0 ? `+${act.points}` : `${act.points}`}
                          </span>
                        </button>

                        {selected && (act.extras?.length ?? 0) > 0 && selections.find((s) => s.activity.name === act.name)?.selectedExtras.length === 0 && (
                          <p className={styles.extrasRequired}>Vælg mindst én underkategori</p>
                        )}

                        {extrasOpen && act.extras && (
                          <ul className={styles.extraList}>
                            {act.extras.map((extra) => {
                              const extraChecked = isExtraSelected(cat.name, act.name, extra.name);
                              return (
                                <li key={extra.name}>
                                  <button
                                    className={styles.extraRow}
                                    onClick={() => toggleExtra(cat.name, act.name, extra.name)}
                                  >
                                    <span className={`${styles.checkbox} ${extraChecked ? styles.checked : ''}`}>
                                      {extraChecked && <span className={styles.checkmark}>✓</span>}
                                    </span>
                                    <span className={styles.extraName}>{extra.name}</span>
                                    {extra.points !== 0 && <span className={styles.points}>{extra.points > 0 ? `+${extra.points}` : `${extra.points}`}</span>}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}

                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          ))}
        </ul>

        {selections.length > 0 && (
          <div className={styles.submitArea}>

            <button
              className={styles.submitButton}
              onClick={() => setShowBioModal(true)}
              disabled={saving || !canSubmit}
            >
              {saving ? 'Gemmer...' : `Tilføj ${totalPoints > 0 ? `+${totalPoints}` : totalPoints} point`}
            </button>
          </div>
        )}

        <div className={styles.qualifySection}>
          <button className={styles.qualifyTrigger} onClick={() => setShowQualify(true)}>
            Kvalificer en performativ aktivitet
          </button>
        </div>

        {showQualify && (
          <div
            className={styles.modalOverlay}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowQualify(false); setQualifyText(''); setQualifyMessage(''); } }}
          >
            <div className={styles.modalCard}>
              <p className={styles.modalTitle}>Kvalificer en performativ aktivitet</p>
              <textarea
                className={styles.qualifyTextarea}
                placeholder="Beskriv en aktivitet du mener er performativt københavnsk..."
                value={qualifyText}
                onChange={(e) => setQualifyText(e.target.value)}
                rows={5}
                autoFocus
              />
              <button
                className={styles.qualifyButton}
                onClick={handleQualify}
                disabled={qualifySaving || !qualifyText.trim()}
              >
                {qualifySaving ? 'Sender...' : 'Send forslag'}
              </button>
              {qualifyMessage && <p className={styles.qualifyMessage}>{qualifyMessage}</p>}
            </div>
          </div>
        )}
      </main>

      <TabBar />

      {showBioModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowBioModal(false); }}
        >
          <div style={{ background: 'var(--color-white)', borderRadius: 20, padding: '24px 20px', width: 'calc(390px - 40px)', maxWidth: 350, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 20, color: 'var(--color-text)', textAlign: 'center' }}>Tilføj til dit opslag</p>

            <textarea
              style={{ fontFamily: 'var(--font-body)', fontSize: 15, background: 'var(--color-primary-light)', border: 'none', borderRadius: 16, padding: '12px 16px', outline: 'none', resize: 'none', color: 'var(--color-text)', width: '100%', boxSizing: 'border-box' }}
              placeholder="Tilføj en beskrivelse..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
            />

            {photoPreview ? (
              <div style={{ position: 'relative' }}>
                <img src={photoPreview} alt="" style={{ width: '100%', borderRadius: 12, maxHeight: 200, objectFit: 'cover' }} />
                <button
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 13 }}
                >✕</button>
              </div>
            ) : (
              <label style={{ display: 'inline-block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--color-primary)', border: '1.5px dashed var(--color-primary)', borderRadius: 20, padding: '8px 16px', cursor: 'pointer', textAlign: 'center' }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)); }
                }} />
                + Tilføj foto
              </label>
            )}

            <button
              onClick={() => handleSubmit()}
              disabled={saving}
              style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 18, color: 'var(--color-white)', background: 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-button)', padding: 16, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Gemmer...' : 'Del opslag'}
            </button>
            <button
              onClick={() => handleSubmit('', null)}
              disabled={saving}
              style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Spring over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
