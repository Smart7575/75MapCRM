
import React, { useState } from 'react';
import { 
  auth,
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  doc,
  setDoc,
  writeBatch,
  handleFirestoreError
} from "../firebase.ts";
import { Users, Mail, Lock, Loader2, AlertCircle, Sun, Moon } from 'lucide-react';
import { translations } from '../translations.ts';
import { DEFAULT_TYPES } from '../constants.tsx';

interface AuthScreenProps {
  language: 'nl' | 'en';
  onLanguageChange: (lang: 'nl' | 'en') => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ language, onLanguageChange }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create initial user document in Firestore
        const userRef = doc(db, 'users', user.uid);
        try {
          await setDoc(userRef, {
            email: user.email,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
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
      }
    } catch (err: any) {
      console.error(err);
      let message = t_auth.errorDefault;
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = t_auth.errorInvalidCreds;
      } else if (err.code === 'auth/email-already-in-use') {
        message = t_auth.errorEmailInUse;
      } else if (err.code === 'auth/weak-password') {
        message = t_auth.errorWeakPassword;
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
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 mb-4 animate-bounce">
              <Users size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tight">MapCRM</h1>
            <p className="text-gray-500 text-sm mt-2 font-medium">
              {isLogin ? t_auth.authWelcomeLogin : t_auth.authWelcomeSignup}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
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
