
import React, { useState, useMemo } from 'react';
import { X, Search, Check, Users, Clock, MessageSquare, Calendar } from 'lucide-react';
import { Contact, Event, InteractionMode } from '../types.ts';

interface EventFormProps {
  contacts: Contact[];
  onClose: () => void;
  onSave: (event: Event) => void;
  onDelete?: (id: string) => void;
  initialData?: Event;
  t: (key: any) => string;
  theme?: string;
}

const EventForm: React.FC<EventFormProps> = ({ contacts, onClose, onSave, onDelete, initialData, t, theme }) => {
  const isDark = theme === 'dark';
  const [title, setTitle] = useState(initialData?.title || '');
  const [date, setDate] = useState(initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<InteractionMode>(initialData?.type || 'physical');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(initialData?.contactIds || []);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return contacts.filter(c => 
      c.firstName.toLowerCase().includes(q) || 
      (c.lastName || '').toLowerCase().includes(q)
    ).sort((a, b) => a.firstName.localeCompare(b.firstName));
  }, [contacts, searchQuery]);

  const toggleContact = (id: string) => {
    setSelectedContactIds(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || selectedContactIds.length === 0) return;

    const eventToSave: Event = {
      id: initialData?.id || `event-${Date.now()}`,
      title,
      date: new Date(date).toISOString(),
      type,
      notes: '',
      contactIds: selectedContactIds,
      createdAt: initialData?.createdAt || new Date().toISOString()
    };

    onSave(eventToSave);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-white/50 text-gray-900'}`}>
        <header className={`p-6 border-b shrink-0 flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Calendar size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">{t('newEvent')}</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('multiContactEvent')}</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-gray-100 text-gray-400'}`}><X size={24} /></button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('eventTitle')}</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={t('eventPlaceholder')}
                  autoComplete="off"
                  className={`w-full px-4 py-3 rounded-2xl border outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-gray-50 border-gray-100'}`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('date')}</label>
                <input 
                  required
                  type="date" 
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl border outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-gray-50 border-gray-100'}`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('contactType')}</label>
              <div className="flex flex-wrap gap-2">
                {(['physical', 'app', 'phone', 'other'] as InteractionMode[]).map(t_mode => (
                  <button
                    key={t_mode}
                    type="button"
                    onClick={() => setType(t_mode)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      type === t_mode 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105' 
                        : (isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-gray-100 text-gray-500')
                    }`}
                  >
                    {t(t_mode === 'phone' ? 'call' : t_mode)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('selectAttendees')}</label>
                  <p className="text-xs font-bold text-blue-500">{selectedContactIds.length} {t('attendees')}</p>
                </div>
                <div className="relative w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input 
                    type="text" 
                    placeholder={t('search')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`w-full pl-9 pr-4 py-1.5 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-gray-50 border-gray-100'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {filteredContacts.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleContact(c.id)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                      selectedContactIds.includes(c.id)
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                        : (isDark ? 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600' : 'bg-gray-50 border-gray-100 text-gray-700 hover:border-gray-200')
                    }`}
                  >
                    <img src={c.photoUrl || `https://ui-avatars.com/api/?name=${c.firstName}`} className="w-8 h-8 rounded-full bg-white/20" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{c.firstName} {c.lastName}</p>
                    </div>
                    {selectedContactIds.includes(c.id) && <Check size={16} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <footer className={`p-6 border-t shrink-0 flex gap-4 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
            {initialData && onDelete && (
              <button 
                type="button" 
                onClick={() => {
                  if (window.confirm(t('confirmDeleteEvent'))) {
                    onDelete(initialData.id);
                  }
                }}
                className={`px-6 py-4 rounded-2xl font-bold transition-all border border-red-200 text-red-500 hover:bg-red-50 active:scale-95`}
              >
                {t('delete')}
              </button>
            )}
            <button 
              type="submit" 
              disabled={selectedContactIds.length === 0 || !title}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:grayscale text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
              {t('save')}
            </button>
            <button 
              type="button" 
              onClick={onClose}
              className={`px-8 py-4 rounded-2xl font-bold transition-all border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
            >
              {t('cancel')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default EventForm;
