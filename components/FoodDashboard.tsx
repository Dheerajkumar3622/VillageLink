
import React, { useState, useEffect } from 'react';
import { User, Shop, FoodItem, FoodBooking } from '../types';
import { Button } from './Button';
import { API_BASE_URL } from '../config';
import { getAuthToken } from '../services/authService';
import { Loader2, Search, MapPin, Star, Utensils, ShoppingBag, X, CheckCircle, Ticket, ArrowLeft } from 'lucide-react';

interface FoodDashboardProps {
    user: User;
    onBack: () => void;
}

export const FoodDashboard: React.FC<FoodDashboardProps> = ({ user, onBack }) => {
    const [view, setView] = useState<'LIST' | 'MENU' | 'SUCCESS' | 'SUBSCRIBE'>('LIST');
    const [messes, setMesses] = useState<Shop[]>([]);
    const [filteredMesses, setFilteredMesses] = useState<Shop[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [pincode, setPincode] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedMess, setSelectedMess] = useState<Shop | null>(null);
    const [menu, setMenu] = useState<FoodItem[]>([]);
    const [cart, setCart] = useState<{ item: FoodItem, quantity: number }[]>([]);
    const [lastBooking, setLastBooking] = useState<FoodBooking | null>(null);

    useEffect(() => {
        fetchMesses();
    }, []);

    useEffect(() => {
        if (!searchQuery) {
            setFilteredMesses(messes);
        } else {
            const lower = searchQuery.toLowerCase();
            setFilteredMesses(messes.filter(m => m.name.toLowerCase().includes(lower) || m.location.toLowerCase().includes(lower)));
        }
    }, [searchQuery, messes]);

    const fetchMesses = async (pin?: string) => {
        setLoading(true);
        try {
            const query = pin ? `?pincode=${pin}` : '';
            const res = await fetch(`${API_BASE_URL}/api/food/mess${query}`);
            const data = await res.json();
            console.log("Fetch Result:", data);



            setMesses(data);
            setFilteredMesses(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };



    const handleSelectMess = async (mess: Shop) => {
        setSelectedMess(mess);
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/food/menu/${mess.id}`);
            const data = await res.json();
            // Sort: Recommended first
            setMenu(data.sort((a: any, b: any) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0)));
            setView('MENU');
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (item: FoodItem) => {
        const existing = cart.find(c => c.item.id === item.id);
        if (existing) {
            setCart(cart.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, { item, quantity: 1 }]);
        }
    };

    const getTotal = () => cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);

    const handleBook = async () => {
        if (!selectedMess || cart.length === 0) return;

        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/food/book`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                    messId: selectedMess.id,
                    items: cart.map(c => ({ itemId: c.item.id, name: c.item.name, price: c.item.price, quantity: c.quantity })),
                    totalAmount: getTotal(),
                    mealTime: 'LUNCH', // Default for now
                    scheduledDate: new Date().toISOString().split('T')[0]
                })
            });
            const data = await res.json();
            if (data.success) {
                setLastBooking(data.booking);
                setView('SUCCESS');
                setCart([]);
            }
        } catch (e) {
            alert("Booking Failed");
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (plan: 'WEEKLY' | 'MONTHLY') => {
        if (!selectedMess) return;
        try {
            setLoading(true);
            const price = plan === 'WEEKLY' ? 800 : 3000;
            const res = await fetch(`${API_BASE_URL}/api/food/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                    messId: selectedMess.id,
                    planName: `${plan} MESS PASS`,
                    type: plan,
                    startDate: new Date().toISOString(),
                    durationDays: plan === 'WEEKLY' ? 7 : 30,
                    price
                })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Subscribed to ${plan} Plan!`);
                setView('LIST');
            }
        } catch (e) {
            alert("Subscription Failed");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !messes.length) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-brand-600" /></div>;

    return (
        <div className={`${view === 'LIST' ? 'min-h-screen relative' : 'fixed inset-0 z-[60] overflow-y-auto'} bg-slate-50 dark:bg-slate-950`}>
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    {view !== 'LIST' && (
                        <button onClick={() => setView('LIST')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                            <X size={20} className="dark:text-white" />
                        </button>
                    )}
                    <h2 className="font-medium text-lg dark:text-white px-2">
                        {view === 'LIST' ? 'Nearby Messes' : (view === 'SUCCESS' ? 'Booking Confirmed' : selectedMess?.name)}
                    </h2>
                </div>
                {view === 'MENU' && (
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setView('SUBSCRIBE')} className="h-8 text-xs">Plans</Button>
                        {cart.length > 0 && (
                            <div className="flex items-center gap-1 bg-brand-600 text-white px-3 py-1 text-xs rounded-full">
                                <ShoppingBag size={12} /> {cart.reduce((s, c) => s + c.quantity, 0)}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="p-4 pb-20 max-w-lg mx-auto">

                {view === 'LIST' && (
                    <div className="space-y-6">
                        {/* Hero Banner */}


                        {/* Search & Address Bar */}
                        <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search Mess..."
                                    className="w-full pl-10 pr-2 py-2 bg-transparent outline-none text-sm dark:text-white"
                                />
                            </div>
                            <div className="w-px bg-slate-200 dark:bg-slate-800 my-1"></div>
                            <div className="relative w-24">
                                <input
                                    type="text"
                                    value={pincode}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setPincode(val);
                                        if (val.length === 6) fetchMesses(val);
                                        if (val.length === 0) fetchMesses();
                                    }}
                                    placeholder="Pin"
                                    maxLength={6}
                                    className="w-full pl-2 pr-2 py-2 bg-transparent outline-none text-sm font-bold text-center dark:text-white"
                                />
                                {loading && pincode.length === 6 && <div className="absolute right-0 top-0 bottom-0 flex items-center pr-2"><Loader2 size={12} className="animate-spin text-orange-500" /></div>}
                            </div>
                        </div>

                        {/* Categories/Chips */}
                        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                            {['All', 'Pure Veg', 'Rated 4.5+'].map((cat, i) => (
                                <button key={i} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${i === 0 ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Premium Mess Cards */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg dark:text-white">{(searchQuery || pincode) ? 'Search Results' : 'Recommended for you'}</h3>
                            {filteredMesses.map(mess => (
                                <div key={mess.id} onClick={() => handleSelectMess(mess)} className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-orange-300 transition-all active:scale-[0.98]">
                                    <div className="flex gap-4">
                                        {/* Image Placeholder */}
                                        <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0">
                                            <Utensils className="text-slate-300 dark:text-slate-600" size={32} />
                                            {mess.rating >= 4.5 && <span className="absolute top-0 left-0 bg-yellow-400 text-[9px] font-bold px-1.5 py-0.5 rounded-br-lg text-black">TOP RATED</span>}
                                        </div>

                                        <div className="flex-1 flex flex-col justify-between py-0.5">
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-bold text-base dark:text-white line-clamp-1">{mess.name}</h3>
                                                    <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                        {mess.rating} <Star size={8} fill="currentColor" />
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-500 mb-2 line-clamp-1">{mess.location}</p>
                                            </div>

                                            <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500">
                                                <span className="flex items-center gap-1"><CheckCircle size={10} className="text-blue-500" /> Monthly Plan</span>
                                                <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                                <span>1.2km</span>
                                            </div>

                                            <div className="mt-2 pt-2 border-t border-dashed border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                                <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-bold">50% OFF first order</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredMesses.length === 0 && (
                            <div className="text-center py-10">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Search className="text-slate-300" />
                                </div>
                                <p className="text-slate-500 text-sm">No messes found nearby.</p>
                            </div>
                        )}
                    </div>
                )}

                {view === 'MENU' && (
                    <div className="space-y-4">
                        {menu.map(item => (
                            <div key={item.id} className={`bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border flex gap-3 ${item.isRecommended ? 'border-brand-300 ring-1 ring-brand-100' : 'border-slate-100 dark:border-slate-800'}`}>
                                <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-lg flex-shrink-0 relative">
                                    {/* Placeholder */}
                                    {item.isRecommended && <span className="absolute -top-2 -left-2 bg-brand-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">BESTSELLER</span>}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <h4 className="font-bold text-sm dark:text-white">{item.name}</h4>
                                        <div className={`w-3 h-3 border flex items-center justify-center ${item.type === 'VEG' ? 'border-green-500' : 'border-red-500'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${item.type === 'VEG' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 line-clamp-2 my-1">{item.description}</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="font-bold text-sm dark:text-white">₹{item.price}</span>
                                        <Button onClick={() => addToCart(item)} size="sm" className="h-7 px-3 text-xs">ADD</Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {view === 'SUBSCRIBE' && selectedMess && (
                    <div className="space-y-6 pt-4 animate-fade-in">
                        <div className="text-center">
                            <h3 className="font-bold text-xl dark:text-white">Subscription Plans</h3>
                            <p className="text-sm text-slate-500">Save money with meal passes for {selectedMess.name}</p>
                        </div>

                        <div onClick={() => handleSubscribe('WEEKLY')} className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-2xl shadow-lg cursor-pointer transform hover:scale-105 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-lg">Weekly Pass</h4>
                                    <p className="opacity-80 text-xs">7 Days • Lunch & Dinner</p>
                                </div>
                                <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold">MOST POPULAR</span>
                            </div>
                            <div className="text-3xl font-bold">₹800</div>
                            <p className="text-xs opacity-70 mt-2">~₹57 per meal</p>
                        </div>

                        <div onClick={() => handleSubscribe('MONTHLY')} className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-6 rounded-2xl shadow-lg cursor-pointer transform hover:scale-105 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-lg">Monthly Pass</h4>
                                    <p className="opacity-80 text-xs">30 Days • Lunch & Dinner</p>
                                </div>
                                <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold">BEST VALUE</span>
                            </div>
                            <div className="text-3xl font-bold">₹3000</div>
                            <p className="text-xs opacity-70 mt-2">~₹50 per meal</p>
                        </div>
                    </div>
                )}

                {view === 'SUCCESS' && lastBooking && (
                    <div className="flex flex-col items-center justify-center pt-10 text-center animate-fade-in">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle size={40} className="text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold dark:text-white">Booking Confirmed!</h2>
                        <p className="text-slate-500 text-sm mt-2">Show this token at the mess counter.</p>

                        <div className="mt-8 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 w-full">
                            <p className="text-xs uppercase font-bold text-slate-400 mb-2">Your Token</p>
                            <div className="text-4xl font-mono font-bold tracking-widest text-brand-600 dark:text-brand-400 mb-4">
                                {lastBooking.token}
                            </div>
                            <div className="border-t dark:border-slate-700 pt-4 text-left space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Mess</span>
                                    <span className="font-bold dark:text-white">{selectedMess?.name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Total Paid</span>
                                    <span className="font-bold dark:text-white">₹{lastBooking.totalAmount}</span>
                                </div>
                            </div>
                        </div>

                        <Button onClick={() => setView('LIST')} className="mt-8" fullWidth>Book Another Meal</Button>
                    </div>
                )}

            </div>

            {/* Cart Footer */}
            {view === 'MENU' && cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shadow-lg">
                    <div className="max-w-lg mx-auto flex justify-between items-center">
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Total</p>
                            <p className="text-xl font-bold dark:text-white">₹{getTotal()}</p>
                        </div>
                        <Button onClick={handleBook} disabled={loading}>{loading ? 'Booking...' : 'Proceed to Pay'}</Button>
                    </div>
                </div>
            )}
        </div>
    );
};
