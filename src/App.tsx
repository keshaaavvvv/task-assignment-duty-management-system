import { useState, useEffect } from 'react';
import { AppUser } from './types';
import SplashView from './components/SplashView';
import LoginView from './components/LoginView';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import { auth, dbService } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isDark, setIsDark] = useState<boolean>(true);

  // Load theme and session on start
  useEffect(() => {
    // Check local storage for persistent theme
    const savedTheme = localStorage.getItem('duty_theme');
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
    } else {
      // Dark mode by default for premium glassmorphism vibe
      setIsDark(true);
    }

    // Monitor Firebase Auth state change for real session persistence
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await dbService.getUser(firebaseUser.uid);
          if (profile) {
            setCurrentUser(profile);
            localStorage.setItem('duty_session', JSON.stringify(profile));
          } else {
            // User authenticated but profile setup is in progress in LoginView
            setCurrentUser(null);
          }
        } catch (err) {
          console.warn("Error fetching user profile", err);
        }
      } else {
        setCurrentUser(null);
        localStorage.removeItem('duty_session');
      }
    });

    return () => unsubscribe();
  }, []);

  // Update HTML class when dark mode changes
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('duty_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('duty_theme', 'light');
    }
  }, [isDark]);

  const handleLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    localStorage.setItem('duty_session', JSON.stringify(user));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Firebase sign out failed", err);
    }
    setCurrentUser(null);
    localStorage.removeItem('duty_session');
  };

  if (showSplash) {
    return <SplashView onComplete={() => setShowSplash(false)} isDark={isDark} />;
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} isDark={isDark} />;
  }

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-zinc-950 text-white' : 'bg-slate-50 text-zinc-900'} transition-colors duration-300`}>
      {currentUser.role === 'admin' ? (
        <AdminDashboard 
          currentUser={currentUser} 
          onLogout={handleLogout} 
          isDark={isDark} 
          setIsDark={setIsDark} 
        />
      ) : (
        <UserDashboard 
          currentUser={currentUser} 
          onLogout={handleLogout} 
          isDark={isDark} 
          setIsDark={setIsDark} 
        />
      )}
    </div>
  );
}
