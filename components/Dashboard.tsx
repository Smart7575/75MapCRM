
import React, { useMemo } from 'react';
import { 
  Gift, 
  MapPin, 
  Users, 
  Heart, 
  Calendar, 
  Activity, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Phone 
} from 'lucide-react';
import { Contact, Address, ContactType } from '../types.ts';
import { cleanPhoneNumber, dialPhoneNumber } from '../utils.ts';

interface DashboardProps {
  contacts: Contact[];
  addresses: Address[];
  types: ContactType[];
  onContactClick: (id: string) => void;
  onCall?: (contact: Contact, phoneNumber?: string, e?: React.MouseEvent | React.TouchEvent) => void;
  onAddContact: () => void;
  t: (key: any) => string;
  theme?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  contacts, 
  addresses, 
  types, 
  onContactClick, 
  onCall,
  onAddContact, 
  t, 
  theme 
}) => {
  const isDark = theme === 'dark';

  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    return contacts
      .filter(c => c.birthDate)
      .map(c => {
        const bday = new Date(c.birthDate!);
        const currentYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
        const nextBday = currentYearBday < today 
          ? new Date(today.getFullYear() + 1, bday.getMonth(), bday.getDate())
          : currentYearBday;
        const diff = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const age = nextBday.getFullYear() - bday.getFullYear();
        return { ...c, daysUntil: diff, nextAge: age };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 8);
  }, [contacts]);

  const planningData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const plannedContacts = contacts
      .filter(c => c.interactionIntervalDays && c.interactionIntervalDays > 0)
      .map(c => {
        const lastDate = (c.lastInteractionDate && c.lastInteractionDate.trim() !== "") 
          ? new Date(c.lastInteractionDate) 
          : new Date(c.createdAt);
        lastDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + (c.interactionIntervalDays || 0));
        const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        let status: 'overdue' | 'soon' | 'ontrack' = 'ontrack';
        if (diffDays < 0) status = 'overdue';
        else if (diffDays <= 7) status = 'soon';
        return { ...c, nextDate, diffDays, status };
      });
    return {
      overdue: plannedContacts.filter(c => c.status === 'overdue').sort((a, b) => a.diffDays - b.diffDays),
      soon: plannedContacts.filter(c => c.status === 'soon').sort((a, b) => a.diffDays - b.diffDays),
      onTrack: plannedContacts.filter(c => c.status === 'ontrack').sort((a, b) => a.diffDays - b.diffDays),
    };
  }, [contacts]);

  const stats = [
    { label: t('totalContacts'), value: contacts.length, icon: <Users size={24} />, color: 'bg-blue-500' },
    { label: t('uniqueAddresses'), value: addresses.length, icon: <MapPin size={24} />, color: 'bg-emerald-500' },
    { label: t('favorites'), value: contacts.filter(c => c.isFavorite).length, icon: <Heart size={24} />, color: 'bg-red-500' },
    { label: t('birthdaysThisMonth'), value: contacts.filter(c => c.birthDate && new Date(c.birthDate).getMonth() === new Date().getMonth()).length, icon: <Gift size={24} />, color: 'bg-amber-500' },
  ];

  return (
    <div className={`h-full w-full overflow-y-auto ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 lg:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
        {/* Header */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-1">{t('welcomeBack')}</h2>
          <p className="text-sm text-gray-500">{t('welcomeSubtitle')}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, i) => (
            <div key={i} className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'} p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border flex items-center gap-4 group transition-shadow`}>
              <div className={`p-3 rounded-2xl ${stat.color} text-white shadow-inner transition-transform group-hover:scale-110`}>{stat.icon}</div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-xl sm:text-2xl font-black">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming Birthdays */}
        <div className="space-y-4 sm:space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Gift className="text-amber-500" /> {t('upcomingBirthdays')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {upcomingBirthdays.length > 0 ? upcomingBirthdays.map(c => {
              const typeColor = types.find(t_obj => t_obj.id === c.typeId)?.color;
              return (
                <div 
                  key={c.id} 
                  onClick={() => onContactClick(c.id)} 
                  className={`${isDark ? 'bg-slate-900 border-slate-800 hover:border-blue-500' : 'bg-white border-gray-100 hover:border-blue-200'} p-4 rounded-3xl border shadow-sm flex items-center gap-4 cursor-pointer group transition-all`}
                >
                  <img 
                    src={c.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.firstName)}+${encodeURIComponent(c.lastName || '')}`} 
                    className="w-16 h-16 rounded-2xl object-cover border-4 shrink-0" 
                    style={{ borderColor: typeColor }} 
                    alt={`${c.firstName} ${c.lastName || ''}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate group-hover:text-blue-500 transition-colors">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-gray-500 font-medium">{t('turning')} {c.nextAge} {t('yearsOld')}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase inline-block mt-2 ${isDark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                      {t('inDays')} {c.daysUntil} {c.daysUntil === 1 ? t('day') : t('days')}
                    </span>
                  </div>
                </div>
              );
            }) : (
              <div className={`col-span-full p-8 sm:p-10 rounded-3xl border border-dashed flex flex-col items-center text-gray-400 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                <Calendar size={48} className="mb-2 opacity-20" />
                <p>{t('noBirthdays')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Planning & Interaction Reminders (Moved from Planning tab) */}
        <div className="pt-6 sm:pt-8 border-t border-gray-200/80 dark:border-slate-800/80 space-y-6 sm:space-y-8">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5">
              <Activity className="text-blue-500" size={24} /> 
              {t('planning')}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('planningSubtitle')}</p>
          </div>

          {/* Overdue Section */}
          <section className="space-y-3">
            <h4 className="text-xs font-black text-red-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <AlertTriangle size={15} /> 
              {t('overdue')} ({planningData.overdue.length})
            </h4>
            {planningData.overdue.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {planningData.overdue.map(c => (
                  <PlanningCard 
                    key={c.id} 
                    contact={c} 
                    types={types} 
                    onContactClick={onContactClick} 
                    onCall={onCall} 
                    t={t} 
                    isDark={isDark} 
                  />
                ))}
              </div>
            ) : (
              <div className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-dashed text-center text-gray-400 text-xs sm:text-sm ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-gray-200'}`}>
                {t('noOverdue')}
              </div>
            )}
          </section>

          {/* Soon Section */}
          <section className="space-y-3">
            <h4 className="text-xs font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Clock size={15} /> 
              {t('soon')} ({planningData.soon.length})
            </h4>
            {planningData.soon.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {planningData.soon.map(c => (
                  <PlanningCard 
                    key={c.id} 
                    contact={c} 
                    types={types} 
                    onContactClick={onContactClick} 
                    onCall={onCall} 
                    t={t} 
                    isDark={isDark} 
                  />
                ))}
              </div>
            ) : (
              <div className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-dashed text-center text-gray-400 text-xs sm:text-sm ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-gray-200'}`}>
                {t('noPlanned')}
              </div>
            )}
          </section>

          {/* On Track Section */}
          <section className="space-y-3">
            <h4 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <CheckCircle2 size={15} /> 
              {t('onTrack')} ({planningData.onTrack.length})
            </h4>
            {planningData.onTrack.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {planningData.onTrack.map(c => (
                  <PlanningCard 
                    key={c.id} 
                    contact={c} 
                    types={types} 
                    onContactClick={onContactClick} 
                    onCall={onCall} 
                    t={t} 
                    isDark={isDark} 
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">{t('noPlanned')}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

interface PlanningCardProps {
  contact: any;
  types: ContactType[];
  onContactClick: (id: string) => void;
  onCall?: (contact: Contact, phoneNumber?: string, e?: React.MouseEvent | React.TouchEvent) => void;
  t: (key: any) => string;
  isDark: boolean;
}

const PlanningCard: React.FC<PlanningCardProps> = ({ 
  contact, 
  types, 
  onContactClick, 
  onCall, 
  t, 
  isDark 
}) => {
  const type = types.find((t_obj: any) => t_obj.id === contact.typeId);
  const isOverdue = contact.status === 'overdue';
  const isSoon = contact.status === 'soon';
  
  const getStatusText = () => {
    if (isOverdue) return `${t('overdue')}: ${Math.abs(contact.diffDays)} ${t('days')}`;
    if (isSoon) return contact.diffDays === 0 ? t('today') : `${t('inDays')} ${contact.diffDays} ${t('days')}`;
    return `${t('inDays')} ${contact.diffDays} ${t('days')}`;
  };

  return (
    <div 
      onClick={() => onContactClick(contact.id)} 
      className={`p-4 sm:p-5 rounded-3xl border shadow-sm transition-all group cursor-pointer flex flex-col justify-between gap-3 ${
        isDark 
          ? 'bg-slate-900 border-slate-800 hover:border-blue-500' 
          : 'bg-white border-gray-100 hover:border-blue-200'
      }`}
    >
      <div className="flex items-center gap-3.5">
        <img 
          src={contact.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.firstName)}+${encodeURIComponent(contact.lastName || '')}`} 
          className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 shadow-sm shrink-0" 
          style={{ borderColor: type?.color || '#3b82f6' }} 
          alt={`${contact.firstName} ${contact.lastName || ''}`}
        />
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold text-sm sm:text-base truncate group-hover:text-blue-500 transition-colors ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
            {contact.firstName} {contact.lastName}
          </h4>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest truncate">{t(type?.name) || type?.name}</p>
        </div>
        {contact.phones && contact.phones.length > 0 && contact.phones[0] && (
          <a
            href={`tel:${cleanPhoneNumber(contact.phones[0])}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onCall) {
                onCall(contact, contact.phones[0], e);
              } else {
                dialPhoneNumber(contact.phones[0], e);
              }
            }}
            title={`${t('call')}: ${contact.phones[0]}`}
            className={`p-2.5 rounded-2xl transition-all active:scale-90 flex items-center justify-center shrink-0 ${
              isDark 
                ? 'bg-emerald-950/70 text-emerald-400 hover:bg-emerald-900 border border-emerald-800/60 shadow-sm' 
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200/80 shadow-sm'
            }`}
          >
            <Phone size={15} className="fill-current" />
          </a>
        )}
      </div>
      <div className={`py-2 px-3 rounded-xl border text-center transition-colors ${
        isOverdue 
          ? (isDark ? 'bg-red-900/20 border-red-900/40 text-red-400' : 'bg-red-50 border-red-100 text-red-600') 
          : isSoon 
          ? (isDark ? 'bg-amber-900/20 border-amber-900/40 text-amber-400' : 'bg-amber-50 border-amber-100 text-amber-600') 
          : (isDark ? 'bg-emerald-900/20 border-emerald-900/40 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600')
      }`}>
        <span className="text-[10px] font-black uppercase tracking-wider">{getStatusText()}</span>
      </div>
    </div>
  );
};

export default Dashboard;
