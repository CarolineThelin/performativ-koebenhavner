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
  const [showQualify, setShowQualify] = useState(false);
  const [qualifyText, setQualifyText] = useState('');
  const [qualifySaving, setQualifySaving] = useState(false);
  const [qualifyMessage, setQualifyMessage] = useState('');

  function toggleCategory(name: string) {
    if (openCategory === name) {
      setOpenCategory(null);
      setSelections([]);
      setOpenActivity(null);
    } else {
      setOpenCategory(name);
      setSelections([]);
      setOpenActivity(null);
    }
  }

  function toggleActivity(categoryName: string, activity: Activity) {
    const key = `${categoryName}__${activity.name}`;
    const already = selections.find(
      (s) => s.categoryName === categoryName && s.activity.name === activity.name
    );

    if (already) {
      setSelections([]);
      setOpenActivity(null);
    } else {
      setSelections([{ categoryName, activity, selectedExtras: [] }]);
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

  async function handleSubmit() {
    if (selections.length === 0) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Ikke logget ind');

      const username = user.user_metadata?.username ?? user.email ?? '';

      const rows = selections.map((s) => {
        const extraPoints = s.selectedExtras.reduce((ep, extraName) => {
          const extra = s.activity.extras?.find((e) => e.name === extraName);
          return ep + (extra?.points ?? 0);
        }, 0);
        return {
          user_id: user.id,
          username,
          activity_name: s.activity.name,
          extras: s.selectedExtras,
          points: s.activity.points + extraPoints,
        };
      });

      const { error } = await supabase.from('user_activities').insert(rows);
      if (error) throw error;

      setSelections([]);
      setOpenCategory(null);
      setTimeout(() => navigate('/aktivitet'), 800);
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
      await supabase.from('activity_suggestions').insert({
        user_id: user?.id ?? null,
        username: user?.user_metadata?.username ?? user?.email ?? null,
        suggestion: qualifyText.trim(),
      });
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
              onClick={handleSubmit}
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
    </div>
  );
}
