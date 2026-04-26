import { useNavigate, useLocation } from 'react-router-dom';
import styles from './TabBar.module.css';
import iconTilfoej from '../../assets/icons/tilføj.svg';
import iconAktivitet from '../../assets/icons/aktivitet.svg';
import iconPerformance from '../../assets/icons/performance.svg';
import iconProfil from '../../assets/icons/profil.svg';

const tabs = [
  { label: 'Tilføj', icon: iconTilfoej, path: '/tilfoej' },
  { label: 'Aktivitet', icon: iconAktivitet, path: '/aktivitet' },
  { label: 'Performance', icon: iconPerformance, path: '/performance' },
  { label: 'Profil', icon: iconProfil, path: '/profil' },
];

export default function TabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className={styles.tabBar}>
      {tabs.map((tab) => {
        const active = pathname === tab.path;
        return (
          <button
            key={tab.path}
            className={`${styles.tab} ${active ? styles.active : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <img src={tab.icon} alt="" className={styles.icon} />
            <span className={styles.label}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
