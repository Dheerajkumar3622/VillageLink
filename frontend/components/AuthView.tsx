
import React, { useState } from 'react';
import { UserRole, VehicleType } from '@villagelink/shared';
import { loginUser, registerUser, requestPasswordReset, resetPassword, resetPasswordViaFirebase, loginViaFirebase, registerViaFirebase } from '../services/authService';
import { auth } from './firebaseConfig';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { Button } from './Button';
import { User, Lock, Bus, Car, ArrowRight, Loader2, Armchair, Mail, Phone, ArrowLeft, Key, Bike, Truck, Mic, Activity, ShieldAlert, Store, MicOff, Utensils, Languages, Sun, Moon } from 'lucide-react';
import { TRANSLATIONS } from '@villagelink/shared';

interface AuthViewProps {
  onSuccess: (user: any) => void;
  lang?: 'EN' | 'HI';
  toggleLang?: () => void;
  toggleTheme?: () => void;
  darkMode?: boolean;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess, lang = 'EN', toggleLang, toggleTheme, darkMode }) => {
  const t = (key: keyof typeof TRANSLATIONS.EN) => TRANSLATIONS[lang][key] || TRANSLATIONS.EN[key];
  const [viewState, setViewState] = useState<'LOGIN' | 'REGISTER' | 'FORGOT' | 'RESET' | 'LOGIN_VERIFY' | 'REGISTER_VERIFY'>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isVoiceAuth, setIsVoiceAuth] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('Click mic to speak...');

  // Login State
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loginOtp, setLoginOtp] = useState('');

  // Register State
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('PASSENGER');
  const [regPass, setRegPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCapacity, setRegCapacity] = useState('40');
  const [regVehicleType, setRegVehicleType] = useState<VehicleType>('BUS');
  const [regAddress, setRegAddress] = useState('');
  const [regPincode, setRegPincode] = useState('');
  const [regOtp, setRegOtp] = useState('');

  // Reset State
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const handleLoginWithOtp = async () => {
    if (!loginId || (!/^\+?[0-9]{10,13}$/.test(loginId) && !/^[0-9]{10}$/.test(loginId))) {
      setError("Please provide a valid 10-digit number to receive OTP");
      return;
    }
    setOtpLoading(true); setError(null); setInfoMsg(null);
    try {
      // Try Firebase first
      if ((window as any).recaptchaVerifier) {
        try { (window as any).recaptchaVerifier.clear(); } catch (e) { }
      }
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-login', {
        'size': 'invisible'
      });
      const phoneNumber = loginId.startsWith('+') ? loginId : `+91${loginId}`;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, (window as any).recaptchaVerifier);
      setConfirmationResult(confirmation);
      setViewState('LOGIN_VERIFY');
      setInfoMsg(`OTP sent to ${phoneNumber}`);
    } catch (err: any) {
      console.warn("Firebase OTP failed, trying backend SMS fallback:", err.message);
      // Fallback: Use backend Fast2SMS for OTP
      try {
        const phoneNumber = loginId.startsWith('+91') ? loginId.replace('+91', '') : loginId.replace('+', '');
        const res = await fetch(`${(await import('../config')).API_BASE_URL}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: phoneNumber })
        });
        const data = await res.json();
        if (data.message || data.success) {
          setInfoMsg(data.message || "OTP sent successfully");
          setViewState('LOGIN_VERIFY');
          setConfirmationResult(null); // Will use backend verify
        } else {
          setError(data.error || "Failed to send OTP");
        }
      } catch (fallbackErr: any) {
        console.error("OTP API Error:", fallbackErr);
        setError("Failed to send OTP: " + (fallbackErr.message || "Network Error"));
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginOtp) return;
    setLoading(true); setError(null);
    try {
      if (confirmationResult) {
        // Firebase flow
        await confirmationResult.confirm(loginOtp);
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) throw new Error("No ID Token available");
        
        const res = await loginViaFirebase(idToken);
        if (res.success && res.user) {
          onSuccess(res.user);
        } else {
          setError(res.message || "Login failed after OTP verification");
        }
      } else {
        // Backend fallback flow: verify OTP via reset-password endpoint, then login
        const phoneNumber = loginId.startsWith('+91') ? loginId.replace('+91', '') : loginId.replace('+', '');
        // Try to login directly with the phone (the OTP was sent via forgot-password, 
        // so we treat a valid OTP as an authentication token)
        const { API_BASE_URL } = await import('../config');
        const verifyRes = await fetch(`${API_BASE_URL}/api/auth/verify-otp-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phoneNumber, otp: loginOtp })
        });
        const data = await verifyRes.json();
        if (data.success && data.user) {
          onSuccess(data.user);
        } else {
          setError(data.error || "Invalid OTP. Please try again.");
        }
      }
    } catch (err: any) {
      setError("Invalid OTP: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) {
      setError("Please enter both ID and Password");
      return;
    }

    setLoginLoading(true); setError(null);
    const res = await loginUser(loginId, password);
    setLoginLoading(false);

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
    if (!regName) {
      setError("Please enter your full name");
      return;
    }
    if (!regEmail && !regPhone) {
      setError("Please provide either Email or Phone number for OTP");
      return;
    }
    if (!regPass || !confirmPass) {
      setError("Please enter and confirm your password");
      return;
    }
    if (regPass !== confirmPass) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true); setError(null);
    if (regPhone) {
      try {
        if ((window as any).recaptchaVerifier) {
          try { (window as any).recaptchaVerifier.clear(); } catch (e) { }
        }
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-reg', {
          'size': 'invisible'
        });
        const phoneNumber = regPhone.startsWith('+') ? regPhone : `+91${regPhone}`;
        const confirmation = await signInWithPhoneNumber(auth, phoneNumber, (window as any).recaptchaVerifier);
        setConfirmationResult(confirmation);
        setViewState('REGISTER_VERIFY');
        setInfoMsg(`OTP sent to ${phoneNumber} for secure registration`);
      } catch (err: any) {
        setError("Failed to send Registration OTP: " + err.message);
      } finally {
        setLoading(false);
      }
    } else {
      // Legacy Flow without phone
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
    }
  };

  const verifyRegOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !regOtp) return;
    setLoading(true); setError(null);
    try {
      await confirmationResult.confirm(regOtp);
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("No ID Token available");
      
      const capacity = regRole === 'DRIVER' ? parseInt(regCapacity) : undefined;
      const res = await registerViaFirebase(idToken, regName, regRole, regEmail, capacity, regVehicleType, regAddress, regPincode);
      
      if (res.success && res.user) {
        alert("Account verified and created successfully!");
        setViewState('LOGIN');
        setLoginId(res.user?.id || regPhone);
      } else {
        setError(res.message || "Registration failed on server.");
      }
    } catch (err: any) {
      setError("Registration verification failed: " + err.message);
    } finally {
      setLoading(false);
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

      {/* Hero 3D Concept - Code Generated Cyber-Van */}
      <div className="relative z-20 flex justify-center -mb-20 pointer-events-none">
        <div className="cyber-van-v3 animate-float-banana">
          <div className="van-body">
            <div className="van-window"></div>
            <div className="van-glow"></div>
          </div>
          <div className="van-shadow"></div>
        </div>
      </div>

      <div className="glass-portal rounded-[32px] p-8 pt-16 shadow-2xl relative overflow-hidden bg-slate-900/80 backdrop-blur-xl border border-white/20">
        {/* Nano Green Glow Ball */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-luxe-gold rounded-full blur-[100px] opacity-20 animate-pulse-glow"></div>
        {/* Rust Depth Ball */}
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-luxe-rust rounded-full blur-[100px] opacity-20"></div>

        <div className="relative z-10 flex justify-between items-center mb-10 w-full px-2">
          {/* Logo Replacement for Namaste */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-brand-400 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg">V</div>
            <span className="font-bold text-xl tracking-tight text-white drop-shadow-md">Village<span className="text-luxe-gold">Link</span></span>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <button onClick={toggleLang} className="px-3 py-2 rounded-full bg-white/10 backdrop-blur-md text-white shadow-sm border border-white/20 font-bold text-xs flex items-center gap-1 hover:bg-white/20 transition-all">
              <Languages size={14} />
              {lang === 'EN' ? 'अ' : 'A'}
            </button>

            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="p-2 rounded-full bg-white/10 backdrop-blur-md text-white shadow-sm border border-white/20 hover:bg-white/20 transition-all">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        <div className="relative z-10 text-center mb-6">
          <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-md">
            {viewState.includes('LOGIN') ? "Sign In" : (viewState.includes('REGISTER') ? t('register') : 'Reset Password')}
          </h2>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 rounded-xl text-red-600 dark:text-red-300 text-sm font-medium text-center">{error}</div>}
        {infoMsg && <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 rounded-xl text-blue-600 dark:text-blue-300 text-sm font-medium text-center">{infoMsg}</div>}

        {viewState === 'LOGIN' && (
          <div className="space-y-6">
            {isVoiceAuth ? (
              <div className="py-8 flex flex-col items-center justify-center animate-fade-in glass-panel rounded-2xl border-none bg-white/5">
                <div className="w-24 h-24 bg-luxe-sienna/20 rounded-full flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 bg-luxe-sienna rounded-full animate-ping opacity-30"></div>
                  <Mic size={40} className="text-luxe-gold" />
                </div>
                <p className="text-lg font-bold text-white tracking-wide">{voiceStatus}</p>
                <button onClick={() => setIsVoiceAuth(false)} className="mt-6 px-4 py-2 rounded-full bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-all">ABORT VOICE LOGON</button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5" autoComplete="on">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white uppercase ml-1 tracking-widest drop-shadow-md">{t('phone')} / ID</label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-brand-600/30 blur-lg rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
                    <input
                      type="text"
                      name="username"
                      value={loginId}
                      onChange={e => setLoginId(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 focus:border-brand-500 dark:focus:border-brand-400 rounded-xl outline-none relative z-10 placeholder-slate-500 dark:placeholder-slate-400 font-bold transition-all shadow-inner"
                      placeholder="Enter Mobile or ID"
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-[10px] font-black text-white uppercase ml-1 tracking-widest drop-shadow-md">{t('password')}</label>
                    <button type="button" onClick={() => setViewState('FORGOT')} className="text-[10px] font-black text-luxe-gold hover:text-white transition-colors uppercase drop-shadow-md">Recover Key?</button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-brand-600/30 blur-lg rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
                    <input
                      type="password"
                      name="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 focus:border-brand-500 dark:focus:border-brand-400 rounded-xl outline-none relative z-10 placeholder-slate-500 dark:placeholder-slate-400 font-bold transition-all shadow-inner"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3 w-full">
                  <button
                    type="submit"
                    disabled={loginLoading || otpLoading}
                    className="w-full py-4 bg-luxe-sienna hover:bg-luxe-rust text-white font-black rounded-xl shadow-[0_0_20px_rgba(190,81,3,0.4)] hover:shadow-[0_0_30px_rgba(183,65,14,0.6)] transition-all transform hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-wide text-sm"
                  >
                    {loginLoading ? <Loader2 className="animate-spin" /> : <>{t('login')} <Lock size={16} /></>}
                  </button>

                  <div className="relative flex py-1 items-center opacity-50">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink-0 mx-4 text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">or</span>
                    <div className="flex-grow border-t border-white/10"></div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLoginWithOtp(); }}
                    disabled={loginLoading || otpLoading}
                    className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-xl shadow-lg transition-all transform hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-wide text-sm"
                  >
                    {otpLoading ? <Loader2 className="animate-spin" /> : <>OTP Login <Phone size={16} /></>}
                  </button>
                </div>
                <div id="recaptcha-login"></div>


              </form>
            )}
            <div className="text-center pt-2">
              <button onClick={() => setViewState('REGISTER')} className="text-sm font-bold text-white hover:text-luxe-gold transition-colors flex items-center justify-center gap-1 mx-auto drop-shadow-md">
                New User? <span className="font-black text-luxe-teal underline decoration-luxe-teal/80 underline-offset-4">Create Identity</span>
              </button>
            </div>
          </div>
        )}

        {viewState === 'REGISTER' && (
          <form onSubmit={handleRegister} className="space-y-4" autoComplete="off">
            <input type="text" name="name" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 focus:border-brand-500 dark:focus:border-brand-400 rounded-xl outline-none placeholder-slate-500 dark:placeholder-slate-400 font-bold shadow-inner transition-all" placeholder="Full Name *" required />

            <div className="space-y-2">
              <label className="text-xs font-bold text-white drop-shadow-md uppercase">Contact Info (Email OR Mobile required for OTP)*</label>
              <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={18} /><input type="email" name="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 focus:border-brand-500 dark:focus:border-brand-400 rounded-xl outline-none placeholder-slate-500 dark:placeholder-slate-400 font-bold shadow-inner transition-all" placeholder="Email Address" /></div>
              <div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={18} /><input type="tel" name="phone" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 focus:border-brand-500 dark:focus:border-brand-400 rounded-xl outline-none placeholder-slate-500 dark:placeholder-slate-400 font-bold shadow-inner transition-all" placeholder="Mobile Number" /></div>
            </div>



            {regRole === 'DRIVER' && (
              <div className="space-y-3 p-4 bg-slate-50/90 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-600 shadow-md">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase drop-shadow-sm">Vehicle Details</p>
                <div className="relative"><Armchair className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300" size={18} /><input type="number" value={regCapacity} onChange={e => setRegCapacity(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-500 font-medium" placeholder="Seats Capacity" required /></div>
                <div className="grid grid-cols-4 gap-2">
                  {(['BUS', 'TAXI', 'AUTO', 'BIKE'] as VehicleType[]).map(type => (
                    <div
                      key={type}
                      onClick={() => setRegVehicleType(type)}
                      className={`cursor-pointer p-2 rounded-lg border flex flex-col items-center justify-center gap-1 ${regVehicleType === type ? 'bg-luxe-sienna text-white border-luxe-sienna' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'}`}
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

            <div className="space-y-2">
              <input type="password" name="new-password" value={regPass} onChange={e => setRegPass(e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 focus:border-brand-500 dark:focus:border-brand-400 rounded-xl outline-none placeholder-slate-500 dark:placeholder-slate-400 font-bold shadow-inner transition-all" placeholder="Create Password *" autoComplete="new-password" required />
              <input type="password" name="confirm-password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 focus:border-brand-500 dark:focus:border-brand-400 rounded-xl outline-none placeholder-slate-500 dark:placeholder-slate-400 font-bold shadow-inner transition-all" placeholder="Confirm Password *" required />
            </div>

            <div id="recaptcha-reg"></div>
            <Button type="submit" fullWidth disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : t('register')}</Button>
            <button type="button" onClick={() => setViewState('LOGIN')} className="w-full text-center text-sm font-bold text-white drop-shadow-md hover:text-luxe-gold transition-colors mt-3">Back to Login</button>
          </form>
        )}

        {viewState === 'LOGIN_VERIFY' && (
          <form onSubmit={verifyLoginOtp} className="space-y-4">
            <div className="bg-brand-50 dark:bg-brand-900/30 p-3 rounded-lg text-center text-xs text-brand-700 dark:text-brand-300">
              Enter the OTP sent to <b>{loginId}</b> for Secure Login
            </div>
            <div className="relative"><Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={18} /><input type="text" value={loginOtp} onChange={e => setLoginOtp(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 focus:border-brand-500 dark:focus:border-brand-400 rounded-xl outline-none text-slate-900 dark:text-white text-center tracking-[0.5em] font-bold text-xl shadow-inner transition-all" placeholder="XXXXXX" maxLength={6} required /></div>
            <Button type="submit" fullWidth disabled={loading}>Verify & Login</Button>
            <button type="button" onClick={() => setViewState('LOGIN')} className="w-full text-center text-sm font-bold text-slate-400 mt-2">Cancel</button>
          </form>
        )}

        {viewState === 'REGISTER_VERIFY' && (
          <form onSubmit={verifyRegOtp} className="space-y-4">
            <div className="bg-brand-50 dark:bg-brand-900/30 p-3 rounded-lg text-center text-xs text-brand-700 dark:text-brand-300">
              Enter the OTP sent to <b>{regPhone}</b> to Complete Registration
            </div>
            <div className="relative"><Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={18} /><input type="text" value={regOtp} onChange={e => setRegOtp(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 focus:border-brand-500 dark:focus:border-brand-400 rounded-xl outline-none text-slate-900 dark:text-white text-center tracking-[0.5em] font-bold text-xl shadow-inner transition-all" placeholder="XXXXXX" maxLength={6} required /></div>
            <Button type="submit" fullWidth disabled={loading}>Verify & Register</Button>
            <button type="button" onClick={() => setViewState('LOGIN')} className="w-full text-center text-sm font-bold text-slate-400 mt-2">Cancel</button>
          </form>
        )}

        {viewState === 'FORGOT' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <p className="text-sm font-medium text-white drop-shadow-md mb-2">Enter your registered Email or Mobile Number to receive a reset OTP.</p>
            <input type="text" value={resetIdentifier} onChange={e => setResetIdentifier(e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 focus:border-brand-500 dark:focus:border-brand-400 rounded-xl outline-none placeholder-slate-500 dark:placeholder-slate-400 font-bold shadow-inner transition-all" placeholder="Email or Phone" required />
            <div id="recaptcha-container"></div>
            <Button type="submit" fullWidth disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Send OTP"}</Button>
            <button type="button" onClick={() => setViewState('LOGIN')} className="w-full text-center text-sm font-bold text-white drop-shadow-md hover:text-luxe-gold mt-3">Cancel</button>
          </form>
        )}

        {viewState === 'RESET' && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="bg-brand-50/90 dark:bg-brand-900/80 p-3 rounded-xl text-center text-xs text-brand-700 dark:text-brand-300 shadow-sm border border-brand-200 dark:border-brand-700 font-medium">
              Enter the OTP sent to <b className="text-brand-800 dark:text-brand-200">{resetIdentifier}</b>
            </div>
            <div className="relative"><Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={18} /><input type="text" value={resetToken} onChange={e => setResetToken(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 focus:border-brand-500 dark:focus:border-brand-400 rounded-xl outline-none placeholder-slate-500 dark:placeholder-slate-400 font-bold text-center tracking-[0.5em] text-xl shadow-inner transition-all" placeholder="XXXXXX" maxLength={6} required /></div>
            <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={18} /><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 focus:border-brand-500 dark:focus:border-brand-400 rounded-xl outline-none placeholder-slate-500 dark:placeholder-slate-400 font-bold shadow-inner transition-all" placeholder="New Password" required /></div>
            <Button type="submit" fullWidth disabled={loading} className="shadow-lg hover:shadow-xl transition-shadow font-bold">Verify & Reset Password</Button>
          </form>
        )}
      </div>
    </div>

  );
};
