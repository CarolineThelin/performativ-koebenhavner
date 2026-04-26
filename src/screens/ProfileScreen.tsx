import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import TabBar from '../components/TabBar';
import styles from './ProfileScreen.module.css';
import coupleImage from '../../assets/images/noerrebropar.png';
import iconProfil from '../../assets/icons/profil.svg';

interface TopActivity {
  name: string;
  points: number;
}

const LEVELS = [
  { name: 'Turisten',                     min: 0,   max: 99       },
  { name: 'Stamgæsten',                   min: 100, max: 199      },
  { name: 'Tilflytteren',                min: 200, max: 299      },
  { name: 'Københavneren',               min: 300, max: 399      },
  { name: 'Den performative Københavner', min: 400, max: Infinity },
];

function getCurrentLevel(score: number) {
  return LEVELS.find((l) => score >= l.min && score <= l.max) ?? LEVELS[0];
}

function getNextLevel(score: number) {
  const idx = LEVELS.findIndex((l) => score >= l.min && score <= l.max);
  return LEVELS[idx + 1] ?? null;
}

function getLevelProgress(score: number) {
  const current = getCurrentLevel(score);
  if (current.max === Infinity) return 100;
  const range = current.max - current.min + 1;
  return Math.min(((score - current.min) / range) * 100, 100);
}

export default function ProfileScreen() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [score, setScore] = useState(0);
  const [weeklyGain, setWeeklyGain] = useState(0);
  const [topActivities, setTopActivities] = useState<TopActivity[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUsername(user.user_metadata?.username ?? user.email ?? '');
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);

      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const { data: allActivities } = await supabase
        .from('user_activities')
        .select('activity_name, points, created_at')
        .eq('user_id', user.id);

      if (!allActivities) return;

      const totalScore = allActivities.reduce((sum, a) => sum + a.points, 0);
      setScore(totalScore);

      const monthlyActivities = allActivities.filter(
        (a) => new Date(a.created_at) >= oneMonthAgo
      );
      const monthlyScore = monthlyActivities.reduce((sum, a) => sum + a.points, 0);
      setWeeklyGain(monthlyScore);

      const grouped: Record<string, number> = {};
      for (const a of allActivities) {
        grouped[a.activity_name] = (grouped[a.activity_name] ?? 0) + a.points;
      }
      const sorted = Object.entries(grouped)
        .map(([name, points]) => ({ name, points }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);
      setTopActivities(sorted);
    }

    load();
  }, []);

  async function handleAvatarUpload(file: File) {
    const path = `${userId}/avatar`;
    await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from('profiles').upsert({ id: userId, avatar_url: url });
    setAvatarUrl(url);
  }

  const currentLevel = getCurrentLevel(weeklyGain);
  const nextLevel = getNextLevel(weeklyGain);
  const progress = getLevelProgress(weeklyGain);
  const pointsToNext = nextLevel ? nextLevel.min - weeklyGain : 0;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>MIN PROFIL</h1>
      </header>

      <main className={styles.content}>
        <section className={styles.userCard}>
          <label className={styles.avatar}>
            <input
              type="file"
              accept="image/*"
              className={styles.avatarInput}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
              }}
            />
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className={styles.avatarPhoto} />
            ) : (
              <img src={iconProfil} alt="" className={styles.avatarIcon} />
            )}
            <span className={styles.avatarOverlay}>+</span>
          </label>
          <div className={styles.userInfo}>
            <div className={styles.usernameRow}>
              <p className={styles.userName}>{username}</p>
              <button className={styles.settingsButton} onClick={() => navigate('/rediger-profil')}>⚙</button>
            </div>
            <p className={styles.score}>Performativitetsscore: {score}</p>
            <p className={styles.weeklyGain}>Denne måned: +{weeklyGain}</p>
          </div>
        </section>

        <section className={styles.levelSection}>
          <h2 className={styles.levelTitle}>Dit niveau</h2>
          <p className={styles.levelSubtitle}>
            {nextLevel
              ? `Du er ${pointsToNext} point fra næste niveau`
              : 'Du er på det højeste niveau!'}
          </p>

          <div className={styles.progressContainer}>
            <img
              src={coupleImage}
              alt=""
              className={styles.progressImage}
              style={{ left: `calc(${progress}% - 20px)` }}
            />
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <div className={styles.progressLabels}>
              <span className={styles.progressLabel}>{currentLevel.name}</span>
              {nextLevel && (
                <span className={styles.progressLabel}>{nextLevel.name}</span>
              )}
            </div>
          </div>
        </section>

        <section className={styles.activitiesSection}>
          <h2 className={styles.activitiesTitle}>Dine bedste performances:</h2>
          {topActivities.length === 0 ? (
            <p className={styles.emptyActivities}>Ingen aktiviteter endnu</p>
          ) : (
            <ol className={styles.activityList}>
              {topActivities.map((activity, i) => (
                <li key={i} className={styles.activityItem}>
                  <span className={styles.activityName}>{activity.name}</span>
                  <span className={styles.activityPoints}>+ {activity.points}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

      </main>

      <TabBar />
    </div>
  );
}
