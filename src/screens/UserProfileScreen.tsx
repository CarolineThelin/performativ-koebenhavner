import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
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

export default function UserProfileScreen() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [currentUserId, setCurrentUserId] = useState('');
  const [username, setUsername] = useState('');
  const [score, setScore] = useState(0);
  const [weeklyGain, setWeeklyGain] = useState(0);
  const [topActivities, setTopActivities] = useState<TopActivity[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!userId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single();

    if (profile?.username) setUsername(profile.username);
    if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);

    const { data: allActivities } = await supabase
      .from('user_activities')
      .select('*, activity_likes(user_id), activity_comments(id)')
      .eq('user_id', userId)
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

    setPosts(
      allActivities.map((a) => ({
        id: a.id,
        user_id: a.user_id,
        username: a.username ?? profile?.username ?? '',
        activity_name: a.activity_name,
        extras: a.extras ?? [],
        points: a.points,
        created_at: a.created_at,
        image_url: a.image_url ?? null,
        bio: a.bio ?? null,
        likes: a.activity_likes?.length ?? 0,
        liked_by_me: user ? (a.activity_likes?.some((l: { user_id: string }) => l.user_id === user.id) ?? false) : false,
        comment_count: a.activity_comments?.length ?? 0,
      }))
    );
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  async function toggleLike(post: Post) {
    if (!currentUserId) return;
    if (post.liked_by_me) {
      await supabase.from('activity_likes').delete().eq('activity_id', post.id).eq('user_id', currentUserId);
    } else {
      await supabase.from('activity_likes').insert({ activity_id: post.id, user_id: currentUserId });
    }
    setPosts((prev) => prev.map((p) =>
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
    if (!body || !currentUserId) return;
    const { data: { user } } = await supabase.auth.getUser();
    const uname = user?.user_metadata?.username ?? user?.email ?? '';
    const { data: newComment } = await supabase
      .from('activity_comments')
      .insert({ activity_id: post.id, user_id: currentUserId, username: uname, body })
      .select('id, user_id, username, body, created_at')
      .single();
    if (newComment) {
      setCommentsMap((prev) => ({ ...prev, [post.id]: [...(prev[post.id] ?? []), newComment] }));
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, comment_count: p.comment_count + 1 } : p));
      setCommentInputs((prev) => ({ ...prev, [post.id]: '' }));
    }
  }

  async function deleteComment(postId: string, commentId: string) {
    await supabase.from('activity_comments').delete().eq('id', commentId);
    setCommentsMap((prev) => ({ ...prev, [postId]: prev[postId].filter((c) => c.id !== commentId) }));
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comment_count: p.comment_count - 1 } : p));
  }

  const currentLevel = getCurrentLevel(weeklyGain);
  const nextLevel = getNextLevel(weeklyGain);
  const progress = getLevelProgress(weeklyGain);
  const pointsToNext = nextLevel ? nextLevel.min - weeklyGain : 0;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>←</button>
        <h1 className={styles.headerTitle}>{username.toUpperCase()}</h1>
      </header>

      <main className={styles.content}>
        <section className={styles.userCard}>
          <div className={styles.avatar}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className={styles.avatarPhoto} />
            ) : (
              <img src={iconProfil} alt="" className={styles.avatarIcon} />
            )}
          </div>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{username}</p>
            <p className={styles.score}>Performativitetsscore: {score}</p>
            <p className={styles.weeklyGain}>De sidste 30 dage: +{weeklyGain}</p>
          </div>
        </section>

        <section className={styles.levelSection}>
          <h2 className={styles.levelTitle}>{username}s niveau</h2>
          <p className={styles.levelSubtitle}>
            {nextLevel
              ? `${username} er ${pointsToNext} point fra næste niveau`
              : `${username} er på det højeste niveau!`}
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
          <h2 className={styles.activitiesTitle}>{username}s bedste performances</h2>
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
        <h2 className={styles.feedTitle}>{username}s aktiviteter</h2>
        {posts.length === 0 ? (
          <p className={styles.emptyActivities} style={{ padding: '0 16px 24px' }}>Ingen aktiviteter endnu</p>
        ) : (
          <div className={feedStyles.feed}>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                avatarUrl={avatarUrl ?? undefined}
                comments={commentsMap[post.id] ?? []}
                commentInput={commentInputs[post.id] ?? ''}
                expandedComments={expandedComments === post.id}
                onLike={() => toggleLike(post)}
                onToggleComments={() => toggleComments(post.id)}
                onCommentChange={(val) => setCommentInputs((prev) => ({ ...prev, [post.id]: val }))}
                onCommentSubmit={() => addComment(post)}
                onCommentDelete={(commentId) => deleteComment(post.id, commentId)}
              />
            ))}
          </div>
        )}
      </section>

      <TabBar />
    </div>
  );
}
