import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { 
  auth, 
  db, 
  doc, 
  deleteDoc, 
  collection, 
  getDocs, 
  writeBatch, 
  deleteUser, 
  GoogleAuthProvider, 
  reauthenticateWithPopup, 
  EmailAuthProvider, 
  reauthenticateWithCredential,
  handleFirestoreError 
} from '../firebase';
import { 
  Settings, 
  User as UserIcon, 
  ShieldAlert, 
  Trash2, 
  Moon, 
  Sun, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Database, 
  KeyRound, 
  Calendar, 
  Users, 
  MapPin, 
  HeartHandshake, 
  Tag,
  LogOut,
  Sparkles,
  RotateCcw,
  Map as MapIcon,
  Check,
  ArrowRight
} from 'lucide-react';

interface SettingsViewProps {
  currentUser: User;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  language: 'nl' | 'en';
  onLanguageChange: (lang: 'nl' | 'en') => void;
  contactsCount: number;
  addressesCount: number;
  relationsCount: number;
  eventsCount: number;
  typesCount: number;
  onExportData: () => void;
  onImportClick: () => void;
  onLogout?: () => void;
  t: (key: any) => string;
  onLoadDemoData?: () => Promise<void>;
  onRemoveDemoData?: () => Promise<void>;
  onClearAllData?: () => Promise<void>;
  demoContactsCount?: number;
  onNavigateToMap?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  theme,
  onThemeChange,
  language,
  onLanguageChange,
  contactsCount,
  addressesCount,
  relationsCount,
  eventsCount,
  typesCount,
  onExportData,
  onImportClick,
  onLogout,
  t,
  onLoadDemoData,
  onRemoveDemoData,
  onClearAllData,
  demoContactsCount = 0,
  onNavigateToMap
}) => {
  const isDark = theme === 'dark';
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStage, setDeleteStage] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Demo data states
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [isRemovingDemo, setIsRemovingDemo] = useState(false);
  const [demoFeedback, setDemoFeedback] = useState<{ type: 'success' | 'error'; message: string; showMapBtn?: boolean } | null>(null);

  // Clean start states
  const [showCleanStartModal, setShowCleanStartModal] = useState(false);
  const [cleanStartInput, setCleanStartInput] = useState('');
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [cleanStartError, setCleanStartError] = useState<string | null>(null);
  const [cleanStartSuccess, setCleanStartSuccess] = useState(false);

  const cleanConfirmWord = language === 'nl' ? 'SCHOON' : 'CLEAN';

  const handleAddDemo = async () => {
    if (!onLoadDemoData) return;
    setIsLoadingDemo(true);
    setDemoFeedback(null);
    try {
      await onLoadDemoData();
      setDemoFeedback({
        type: 'success',
        message: t('demoDataAdded'),
        showMapBtn: true
      });
    } catch (err: any) {
      setDemoFeedback({
        type: 'error',
        message: err?.message || t('errorDefault')
      });
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleRemoveDemo = async () => {
    if (!onRemoveDemoData) return;
    setIsRemovingDemo(true);
    setDemoFeedback(null);
    try {
      await onRemoveDemoData();
      setDemoFeedback({
        type: 'success',
        message: t('demoDataRemoved')
      });
    } catch (err: any) {
      setDemoFeedback({
        type: 'error',
        message: err?.message || t('errorDefault')
      });
    } finally {
      setIsRemovingDemo(false);
    }
  };

  const handleExecuteCleanStart = async () => {
    if (!onClearAllData) return;
    setIsClearingAll(true);
    setCleanStartError(null);
    try {
      await onClearAllData();
      setShowCleanStartModal(false);
      setCleanStartInput('');
      setCleanStartSuccess(true);
      setTimeout(() => setCleanStartSuccess(false), 5000);
    } catch (err: any) {
      setCleanStartError(err?.message || t('errorDefault'));
    } finally {
      setIsClearingAll(false);
    }
  };

  // Re-auth state
  const [needsReauth, setNeedsReauth] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [isReauthing, setIsReauthing] = useState(false);

  const confirmWord = language === 'nl' ? 'VERWIJDER' : 'DELETE';
  const isGoogleUser = currentUser.providerData.some(p => p.providerId === 'google.com');

  const handleDeleteSubcollection = async (subName: string, path: string) => {
    setDeleteStage(`${subName}...`);
    const colRef = collection(db, path);
    let snapshot;
    try {
      snapshot = await getDocs(colRef);
    } catch (err) {
      handleFirestoreError(err, 'list', path);
      return;
    }

    if (snapshot.empty) return;

    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const chunk = docs.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach(docSnap => batch.delete(docSnap.ref));
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, 'delete', path);
      }
    }
  };

  const executeAccountAndDataDeletion = async () => {
    if (!currentUser) return;
    setIsDeleting(true);
    setDeleteError(null);

    const uid = currentUser.uid;

    try {
      // 1. Delete user subcollections
      await handleDeleteSubcollection(t('contacts') || 'Contacten', `users/${uid}/contacts`);
      await handleDeleteSubcollection(t('location') || 'Adressen', `users/${uid}/addresses`);
      await handleDeleteSubcollection(t('relations') || 'Relaties', `users/${uid}/relations`);
      await handleDeleteSubcollection(t('events') || 'Gebeurtenissen', `users/${uid}/events`);
      await handleDeleteSubcollection('Contact Types', `users/${uid}/types`);

      // 2. Delete user root document
      setDeleteStage(t('accountInfo') || 'Gebruikersprofiel...');
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (err) {
        handleFirestoreError(err, 'delete', `users/${uid}`);
      }

      // 3. Delete Firebase Auth account
      setDeleteStage(t('deleteAccountTitle') || 'Firebase Auth account...');
      await deleteUser(currentUser);
      
      // Successfully deleted. onAuthStateChanged will handle redirect to AuthScreen
    } catch (err: any) {
      console.error('Error during account deletion:', err);
      if (err?.code === 'auth/requires-recent-login') {
        setNeedsReauth(true);
        setDeleteError(t('reauthRequiredDesc'));
      } else {
        setDeleteError(err?.message || t('errorDefault'));
      }
      setIsDeleting(false);
    }
  };

  const handleReauthAndRetry = async () => {
    if (!currentUser) return;
    setIsReauthing(true);
    setDeleteError(null);

    try {
      if (isGoogleUser) {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await reauthenticateWithPopup(currentUser, provider);
      } else {
        if (!reauthPassword) {
          setDeleteError(language === 'nl' ? 'Vul je wachtwoord in.' : 'Please enter your password.');
          setIsReauthing(false);
          return;
        }
        const credential = EmailAuthProvider.credential(currentUser.email || '', reauthPassword);
        await reauthenticateWithCredential(currentUser, credential);
      }

      setNeedsReauth(false);
      setIsReauthing(false);
      // Retry deletion
      await executeAccountAndDataDeletion();
    } catch (err: any) {
      console.error('Re-auth error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setDeleteError(t('errorInvalidCreds'));
      } else if (err.code === 'auth/popup-closed-by-user') {
        setDeleteError(t('errorPopupClosed'));
      } else {
        setDeleteError(err.message || t('errorDefault'));
      }
      setIsReauthing(false);
    }
  };

  const creationDate = currentUser.metadata.creationTime 
    ? new Date(currentUser.metadata.creationTime).toLocaleDateString(language === 'nl' ? 'nl-NL' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '-';

  return (
    <div 
      className={`h-full w-full overflow-y-auto overscroll-y-contain touch-pan-y p-4 sm:p-8 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="max-w-4xl mx-auto space-y-8 pb-32 sm:pb-40">
        
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${isDark ? 'bg-slate-900 text-blue-400 border border-slate-800' : 'bg-white text-blue-600 shadow-sm border border-gray-100'}`}>
              <Settings size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{t('settings')}</h1>
              <p className="text-xs text-gray-500">{t('settingsSubtitle')}</p>
            </div>
          </div>
        </div>

        {/* Account Info Card */}
        <section className={`p-6 rounded-3xl border transition-all ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <UserIcon size={18} className="text-blue-500" />
              <h2 className="text-sm font-black uppercase tracking-wider">{t('accountInfo')}</h2>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' 
                    : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-700'
                }`}
                title={t('logout')}
              >
                <LogOut size={14} />
                <span>{t('logout')}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
              <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-1">{t('accountEmail')}</span>
              <p className="font-bold text-sm truncate">{currentUser.email || '-'}</p>
            </div>

            <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
              <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-1">{t('accountAuthMethod')}</span>
              <div className="flex items-center gap-2 mt-0.5">
                {isGoogleUser ? (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span className="font-bold">Google Sign-in</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={16} className="text-blue-500" />
                    <span className="font-bold">{t('emailAndPassword')}</span>
                  </>
                )}
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
              <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-1">{t('accountCreated')}</span>
              <p className="font-semibold">{creationDate}</p>
            </div>

            <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
              <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-1">{t('accountUid')}</span>
              <p className="font-mono text-[11px] text-gray-500 truncate" title={currentUser.uid}>{currentUser.uid}</p>
            </div>
          </div>
        </section>

        {/* Preferences Card */}
        <section className={`p-6 rounded-3xl border transition-all ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
            <Settings size={18} className="text-blue-500" />
            <h2 className="text-sm font-black uppercase tracking-wider">{t('preferences')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Theme Toggle */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-slate-800/50 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
              <div>
                <span className="font-bold text-xs block">{t('themePreference')}</span>
                <span className="text-[11px] text-gray-400">{isDark ? t('darkMode') : t('lightMode')}</span>
              </div>
              <button
                type="button"
                onClick={() => onThemeChange(isDark ? 'light' : 'dark')}
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                    : 'bg-white border-gray-200 text-blue-600 hover:bg-gray-100 shadow-sm'
                }`}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
                <span>{isDark ? t('light') : t('dark')}</span>
              </button>
            </div>

            {/* Language Selection */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-slate-800/50 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
              <div>
                <span className="font-bold text-xs block">{t('languagePreference')}</span>
                <span className="text-[11px] text-gray-400">{language === 'nl' ? 'Nederlands' : 'English'}</span>
              </div>
              <div className={`flex p-1 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                <button
                  type="button"
                  onClick={() => onLanguageChange('nl')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    language === 'nl' 
                      ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white shadow-sm') 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  NL
                </button>
                <button
                  type="button"
                  onClick={() => onLanguageChange('en')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    language === 'en' 
                      ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white shadow-sm') 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Data Overview & Management Card */}
        <section className={`p-6 rounded-3xl border transition-all ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-blue-500" />
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider">{t('dataManagement')}</h2>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">{t('dataManagementDesc')}</p>
              </div>
            </div>
          </div>

          {/* Counts */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center mb-6">
            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
              <Users size={16} className="mx-auto text-blue-500 mb-1" />
              <span className="text-lg font-black block">{contactsCount}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase">{t('contacts')}</span>
            </div>
            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
              <MapPin size={16} className="mx-auto text-emerald-500 mb-1" />
              <span className="text-lg font-black block">{addressesCount}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase">{t('uniqueAddresses')}</span>
            </div>
            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
              <HeartHandshake size={16} className="mx-auto text-teal-500 mb-1" />
              <span className="text-lg font-black block">{relationsCount}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase">{t('relations')}</span>
            </div>
            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
              <Calendar size={16} className="mx-auto text-purple-500 mb-1" />
              <span className="text-lg font-black block">{eventsCount}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase">{t('events')}</span>
            </div>
            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
              <Tag size={16} className="mx-auto text-amber-500 mb-1" />
              <span className="text-lg font-black block">{typesCount}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase">{t('types')}</span>
            </div>
          </div>

          {/* Dedicated Export & Import Action Panels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Export Action Card */}
            <div className={`p-4 rounded-2xl border flex flex-col justify-between gap-4 ${
              isDark ? 'bg-slate-800/50 border-slate-800' : 'bg-gray-50 border-gray-100'
            }`}>
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                  <Download size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-xs">{t('export')}</h3>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {t('exportDataDesc')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="settings-export-backup-btn"
                onClick={onExportData}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Download size={15} />
                <span>{t('export')}</span>
              </button>
            </div>

            {/* Import Action Card */}
            <div className={`p-4 rounded-2xl border flex flex-col justify-between gap-4 ${
              isDark ? 'bg-slate-800/50 border-slate-800' : 'bg-gray-50 border-gray-100'
            }`}>
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                  <Upload size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-xs">{t('import')}</h3>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {t('importDataDesc')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="settings-import-backup-btn"
                onClick={onImportClick}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all active:scale-95 ${
                  isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-800 shadow-sm'
                }`}
              >
                <Upload size={15} />
                <span>{t('import')}</span>
              </button>
            </div>
          </div>

          {/* Demo Data & Clean Start Division */}
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800 space-y-4">
            {/* Demo Data Card */}
            <div className={`p-4 rounded-2xl border ${
              isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-blue-50/40 border-blue-100'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs flex items-center gap-2">
                      <span>{t('demoDataTitle')}</span>
                      {demoContactsCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {t('demoDataPresent').replace('{count}', demoContactsCount.toString())}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500">
                          {t('demoDataNotPresent')}
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {t('demoDataDesc')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Demo action feedback */}
              {demoFeedback && (
                <div className={`mb-3 p-3 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200 ${
                  demoFeedback.type === 'success'
                    ? (isDark ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800' : 'bg-emerald-50 text-emerald-800 border border-emerald-200')
                    : (isDark ? 'bg-red-950/60 text-red-300 border border-red-800' : 'bg-red-50 text-red-800 border border-red-200')
                }`}>
                  <div className="flex items-center gap-2">
                    {demoFeedback.type === 'success' ? <Check size={16} className="shrink-0 text-emerald-500" /> : <AlertTriangle size={16} className="shrink-0 text-red-500" />}
                    <span>{demoFeedback.message}</span>
                  </div>
                  {demoFeedback.showMapBtn && onNavigateToMap && (
                    <button
                      type="button"
                      onClick={onNavigateToMap}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shrink-0 flex items-center gap-1 shadow-sm transition-all"
                    >
                      <MapIcon size={12} />
                      <span>{t('viewOnMap')}</span>
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  id="settings-load-demo-data-btn"
                  onClick={handleAddDemo}
                  disabled={isLoadingDemo || isRemovingDemo}
                  className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  {isLoadingDemo ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{t('loadingDemoData')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>{t('loadDemoData')}</span>
                    </>
                  )}
                </button>

                {demoContactsCount > 0 && (
                  <button
                    type="button"
                    id="settings-remove-demo-data-btn"
                    onClick={handleRemoveDemo}
                    disabled={isLoadingDemo || isRemovingDemo}
                    className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all active:scale-95 disabled:opacity-50 ${
                      isDark 
                        ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-red-400' 
                        : 'bg-white border-red-200 hover:bg-red-50 text-red-600 shadow-sm'
                    }`}
                  >
                    {isRemovingDemo ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>{t('removingDemoData')}</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} />
                        <span>{t('removeDemoData')}</span>
                      </>
                    )}
                  </button>
                )}

                {demoContactsCount > 0 && onNavigateToMap && (
                  <button
                    type="button"
                    onClick={onNavigateToMap}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                      isDark ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <MapIcon size={14} className="text-blue-500" />
                    <span>{t('viewOnMap')}</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Clean Start Card */}
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isDark ? 'bg-slate-800/30 border-slate-800' : 'bg-gray-50/80 border-gray-100'
            }`}>
              <div className="flex items-start gap-3 max-w-xl">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-xs">{t('cleanStartTitle')}</h3>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {t('cleanStartDesc')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="settings-clean-start-modal-btn"
                onClick={() => {
                  setShowCleanStartModal(true);
                  setCleanStartInput('');
                  setCleanStartError(null);
                }}
                className={`py-2 px-3.5 rounded-xl font-bold text-xs shrink-0 flex items-center justify-center gap-1.5 border transition-all active:scale-95 ${
                  isDark 
                    ? 'bg-slate-800 border-amber-900/50 hover:bg-slate-700 text-amber-400' 
                    : 'bg-white border-amber-200 hover:bg-amber-50 text-amber-800 shadow-sm'
                }`}
              >
                <RotateCcw size={13} />
                <span>{t('cleanStartAction')}</span>
              </button>
            </div>

            {cleanStartSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                <Check size={16} className="text-emerald-500 shrink-0" />
                <span>{t('cleanStartSuccess')}</span>
              </div>
            )}
          </div>
        </section>

        {/* Danger Zone: Delete Account */}
        <section className={`p-6 rounded-3xl border transition-all ${
          isDark 
            ? 'bg-red-950/20 border-red-900/40' 
            : 'bg-red-50/50 border-red-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={20} className="text-red-600 dark:text-red-400" />
            <h2 className="text-sm font-black uppercase tracking-wider text-red-600 dark:text-red-400">
              {t('dangerZone')}
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="max-w-xl">
              <h3 className="font-bold text-sm text-gray-900 dark:text-slate-100">
                {t('deleteAccountTitle')}
              </h3>
              <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 leading-relaxed">
                {t('deleteAccountDesc')}
              </p>
            </div>

            <button
              type="button"
              id="open-delete-account-modal-button"
              onClick={() => {
                setShowDeleteModal(true);
                setConfirmInput('');
                setDeleteError(null);
                setNeedsReauth(false);
              }}
              className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs tracking-wide shrink-0 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
            >
              <Trash2 size={16} />
              <span>{t('deleteAccountBtn')}</span>
            </button>
          </div>
        </section>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 border shadow-2xl relative space-y-6 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-red-600 dark:text-red-400">
                  {t('deleteAccountConfirmTitle')}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  {currentUser.email}
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border text-xs space-y-2 leading-relaxed ${
              isDark ? 'bg-slate-800/40 border-slate-800 text-slate-300' : 'bg-gray-50 border-gray-100 text-gray-700'
            }`}>
              <p className="font-bold text-red-500">{t('deleteAccountWarning')}</p>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-gray-600 dark:text-slate-400">
                <li>{t('deleteAccountItemsContact')} ({contactsCount})</li>
                <li>{t('deleteAccountItemsAddress')} ({addressesCount})</li>
                <li>{t('deleteAccountItemsRelation')} ({relationsCount})</li>
                <li>{t('deleteAccountItemsEvent')} ({eventsCount})</li>
                <li>{t('deleteAccountItemsTypes')} ({typesCount})</li>
                <li>{t('deleteAccountItemsAuth')}</li>
              </ul>
            </div>

            {/* Re-auth Prompt if required */}
            {needsReauth ? (
              <div className="space-y-4 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold">
                  <KeyRound size={16} />
                  <span>{t('reauthRequiredTitle')}</span>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-slate-400">
                  {t('reauthRequiredDesc')}
                </p>

                {isGoogleUser ? (
                  <button
                    type="button"
                    onClick={handleReauthAndRetry}
                    disabled={isReauthing}
                    className="w-full py-3 px-4 rounded-xl bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs border shadow-sm flex items-center justify-center gap-2"
                  >
                    {isReauthing ? (
                      <Loader2 size={16} className="animate-spin text-blue-600" />
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>{t('reauthWithGoogleBtn')}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="password"
                      value={reauthPassword}
                      onChange={(e) => setReauthPassword(e.target.value)}
                      placeholder={t('reauthWithPasswordPlaceholder')}
                      className={`w-full p-3 rounded-xl border text-xs outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-gray-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleReauthAndRetry}
                      disabled={isReauthing || !reauthPassword}
                      className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2"
                    >
                      {isReauthing ? <Loader2 size={16} className="animate-spin" /> : t('reauthWithPasswordBtn')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Confirmation Word Input */
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                  {t('deleteTypeConfirmPrompt')} <span className="font-mono text-red-500 font-black">{confirmWord}</span>
                </label>
                <input
                  type="text"
                  id="confirm-delete-account-input"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={confirmWord}
                  disabled={isDeleting}
                  className={`w-full p-3.5 rounded-2xl border text-xs font-mono font-bold uppercase tracking-wider outline-none transition-all ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-red-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-red-500'
                  }`}
                />
              </div>
            )}

            {/* Error Message */}
            {deleteError && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Active Deletion Progress */}
            {isDeleting && (
              <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-3 animate-pulse">
                <Loader2 size={18} className="animate-spin shrink-0" />
                <div>
                  <p>{t('deletingAccountProgress')}</p>
                  {deleteStage && <p className="text-[10px] font-normal opacity-80">{deleteStage}</p>}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!isDeleting) {
                    setShowDeleteModal(false);
                    setConfirmInput('');
                    setDeleteError(null);
                    setNeedsReauth(false);
                  }
                }}
                disabled={isDeleting}
                className={`px-5 py-3 rounded-2xl border font-bold text-xs transition-all ${
                  isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {t('cancel')}
              </button>

              {!needsReauth && (
                <button
                  type="button"
                  id="confirm-delete-account-button"
                  onClick={executeAccountAndDataDeletion}
                  disabled={confirmInput !== confirmWord || isDeleting}
                  className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs tracking-wide transition-all flex items-center gap-2 shadow-lg shadow-red-600/20"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{t('deletingAccountProgress')}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      <span>{t('deleteAccountBtn')}</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Clean Start Confirmation Modal */}
      {showCleanStartModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl relative space-y-5 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <RotateCcw size={22} />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight text-amber-600 dark:text-amber-400">
                  {t('cleanStartConfirmTitle')}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  {contactsCount} {t('contacts')}, {addressesCount} {t('uniqueAddresses')}
                </p>
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl border text-xs space-y-1.5 leading-relaxed ${
              isDark ? 'bg-slate-800/40 border-slate-800 text-slate-300' : 'bg-gray-50 border-gray-100 text-gray-700'
            }`}>
              <p className="font-semibold">{t('cleanStartConfirmWarning')}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-600 dark:text-slate-400">
                {t('cleanStartConfirmPrompt')} <span className="font-mono font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest underline">{cleanConfirmWord}</span>:
              </label>
              <input
                type="text"
                id="clean-start-confirm-input"
                value={cleanStartInput}
                onChange={e => setCleanStartInput(e.target.value)}
                placeholder={cleanConfirmWord}
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono font-bold tracking-widest uppercase outline-none transition-all ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500' 
                    : 'bg-white border-gray-200 text-gray-900 focus:border-amber-500'
                }`}
                autoFocus
              />
            </div>

            {cleanStartError && (
              <div className="p-3 rounded-xl bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs">
                {cleanStartError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCleanStartModal(false)}
                disabled={isClearingAll}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t('cancel')}
              </button>

              <button
                type="button"
                id="execute-clean-start-btn"
                onClick={handleExecuteCleanStart}
                disabled={cleanStartInput.trim().toUpperCase() !== cleanConfirmWord || isClearingAll}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs tracking-wide transition-all flex items-center gap-2 shadow-lg shadow-amber-600/20"
              >
                {isClearingAll ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>{t('deleting')}...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    <span>{t('cleanStartAction')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
