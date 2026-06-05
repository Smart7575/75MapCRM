
import React, { useMemo } from 'react';
import { 
  Clock, AlertTriangle, CheckCircle2, Calendar, 
  ChevronRight, ArrowRight, UserCheck, Smartphone, Phone,
  Activity
} from 'lucide-react';
import { Contact, Address, ContactType } from '../types.ts';

interface PlanningViewProps {
  contacts: Contact[];
  addresses: Address[];
  types: ContactType[];
  onContactClick: (id: string) => void;
  t: (key: any) => string;
  theme?: string;
}

const PlanningView: React.FC<PlanningViewProps> = ({ contacts, addresses, types, onContactClick, t, theme }) => {
  const isDark = theme === 'dark';

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

  return (
    <div className={`h-full w-full overflow-y-auto ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-gray-50/50 text-gray-900'}`}>
      <div className="p-8 max-w-6xl mx-auto space-y-10 pb-24">
        <div>
          <h2 className="text-3xl font-bold mb-1 flex items-center gap-3"><Activity className="text-blue-500" /> {t('planning')}</h2>
          <p className="text-gray-500">{t('planningSubtitle')}</p>
        </div>
        <section className="space-y-4">
          <h3 className="text-xs font-black text-red-500 uppercase tracking-[0.2em] flex items-center gap-2"><AlertTriangle size={14} /> {t('overdue')} ({planningData.overdue.length})</h3>
          {planningData.overdue.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {planningData.overdue.map(c => <PlanningCard key={c.id} contact={c} types={types} onContactClick={onContactClick} t={t} isDark={isDark} />)}
            </div>
          ) : (
            <div className={`p-10 rounded-[2rem] border border-dashed text-center text-gray-400 text-sm ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-gray-200'}`}>{t('noOverdue')}</div>
          )}
        </section>
        <section className="space-y-4">
          <h3 className="text-xs font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2"><Clock size={14} /> {t('soon')} ({planningData.soon.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {planningData.soon.map(c => <PlanningCard key={c.id} contact={c} types={types} onContactClick={onContactClick} t={t} isDark={isDark} />)}
          </div>
        </section>
        <section className="space-y-4">
          <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2"><CheckCircle2 size={14} /> {t('onTrack')} ({planningData.onTrack.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {planningData.onTrack.map(c => <PlanningCard key={c.id} contact={c} types={types} onContactClick={onContactClick} t={t} isDark={isDark} />)}
            {planningData.onTrack.length === 0 && <p className="col-span-full text-xs text-gray-500 italic">{t('noPlanned')}</p>}
          </div>
        </section>
      </div>
    </div>
  );
};

const PlanningCard = ({ contact, types, onContactClick, t, isDark }: any) => {
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
      className={`p-5 rounded-[2rem] border shadow-sm transition-all group cursor-pointer flex flex-col gap-4 ${isDark ? 'bg-slate-900 border-slate-800 hover:border-blue-500' : 'bg-white border-gray-100 hover:border-blue-200'}`}
    >
      <div className="flex items-center gap-4">
        <img src={contact.photoUrl || `https://ui-avatars.com/api/?name=${contact.firstName}+${contact.lastName || ''}`} className="w-14 h-14 rounded-2xl object-cover border-2 shadow-sm" style={{ borderColor: type?.color }} />
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold group-hover:text-blue-500 transition-colors ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{contact.firstName} {contact.lastName}</h4>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t(type?.name)}</p>
        </div>
      </div>
      <div className={`p-3 rounded-2xl border transition-colors ${isOverdue ? (isDark ? 'bg-red-900/20 border-red-900/40 text-red-400' : 'bg-red-50 border-red-100 text-red-600') : isSoon ? (isDark ? 'bg-amber-900/20 border-amber-900/40 text-amber-400' : 'bg-amber-50 border-amber-100 text-amber-600') : (isDark ? 'bg-emerald-900/20 border-emerald-900/40 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600')}`}>
        <span className="text-[10px] font-black uppercase tracking-widest">{getStatusText()}</span>
      </div>
    </div>
  );
};

export default PlanningView;
