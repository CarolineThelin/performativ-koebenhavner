import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import TabBar from '../components/TabBar';
import styles from './FriendsScreen.module.css';
import iconTilfoej from '../../assets/icons/tilføj.svg';

interface Friend {
  id: string;
  username: string;
}

interface FriendRequest {
  id: string;
  from_user_id: string;
  from_username: string;
}

export default function FriendsScreen() {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState('');
  const [myUsername, setMyUsername] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);
    setMyUsername(user.user_metadata?.username ?? '');

    const { data: friendships } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', user.id);

    const friendIds = (friendships ?? []).map((f) => f.friend_id);

    if (friendIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', friendIds);
      setFriends(profiles ?? []);
    } else {
      setFriends([]);
    }

    const { data: reqs } = await supabase
      .from('friend_requests')
      .select('id, from_user_id, from_username')
      .eq('to_user_id', user.id)
      .eq('status', 'pending');
    setRequests(reqs ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSearch(query: string) {
    setSearchQuery(query);
    setMessage('');
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', `%${query.trim()}%`)
      .limit(10);

    const filtered = (profiles ?? []).filter((p) => p.id !== currentUserId);
    setSearchResults(filtered);
    if (filtered.length === 0) setMessage('Ingen brugere fundet');
  }

  async function sendFriendRequest(target: Friend) {
    const { error } = await supabase.from('friend_requests').insert({
      from_user_id: currentUserId,
      from_username: myUsername,
      to_user_id: target.id,
      status: 'pending',
    });
    if (error) {
      setMessage('Anmodning allerede sendt');
    } else {
      setMessage(`Anmodning sendt til ${target.username}!`);
      setSearchQuery('');
      setSearchResults([]);
    }
  }

  async function acceptRequest(req: FriendRequest) {
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', req.id);
    await supabase.from('friendships').insert([
      { user_id: currentUserId, friend_id: req.from_user_id },
      { user_id: req.from_user_id, friend_id: currentUserId },
    ]);
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    load();
  }

  async function rejectRequest(req: FriendRequest) {
    await supabase.from('friend_requests').delete().eq('id', req.id);
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
  }

  async function removeFriend(friendId: string) {
    await supabase.from('friendships').delete().match({ user_id: currentUserId, friend_id: friendId });
    await supabase.from('friendships').delete().match({ user_id: friendId, friend_id: currentUserId });
    setFriends((prev) => prev.filter((f) => f.id !== friendId));
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>MINE VENNER</h1>
      </header>

      <main className={styles.content}>
        <button className={styles.backButton} onClick={() => navigate('/performance')}>← Tilbage</button>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Tilføj ven</h2>
          <input
            className={styles.input}
            type="text"
            placeholder="Søg efter brugernavn..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchResults.length > 0 && (
            <ul className={styles.searchResults}>
              {searchResults.map((u) => (
                <li key={u.id} className={styles.resultRow}>
                  <span className={styles.resultName}>{u.username}</span>
                  <button className={styles.addButton} onClick={() => sendFriendRequest(u)}>
                    <img src={iconTilfoej} alt="Tilføj" className={styles.addIcon} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {message && <p className={styles.message}>{message}</p>}
        </section>

        {requests.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Venneanmodninger</h2>
            {requests.map((req) => (
              <div key={req.id} className={styles.requestRow}>
                <span className={styles.requestName}>{req.from_username} vil være din ven</span>
                <div className={styles.requestActions}>
                  <button className={styles.acceptButton} onClick={() => acceptRequest(req)}>
                    Tilføj
                  </button>
                  <button className={styles.rejectButton} onClick={() => rejectRequest(req)}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Mine venner ({friends.length})</h2>
          {friends.length === 0 ? (
            <p className={styles.emptyText}>Du har ingen venner endnu</p>
          ) : (
            <ul className={styles.friendList}>
              {friends.map((f) => (
                <li key={f.id} className={styles.friendRow}>
                  <span className={styles.friendName}>{f.username}</span>
                  <button className={styles.removeButton} onClick={() => removeFriend(f.id)}>
                    Fjern
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <TabBar />
    </div>
  );
}
