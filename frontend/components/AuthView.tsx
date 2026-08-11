
import React, { useState, useEffect } from 'react';
import { UserRole, VehicleType, TRANSLATIONS } from '@villagelink/shared';
import { loginUser, registerUser, requestPasswordReset, resetPassword, resetPasswordViaFirebase, loginViaFirebase, registerViaFirebase } from '../services/authService';
import { Button } from './Button';
import { AuthRoleTabs, AuthPortalRole } from './AuthRoleTabs';
import { User, Lock, Bus, Car, ArrowRight, Loader2, Armchair, Mail, Phone, ArrowLeft, Key, Bike, Truck, Mic, Activity, ShieldAlert, Store, UtensilsCrossed, Wheat, Package, Shield, RefreshCw, Languages, Sun, Moon } from 'lucide-react';

type ConfirmationResult = import('firebase/auth').ConfirmationResult;
const getFirebase = async () => {
  const [{ auth }, firebaseAuth] = await Promise.all([
    import('./firebaseConfig'),
    import('firebase/auth')
  ]);
  return { auth, ...firebaseAuth };
};

interface AuthViewProps {
  onSuccess: (user: any) => void;
  lang?: 'EN' | 'HI';
  toggleLang?: () => void;
  toggleTheme?: () => void;
  darkMode?: boolean;
  initialRole?: AuthPortalRole;
  showRoleTabs?: boolean;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onSuccess,
  lang = 'EN',
  toggleLang,
  toggleTheme,
  darkMode,
  initialRole = 'USER',
  showRoleTabs = false
}) => {
  const t = (key: keyof typeof TRANSLATIONS.EN) => TRANSLATIONS[lang][key] || TRANSLATIONS.EN[key];
  const [activePortalRole, setActivePortalRole] = useState<AuthPortalRole>(initialRole);
  const [viewState, setViewState] = useState<'LOGIN' | 'REGISTER' | 'FORGOT' | 'RESET' | 'LOGIN_VERIFY' | 'REGISTER_VERIFY'>('LOGIN');

  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Resend OTP Timer State
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Login State
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loginOtp, setLoginOtp] = useState('');

  // Register State
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState<UserRole>(initialRole === 'PROVIDER' ? 'DRIVER' : 'PASSENGER');
  const [regPass, setRegPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCapacity, setRegCapacity] = useState('40');
  const [regVehicleType, setRegVehicleType] = useState<VehicleType>('BUS');
  const [regAddress, setRegAddress] = useState('');
  const [regPincode, setRegPincode] = useState('');
  const [regOtp, setRegOtp] = useState('');

  // Reset & Firebase State
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Handle Resend Countdown Timer
  useEffect(() => {
    let interval: any = null;
    if ((viewState === 'LOGIN_VERIFY' || viewState === 'REGISTER_VERIFY' || viewState === 'RESET') && resendTimer > 0) {
      setCanResend(false);
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [viewState, resendTimer]);

  // WebOTP API Auto-retrieval listener for 1-tap seamless verification
  useEffect(() => {
    if ((viewState === 'LOGIN_VERIFY' || viewState === 'REGISTER_VERIFY') && 'OTPCredential' in window) {
      const ac = new AbortController();
      (navigator.credentials as any)?.get({
        otp: { transport: ['sms'] },
        signal: ac.signal
      }).then((otpCredential: any) => {
        if (otpCredential && otpCredential.code) {
          if (viewState === 'LOGIN_VERIFY') setLoginOtp(otpCredential.code);
          else setRegOtp(otpCredential.code);
          setInfoMsg("✨ 1-Tap Auto Verification: OTP retrieved from device!");
        }
      }).catch((err: any) => {
        console.log("WebOTP auto-retrieval active/pending");
      });
      return () => ac.abort();
    }
  }, [viewState]);

  const handlePortalChange = (role: AuthPortalRole) => {
    setActivePortalRole(role);
    setError(null);
    setInfoMsg(null);
    if (role === 'USER') {
      setRegRole('PASSENGER');
    } else if (role === 'PROVIDER') {
      setRegRole('DRIVER');
    }
  };

  const startResendTimer = () => {
    setResendTimer(30);
    setCanResend(false);
  };

  const formatFirebaseError = (err: any): string => {
    const code = err?.code || '';
    const msg = err?.message || String(err);
    if (code.includes('operation-not-allowed')) {
      return 'Firebase Phone Auth is disabled. Please enable Phone sign-in under Firebase Console > Authentication > Sign-in method.';
    }
    if (code.includes('unauthorized-domain') || code.includes('auth-domain-config-required')) {
      return 'Domain/IP not authorized in Firebase Console. Please add current URL/IP under Authentication > Settings > Authorized domains.';
    }
    if (code.includes('invalid-phone-number')) {
      return 'Invalid phone number. Please enter a valid 10-digit mobile number.';
    }
    if (code.includes('too-many-requests') || code.includes('quota-exceeded')) {
      return 'SMS Quota Exceeded. Please wait a few minutes or use Firebase test numbers (+919999999999 / code: 123456).';
    }
    if (code.includes('captcha-check-failed') || code.includes('invalid-app-credential')) {
      return 'Recaptcha verification failed. Please refresh the page and try again.';
    }
    return `Firebase Phone Auth Error: ${msg}`;
  };

  // Helper for backend OTP sending with 404 route fallback
  const sendBackendOtp = async (targetId: string) => {
    const { API_BASE_URL } = await import('../config');
    let res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: targetId })
    });
    if (res.status === 404) {
      res = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: targetId })
      });
    }
    return await res.json();
  };

  // Helper for resilient Firebase Phone Auth execution with timeout race against hanging reCAPTCHA
  const executeFirebasePhoneAuth = async (phoneNumber: string): Promise<ConfirmationResult> => {
    const fb = await getFirebase();
    if ((window as any).recaptchaVerifier) {
      try { (window as any).recaptchaVerifier.clear(); } catch (e) { }
    }
    const verifier = new fb.RecaptchaVerifier(fb.auth, 'recaptcha-container-auth', {
      'size': 'invisible',
      'callback': () => {},
      'expired-callback': () => {}
    });
    (window as any).recaptchaVerifier = verifier;

    const phoneAuthPromise = fb.signInWithPhoneNumber(fb.auth, phoneNumber, verifier);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('reCAPTCHA / Phone Auth verification timed out after 2.5s')), 2500)
    );

    return await Promise.race([phoneAuthPromise, timeoutPromise]);
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    startResendTimer();
    setError(null);
    setInfoMsg("Resending OTP...");

    const targetId = viewState === 'LOGIN_VERIFY' ? loginId : (viewState === 'REGISTER_VERIFY' ? (regPhone || regEmail) : resetIdentifier);
    if (!targetId) {
      setError("Target Mobile / Email is missing");
      return;
    }

    const isPhone = /^\+?[0-9]{10,13}$/.test(targetId) || /^[0-9]{10}$/.test(targetId);
    if (isPhone) {
      try {
        const phoneNumber = targetId.startsWith('+') ? targetId : `+91${targetId.replace(/\D/g, '').slice(-10)}`;
        const confirmation = await executeFirebasePhoneAuth(phoneNumber);
        setConfirmationResult(confirmation);
        setInfoMsg(`Real SMS OTP re-sent to ${phoneNumber} via Firebase!`);
      } catch (fbErr: any) {
        console.warn("Firebase Resend SMS fallback:", fbErr);
        try {
          const data = await sendBackendOtp(targetId);
          setConfirmationResult(null);
          setInfoMsg((data.message || 'OTP re-sent!') + (data.otp ? ` (OTP Code: ${data.otp})` : ''));
        } catch (e: any) {
          setError(formatFirebaseError(fbErr));
        }
      }
    } else {
      try {
        const data = await sendBackendOtp(targetId);
        setInfoMsg(data.message || 'OTP re-sent successfully!');
      } catch (e: any) {
        setError("Resend Email OTP failed: " + e.message);
      }
    }
  };

  // Helper to parse any mobile number format to E.164 (+91XXXXXXXXXX)
  const normalizePhoneInput = (input: string): string | null => {
    const digits = input.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (digits.length === 13 && digits.startsWith('091')) return `+${digits.slice(1)}`;
    if (input.startsWith('+') && digits.length >= 10 && digits.length <= 13) return input;
    return null;
  };

  const handleLoginWithOtp = async () => {
    const trimmedId = loginId.trim();
    if (!trimmedId) {
      setError("Please enter your 10-digit Mobile number or Email address");
      return;
    }

    const formattedPhone = normalizePhoneInput(trimmedId);

    setOtpLoading(true); setError(null); setInfoMsg(null);
    if (formattedPhone) {
      try {
        const confirmation = await executeFirebasePhoneAuth(formattedPhone);
        setConfirmationResult(confirmation);
        setViewState('LOGIN_VERIFY');
        setInfoMsg(`Real SMS OTP sent to ${formattedPhone} via Firebase!`);
        startResendTimer();
      } catch (fbErr: any) {
        console.warn("Firebase Phone Auth fallback:", fbErr);
        try {
          const data = await sendBackendOtp(formattedPhone);
          setConfirmationResult(null);
          setViewState('LOGIN_VERIFY');
          startResendTimer();
          if (data.otp) {
            setInfoMsg(`OTP Code: ${data.otp} (Firebase Console Setup Pending: ${formatFirebaseError(fbErr)})`);
          } else {
            setInfoMsg(data.message || "OTP sent");
          }
        } catch (fallbackErr: any) {
          setError(formatFirebaseError(fbErr));
        }
      } finally {
        setOtpLoading(false);
      }
    } else {
      // Email Flow
      try {
        const data = await sendBackendOtp(trimmedId);
        if (data.success || data.message) {
          setConfirmationResult(null);
          setInfoMsg((data.message || "OTP sent") + (data.otp ? ` (Dev OTP: ${data.otp})` : ''));
          setViewState('LOGIN_VERIFY');
          startResendTimer();
        } else {
          setError(data.error || "Failed to send OTP");
        }
      } catch (err: any) {
        setError("Failed to send Email OTP: " + err.message);
      } finally {
        setOtpLoading(false);
      }
    }
  };

  const verifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginOtp) return;
    setLoading(true); setError(null);
    try {
      if (confirmationResult) {
        // Firebase Phone Auth Verification
        await confirmationResult.confirm(loginOtp.trim());
        const fb = await getFirebase();
        const idToken = await fb.auth.currentUser?.getIdToken();
        if (!idToken) throw new Error("No ID Token received from Firebase");

        const res = await loginViaFirebase(idToken);
        if (res.success && res.user) {
          onSuccess(res.user);
        } else {
          setError(res.message || "Login failed after Firebase SMS OTP verification");
        }
      } else {
        // Backend OTP Verification
        const { API_BASE_URL } = await import('../config');
        const verifyRes = await fetch(`${API_BASE_URL}/api/auth/verify-otp-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: loginId.trim(),
            otp: loginOtp.trim(),
            role: activePortalRole === 'PROVIDER' ? regRole : 'PASSENGER'
          })
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
      setError("Please enter both ID/Mobile/Email and Password");
      return;
    }

    setLoginLoading(true); setError(null);
    const res = await loginUser(loginId, password, activePortalRole === 'ADMIN' ? 'ADMIN' : (activePortalRole === 'PROVIDER' ? 'PROVIDER' : 'USER'));
    setLoginLoading(false);

    if (res.success && res.user) {
      onSuccess(res.user);
    } else {
      setError(res.message || 'Login failed');
    }
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

    const targetId = (regPhone || regEmail).trim();
    const isPhone = /^\+?[0-9]{10,13}$/.test(targetId) || /^[0-9]{10}$/.test(targetId);

    if (isPhone) {
      setViewState('REGISTER_VERIFY');
      startResendTimer();
      setInfoMsg("Sending OTP...");
      try {
        const data = await sendBackendOtp(targetId);
        setConfirmationResult(null);
        if (data.otp) {
          setInfoMsg(`OTP Code: ${data.otp}`);
        } else {
          setInfoMsg(data.message || "OTP sent to your mobile number!");
        }
      } catch (err: any) {
        console.warn("Backend SMS failed, attempting Firebase Phone Auth fallback:", err);
        try {
          const phoneNumber = targetId.startsWith('+') ? targetId : `+91${targetId.replace(/\D/g, '').slice(-10)}`;
          const confirmation = await executeFirebasePhoneAuth(phoneNumber);
          setConfirmationResult(confirmation);
          setInfoMsg(`Real SMS OTP sent to ${phoneNumber} via Firebase!`);
        } catch (fbErr: any) {
          setError(formatFirebaseError(fbErr));
        }
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const data = await sendBackendOtp(targetId);
        if (data.success || data.message) {
          setConfirmationResult(null);
          setViewState('REGISTER_VERIFY');
          setInfoMsg((data.message || "OTP sent") + (data.otp ? ` (Dev OTP: ${data.otp})` : ''));
          startResendTimer();
        } else {
          setError(data.error || "Failed to send Registration OTP");
        }
      } catch (err: any) {
        setError("Failed to send Registration OTP: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const verifyRegOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regOtp) return;
    setLoading(true); setError(null);
    try {
      if (confirmationResult) {
        await confirmationResult.confirm(regOtp.trim());
        const fb = await getFirebase();
        const idToken = await fb.auth.currentUser?.getIdToken();
        if (!idToken) throw new Error("No ID Token available");

        const capacity = regRole === 'DRIVER' ? parseInt(regCapacity) : undefined;
        const res = await registerViaFirebase(idToken, regName, regRole, regEmail, capacity, regVehicleType, regAddress, regPincode);
        if (res.success && res.user) {
          onSuccess(res.user);
        } else {
          setError(res.message || "Registration failed on server.");
        }
      } else {
        const capacity = regRole === 'DRIVER' ? parseInt(regCapacity) : undefined;
        const vehicleType = regRole === 'DRIVER' ? regVehicleType : undefined;

        const res = await registerUser(
          regName,
          regRole,
          regPass,
          regEmail,
          regPhone,
          capacity,
          vehicleType,
          regAddress,
          regPincode
        );

        if (res.success && res.user) {
          onSuccess(res.user);
        } else if (res.success && res.pendingVerification) {
          setViewState('LOGIN');
          setInfoMsg("Account registered! Pending admin verification.");
        } else {
          setError(res.message || "Registration failed.");
        }
      }
    } catch (err: any) {
      setError("Registration verification failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier) {
      setError("Enter registered Email or Mobile number");
      return;
    }
    setLoading(true); setError(null);

    const targetId = resetIdentifier.trim();
    const isPhone = /^\+?[0-9]{10,13}$/.test(targetId) || /^[0-9]{10}$/.test(targetId);

    if (isPhone) {
      setViewState('RESET');
      startResendTimer();
      setInfoMsg("Sending OTP...");
      try {
        const data = await sendBackendOtp(targetId);
        setConfirmationResult(null);
        if (data.otp) {
          setInfoMsg(`OTP Code: ${data.otp}`);
        } else {
          setInfoMsg(data.message || "OTP sent to your mobile number!");
        }
      } catch (err: any) {
        console.warn("Backend SMS failed, attempting Firebase Phone Auth fallback:", err);
        try {
          const phoneNumber = targetId.startsWith('+') ? targetId : `+91${targetId.replace(/\D/g, '').slice(-10)}`;
          const confirmation = await executeFirebasePhoneAuth(phoneNumber);
          setConfirmationResult(confirmation);
          setInfoMsg(`Real SMS OTP sent to ${phoneNumber} via Firebase!`);
        } catch (fbErr: any) {
          setError(formatFirebaseError(fbErr));
        }
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const data = await sendBackendOtp(targetId);
        setConfirmationResult(null);
        setInfoMsg((data.message || "OTP Sent") + (data.otp ? ` (Dev OTP: ${data.otp})` : ''));
        setViewState('RESET');
        startResendTimer();
      } catch (err: any) {
        setError("Forgot password failed: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword) return;
    setLoading(true); setError(null);

    if (confirmationResult) {
      try {
        await confirmationResult.confirm(resetToken.trim());
        const fb = await getFirebase();
        const idToken = await fb.auth.currentUser?.getIdToken();
        if (!idToken) throw new Error("No ID Token available");

        const res = await resetPasswordViaFirebase(idToken, newPassword);
        if (res.success) {
          alert("Password Reset Successfully!");
          setViewState('LOGIN');
          setLoginId(resetIdentifier);
          setPassword(newPassword);
        } else {
          setError((res.message || res.error || "Backend update failed") as string);
        }
      } catch (err: any) {
        setError("Invalid OTP or Verification Failed: " + err.message);
      } finally {
        setLoading(false);
      }
    } else {
      const res = await resetPassword(resetIdentifier, resetToken, newPassword);
      setLoading(false);
      if (res.error) {
        setError(res.error);
      } else {
        alert(res.message || "Password reset successful!");
        setViewState('LOGIN');
        setLoginId(resetIdentifier);
        setPassword(newPassword);
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in relative">
      <div className="animated-bg"></div>

      {/* Invisible Recaptcha Container */}
      <div id="recaptcha-container-auth"></div>

      {/* Cyber Van Logo Concept */}
      <div className="relative z-20 flex justify-center -mb-20 pointer-events-none">
        <div className="cyber-van-v3 animate-float-banana">
          <div className="van-body">
            <div className="van-window"></div>
            <div className="van-glow"></div>
          </div>
          <div className="van-shadow"></div>
        </div>
      </div>

      <div className="glass-portal rounded-[32px] p-8 pt-16 shadow-2xl relative overflow-hidden bg-slate-900/85 backdrop-blur-xl border border-white/20">
        <div className="relative z-10 flex justify-between items-center mb-6 w-full px-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-brand-400 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg">V</div>
            <span className="font-bold text-xl tracking-tight text-white drop-shadow-md">Village<span className="text-luxe-gold">Link</span></span>
          </div>

          <div className="flex items-center gap-2">
            {toggleLang && (
              <button onClick={toggleLang} className="px-3 py-2 rounded-full bg-white/10 backdrop-blur-md text-white shadow-sm border border-white/20 font-bold text-xs flex items-center gap-1 hover:bg-white/20 transition-all">
                <Languages size={14} />
                {lang === 'EN' ? 'अ' : 'A'}
              </button>
            )}

            {toggleTheme && (
              <button onClick={toggleTheme} className="p-2 rounded-full bg-white/10 backdrop-blur-md text-white shadow-sm border border-white/20 hover:bg-white/20 transition-all">
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
          </div>
        </div>

        {/* Portal Role Switcher Tabs (Only shown if showRoleTabs is true) */}
        {showRoleTabs && <AuthRoleTabs activeRole={activePortalRole} onSelectRole={handlePortalChange} />}

        <div className="relative z-10 text-center mb-6">
          <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md flex items-center justify-center gap-2">
            {activePortalRole === 'USER' && <User className="text-emerald-400" size={24} />}
            {activePortalRole === 'PROVIDER' && <Store className="text-amber-400" size={24} />}
            {activePortalRole === 'ADMIN' && <Shield className="text-purple-400" size={24} />}
            {viewState.includes('LOGIN') ? `${activePortalRole === 'ADMIN' ? 'Admin Access' : (activePortalRole === 'PROVIDER' ? 'Merchant Portal' : 'User Portal')}` : (viewState.includes('REGISTER') ? 'Create Account' : 'Reset Password')}
          </h2>
        </div>

        {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-200 text-xs font-medium text-center">{error}</div>}
        {infoMsg && <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs font-medium text-center">{infoMsg}</div>}

        {viewState === 'LOGIN' && (
          <div className="space-y-5">
            <form onSubmit={handleLogin} className="space-y-4" autoComplete="on">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-white uppercase ml-1 tracking-widest drop-shadow-md">
                  {activePortalRole === 'ADMIN' ? 'Admin ID / Email' : 'Mobile / Email / ID'}
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
                  <input
                    type="text"
                    value={loginId}
                    onChange={e => setLoginId(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-800/90 text-white border-2 border-slate-600 focus:border-brand-400 rounded-xl outline-none text-sm font-bold shadow-inner"
                    placeholder={activePortalRole === 'ADMIN' ? 'Enter Admin Identifier' : 'Mobile number or Email'}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-[10px] font-black text-white uppercase ml-1 tracking-widest drop-shadow-md">Password</label>
                  <button type="button" onClick={() => setViewState('FORGOT')} className="text-[10px] font-black text-luxe-gold hover:text-white transition-colors uppercase">Recover Password?</button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-800/90 text-white border-2 border-slate-600 focus:border-brand-400 rounded-xl outline-none text-sm font-bold shadow-inner"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={loginLoading || otpLoading}
                  className={`w-full py-3.5 text-white font-black rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-wide text-xs ${
                    activePortalRole === 'ADMIN'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600'
                      : (activePortalRole === 'PROVIDER'
                        ? 'bg-gradient-to-r from-amber-600 to-sienna-600 hover:from-amber-500 hover:to-sienna-500'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500')
                  }`}
                >
                  {loginLoading ? <Loader2 className="animate-spin" /> : <>Sign In <Lock size={14} /></>}
                </button>

                {activePortalRole !== 'ADMIN' && (
                  <>
                    <div className="relative flex py-1 items-center opacity-40">
                      <div className="flex-grow border-t border-white/20"></div>
                      <span className="flex-shrink-0 mx-4 text-[10px] text-white font-bold uppercase tracking-widest">or</span>
                      <div className="flex-grow border-t border-white/20"></div>
                    </div>

                    <button
                      type="button"
                      onClick={handleLoginWithOtp}
                      disabled={loginLoading || otpLoading}
                      className="w-full py-3.5 bg-brand-600/90 hover:bg-brand-500 text-white font-black rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-wide text-xs"
                    >
                      {otpLoading ? <Loader2 className="animate-spin" /> : <>Login / Signup via SMS/Email OTP <Phone size={14} /></>}
                    </button>
                  </>
                )}
              </div>
            </form>

            {activePortalRole !== 'ADMIN' && (
              <div className="text-center pt-2">
                <button onClick={() => setViewState('REGISTER')} className="text-xs font-bold text-white hover:text-luxe-gold transition-colors flex items-center justify-center gap-1 mx-auto drop-shadow-md">
                  New User? <span className="font-black text-luxe-teal underline">Create Identity</span>
                </button>
              </div>
            )}
          </div>
        )}

        {viewState === 'REGISTER' && activePortalRole !== 'ADMIN' && (
          <form onSubmit={handleRegister} className="space-y-3.5" autoComplete="off">
            <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full px-4 py-3 bg-slate-800 text-white border-2 border-slate-600 focus:border-brand-400 rounded-xl outline-none text-xs font-bold shadow-inner" placeholder="Full Name *" required />

            <div className="space-y-2">
              <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-800 text-white border-2 border-slate-600 focus:border-brand-400 rounded-xl outline-none text-xs font-bold shadow-inner" placeholder="Email Address" /></div>
              <div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-800 text-white border-2 border-slate-600 focus:border-brand-400 rounded-xl outline-none text-xs font-bold shadow-inner" placeholder="Mobile Number (10 digits)" /></div>
            </div>

            {activePortalRole === 'PROVIDER' && (
              <div className="space-y-2 p-3 bg-slate-800/90 rounded-xl border border-slate-700">
                <label className="text-[10px] font-bold text-slate-300 uppercase">Select Provider Type</label>
                <select value={regRole} onChange={e => setRegRole(e.target.value as UserRole)} className="w-full p-2.5 bg-slate-900 text-white border border-slate-600 rounded-lg text-xs font-bold outline-none">
                  <option value="DRIVER">Driver / Transporter</option>
                  <option value="FARMER">Farmer / Agriculture Provider</option>
                  <option value="SHOPKEEPER">Shopkeeper / Merchant</option>
                  <option value="MESS_MANAGER">Mess / Dining Owner</option>
                  <option value="FOOD_VENDOR">Food Vendor</option>
                  <option value="LOGISTICS_PARTNER">Logistics Partner</option>
                </select>

                {regRole === 'DRIVER' && (
                  <div className="space-y-2 pt-2 border-t border-slate-700">
                    <input type="number" value={regCapacity} onChange={e => setRegCapacity(e.target.value)} className="w-full px-3 py-2 bg-slate-900 text-white border border-slate-600 rounded-lg text-xs" placeholder="Seat Capacity" />
                    <div className="grid grid-cols-4 gap-1">
                      {(['BUS', 'TAXI', 'AUTO', 'BIKE'] as VehicleType[]).map(type => (
                        <button type="button" key={type} onClick={() => setRegVehicleType(type)} className={`p-1.5 rounded text-[10px] font-bold border ${regVehicleType === type ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>{type}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <input type="password" value={regPass} onChange={e => setRegPass(e.target.value)} className="w-full px-4 py-3 bg-slate-800 text-white border-2 border-slate-600 focus:border-brand-400 rounded-xl outline-none text-xs font-bold shadow-inner" placeholder="Create Password *" required />
              <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="w-full px-4 py-3 bg-slate-800 text-white border-2 border-slate-600 focus:border-brand-400 rounded-xl outline-none text-xs font-bold shadow-inner" placeholder="Confirm Password *" required />
            </div>

            <Button type="submit" fullWidth disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Verify via OTP"}</Button>
            <button type="button" onClick={() => setViewState('LOGIN')} className="w-full text-center text-xs font-bold text-slate-300 hover:text-white mt-2">Back to Login</button>
          </form>
        )}

        {(viewState === 'LOGIN_VERIFY' || viewState === 'REGISTER_VERIFY') && (
          <form onSubmit={viewState === 'LOGIN_VERIFY' ? verifyLoginOtp : verifyRegOtp} className="space-y-4">
            <div className="bg-brand-900/40 border border-brand-500/30 p-3 rounded-xl text-center text-xs text-brand-200">
              Enter 6-digit OTP sent to <b>{loginId || regPhone || regEmail}</b>
            </div>

            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={viewState === 'LOGIN_VERIFY' ? loginOtp : regOtp}
                onChange={e => viewState === 'LOGIN_VERIFY' ? setLoginOtp(e.target.value) : setRegOtp(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-800 border-2 border-slate-600 focus:border-brand-400 rounded-xl outline-none text-white text-center tracking-[0.5em] font-bold text-xl shadow-inner"
                placeholder="XXXXXX"
                maxLength={6}
                autoComplete="one-time-code"
                inputMode="numeric"
                required
              />
            </div>

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "Verify & Complete"}
            </Button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={!canResend}
                className={`font-bold flex items-center gap-1 ${
                  canResend
                    ? 'text-luxe-gold hover:underline cursor-pointer'
                    : 'text-slate-500 cursor-not-allowed'
                }`}
              >
                <RefreshCw size={12} className={canResend ? '' : 'animate-spin'} />
                {canResend ? 'Resend OTP' : `Resend OTP in ${resendTimer}s`}
              </button>

              <button type="button" onClick={() => setViewState('LOGIN')} className="text-slate-400 hover:text-white font-bold">
                Cancel
              </button>
            </div>
          </form>
        )}

        {viewState === 'FORGOT' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <p className="text-xs text-slate-300">Enter your registered Email or Mobile Number to receive a password reset OTP.</p>
            <input type="text" value={resetIdentifier} onChange={e => setResetIdentifier(e.target.value)} className="w-full px-4 py-3.5 bg-slate-800 text-white border-2 border-slate-600 focus:border-brand-400 rounded-xl outline-none text-xs font-bold shadow-inner" placeholder="Mobile or Email" required />
            <Button type="submit" fullWidth disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Send Reset OTP"}</Button>
            <button type="button" onClick={() => setViewState('LOGIN')} className="w-full text-center text-xs font-bold text-slate-300 hover:text-white">Cancel</button>
          </form>
        )}

        {viewState === 'RESET' && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="bg-brand-900/40 border border-brand-500/30 p-3 rounded-xl text-center text-xs text-brand-200">
              Enter OTP sent to <b>{resetIdentifier}</b>
            </div>
            <div className="relative"><Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" value={resetToken} onChange={e => setResetToken(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-800 text-white border-2 border-slate-600 focus:border-brand-400 rounded-xl outline-none text-center tracking-[0.5em] font-bold text-xl shadow-inner" placeholder="XXXXXX" maxLength={6} required /></div>
            <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-800 text-white border-2 border-slate-600 focus:border-brand-400 rounded-xl outline-none text-xs font-bold shadow-inner" placeholder="New Password" required /></div>
            <Button type="submit" fullWidth disabled={loading}>Reset Password</Button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={!canResend}
                className={`font-bold flex items-center gap-1 ${
                  canResend
                    ? 'text-luxe-gold hover:underline cursor-pointer'
                    : 'text-slate-500 cursor-not-allowed'
                }`}
              >
                <RefreshCw size={12} />
                {canResend ? 'Resend OTP' : `Resend OTP in ${resendTimer}s`}
              </button>

              <button type="button" onClick={() => setViewState('LOGIN')} className="text-slate-400 hover:text-white font-bold">
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
