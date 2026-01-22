
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
const ShopkeeperView = lazy(() => import('./ShopkeeperView'));
const MessManagerView = lazy(() => import('./MessManagerView'));
const VendorView = lazy(() => import('./VendorView'));
const VyaparSaathiView = lazy(() => import('./VyaparSaathiView').then(m => ({ default: m.VyaparSaathiView })));
const LuxeOSView = lazy(() => import('./LuxeOSView').then(m => ({ default: m.LuxeOSView })));
const VillageManagerView = lazy(() => import('./VillageManagerView'));
const KisanApp = lazy(() => import('./KisanApp'));
const UserProfile = lazy(() => import('./UserProfile').then(m => ({ default: m.UserProfile })));

// Provider Apps - Separate entry points
const DriverApp = lazy(() => import('./DriverApp').then(m => ({ default: m.DriverApp })));
const VyapariApp = lazy(() => import('./VyapariApp').then(m => ({ default: m.VyapariApp })));
const MessApp = lazy(() => import('./MessApp').then(m => ({ default: m.MessApp })));
const StorageApp = lazy(() => import('./StorageApp').then(m => ({ default: m.StorageApp })));
const LogisticsApp = lazy(() => import('./LogisticsApp').then(m => ({ default: m.LogisticsApp })));
const UserPanel = lazy(() => import('./UserPanel').then(m => ({ default: m.UserPanel })));
const CargoShipmentView = lazy(() => import('./CargoShipmentView'));

// USS v3.0 - Unified Apps
const UserApp = lazy(() => import('./UserApp'));
const ProviderApp = lazy(() => import('./ProviderApp'));

// Check if accessing a dedicated provider app URL
type AppMode = 'KISAN' | 'DRIVER' | 'VYAPARI' | 'MESS' | 'STORAGE' | 'LOGISTICS' | 'CARGO' | 'USS_USER' | 'USS_PROVIDER' | 'VILLAGE_MANAGER' | 'USER';
const getAppMode = (): AppMode => {
  const path = window.location.pathname.toLowerCase();
  // USS v3.0 unified app routes
  if (path.startsWith('/app') || path.startsWith('/consumer')) return 'USS_USER';
  if (path.startsWith('/provider') || path.startsWith('/partner')) return 'USS_PROVIDER';
  // Legacy provider app routes
  if (path.startsWith('/kisan')) return 'KISAN';
  if (path.startsWith('/driver')) return 'DRIVER';
  if (path.startsWith('/vyapari')) return 'VYAPARI';
  if (path.startsWith('/mess')) return 'MESS';
  if (path.startsWith('/storage')) return 'STORAGE';
  if (path.startsWith('/logistics')) return 'LOGISTICS';
  if (path.startsWith('/cargo')) return 'CARGO';
  if (path.startsWith('/villagemanager')) return 'VILLAGE_MANAGER';
  return 'USER'; // Default to role-based view
};

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
        return <UserApp user={user} onLogout={handleLogout} lang={lang} />;
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
      case 'FARMER':
        return <KisanApp />;
      case 'VILLAGE_MANAGER':
        return <VillageManagerView user={user} />;
      default:
        return <UserApp user={user} onLogout={handleLogout} lang={lang} />;
    }
  };

  // Route to dedicated provider apps based on URL path
  const appMode = getAppMode();
  if (appMode === 'KISAN') {
    return (
      <Suspense fallback={<ViewSkeleton />}>
        <KisanApp />
      </Suspense>
    );
  }
  if (appMode === 'DRIVER') {
    return (
      <Suspense fallback={<ViewSkeleton />}>
        <DriverApp />
      </Suspense>
    );
  }
  if (appMode === 'VYAPARI') {
    return (
      <Suspense fallback={<ViewSkeleton />}>
        <VyapariApp />
      </Suspense>
    );
  }
  if (appMode === 'MESS') {
    return (
      <Suspense fallback={<ViewSkeleton />}>
        <MessApp />
      </Suspense>
    );
  }
  if (appMode === 'STORAGE') {
    return (
      <Suspense fallback={<ViewSkeleton />}>
        <StorageApp />
      </Suspense>
    );
  }
  if (appMode === 'LOGISTICS') {
    return (
      <Suspense fallback={<ViewSkeleton />}>
        <LogisticsApp />
      </Suspense>
    );
  }
  if (appMode === 'VILLAGE_MANAGER') {
    return (
      <Suspense fallback={<ViewSkeleton />}>
        <VillageManagerView user={user || { id: 'guest', name: 'Guest', role: 'VILLAGE_MANAGER' } as any} />
      </Suspense>
    );
  }
  if (appMode === 'CARGO') {
    // CargoLink shipper interface
    const mockUser = { id: 'guest', name: 'Guest User', phone: '' };
    return (
      <Suspense fallback={<ViewSkeleton />}>
        <CargoShipmentView user={user || mockUser} />
      </Suspense>
    );
  }

  // USS v3.0 - Unified Consumer App
  if (appMode === 'USS_USER' || (user && user.role === 'PASSENGER')) {
    return (
      <div className="min-h-screen bg-obsidian-deep">
        <Suspense fallback={<ViewSkeleton />}>
          <UserApp user={user} onLogout={handleLogout} lang={lang} />
        </Suspense>
      </div>
    );
  }

  // USS v3.0 - Unified Service Provider App
  if (appMode === 'USS_PROVIDER') {
    return (
      <Suspense fallback={<ViewSkeleton />}>
        <ProviderApp user={user} onLogout={handleLogout} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-500 overflow-x-hidden">

      {/* Whisk 3.0: Cinematic Layers */}
      <div className="veo-cinematic-bg" />
      <div className="veo-drift-grain" />

      <div className="max-w-4xl mx-auto min-h-screen relative flex flex-col p-4 z-10">

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
              <button onClick={handleLogout} aria-label="Logout" className="p-2 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md text-red-500 dark:text-red-400 shadow-sm border border-slate-200 dark:border-slate-700">
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
