import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginScreen from './screens/LoginScreen';
import CreateProfileScreen from './screens/CreateProfileScreen';
import ProfileScreen from './screens/ProfileScreen';
import AddActivityScreen from './screens/AddActivityScreen';
import ActivityScreen from './screens/ActivityScreen';
import PerformanceScreen from './screens/PerformanceScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import FriendsScreen from './screens/FriendsScreen';
import SplashScreen from './screens/SplashScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import { getSession } from './services/auth';
import { supabase } from './lib/supabase';

function AuthRouter() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes('type=recovery');

    if (isRecovery) {
      setChecking(false);
      navigate('/nyt-kodeord');
    } else {
      getSession().then((session) => {
        setLoggedIn(!!session);
        setChecking(false);
        if (session) navigate('/aktivitet');
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/nyt-kodeord');
      } else {
        setLoggedIn(!!session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (checking) return null;

  return (
    <Routes>
      {/* Auth */}
      <Route
        path="/login"
        element={
          loggedIn ? <Navigate to="/aktivitet" replace /> :
          <LoginScreen
            onLogin={() => navigate('/aktivitet')}
            onCreateProfile={() => navigate('/opret-profil')}
            onForgotPassword={() => navigate('/glemt-kodeord')}
          />
        }
      />
      <Route
        path="/nyt-kodeord"
        element={<ResetPasswordScreen onDone={() => navigate('/login')} />}
      />
      <Route
        path="/glemt-kodeord"
        element={
          loggedIn ? <Navigate to="/aktivitet" replace /> :
          <ForgotPasswordScreen onBack={() => navigate('/login')} />
        }
      />
      <Route
        path="/opret-profil"
        element={
          loggedIn ? <Navigate to="/aktivitet" replace /> :
          <CreateProfileScreen
            onCreated={() => navigate('/login')}
            onGoToLogin={() => navigate('/login')}
          />
        }
      />

      {/* Tabs */}
      <Route
        path="/profil"
        element={loggedIn ? <ProfileScreen /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/aktivitet"
        element={loggedIn ? <ActivityScreen /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/tilfoej"
        element={loggedIn ? <AddActivityScreen /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/performance"
        element={loggedIn ? <PerformanceScreen /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/rediger-profil"
        element={loggedIn ? <EditProfileScreen /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/venner"
        element={loggedIn ? <FriendsScreen /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/bruger/:userId"
        element={loggedIn ? <UserProfileScreen /> : <Navigate to="/login" replace />}
      />
      <Route path="/" element={<Navigate to={loggedIn ? '/aktivitet' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <BrowserRouter>
        <AuthRouter />
      </BrowserRouter>
    </>
  );
}
