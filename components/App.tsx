
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthView } from './AuthView';
import { ViewSkeleton, ProfileSkeleton } from './LoadingSkeleton';
import { User } from '../types';
import { getCurrentUser, logoutUser, getAuthToken } from '../services/authService';
import { initSocketConnection } from '../services/transportService';
import { getRoutes } from '../services/adminService';
import { setUniversalRoutes } from '../services/graphService';
import { initializeGeoData } from '../constants';
import { initErrorReporting } from '../services/errorReportingService';
import { Moon, Sun, LogOut, Languages } from 'lucide-react';

// ========================================
// LAZY LOADED VIEWS - Only load what's needed
// ========================================
const PassengerView = lazy(() => import('./PassengerView').then(m => ({ default: m.PassengerView })));
const DriverView = lazy(() => import('./DriverView').then(m => ({ default: m.DriverView })));
const AdminView = lazy(() => import('./AdminView').then(m => ({ default: m.AdminView })));
const ShopkeeperView = lazy(() => import('./ShopkeeperView').then(m => ({ default: m.ShopkeeperView })));
const MessManagerView = lazy(() => import('./MessManagerView').then(m => ({ default: m.MessManagerView })));
const VendorView = lazy(() => import('./VendorView').then(m => ({ default: m.VendorView })));
const VyaparSaathiView = lazy(() => import('./VyaparSaathiView').then(m => ({ default: m.VyaparSaathiView })));
const LuxeOSView = lazy(() => import('./LuxeOSView').then(m => ({ default: m.LuxeOSView })));
const UserProfile = lazy(() => import('./UserProfile').then(m => ({ default: m.UserProfile })));

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [view, setView] = useState<'HOME' | 'PROFILE'>('HOME');
  const [lang, setLang] = useState<'EN' | 'HI'>('EN');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check auth state synchronously first (from localStorage)
    const currentUser = getCurrentUser();
    const token = getAuthToken();
    if (currentUser && token) {
      setUser(currentUser);
    }
    setIsInitialized(true);

    // Initialize error reporting system
    initErrorReporting();

    // Defer non-critical initialization to after first paint
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        initializeGeoData();
        getRoutes().then(routes => {
          if (routes.length > 0) setUniversalRoutes(routes);
        });
        if (currentUser && token) {
          initSocketConnection();
        }
      }, { timeout: 2000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        initializeGeoData();
        getRoutes().then(routes => {
          if (routes.length > 0) setUniversalRoutes(routes);
        });
        if (currentUser && token) {
          initSocketConnection();
        }
      }, 100);
    }

    const handleAuthError = () => {
      alert("Session Expired: You have logged in on another device.");
      handleLogout();
    };
    window.addEventListener('auth_error', handleAuthError);

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
    return () => window.removeEventListener('auth_error', handleAuthError);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);
  const toggleLang = () => setLang(prev => prev === 'EN' ? 'HI' : 'EN');

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setView('HOME');
  };

  const handleLoginSuccess = (u: User) => {
    setUser(u);
    // Defer socket connection to not block main thread
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => initSocketConnection(), { timeout: 1000 });
    } else {
      setTimeout(() => initSocketConnection(), 100);
    }
  };

  // Render role-based view with lazy loading
  const renderRoleView = () => {
    if (!user) return null;

    switch (user.role) {
      case 'ADMIN':
        return <AdminView user={user} />;
      case 'PASSENGER':
        return <PassengerView user={user} lang={lang} />;
      case 'DRIVER':
        return <DriverView user={user} lang={lang} />;
      case 'SHOPKEEPER':
        return <ShopkeeperView user={user} />;
      case 'MESS_MANAGER':
        return <MessManagerView user={user} />;
      case 'FOOD_VENDOR': // Street Vendor = Vyapar Saathi
        return <VyaparSaathiView user={user} />;
      case 'RESTAURANT_MANAGER': // Fine Dining = LuxeOS
        return <LuxeOSView user={user} />;
      default:
        return <PassengerView user={user} lang={lang} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-500">

      <div className="max-w-4xl mx-auto min-h-screen relative flex flex-col p-4">

        {/* Fixed Header */}
        <header className="sticky top-0 z-50 flex justify-between items-center py-4 mb-6 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md -mx-4 px-4 border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('HOME')}>
            <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-brand-400 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg">V</div>
            <span className="font-bold text-xl tracking-tight dark:text-white">Village<span className="text-brand-600 dark:text-brand-400">Link</span></span>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <button onClick={toggleLang} className="px-3 py-2 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md text-slate-800 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center gap-1">
              <Languages size={14} />
              {lang === 'EN' ? 'अ' : 'A'}
            </button>

            <button onClick={toggleTheme} className="p-2 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md text-slate-800 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {user && (
              <button onClick={handleLogout} className="p-2 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md text-red-500 dark:text-red-400 shadow-sm border border-slate-200 dark:border-slate-700">
                <LogOut size={18} />
              </button>
            )}
          </div>
        </header>

        <main className="relative flex-grow">
          {!isInitialized ? (
            <ViewSkeleton />
          ) : !user ? (
            <div className="my-auto py-10">
              <AuthView onSuccess={handleLoginSuccess} lang={lang} />
            </div>
          ) : (
            <Suspense fallback={view === 'PROFILE' ? <ProfileSkeleton /> : <ViewSkeleton />}>
              {view === 'PROFILE' ? (
                <UserProfile user={user} onBack={() => setView('HOME')} />
              ) : (
                renderRoleView()
              )}
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
