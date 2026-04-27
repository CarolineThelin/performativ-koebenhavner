import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { categories } from '../data/activities';
import TabBar from '../components/TabBar';
import styles from './ActivityScreen.module.css';
import avatarIcon from '../../assets/icons/profil.svg';
import likeIcon from '../../assets/icons/like.svg';
import commentIcon from '../../assets/icons/kommentar.svg';
import coupleThumb from '../../assets/images/noerrebropar.png';

interface Post {
  id: string;
  user_id: string;
  username: string;
  activity_name: string;
  extras: string[];
  points: number;
  created_at: string;
  image_url: string | null;
  bio: string | null;
  likes: number;
  liked_by_me: boolean;
  comment_count: number;
}

interface Comment {
  id: string;
  user_id: string;
  username: string;
  body: string;
  created_at: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('da-DK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ActivityScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editActivityKey, setEditActivityKey] = useState('');
  const [editExtras, setEditExtras] = useState<string[]>([]);
  const [editBio, setEditBio] = useState('');
  const [editOpenCategory, setEditOpenCategory] = useState<string | null>(null);
  const [confirmDeletePost, setConfirmDeletePost] = useState<Post | null>(null);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState<{ postId: string; commentId: string } | null>(null);
  const [likersModal, setLikersModal] = useState<{ postId: string; names: string[] } | null>(null);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});

  const fetchFeed = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data: friendships } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', user.id);

    const friendIds = (friendships ?? []).map((f) => f.friend_id);
    const allowedIds = [user.id, ...friendIds];

    const { data: activities } = await supabase
      .from('user_activities')
      .select('*, activity_likes(user_id), activity_comments(id)')
      .in('user_id', allowedIds)
      .order('created_at', { ascending: false });

    if (!activities) return;

    setPosts(
      activities.map((a) => ({
        id: a.id,
        user_id: a.user_id,
        username: a.username ?? 'Ukendt',
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
    setLoading(false);

    const userIds = [...new Set(activities.map((a) => a.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, avatar_url')
      .in('id', userIds);
    if (profiles) {
      const map: Record<string, string> = {};
      for (const p of profiles) {
        if (p.avatar_url) map[p.id] = p.avatar_url;
      }
      setAvatarMap(map);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    const scrollToId = (location.state as { scrollToId?: string } | null)?.scrollToId;
    if (!scrollToId || posts.length === 0) return;
    const el = document.getElementById(`post-${scrollToId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [location.state, posts]);

  async function handlePhotoUpload(post: Post, file: File) {
    const path = `${post.user_id}/${Date.now()}_${file.name}`;
    await supabase.storage.from('activity-images').upload(path, file);
    const { data: urlData } = supabase.storage.from('activity-images').getPublicUrl(path);
    await supabase.from('user_activities').update({ image_url: urlData.publicUrl }).eq('id', post.id);
    setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, image_url: urlData.publicUrl } : p));
  }

  async function handlePhotoDelete(post: Post) {
    await supabase.from('user_activities').update({ image_url: null }).eq('id', post.id);
    setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, image_url: null } : p));
    setOpenMenuId(null);
  }

  async function handleDeletePost() {
    if (!confirmDeletePost) return;
    await supabase.from('user_activities').delete().eq('id', confirmDeletePost.id);
    setPosts((prev) => prev.filter((p) => p.id !== confirmDeletePost.id));
    setConfirmDeletePost(null);
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
    const selectedActivity = categories
      .flatMap((c) => c.activities)
      .find((a) => a.name === editActivityKey);
    const extraPoints = editExtras.reduce((sum, extraName) => {
      const extra = selectedActivity?.extras?.find((e) => e.name === extraName);
      return sum + (extra?.points ?? 0);
    }, 0);
    const updates: Record<string, unknown> = {
      bio: editBio.trim() || null,
      extras: editExtras,
    };
    if (selectedActivity) {
      updates.activity_name = selectedActivity.name;
      updates.points = selectedActivity.points + extraPoints;
    }
    await supabase.from('user_activities').update(updates).eq('id', editingPost.id);
    setPosts((prev) => prev.map((p) => p.id === editingPost.id ? {
      ...p,
      activity_name: (updates.activity_name as string) ?? p.activity_name,
      points: (updates.points as number) ?? p.points,
      extras: editExtras,
      bio: updates.bio as string | null,
    } : p));
    setEditingPost(null);
  }

  async function toggleComments(postId: string) {
    if (expandedComments === postId) {
      setExpandedComments(null);
      return;
    }
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
    const username = user?.user_metadata?.username ?? user?.email ?? '';
    const { data: newComment } = await supabase
      .from('activity_comments')
      .insert({ activity_id: post.id, user_id: currentUserId, username, body })
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

  async function toggleLike(post: Post) {
    if (!currentUserId) return;

    if (post.liked_by_me) {
      await supabase
        .from('activity_likes')
        .delete()
        .eq('activity_id', post.id)
        .eq('user_id', currentUserId);
    } else {
      await supabase
        .from('activity_likes')
        .insert({ activity_id: post.id, user_id: currentUserId });
    }

    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, liked_by_me: !p.liked_by_me, likes: p.likes + (p.liked_by_me ? -1 : 1) }
          : p
      )
    );
  }

  async function handleLikeClick(post: Post) {
    if (post.user_id === currentUserId) {
      const { data: likes } = await supabase
        .from('activity_likes')
        .select('user_id')
        .eq('activity_id', post.id);
      const userIds = (likes ?? []).map((l: { user_id: string }) => l.user_id);
      let names: string[] = [];
      if (userIds.length > 0) {
        const { data: activities } = await supabase
          .from('user_activities')
          .select('user_id, username')
          .in('user_id', userIds);
        const nameMap: Record<string, string> = {};
        for (const a of activities ?? []) {
          if (a.username) nameMap[a.user_id] = a.username;
        }
        names = userIds.map((id: string) => nameMap[id] ?? 'Ukendt');
      }
      setLikersModal({ postId: post.id, names });
    } else {
      toggleLike(post);
    }
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>AKTIVITET</h1>
      </header>

      <main className={styles.feed}>
        {loading && <p className={styles.empty}>Indlæser...</p>}
        {!loading && posts.length === 0 && (
          <p className={styles.empty}>Ingen aktiviteter endnu. Tilføj en!</p>
        )}

        {posts.map((post) => (
          <article key={post.id} id={`post-${post.id}`} className={styles.post}>
            <div className={styles.postHeader}>
              <button
                className={styles.avatar}
                onClick={() => navigate(`/bruger/${post.user_id}`)}
                style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              >
                {avatarMap[post.user_id] ? (
                  <img src={avatarMap[post.user_id]} alt="" className={styles.avatarPhoto} />
                ) : (
                  <img src={avatarIcon} alt="" className={styles.avatarIcon} />
                )}
              </button>
              <div className={styles.postMeta}>
                <span
                  className={styles.postUsername}
                  onClick={() => navigate(`/bruger/${post.user_id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {post.username}
                </span>
                <span className={styles.postDate}>{formatDate(post.created_at)}</span>
              </div>
              {post.user_id === currentUserId && (
                <div className={styles.menuWrapper}>
                  <button
                    className={styles.menuButton}
                    onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                  >
                    ···
                  </button>
                  {openMenuId === post.id && (
                    <div className={styles.menuDropdown}>
                      <button className={styles.menuItem} onClick={() => openEdit(post)}>
                        Rediger aktivitet
                      </button>
                      {post.image_url && (
                        <button className={styles.menuItem} onClick={() => handlePhotoDelete(post)}>
                          Slet billede
                        </button>
                      )}
                      <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => { setConfirmDeletePost(post); setOpenMenuId(null); }}>
                        Slet aktivitet
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <h2 className={styles.activityName}>{post.activity_name}</h2>
            {post.bio && <p className={styles.postBio}>{post.bio}</p>}

            {post.extras.length > 0 && (
              <div className={styles.extrasList}>
                {post.extras.map((extra) => (
                  <span key={extra} className={styles.extraTag}>
                    <span className={styles.extraCheck}>✓</span>
                    {extra}
                  </span>
                ))}
              </div>
            )}

            {post.image_url ? (
              <img src={post.image_url} alt="" className={styles.postImage} />
            ) : post.user_id === currentUserId ? (
              <label className={styles.addPhotoLabel}>
                <input
                  type="file"
                  accept="image/*"
                  className={styles.addPhotoInput}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(post, file);
                  }}
                />
                + Tilføj foto
              </label>
            ) : null}

            <div className={styles.postFooter}>
              <div className={styles.pointsArea}>
                <img src={coupleThumb} alt="" className={styles.thumb} />
                <span className={styles.points}>{post.points} points</span>
              </div>
              <div className={styles.postActions}>
                <button
                  className={styles.commentButton}
                  onClick={() => toggleComments(post.id)}
                >
                  <img src={commentIcon} alt="" className={styles.commentIcon} />
                  <span className={styles.commentCount}>{post.comment_count}</span>
                </button>
                <button
                  className={`${styles.likeButton} ${post.liked_by_me ? styles.liked : ''}`}
                  onClick={() => handleLikeClick(post)}
                >
                  <img src={likeIcon} alt="Like" className={styles.likeIcon} />
                  <span className={styles.likeCount}>{post.likes}</span>
                </button>
              </div>
            </div>

            {expandedComments === post.id && (
              <div className={styles.commentsSection}>
                {(commentsMap[post.id] ?? []).map((comment) => (
                  <div key={comment.id} className={styles.commentRow}>
                    <div className={styles.commentContent}>
                      <button
                        className={styles.commentUsername}
                        onClick={() => navigate(`/bruger/${comment.user_id}`)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                      >
                        {comment.username}
                      </button>
                      <span className={styles.commentBody}>{comment.body}</span>
                    </div>
                    {(comment.user_id === currentUserId || post.user_id === currentUserId) && (
                      <button className={styles.commentDelete} onClick={() => setConfirmDeleteComment({ postId: post.id, commentId: comment.id })}>✕</button>
                    )}
                  </div>
                ))}
                <div className={styles.commentInputRow}>
                  <input
                    className={styles.commentInput}
                    placeholder="Skriv en kommentar..."
                    value={commentInputs[post.id] ?? ''}
                    onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addComment(post)}
                  />
                  <button className={styles.commentSend} onClick={() => addComment(post)}>Send</button>
                </div>
              </div>
            )}
          </article>
        ))}
      </main>

      <TabBar />

      {confirmDeletePost && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setConfirmDeletePost(null); }}>
          <div className={styles.modalCard}>
            <p className={styles.modalTitle}>Oh no!</p>
            <p className={styles.confirmText}>Nu mister du performativitetspoint. Er du sikker på at du vil slette denne aktivitet?</p>
            <button className={`${styles.modalSave} ${styles.modalDanger}`} onClick={handleDeletePost}>
              Ja, slet aktivitet
            </button>
            <button className={styles.modalCancel} onClick={() => setConfirmDeletePost(null)}>
              Annuller
            </button>
          </div>
        </div>
      )}

      {editingPost && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => { if (e.target === e.currentTarget) setEditingPost(null); }}
        >
          <div className={styles.modalCard}>
            <p className={styles.modalTitle}>Rediger aktivitet</p>

            <textarea
              className={styles.modalTextarea}
              placeholder="Tilføj en beskrivelse..."
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              rows={3}
              autoFocus
            />

            <div className={styles.editActivityList}>
              {categories.map((cat) => (
                <div key={cat.name}>
                  <button
                    className={styles.editCategoryRow}
                    onClick={() => setEditOpenCategory(editOpenCategory === cat.name ? null : cat.name)}
                  >
                    <span className={styles.editCategoryName}>{cat.name}</span>
                    <span className={editOpenCategory === cat.name ? styles.editIconOpen : styles.editIcon}>+</span>
                  </button>
                  <div className={styles.editDivider} />
                  {editOpenCategory === cat.name && (
                    <ul className={styles.editActivities}>
                      {cat.activities.map((act) => {
                        const selected = editActivityKey === act.name;
                        return (
                          <li key={act.name}>
                            <button
                              className={styles.editActivityRow}
                              onClick={() => {
                                setEditActivityKey(act.name);
                                setEditExtras([]);
                              }}
                            >
                              <span className={`${styles.editCheckbox} ${selected ? styles.editChecked : ''}`}>
                                {selected && <span className={styles.editCheckmark}>✓</span>}
                              </span>
                              <span className={styles.editActivityName}>{act.name}</span>
                              <span className={styles.editPoints}>
                                {act.points > 0 ? `+${act.points}` : `${act.points}`}
                              </span>
                            </button>

                            {selected && act.extras && act.extras.length > 0 && (
                              <>
                                {editExtras.length === 0 && (
                                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#c0392b', padding: '4px 0 4px 32px', margin: 0 }}>
                                    Vælg mindst én underkategori
                                  </p>
                                )}
                                <ul className={styles.editExtras}>
                                  {act.extras.map((extra) => {
                                    const checked = editExtras.includes(extra.name);
                                    return (
                                      <li key={extra.name}>
                                        <button
                                          className={styles.editActivityRow}
                                          onClick={() => setEditExtras((prev) =>
                                            checked ? prev.filter((e) => e !== extra.name) : [...prev, extra.name]
                                          )}
                                        >
                                          <span className={`${styles.editCheckbox} ${checked ? styles.editChecked : ''}`}>
                                            {checked && <span className={styles.editCheckmark}>✓</span>}
                                          </span>
                                          <span className={styles.editExtraName}>{extra.name}</span>
                                          {extra.points !== 0 && (
                                            <span className={styles.editPoints}>
                                              {extra.points > 0 ? `+${extra.points}` : `${extra.points}`}
                                            </span>
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
              className={styles.modalSave}
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
      {likersModal && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setLikersModal(null); }}>
          <div className={styles.modalCard}>
            <p className={styles.modalTitle}>
              {likersModal.names.length === 0 ? 'Ingen likes endnu' : 'Likes'}
            </p>
            {likersModal.names.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {likersModal.names.map((name, i) => (
                  <li key={i} style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--color-text)', fontWeight: 600 }}>
                    {name}
                  </li>
                ))}
              </ul>
            )}
            <button className={styles.modalCancel} onClick={() => setLikersModal(null)}>Luk</button>
          </div>
        </div>
      )}

      {confirmDeleteComment && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setConfirmDeleteComment(null); }}>
          <div className={styles.modalCard}>
            <p className={styles.modalTitle}>Slet kommentar?</p>
            <p className={styles.confirmText}>Er du sikker på at du vil slette denne kommentar?</p>
            <button
              className={`${styles.modalSave} ${styles.modalDanger}`}
              onClick={() => { deleteComment(confirmDeleteComment.postId, confirmDeleteComment.commentId); setConfirmDeleteComment(null); }}
            >
              Ja, slet kommentar
            </button>
            <button className={styles.modalCancel} onClick={() => setConfirmDeleteComment(null)}>
              Annuller
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
