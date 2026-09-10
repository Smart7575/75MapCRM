
import React, { useMemo } from 'react';
import { Gift, MapPin, Users, Heart, ArrowRight, UserPlus, Calendar } from 'lucide-react';
import { Contact, Address, ContactType } from '../types.ts';

interface DashboardProps {
  contacts: Contact[];
  addresses: Address[];
  types: ContactType[];
  onContactClick: (id: string) => void;
  onAddContact: () => void;
  t: (key: any) => string;
  theme?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ contacts, addresses, types, onContactClick, onAddContact, t, theme }) => {
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

  const stats = [
    { label: t('totalContacts'), value: contacts.length, icon: <Users size={24} />, color: 'bg-blue-500' },
    { label: t('uniqueAddresses'), value: addresses.length, icon: <MapPin size={24} />, color: 'bg-emerald-500' },
    { label: t('favorites'), value: contacts.filter(c => c.isFavorite).length, icon: <Heart size={24} />, color: 'bg-red-500' },
    { label: t('birthdaysThisMonth'), value: contacts.filter(c => c.birthDate && new Date(c.birthDate).getMonth() === new Date().getMonth()).length, icon: <Gift size={24} />, color: 'bg-amber-500' },
  ];

  return (
    <div className={`h-full w-full overflow-y-auto ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 lg:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 sm:pb-24">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-1">{t('welcomeBack')}</h2>
          <p className="text-sm text-gray-500">{t('welcomeSubtitle')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, i) => (
            <div key={i} className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'} p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border flex items-center gap-4 group transition-shadow`}>
              <div className={`p-3 rounded-2xl ${stat.color} text-white shadow-inner transition-transform group-hover:scale-110`}>{stat.icon}</div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-xl sm:text-2xl font-black">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="pb-12">
          <div className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2"><Gift className="text-amber-500" /> {t('upcomingBirthdays')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {upcomingBirthdays.length > 0 ? upcomingBirthdays.map(c => {
                const typeColor = types.find(t_obj => t_obj.id === c.typeId)?.color;
                return (
                  <div key={c.id} onClick={() => onContactClick(c.id)} className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-blue-500' : 'bg-white border-gray-100 hover:border-blue-200'} p-4 rounded-3xl border shadow-sm flex items-center gap-4 cursor-pointer group transition-all`}>
                    <img src={c.photoUrl || `https://ui-avatars.com/api/?name=${c.firstName}+${c.lastName || ''}`} className="w-16 h-16 rounded-2xl object-cover border-4" style={{ borderColor: typeColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate group-hover:text-blue-500 transition-colors">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-gray-500 font-medium">{t('turning')} {c.nextAge} {t('yearsOld')}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase inline-block mt-2 ${theme === 'dark' ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                        {t('inDays')} {c.daysUntil} {c.daysUntil === 1 ? t('day') : t('days')}
                      </span>
                    </div>
                  </div>
                );
              }) : (
                <div className={`col-span-full p-10 rounded-3xl border border-dashed flex flex-col items-center text-gray-400 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                  <Calendar size={48} className="mb-2 opacity-20" />
                  <p>{t('noBirthdays')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
