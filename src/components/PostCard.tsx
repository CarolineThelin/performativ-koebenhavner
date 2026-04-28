import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function MentionText({ text, onNavigate }: { text: string; onNavigate: (username: string) => void }) {
  const parts = text.split(/(@\[[^\]]+\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^@\[(.+)\]$/);
        if (match) {
          const username = match[1];
          return (
            <button
              key={i}
              onClick={() => onNavigate(username)}
              style={{ fontWeight: 700, color: 'var(--color-primary)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
            >
              @{username}
            </button>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
import styles from '../screens/ActivityScreen.module.css';
import avatarIcon from '../../assets/icons/profil.svg';
import likeIcon from '../../assets/icons/like.svg';
import commentIcon from '../../assets/icons/kommentar.svg';
import coupleThumb from '../../assets/images/noerrebropar.png';

export interface Post {
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

export interface Comment {
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

interface PostCardProps {
  post: Post;
  currentUserId: string | null;
  avatarUrl?: string;
  comments: Comment[];
  commentInput: string;
  expandedComments: boolean;
  onLike: () => void;
  onToggleComments: () => void;
  onCommentChange: (value: string) => void;
  onCommentSubmit: () => void;
  onCommentDelete: (commentId: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPhotoUpload?: (file: File) => void;
  onPhotoDelete?: () => void;
  menuOpen?: boolean;
  onMenuToggle?: () => void;
  friends?: { id: string; username: string }[];
}

export default function PostCard({
  post,
  currentUserId,
  avatarUrl,
  comments,
  commentInput,
  expandedComments,
  onLike,
  onToggleComments,
  onCommentChange,
  onCommentSubmit,
  onCommentDelete,
  onEdit,
  onDelete,
  onPhotoUpload,
  onPhotoDelete,
  menuOpen,
  onMenuToggle,
  friends = [],
}: PostCardProps) {
  const navigate = useNavigate();
  const isOwn = post.user_id === currentUserId;
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<string | null>(null);
  const [likers, setLikers] = useState<string[]>([]);
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  async function navigateToMention(username: string) {
    const { data } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();
    if (!data?.id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id === data.id) {
      navigate('/profil');
    } else {
      navigate(`/bruger/${data.id}`);
    }
  }

  function handleCommentInput(value: string) {
    onCommentChange(value);
    const lastWord = value.split(/\s/).pop() ?? '';
    if (lastWord.startsWith('@')) {
      setMentionQuery(lastWord.slice(1).toLowerCase());
    } else {
      setMentionQuery(null);
    }
  }

  function selectMention(username: string) {
    const words = commentInput.split(/(\s+)/);
    const lastIdx = words.length - 1;
    words[lastIdx] = `@[${username}] `;
    onCommentChange(words.join(''));
    setMentionQuery(null);
  }

  async function handleLikeClick() {
    if (isOwn) {
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
      setLikers(names);
      setShowLikersModal(true);
    } else {
      onLike();
    }
  }

  return (
    <>
    <article className={styles.post}>
      <div className={styles.postHeader}>
        <button
          className={styles.avatar}
          onClick={() => !isOwn && navigate(`/bruger/${post.user_id}`)}
          style={{ cursor: isOwn ? 'default' : 'pointer', background: 'none', border: 'none', padding: 0 }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className={styles.avatarPhoto} />
          ) : (
            <img src={avatarIcon} alt="" className={styles.avatarIcon} />
          )}
        </button>
        <div className={styles.postMeta}>
          <span
            className={styles.postUsername}
            onClick={() => !isOwn && navigate(`/bruger/${post.user_id}`)}
            style={{ cursor: isOwn ? 'default' : 'pointer' }}
          >
            {post.username}
          </span>
          <span className={styles.postDate}>{formatDate(post.created_at)}</span>
        </div>
        {isOwn && onMenuToggle && (
          <div className={styles.menuWrapper}>
            <button className={styles.menuButton} onClick={onMenuToggle}>···</button>
            {menuOpen && (
              <div className={styles.menuDropdown}>
                {onEdit && (
                  <button className={styles.menuItem} onClick={onEdit}>
                    Rediger aktivitet
                  </button>
                )}
                {post.image_url && onPhotoDelete && (
                  <button className={styles.menuItem} onClick={onPhotoDelete}>
                    Slet billede
                  </button>
                )}
                {onDelete && (
                  <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={onDelete}>
                    Slet aktivitet
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <h2 className={styles.activityName}>{post.activity_name}</h2>
      {post.bio && <p className={styles.postBio}><MentionText text={post.bio} onNavigate={navigateToMention} /></p>}

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
      ) : isOwn && onPhotoUpload ? (
        <label className={styles.addPhotoLabel}>
          <input
            type="file"
            accept="image/*"
            className={styles.addPhotoInput}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPhotoUpload(file);
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
          <button className={styles.commentButton} onClick={onToggleComments}>
            <img src={commentIcon} alt="" className={styles.commentIcon} />
            <span className={styles.commentCount}>{post.comment_count}</span>
          </button>
          <button
            className={`${styles.likeButton} ${post.liked_by_me ? styles.liked : ''}`}
            onClick={handleLikeClick}
          >
            <img src={likeIcon} alt="Like" className={styles.likeIcon} />
            <span className={styles.likeCount}>{post.likes}</span>
          </button>
        </div>
      </div>

      {expandedComments && (
        <div className={styles.commentsSection}>
          {comments.map((comment) => (
            <div key={comment.id} className={styles.commentRow}>
              <div className={styles.commentContent}>
                <button
                  className={styles.commentUsername}
                  onClick={() => navigate(`/bruger/${comment.user_id}`)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                >
                  {comment.username}
                </button>
                <span className={styles.commentBody}><MentionText text={comment.body} onNavigate={navigateToMention} /></span>
              </div>
              {(comment.user_id === currentUserId || post.user_id === currentUserId) && (
                <button className={styles.commentDelete} onClick={() => setConfirmDeleteCommentId(comment.id)}>✕</button>
              )}
            </div>
          ))}
          {mentionQuery !== null && (
            <div style={{ background: 'var(--color-white)', border: '1px solid #ddd', borderRadius: 8, marginBottom: 4, maxHeight: 120, overflowY: 'auto' }}>
              {friends
                .filter((f) => f.username.toLowerCase().startsWith(mentionQuery))
                .map((f) => (
                  <button
                    key={f.id}
                    onMouseDown={(e) => { e.preventDefault(); selectMention(f.username); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}
                  >
                    @{f.username}
                  </button>
                ))}
              {friends.filter((f) => f.username.toLowerCase().startsWith(mentionQuery)).length === 0 && (
                <p style={{ padding: '8px 12px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>Ingen venner fundet</p>
              )}
            </div>
          )}
          <div className={styles.commentInputRow}>
            <input
              className={styles.commentInput}
              placeholder="Skriv en kommentar..."
              value={commentInput}
              onChange={(e) => handleCommentInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onCommentSubmit()}
            />
            <button className={styles.commentSend} onClick={onCommentSubmit}>Send</button>
          </div>
        </div>
      )}
    </article>

    {showLikersModal && (
      <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowLikersModal(false); }}>
        <div className={styles.modalCard}>
          <p className={styles.modalTitle}>
            {likers.length === 0 ? 'Ingen likes endnu' : 'Likes'}
          </p>
          {likers.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {likers.map((name, i) => (
                <li key={i} style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--color-text)', fontWeight: 600 }}>
                  {name}
                </li>
              ))}
            </ul>
          )}
          <button className={styles.modalCancel} onClick={() => setShowLikersModal(false)}>Luk</button>
        </div>
      </div>
    )}

    {confirmDeleteCommentId && (
      <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setConfirmDeleteCommentId(null); }}>
        <div className={styles.modalCard}>
          <p className={styles.modalTitle}>Slet kommentar?</p>
          <p className={styles.confirmText}>Er du sikker på at du vil slette denne kommentar?</p>
          <button
            className={`${styles.modalSave} ${styles.modalDanger}`}
            onClick={() => { onCommentDelete(confirmDeleteCommentId); setConfirmDeleteCommentId(null); }}
          >
            Ja, slet kommentar
          </button>
          <button className={styles.modalCancel} onClick={() => setConfirmDeleteCommentId(null)}>
            Annuller
          </button>
        </div>
      </div>
    )}
    </>
  );
}
