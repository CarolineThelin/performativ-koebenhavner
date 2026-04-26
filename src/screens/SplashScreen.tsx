import { useEffect, useState } from 'react';
import styles from './SplashScreen.module.css';
import coupleImage from '../../assets/images/noerrebropar.png';

interface Props {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: Props) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 2000);
    const doneTimer = setTimeout(() => onDone(), 2500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div className={`${styles.splash} ${fading ? styles.fadeOut : ''}`}>
      <div className={styles.inner}>
        <h1 className={styles.title}>PERFORMATIV KØBENHAVNER</h1>
        <img src={coupleImage} alt="" className={styles.image} />
      </div>
    </div>
  );
}
