import React, { useState, useEffect, Suspense } from 'react';
import { User } from '@villagelink/shared';
import { getCurrentUser, logoutUser, getAuthToken } from '../services/authService';
import { ViewSkeleton } from './LoadingSkeleton';
import UserAuthView from './UserAuthView';
const AdminView = React.lazy(() => import('./AdminView').then(m => ({ default: m.AdminView })));

const AdminAppRoot: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    
    useEffect(() => {
        const currentUser = getCurrentUser();
        const token = getAuthToken();
        if (currentUser && token) {
            if (currentUser.role === 'ADMIN') {
                setUser(currentUser);
            } else {
                localStorage.removeItem('villagelink_token');
                localStorage.removeItem('villagelink_user');
            }
        }
        setIsInitialized(true);
    }, []);

    const handleLoginSuccess = (u: User) => {
        if (u.role !== 'ADMIN') {
            logoutUser();
            alert("Access Denied: This account does not have Admin privileges.");
            return;
        }
        setUser(u);
    };

    if (!isInitialized) return <ViewSkeleton />;

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
                <div className="mb-8 text-center bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl max-w-md w-full">
                    <div className="w-16 h-16 bg-luxe-sienna/20 text-luxe-sienna rounded-2xl flex items-center justify-center text-2xl mb-4 mx-auto font-black shadow-glow-sm">
                        A
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Admin Portal</h1>
                    <p className="text-sm text-slate-400 font-medium">Please login with an Admin account</p>
                </div>
                <div className="w-full max-w-md bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 relative z-10">
                    <UserAuthView onSuccess={handleLoginSuccess} lang={'EN'} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-tr from-luxe-sienna/10 to-transparent pointer-events-none z-0"></div>
            </div>
        );
    }

    return (
        <Suspense fallback={<ViewSkeleton />}>
            <div className="bg-slate-900 min-h-screen">
                <div className="p-4 bg-slate-800 flex justify-between items-center shadow-md sticky top-0 z-50 border-b border-slate-700">
                    <h2 className="font-bold text-white tracking-tight flex items-center gap-2">
                        <span className="w-6 h-6 bg-luxe-sienna text-white rounded flex items-center justify-center text-xs">V</span>
                        VillageLink Admin
                    </h2>
                    <button 
                        onClick={() => { logoutUser(); setUser(null); }}
                        className="text-[10px] bg-slate-700/50 hover:bg-red-500/20 text-slate-300 hover:text-red-400 px-3 py-1.5 rounded-full font-bold transition-all border border-slate-600 hover:border-red-500/30 tracking-wider"
                    >
                        LOGOUT
                    </button>
                </div>
                <AdminView user={user} />
            </div>
        </Suspense>
    );
};

export default AdminAppRoot;
