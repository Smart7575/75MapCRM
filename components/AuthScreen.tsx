
import React, { useState } from 'react';
import { 
  auth,
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  doc,
  getDoc,
  setDoc,
  writeBatch,
  handleFirestoreError
} from "../firebase.ts";
import { Users, Mail, Lock, Loader2, AlertCircle, Sun, Moon, Copy, Check, ExternalLink } from 'lucide-react';
import { translations } from '../translations.ts';
import { DEFAULT_TYPES } from '../constants.tsx';
import firebaseConfig from '../firebase-applet-config.json';

interface AuthScreenProps {
  language: 'nl' | 'en';
  onLanguageChange: (lang: 'nl' | 'en') => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ language, onLanguageChange }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  
  // Theme for auth screen follows system or default
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('mapcrm_theme');
    if (saved) return saved as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const t_auth = translations[language];

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('mapcrm_theme', newTheme);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setUnauthorizedDomain(null);
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Check if initial user document exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      let userSnap = null;
      try {
        userSnap = await getDoc(userRef);
      } catch {
        // Doc existence check fallback
      }

      if (!userSnap || !userSnap.exists()) {
        try {
          await setDoc(userRef, {
            email: user.email || '',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            language: language
          });
        } catch (e) {
          handleFirestoreError(e, 'create', `users/${user.uid}`);
        }

        // Initialize DEFAULT_TYPES for the new user in the 'types' collection
        try {
          const batch = writeBatch(db);
          DEFAULT_TYPES.forEach((t_obj) => {
            const typeRef = doc(db, 'users', user.uid, 'types', t_obj.id);
            batch.set(typeRef, t_obj);
          });
          await batch.commit();
        } catch (e) {
          handleFirestoreError(e, 'write', `users/${user.uid}/types/*`);
        }
      } else {
        // Update last login timestamp
        try {
          await setDoc(userRef, {
            lastLogin: new Date().toISOString()
          }, { merge: true });
        } catch {
          // Non-critical background update
        }
      }
    } catch (err: any) {
      console.error("Google auth error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setUnauthorizedDomain(window.location.hostname);
        setError(null);
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError(t_auth.errorPopupClosed);
      } else if (err.code === 'auth/popup-blocked') {
        setError(t_auth.errorPopupBlocked);
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError(t_auth.errorEmailInUse);
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignored
      } else {
        setError(err.message || t_auth.errorDefault);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError(language === 'nl' ? "Vul eerst je e-mailadres in om een herstellink te ontvangen." : "Please enter your email address first to receive a reset link.");
      return;
    }
    setError(null);
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 6000);
    } catch (err: any) {
      console.error("Password reset error:", err);
      if (err.code === 'auth/user-not-found') {
        setError(t_auth.errorUserNotFoundRegistrationTip);
      } else if (err.code === 'auth/invalid-email') {
        setError(t_auth.errorInvalidEmail);
      } else {
        setError(err.message || t_auth.errorDefault);
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnauthorizedDomain(null);
    setResetSent(false);
    setLoading(true);

    const cleanEmail = email.trim();

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const user = userCredential.user;
        
        // Check if initial user document already exists in Firestore (safe merge)
        const userRef = doc(db, 'users', user.uid);
        let userSnap = null;
        try {
          userSnap = await getDoc(userRef);
        } catch {
          // Document existence check fallback
        }

        if (!userSnap || !userSnap.exists()) {
          try {
            await setDoc(userRef, {
              email: user.email || cleanEmail,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              language: language
            });
          } catch (e) {
            handleFirestoreError(e, 'create', `users/${user.uid}`);
          }

          // Initialize DEFAULT_TYPES for the new user in the 'types' collection
          const batch = writeBatch(db);
          DEFAULT_TYPES.forEach((t_obj) => {
            const typeRef = doc(db, 'users', user.uid, 'types', t_obj.id);
            batch.set(typeRef, t_obj);
          });
          
          try {
            await batch.commit();
          } catch (e) {
            handleFirestoreError(e, 'write', `users/${user.uid}/types/*`);
          }
        } else {
          // Preserve existing profile and update lastLogin
          try {
            await setDoc(userRef, {
              lastLogin: new Date().toISOString()
            }, { merge: true });
          } catch {
            // Non-critical
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      let message = err.message || t_auth.errorDefault;
      if (err.code === 'auth/operation-not-allowed') {
        message = t_auth.errorOperationNotAllowed;
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        message = isLogin 
          ? `${t_auth.errorInvalidCreds} ${t_auth.errorUserNotFoundRegistrationTip}`
          : t_auth.errorInvalidCreds;
      } else if (err.code === 'auth/wrong-password') {
        message = t_auth.errorInvalidCreds;
      } else if (err.code === 'auth/email-already-in-use') {
        message = t_auth.errorEmailInUse;
      } else if (err.code === 'auth/weak-password') {
        message = t_auth.errorWeakPassword;
      } else if (err.code === 'auth/too-many-requests') {
        message = t_auth.errorTooManyRequests;
      } else if (err.code === 'auth/invalid-email') {
        message = t_auth.errorInvalidEmail;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-blue-50 text-blue-900'}`}>
      <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-white/50'} rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border animate-in zoom-in-95 duration-300 relative`}>
        {/* Header Controls */}
        <div className="absolute top-6 right-6 z-20 flex gap-2">
          <button 
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-gray-100 border-gray-200 text-blue-600'}`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          
          <div className={`flex p-1 rounded-xl shadow-inner border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200/50'}`}>
            <button 
              onClick={() => onLanguageChange('nl')} 
              className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-tighter transition-all ${language === 'nl' ? (theme === 'dark' ? 'bg-slate-900 text-blue-400' : 'bg-white shadow-sm text-blue-600') : 'text-gray-400 hover:text-gray-600'}`}
            >
              NL
            </button>
            <button 
              onClick={() => onLanguageChange('en')} 
              className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-tighter transition-all ${language === 'en' ? (theme === 'dark' ? 'bg-slate-900 text-blue-400' : 'bg-white shadow-sm text-blue-600') : 'text-gray-400 hover:text-gray-600'}`}
            >
              EN
            </button>
          </div>
        </div>

        <div className="p-8 sm:p-12">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 mb-4 animate-bounce">
              <Users size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tight">75MapCRM</h1>
            <p className="text-gray-500 text-sm mt-2 font-medium text-center">
              {isLogin ? t_auth.authWelcomeLogin : t_auth.authWelcomeSignup}
            </p>
          </div>

          {/* Google Sign-in / Sign-up Button */}
          <button
            type="button"
            id="google-auth-button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-3 border shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              theme === 'dark' 
                ? 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-100 shadow-black/20' 
                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700 shadow-gray-100'
            }`}
          >
            {googleLoading ? (
              <Loader2 size={20} className="animate-spin text-blue-500" />
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isLogin ? t_auth.continueWithGoogle : t_auth.signupWithGoogle}</span>
              </>
            )}
          </button>

          {/* Unauthorized Domain Helper Card */}
          {unauthorizedDomain && (
            <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="font-bold flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{t_auth.errorUnauthorizedDomain}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                {t_auth.errorUnauthorizedDomainHelp}
              </p>
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-amber-200 dark:border-amber-800/40">
                <code className="text-[11px] font-mono select-all flex-1 truncate text-slate-800 dark:text-slate-200">
                  {unauthorizedDomain}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(unauthorizedDomain);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shrink-0"
                >
                  {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  <span>{copied ? t_auth.domainCopied : t_auth.copyDomain}</span>
                </button>
              </div>
              <div className="pt-0.5">
                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                >
                  <span>{t_auth.openFirebaseSettings}</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className={`w-full border-t ${theme === 'dark' ? 'border-slate-800' : 'border-gray-200'}`} />
            <span className={`absolute px-3 text-xs uppercase font-bold tracking-wider ${theme === 'dark' ? 'bg-slate-900 text-slate-500' : 'bg-white text-gray-400'}`}>
              {t_auth.orDivider}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  className={`w-full pl-12 pr-4 py-4 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold placeholder:text-gray-400 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-gray-50 border-gray-100 text-black'}`}
                  placeholder={t_auth.emailAddress}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  className={`w-full pl-12 pr-4 py-4 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold placeholder:text-gray-400 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-gray-50 border-gray-100 text-black'}`}
                  placeholder={t_auth.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {isLogin && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline transition-all inline-flex items-center gap-1"
                  >
                    {resetLoading && <Loader2 size={12} className="animate-spin" />}
                    <span>{t_auth.forgotPassword}</span>
                  </button>
                </div>
              )}
            </div>

            {resetSent && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in fade-in duration-200 border border-emerald-200 dark:border-emerald-800">
                <Check size={16} className="shrink-0 text-emerald-500" />
                <span>{t_auth.resetPasswordSent}</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm tracking-wide transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                isLogin ? t_auth.loginAction : t_auth.signupAction
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setUnauthorizedDomain(null);
              }}
              className="text-sm font-bold text-blue-600 hover:text-blue-500 transition-colors"
            >
              {isLogin ? t_auth.noAccount : t_auth.hasAccount}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
