import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import TabBar from '../components/TabBar';
import styles from './PerformanceScreen.module.css';
import iconTilfoej from '../../assets/icons/tilføj.svg';
import iconPerformance from '../../assets/icons/performance.svg';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  score: number;
  isMe: boolean;
}

interface FriendRequest {
  id: string;
  from_user_id: string;
  from_username: string;
}

interface ActivityNotification {
  id: string;
  type: 'like' | 'comment';
  from_username: string;
  activity_name: string;
  created_at: string;
  body?: string;
}

export default function PerformanceScreen() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [addMessage, setAddMessage] = useState('');
  const [foundUsers, setFoundUsers] = useState<{ id: string; username: string }[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [activityNotifs, setActivityNotifs] = useState<ActivityNotification[]>([]);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Hent venskaber
    const { data: friendships } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', user.id);

    const friendIds = friendships?.map((f) => f.friend_id) ?? [];
    const allIds = [user.id, ...friendIds];

    // Hent scores for alle
    const { data: activities } = await supabase
      .from('user_activities')
      .select('user_id, username, points, created_at')
      .in('user_id', allIds)
      .gte('created_at', oneMonthAgo.toISOString());

    const scoreMap: Record<string, { username: string; score: number }> = {};
    for (const a of activities ?? []) {
      if (!scoreMap[a.user_id]) {
        scoreMap[a.user_id] = {
          username: a.username ?? 'Ukendt',
          score: 0,
        };
      }
      scoreMap[a.user_id].score += a.points;
    }

    // Sørg for at den nuværende bruger altid er med
    if (!scoreMap[user.id]) {
      scoreMap[user.id] = {
        username: user.user_metadata?.username ?? user.email ?? '',
        score: 0,
      };
    }

    const sorted = Object.entries(scoreMap)
      .map(([uid, { username, score }]) => ({
        user_id: uid,
        username,
        score,
        isMe: uid === user.id,
      }))
      .sort((a, b) => b.score - a.score);

    setLeaderboard(sorted);

    // Hent indkommende venneanmodninger
    const { data: reqs } = await supabase
      .from('friend_requests')
      .select('id, from_user_id, from_username')
      .eq('to_user_id', user.id)
      .eq('status', 'pending');

    setRequests(reqs ?? []);

    // Hent likes og kommentarer på egne aktiviteter fra andre brugere
    const { data: myActivities } = await supabase
      .from('user_activities')
      .select('id, activity_name')
      .eq('user_id', user.id);

    const myActivityIds = (myActivities ?? []).map((a) => a.id);
    const activityNameMap: Record<string, string> = {};
    for (const a of myActivities ?? []) activityNameMap[a.id] = a.activity_name;

    const notifs: ActivityNotification[] = [];

    if (myActivityIds.length > 0) {
      const { data: likes } = await supabase
        .from('activity_likes')
        .select('activity_id, user_id, created_at')
        .in('activity_id', myActivityIds)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      const likerIds = [...new Set((likes ?? []).map((l) => l.user_id))];
      let likerNames: Record<string, string> = {};
      if (likerIds.length > 0) {
        const { data: likerActivities } = await supabase
          .from('user_activities')
          .select('user_id, username')
          .in('user_id', likerIds);
        for (const a of likerActivities ?? []) {
          if (a.username) likerNames[a.user_id] = a.username;
        }
      }

      for (const like of likes ?? []) {
        notifs.push({
          id: `like-${like.activity_id}-${like.user_id}`,
          type: 'like',
          from_username: likerNames[like.user_id] ?? 'Nogen',
          activity_name: activityNameMap[like.activity_id] ?? '',
          created_at: like.created_at,
        });
      }

      const { data: comments } = await supabase
        .from('activity_comments')
        .select('id, activity_id, user_id, username, body, created_at')
        .in('activity_id', myActivityIds)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      for (const c of comments ?? []) {
        notifs.push({
          id: `comment-${c.id}`,
          type: 'comment',
          from_username: c.username ?? 'Nogen',
          activity_name: activityNameMap[c.activity_id] ?? '',
          created_at: c.created_at,
          body: c.body,
        });
      }
    }

    notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setActivityNotifs(notifs);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSearch(query: string) {
    setFriendUsername(query);
    setAddMessage('');
    if (query.trim().length < 2) {
      setFoundUsers([]);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', `%${query.trim()}%`)
      .limit(10);

    const filtered = (profiles ?? []).filter((p) => p.id !== currentUserId);
    setFoundUsers(filtered);
    if (filtered.length === 0) setAddMessage('Ingen brugere fundet');
    else setAddMessage('');
  }

  async function sendFriendRequest(targetUser: { id: string; username: string }) {
    const { error } = await supabase.from('friend_requests').insert({
      from_user_id: currentUserId,
      from_username: leaderboard.find((e) => e.isMe)?.username ?? '',
      to_user_id: targetUser.id,
      status: 'pending',
    });

    if (error) {
      setAddMessage('Anmodning allerede sendt');
    } else {
      setAddMessage(`Anmodning sendt til ${targetUser.username}!`);
      setFriendUsername('');
      setFoundUsers([]);
    }
  }

  async function acceptRequest(req: FriendRequest) {
    await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', req.id);

    await supabase.from('friendships').insert([
      { user_id: currentUserId, friend_id: req.from_user_id },
      { user_id: req.from_user_id, friend_id: currentUserId },
    ]);

    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    load();
  }

  const maxScore = leaderboard[0]?.score || 1;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>PERFORMANCE</h1>
      </header>

      <main className={styles.content}>
        <div className={styles.addFriendRow}>
          <button className={styles.myFriendsButton} onClick={() => navigate('/venner')}>
            Mine venner
          </button>
          <button
            className={styles.addFriendButton}
            onClick={() => { setShowAddFriend((v) => !v); setFoundUsers([]); setAddMessage(''); }}
          >
            <span>Tilføj ven</span>
            <img src={iconTilfoej} alt="" className={styles.addFriendIcon} />
          </button>
        </div>

        {showAddFriend && (
          <div
            className={styles.modalOverlay}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowAddFriend(false); setFoundUsers([]); setAddMessage(''); } }}
          >
            <div className={styles.modalCard}>
              <p className={styles.modalTitle}>Tilføj dine venner</p>
              <input
                className={styles.addFriendInput}
                type="text"
                placeholder="Søg efter brugernavn..."
                value={friendUsername}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
              />

              {foundUsers.length > 0 && (
                <ul className={styles.searchResults}>
                  {foundUsers.map((u) => (
                    <li key={u.id} className={styles.foundUserRow}>
                      <span className={styles.foundUsername}>{u.username}</span>
                      <button className={styles.addFoundButton} onClick={() => sendFriendRequest(u)}>
                        <img src={iconTilfoej} alt="Tilføj" className={styles.addFoundIcon} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {addMessage && <p className={styles.addMessage}>{addMessage}</p>}
            </div>
          </div>
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Notifikationer</h2>
          {requests.length === 0 && activityNotifs.length === 0 ? (
            <p className={styles.emptyNotifications}>Ingen nye notifikationer</p>
          ) : (
            <>
              {requests.map((req) => (
                <div key={req.id} className={styles.notificationRow}>
                  <span className={styles.notificationText}>
                    {req.from_username} tilføjede dig
                  </span>
                  <button className={styles.acceptButton} onClick={() => acceptRequest(req)}>
                    Tilføj
                  </button>
                </div>
              ))}
              {activityNotifs.map((n) => (
                <div key={n.id} className={styles.notificationRow}>
                  <span className={styles.notificationText}>
                    {n.type === 'like'
                      ? `${n.from_username} likede din ${n.activity_name}`
                      : `${n.from_username} kommenterede din ${n.activity_name}: "${n.body}"`}
                  </span>
                </div>
              ))}
            </>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Leaderboard</h2>
          <ul className={styles.leaderboard}>
            {leaderboard.map((entry, i) => (
              <li key={entry.user_id} className={styles.leaderboardItem}>
                <div className={styles.leaderboardRow}>
                  <span className={styles.leaderboardName}>
                    {entry.username}
                    {i === 0 && (
                      <img
                        src={iconPerformance}
                        alt="nr. 1"
                        className={styles.trophyIcon}
                      />
                    )}
                  </span>
                  <span className={styles.leaderboardScore}>{entry.score}</span>
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${(entry.score / maxScore) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <TabBar />
    </div>
  );
}
