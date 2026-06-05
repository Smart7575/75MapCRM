
import React from 'react';
import { Calendar, Users, Clock, MessageSquare, ChevronRight, Interaction } from 'lucide-react';
import { Event, Contact, InteractionMode } from '../types.ts';

interface EventsViewProps {
  events: Event[];
  contacts: Contact[];
  onContactClick: (id: string) => void;
  onEditEvent: (event: Event) => void;
  t: (key: any) => string;
  theme?: string;
}

const EventsView: React.FC<EventsViewProps> = ({ events, contacts, onContactClick, onEditEvent, t, theme }) => {
  const isDark = theme === 'dark';
  
  const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getInteractionIcon = (type_in: InteractionMode) => {
    switch(type_in) {
      case 'physical': return <Users size={18} />;
      case 'app': return <Clock size={18} />; // Replacing with better ones if needed
      case 'phone': return <Calendar size={18} />;
      default: return <MessageSquare size={18} />;
    }
  };

  return (
    <div className={`h-full flex flex-col p-6 space-y-6 overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-black tracking-tight">{t('events')}</h2>
        <p className="text-gray-500 font-medium">{t('multiContactEvent')}</p>
      </header>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
        {sortedEvents.length === 0 ? (
          <div className={`p-12 text-center rounded-[2.5rem] border-2 border-dashed ${isDark ? 'bg-slate-900/50 border-slate-800 text-slate-500' : 'bg-white border-gray-100 text-gray-400'}`}>
            <Calendar size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold">{t('noInteractions')}</p>
          </div>
        ) : (
          sortedEvents.map(event => (
            <div 
              key={event.id}
              className={`p-6 rounded-[2rem] border transition-all hover:shadow-xl group ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100 shadow-sm'}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{event.title}</h3>
                    <p className="text-sm font-medium text-gray-500">{new Date(event.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onEditEvent(event)}
                    className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}
                  >
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                    {t(event.type === 'phone' ? 'call' : event.type)}
                  </span>
                </div>
              </div>

              {event.notes && (
                <div className={`mb-6 p-4 rounded-2xl italic text-sm ${isDark ? 'bg-slate-800/50 text-slate-400' : 'bg-gray-50 text-gray-600'}`}>
                  {event.notes}
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('attendees')}</p>
                <div className="flex flex-wrap gap-2">
                  {event.contactIds.map(cId => {
                    const contact = contacts.find(c => c.id === cId);
                    if (!contact) return null;
                    return (
                      <button
                        key={cId}
                        onClick={() => onContactClick(cId)}
                        className={`flex items-center gap-2 p-1.5 pr-4 rounded-full border transition-all ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-white border-gray-100 hover:border-gray-200 text-gray-700 shadow-sm'}`}
                      >
                        <img src={contact.photoUrl || `https://ui-avatars.com/api/?name=${contact.firstName}`} className="w-6 h-6 rounded-full" />
                        <span className="text-xs font-bold">{contact.firstName}</span>
                        <ChevronRight size={12} className="opacity-30" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventsView;
