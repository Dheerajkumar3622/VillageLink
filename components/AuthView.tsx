
import React, { useState } from 'react';
import { UserRole, VehicleType } from '../types';
import { loginUser, registerUser, requestPasswordReset, resetPassword, resetPasswordViaFirebase } from '../services/authService';
import { auth } from './firebaseConfig';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { Button } from './Button';
import { User, Lock, Bus, Car, ArrowRight, Loader2, Armchair, Mail, Phone, ArrowLeft, Key, Bike, Truck, Mic, Activity, ShieldAlert, Store, MicOff, Utensils } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface AuthViewProps {
  onSuccess: (user: any) => void;
  lang?: 'EN' | 'HI';
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess, lang = 'EN' }) => {
  const t = (key: keyof typeof TRANSLATIONS.EN) => TRANSLATIONS[lang][key] || TRANSLATIONS.EN[key];
  const [viewState, setViewState] = useState<'LOGIN' | 'REGISTER' | 'FORGOT' | 'RESET'>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isVoiceAuth, setIsVoiceAuth] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('Click mic to speak...');

  // Login State
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  // Register State
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('PASSENGER');
  const [regPass, setRegPass] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCapacity, setRegCapacity] = useState('40');
  const [regVehicleType, setRegVehicleType] = useState<VehicleType>('BUS');
  const [regAddress, setRegAddress] = useState('');
  const [regPincode, setRegPincode] = useState('');

  // Reset State
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) {
      setError("Please enter both ID and Password");
      return;
    }

    setLoading(true); setError(null);
    const res = await loginUser(loginId, password);
    setLoading(false);

    if (res.success && res.user) {
      onSuccess(res.user);
    } else {
      setError(res.message || 'Login failed');
    }
  };

  const handleVoiceLogin = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError("Voice Login not supported in this browser.");
      return;
    }

    setIsVoiceAuth(true);
    setVoiceStatus("Listening... Say 'Login as Passenger'");

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      setVoiceStatus(`Heard: "${transcript}"`);

      // Simple Phrase Matching for Demo (Real app would use Voice Print Biometrics)
      if (transcript.includes('passenger') || transcript.includes('login')) {
        setVoiceStatus("Voice Verified. Logging in...");
        const res = await loginUser('USR-999', 'pass'); // Demo User
        if (res.success && res.user) {
          onSuccess(res.user);
        } else {
          setError("Voice match failed.");
          setIsVoiceAuth(false);
        }
      } else {
        setError("Phrase not recognized. Try 'Login as Passenger'");
        setTimeout(() => setIsVoiceAuth(false), 2000);
      }
    };

    recognition.onerror = (event: any) => {
      setError("Voice Error: " + event.error);
      setIsVoiceAuth(false);
    };

    recognition.onend = () => {
      if (voiceStatus.startsWith("Listening")) {
        setIsVoiceAuth(false);
      }
    };

    recognition.start();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail && !regPhone) {
      setError("Please provide either Email or Phone number");
      return;
    }
    setLoading(true); setError(null);
    const capacity = regRole === 'DRIVER' ? parseInt(regCapacity) : undefined;

    const res = await registerUser(regName, regRole, regPass, regEmail, regPhone, capacity, regVehicleType, regAddress, regPincode);
    setLoading(false);
    if (res.success && res.user) {
      alert(`Account Created! User ID: ${res.user.id}`);
      setViewState('LOGIN');
      setLoginId(res.user.id);
    } else {
      setError(res.message || "Registration failed");
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);

    // Initial check: Is it a phone number?
    const isPhone = /^\+?[0-9]{10,13}$/.test(resetIdentifier) || /^[0-9]{10}$/.test(resetIdentifier);

    if (isPhone) {
      // Use Firebase Phone Auth
      try {
        // Always create a fresh RecaptchaVerifier
        if ((window as any).recaptchaVerifier) {
          try { (window as any).recaptchaVerifier.clear(); } catch (e) { }
        }
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': () => console.log('reCAPTCHA solved')
        });

        const appVerifier = (window as any).recaptchaVerifier;
        const phoneNumber = resetIdentifier.startsWith('+') ? resetIdentifier : `+91${resetIdentifier}`;

        console.log('Sending OTP to:', phoneNumber);
        const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        setConfirmationResult(confirmation);
        setInfoMsg(`OTP sent to ${phoneNumber} via Firebase`);
        setViewState('RESET');
      } catch (err: any) {
        console.error('Firebase OTP Error:', err);
        // Clear verifier on error
        if ((window as any).recaptchaVerifier) {
          try { (window as any).recaptchaVerifier.clear(); } catch (e) { }
          (window as any).recaptchaVerifier = null;
        }
        setError("Firebase SMS Failed: " + err.message);
      } finally {
        setLoading(false);
      }
    } else {
      // Use Legacy Email/SMS Flow
      const res = await requestPasswordReset(resetIdentifier);
      setLoading(false);
      if (res.error) {
        setError(res.error);
      } else {
        const otpMsg = res.otp ? ` (Simulated OTP: ${res.otp})` : '';
        setInfoMsg(res.message + otpMsg);
        setViewState('RESET');
      }
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);

    if (confirmationResult) {
      // Verify Firebase OTP
      try {
        await confirmationResult.confirm(resetToken);
        // Success: Get ID Token
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) throw new Error("Failed to retrieve token");

        // Send to backend to update password
        const res = await resetPasswordViaFirebase(idToken, newPassword);

        if (res.success) {
          alert("Password Reset Successfully!");
          setViewState('LOGIN');
          setLoginId(resetIdentifier);
          setPassword(newPassword);
        } else {
          setError(res.message || "Backend update failed");
        }
      } catch (err: any) {
        setError("Invalid OTP or Verification Failed: " + err.message);
      } finally {
        setLoading(false);
      }
    } else {
      // Legacy Verify
      const res = await resetPassword(resetIdentifier, resetToken, newPassword);
      setLoading(false);
      if (res.error) {
        setError(res.error);
      } else {
        alert(res.message);
        setViewState('LOGIN');
        setLoginId(resetIdentifier);
        setPassword(newPassword);
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in relative">
      {/* Animated Background (Veo Placeholder) */}
      <div className="animated-bg"></div>

      {/* Hero 3D Image */}
      <div className="flex justify-center mb-6">
        <img
          src="/assets/hero-bus-icon.png"
          alt="VillageLink Transport"
          className="w-24 h-24 object-contain drop-shadow-lg animate-pulse-glow rounded-full"
        />
      </div>

      <div className="glass-panel rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-400 rounded-full blur-[60px] opacity-30"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-accent-400 rounded-full blur-[60px] opacity-30"></div>

        <div className="relative z-10">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-accent-500 dark:from-brand-400 dark:to-accent-400">
              {viewState === 'LOGIN' ? t('welcome') : (viewState === 'REGISTER' ? t('register') : 'Reset Password')}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              Premium Transport Connectivity
            </p>
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 rounded-xl text-red-600 dark:text-red-300 text-sm font-medium text-center">{error}</div>}
          {infoMsg && <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 rounded-xl text-blue-600 dark:text-blue-300 text-sm font-medium text-center">{infoMsg}</div>}

          {viewState === 'LOGIN' && (
            <div className="space-y-4">
              {isVoiceAuth ? (
                <div className="py-8 flex flex-col items-center justify-center animate-fade-in">
                  <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mb-4 relative">
                    <div className="absolute inset-0 bg-brand-500 rounded-full animate-ping opacity-20"></div>
                    <Mic size={32} className="text-brand-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-white">{voiceStatus}</p>
                  <button onClick={() => setIsVoiceAuth(false)} className="mt-4 text-xs text-red-500 underline">Cancel</button>
                </div>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4" autoComplete="on">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">{t('phone')} / Email</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        name="username"
                        value={loginId}
                        onChange={e => setLoginId(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white"
                        placeholder="Enter credential"
                        autoComplete="username"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">{t('password')}</label>
                      <button type="button" onClick={() => setViewState('FORGOT')} className="text-xs font-bold text-brand-600 dark:text-brand-400">Forgot?</button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="password"
                        name="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" fullWidth disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : t('login')}</Button>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                    <span className="flex-shrink-0 mx-4 text-xs text-slate-400 font-bold uppercase">OR</span>
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                  </div>

                  <button
                    type="button"
                    onClick={handleVoiceLogin}
                    className="w-full py-3 rounded-xl border border-brand-200 dark:border-slate-700 flex items-center justify-center gap-2 hover:bg-brand-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Activity size={18} className="text-brand-500" />
                    <span className="text-sm font-bold text-brand-700 dark:text-brand-400">Voice Login</span>
                  </button>
                </form>
              )}
              <div className="text-center pt-2">
                <button onClick={() => setViewState('REGISTER')} className="text-sm font-semibold text-brand-600 dark:text-brand-400 flex items-center justify-center gap-1 mx-auto">{t('register')} <ArrowRight size={14} /></button>
              </div>
            </div>
          )}

          {viewState === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-4" autoComplete="off">
              <div className="grid grid-cols-4 gap-2 mb-4">
                <button type="button" onClick={() => setRegRole('PASSENGER')} className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${regRole === 'PASSENGER' ? 'bg-brand-50 border-brand-500 text-brand-700' : 'border-slate-200 text-slate-500'}`}><User size={18} /><span className="text-[9px] font-bold">{t('passenger')}</span></button>
                <button type="button" onClick={() => setRegRole('DRIVER')} className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${regRole === 'DRIVER' ? 'bg-brand-50 border-brand-500 text-brand-700' : 'border-slate-200 text-slate-500'}`}><Car size={18} /><span className="text-[9px] font-bold">{t('driver')}</span></button>
                <button type="button" onClick={() => setRegRole('SHOPKEEPER')} className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${regRole === 'SHOPKEEPER' ? 'bg-brand-50 border-brand-500 text-brand-700' : 'border-slate-200 text-slate-500'}`}><Store size={18} /><span className="text-[9px] font-bold">{t('shopkeeper')}</span></button>
                <button type="button" onClick={() => setRegRole('MESS_MANAGER')} className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${regRole === 'MESS_MANAGER' ? 'bg-brand-50 border-brand-500 text-brand-700' : 'border-slate-200 text-slate-500'}`}><Utensils size={18} /><span className="text-[9px] font-bold">Mess</span></button>
              </div>
              <input type="text" name="name" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white" placeholder={regRole === 'MESS_MANAGER' ? "Mess Name" : "Full Name"} required />

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Contact Info (At least one)</label>
                <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="email" name="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white" placeholder="Email Address" /></div>
                <div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="tel" name="phone" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white" placeholder="Mobile Number" /></div>
              </div>

              {regRole === 'MESS_MANAGER' && (
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 animate-fade-in">
                  <p className="text-xs font-bold text-slate-500 uppercase">Mess Location</p>
                  <input type="text" value={regAddress} onChange={e => setRegAddress(e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white" placeholder="Full Address / Shop No." required />
                  <input type="text" value={regPincode} onChange={e => setRegPincode(e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white" placeholder="Pin Code" maxLength={6} required />
                </div>
              )}

              {regRole === 'DRIVER' && (
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-500 uppercase">Vehicle Details</p>
                  <div className="relative"><Armchair className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="number" value={regCapacity} onChange={e => setRegCapacity(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white" placeholder="Seats Capacity" required /></div>
                  <div className="grid grid-cols-4 gap-2">
                    {(['BUS', 'TAXI', 'AUTO', 'BIKE'] as VehicleType[]).map(type => (
                      <div
                        key={type}
                        onClick={() => setRegVehicleType(type)}
                        className={`cursor-pointer p-2 rounded-lg border flex flex-col items-center justify-center gap-1 ${regVehicleType === type ? 'bg-brand-500 text-white border-brand-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'}`}
                      >
                        {type === 'BUS' && <Bus size={16} />}
                        {type === 'TAXI' && <Car size={16} />}
                        {type === 'AUTO' && <Truck size={16} />}
                        {type === 'BIKE' && <Bike size={16} />}
                        <span className="text-[9px] font-bold">{type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <input type="password" name="new-password" value={regPass} onChange={e => setRegPass(e.target.value)} className="w-full px-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white" placeholder="Password" autoComplete="new-password" required />

              <Button type="submit" fullWidth disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : t('register')}</Button>
              <button type="button" onClick={() => setViewState('LOGIN')} className="w-full text-center text-sm font-bold text-slate-400 mt-2">Back to Login</button>
            </form>
          )}

          {viewState === 'FORGOT' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="text-sm text-slate-500 mb-2">Enter your registered Email or Mobile Number to receive a reset OTP.</p>
              <input type="text" value={resetIdentifier} onChange={e => setResetIdentifier(e.target.value)} className="w-full px-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white" placeholder="Email or Phone" required />
              <div id="recaptcha-container"></div>
              <Button type="submit" fullWidth disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Send OTP"}</Button>
              <button type="button" onClick={() => setViewState('LOGIN')} className="w-full text-center text-sm font-bold text-slate-400 mt-2">Cancel</button>
            </form>
          )}

          {viewState === 'RESET' && (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="bg-brand-50 dark:bg-brand-900/30 p-3 rounded-lg text-center text-xs text-brand-700 dark:text-brand-300">
                Enter the OTP sent to <b>{resetIdentifier}</b>
              </div>
              <div className="relative"><Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" value={resetToken} onChange={e => setResetToken(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white text-center tracking-[0.5em] font-bold text-xl" placeholder="XXXXXX" maxLength={6} required /></div>
              <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white" placeholder="New Password" required /></div>
              <Button type="submit" fullWidth disabled={loading}>Verify & Reset Password</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
