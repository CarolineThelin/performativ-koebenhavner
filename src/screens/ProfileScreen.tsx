import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { categories } from '../data/activities';
import TabBar from '../components/TabBar';
import PostCard, { type Post, type Comment } from '../components/PostCard';
import styles from './ProfileScreen.module.css';
import feedStyles from './ActivityScreen.module.css';
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
  const [ownPosts, setOwnPosts] = useState<Post[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [confirmDeletePost, setConfirmDeletePost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editActivityKey, setEditActivityKey] = useState('');
  const [editExtras, setEditExtras] = useState<string[]>([]);
  const [editBio, setEditBio] = useState('');
  const [editOpenCategory, setEditOpenCategory] = useState<string | null>(null);

  const load = useCallback(async () => {
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
      .select('*, activity_likes(user_id), activity_comments(id)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!allActivities) return;

    const totalScore = allActivities.reduce((sum, a) => sum + a.points, 0);
    setScore(totalScore);

    const monthlyScore = allActivities
      .filter((a) => new Date(a.created_at) >= oneMonthAgo)
      .reduce((sum, a) => sum + a.points, 0);
    setWeeklyGain(monthlyScore);

    const grouped: Record<string, number> = {};
    for (const a of allActivities) {
      grouped[a.activity_name] = (grouped[a.activity_name] ?? 0) + a.points;
    }
    setTopActivities(
      Object.entries(grouped)
        .map(([name, points]) => ({ name, points }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 5)
    );

    setOwnPosts(
      allActivities.map((a) => ({
        id: a.id,
        user_id: a.user_id,
        username: a.username ?? user.user_metadata?.username ?? user.email ?? '',
        activity_name: a.activity_name,
        extras: a.extras ?? [],
        points: a.points,
        created_at: a.created_at,
        image_url: a.image_url ?? null,
        bio: a.bio ?? null,
        likes: a.activity_likes?.length ?? 0,
        liked_by_me: a.activity_likes?.some((l: { user_id: string }) => l.user_id === user.id) ?? false,
        comment_count: a.activity_comments?.length ?? 0,
      }))
    );
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAvatarUpload(file: File) {
    const path = `${userId}/avatar`;
    await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from('profiles').upsert({ id: userId, avatar_url: url });
    setAvatarUrl(url);
  }

  async function toggleLike(post: Post) {
    if (!userId) return;
    if (post.liked_by_me) {
      await supabase.from('activity_likes').delete().eq('activity_id', post.id).eq('user_id', userId);
    } else {
      await supabase.from('activity_likes').insert({ activity_id: post.id, user_id: userId });
    }
    setOwnPosts((prev) => prev.map((p) =>
      p.id === post.id ? { ...p, liked_by_me: !p.liked_by_me, likes: p.likes + (p.liked_by_me ? -1 : 1) } : p
    ));
  }

  async function toggleComments(postId: string) {
    if (expandedComments === postId) { setExpandedComments(null); return; }
    setExpandedComments(postId);
    if (commentsMap[postId]) return;
    const { data } = await supabase
      .from('activity_comments')
      .select('id, user_id, username, body, created_at')
      .eq('activity_id', postId)
      .order('created_at', { ascending: true });
    setCommentsMap((prev) => ({ ...prev, [postId]: data ?? [] }));
  }

  async function addComment(post: Post) {
    const body = commentInputs[post.id]?.trim();
    if (!body || !userId) return;
    const { data: { user } } = await supabase.auth.getUser();
    const uname = user?.user_metadata?.username ?? user?.email ?? '';
    const { data: newComment } = await supabase
      .from('activity_comments')
      .insert({ activity_id: post.id, user_id: userId, username: uname, body })
      .select('id, user_id, username, body, created_at')
      .single();
    if (newComment) {
      setCommentsMap((prev) => ({ ...prev, [post.id]: [...(prev[post.id] ?? []), newComment] }));
      setOwnPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, comment_count: p.comment_count + 1 } : p));
      setCommentInputs((prev) => ({ ...prev, [post.id]: '' }));
    }
  }

  async function deleteComment(postId: string, commentId: string) {
    await supabase.from('activity_comments').delete().eq('id', commentId);
    setCommentsMap((prev) => ({ ...prev, [postId]: prev[postId].filter((c) => c.id !== commentId) }));
    setOwnPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comment_count: p.comment_count - 1 } : p));
  }

  async function handleDeletePost() {
    if (!confirmDeletePost) return;
    await supabase.from('user_activities').delete().eq('id', confirmDeletePost.id);
    setOwnPosts((prev) => prev.filter((p) => p.id !== confirmDeletePost.id));
    setConfirmDeletePost(null);
  }

  async function handlePhotoUpload(post: Post, file: File) {
    const path = `${post.user_id}/${Date.now()}_${file.name}`;
    await supabase.storage.from('activity-images').upload(path, file);
    const { data: urlData } = supabase.storage.from('activity-images').getPublicUrl(path);
    await supabase.from('user_activities').update({ image_url: urlData.publicUrl }).eq('id', post.id);
    setOwnPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, image_url: urlData.publicUrl } : p));
  }

  async function handlePhotoDelete(post: Post) {
    await supabase.from('user_activities').update({ image_url: null }).eq('id', post.id);
    setOwnPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, image_url: null } : p));
    setOpenMenuId(null);
  }

  function openEdit(post: Post) {
    setEditingPost(post);
    setEditActivityKey(post.activity_name);
    setEditExtras(post.extras ?? []);
    setEditBio(post.bio ?? '');
    setEditOpenCategory(null);
    setOpenMenuId(null);
  }

  async function saveEdit() {
    if (!editingPost) return;
    const selectedActivity = categories.flatMap((c) => c.activities).find((a) => a.name === editActivityKey);
    const extraPoints = editExtras.reduce((sum, extraName) => {
      const extra = selectedActivity?.extras?.find((e) => e.name === extraName);
      return sum + (extra?.points ?? 0);
    }, 0);
    const updates: Record<string, unknown> = { bio: editBio.trim() || null, extras: editExtras };
    if (selectedActivity) {
      updates.activity_name = selectedActivity.name;
      updates.points = selectedActivity.points + extraPoints;
    }
    await supabase.from('user_activities').update(updates).eq('id', editingPost.id);
    setOwnPosts((prev) => prev.map((p) => p.id === editingPost.id ? {
      ...p,
      activity_name: (updates.activity_name as string) ?? p.activity_name,
      points: (updates.points as number) ?? p.points,
      extras: editExtras,
      bio: updates.bio as string | null,
    } : p));
    setEditingPost(null);
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
            <p className={styles.weeklyGain}>De sidste 30 dage: +{weeklyGain}</p>
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
              {nextLevel && <span className={styles.progressLabel}>{nextLevel.name}</span>}
            </div>
          </div>
        </section>

        <section className={styles.activitiesSection}>
          <h2 className={styles.activitiesTitle}>Dine bedste performances</h2>
          {topActivities.length === 0 ? (
            <p className={styles.emptyActivities}>Ingen aktiviteter endnu</p>
          ) : (
            <ol className={styles.activityList}>
              {topActivities.map((activity, i) => (
                <li key={i} className={styles.activityItem}>
                  <span className={styles.activityName}>{activity.name}</span>
                  <span className={styles.activityPoints}>+{activity.points}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>

      <section className={styles.feedSection}>
        <h2 className={styles.feedTitle}>Mine aktiviteter</h2>
        {ownPosts.length === 0 ? (
          <p className={styles.emptyActivities} style={{ padding: '0 16px 24px' }}>Ingen aktiviteter endnu</p>
        ) : (
          <div className={feedStyles.feed}>
            {ownPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={userId}
                avatarUrl={avatarUrl ?? undefined}
                comments={commentsMap[post.id] ?? []}
                commentInput={commentInputs[post.id] ?? ''}
                expandedComments={expandedComments === post.id}
                onLike={() => toggleLike(post)}
                onToggleComments={() => toggleComments(post.id)}
                onCommentChange={(val) => setCommentInputs((prev) => ({ ...prev, [post.id]: val }))}
                onCommentSubmit={() => addComment(post)}
                onCommentDelete={(commentId) => deleteComment(post.id, commentId)}
                onEdit={() => openEdit(post)}
                onDelete={() => { setConfirmDeletePost(post); setOpenMenuId(null); }}
                onPhotoUpload={(file) => handlePhotoUpload(post, file)}
                onPhotoDelete={() => handlePhotoDelete(post)}
                menuOpen={openMenuId === post.id}
                onMenuToggle={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
              />
            ))}
          </div>
        )}
      </section>

      <TabBar />

      {confirmDeletePost && (
        <div className={feedStyles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setConfirmDeletePost(null); }}>
          <div className={feedStyles.modalCard}>
            <p className={feedStyles.modalTitle}>Oh no!</p>
            <p className={feedStyles.confirmText}>Nu mister du performativitetspoint. Er du sikker på at du vil slette denne aktivitet?</p>
            <button className={`${feedStyles.modalSave} ${feedStyles.modalDanger}`} onClick={handleDeletePost}>
              Ja, slet aktivitet
            </button>
            <button className={feedStyles.modalCancel} onClick={() => setConfirmDeletePost(null)}>
              Annuller
            </button>
          </div>
        </div>
      )}

      {editingPost && (
        <div className={feedStyles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setEditingPost(null); }}>
          <div className={feedStyles.modalCard}>
            <p className={feedStyles.modalTitle}>Rediger aktivitet</p>
            <textarea
              className={feedStyles.modalTextarea}
              placeholder="Tilføj en beskrivelse..."
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              rows={3}
              autoFocus
            />
            <div className={feedStyles.editActivityList}>
              {categories.map((cat) => (
                <div key={cat.name}>
                  <button
                    className={feedStyles.editCategoryRow}
                    onClick={() => setEditOpenCategory(editOpenCategory === cat.name ? null : cat.name)}
                  >
                    <span className={feedStyles.editCategoryName}>{cat.name}</span>
                    <span className={editOpenCategory === cat.name ? feedStyles.editIconOpen : feedStyles.editIcon}>+</span>
                  </button>
                  <div className={feedStyles.editDivider} />
                  {editOpenCategory === cat.name && (
                    <ul className={feedStyles.editActivities}>
                      {cat.activities.map((act) => {
                        const selected = editActivityKey === act.name;
                        return (
                          <li key={act.name}>
                            <button
                              className={feedStyles.editActivityRow}
                              onClick={() => { setEditActivityKey(act.name); setEditExtras([]); }}
                            >
                              <span className={`${feedStyles.editCheckbox} ${selected ? feedStyles.editChecked : ''}`}>
                                {selected && <span className={feedStyles.editCheckmark}>✓</span>}
                              </span>
                              <span className={feedStyles.editActivityName}>{act.name}</span>
                              <span className={feedStyles.editPoints}>{act.points > 0 ? `+${act.points}` : `${act.points}`}</span>
                            </button>
                            {selected && act.extras && act.extras.length > 0 && (
                              <>
                                {editExtras.length === 0 && (
                                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#c0392b', padding: '4px 0 4px 32px', margin: 0 }}>
                                    Vælg mindst én underkategori
                                  </p>
                                )}
                                <ul className={feedStyles.editExtras}>
                                  {act.extras.map((extra) => {
                                    const checked = editExtras.includes(extra.name);
                                    return (
                                      <li key={extra.name}>
                                        <button
                                          className={feedStyles.editActivityRow}
                                          onClick={() => setEditExtras((prev) =>
                                            checked ? prev.filter((e) => e !== extra.name) : [...prev, extra.name]
                                          )}
                                        >
                                          <span className={`${feedStyles.editCheckbox} ${checked ? feedStyles.editChecked : ''}`}>
                                            {checked && <span className={feedStyles.editCheckmark}>✓</span>}
                                          </span>
                                          <span className={feedStyles.editExtraName}>{extra.name}</span>
                                          {extra.points !== 0 && (
                                            <span className={feedStyles.editPoints}>{extra.points > 0 ? `+${extra.points}` : `${extra.points}`}</span>
                                          )}
                                        </button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <button
              className={feedStyles.modalSave}
              onClick={saveEdit}
              disabled={(() => {
                const act = categories.flatMap((c) => c.activities).find((a) => a.name === editActivityKey);
                return !!(act?.extras?.length && editExtras.length === 0);
              })()}
            >
              Gem
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
