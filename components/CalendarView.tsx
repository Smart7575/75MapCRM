
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Gift } from 'lucide-react';
import { Contact, ContactType } from '../types.ts';

interface CalendarViewProps {
  contacts: Contact[];
  types: ContactType[];
  onContactClick: (id: string) => void;
  language: 'nl' | 'en';
  theme?: string;
}

const CalendarView: React.FC<CalendarViewProps> = ({ contacts, types, onContactClick, language, theme }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const isDark = theme === 'dark';

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const translations = {
    nl: {
      months: ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'],
      days: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
      today: 'Vandaag',
      subtitle: 'Plan je sociale uitjes en verjaardagskaarten.'
    },
    en: {
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      days: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
      today: 'Today',
      subtitle: 'Plan your social outings and birthday cards.'
    }
  };

  const t_cal = translations[language];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = [];
  const totalDays = daysInMonth(year, month);
  const startOffset = (firstDayOfMonth(year, month) + 6) % 7; 

  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= totalDays; d++) days.push(d);

  return (
    <div className={`h-full w-full overflow-y-auto ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-4 sm:space-y-6 flex flex-col min-h-full pb-20 sm:pb-24">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">{t_cal.months[month]} {year}</h2>
            <p className="text-xs sm:text-sm text-gray-500">{t_cal.subtitle}</p>
          </div>
          <div className="flex gap-2 self-end sm:self-auto">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className={`p-2 border rounded-full transition-colors ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}><ChevronLeft size={18}/></button>
            <button onClick={() => setCurrentDate(new Date())} className={`px-3 sm:px-4 py-1.5 sm:py-2 border rounded-xl font-bold text-xs sm:text-sm transition-colors ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>{t_cal.today}</button>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className={`p-2 border rounded-full transition-colors ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}><ChevronRight size={18}/></button>
          </div>
        </div>
        <div className={`flex-1 rounded-2xl sm:rounded-3xl border shadow-xl overflow-hidden flex flex-col ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
          <div className={`grid grid-cols-7 border-b ${isDark ? 'bg-slate-800/50 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
            {t_cal.days.map(day => <div key={day} className="py-2.5 sm:py-4 text-center text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest">{day}</div>)}
          </div>
          <div className="flex-1 grid grid-cols-7 grid-rows-5 overflow-auto">
            {days.map((day, idx) => {
              const birthdayContacts = day ? contacts.filter(c => c.birthDate && new Date(c.birthDate).getDate() === day && new Date(c.birthDate).getMonth() === month) : [];
              const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
              
              return (
                <div key={idx} className={`min-h-[80px] sm:min-h-[105px] p-1.5 sm:p-2 border-r border-b flex flex-col gap-1 transition-colors ${isDark ? 'border-slate-800/50 hover:bg-slate-800/50' : 'border-gray-50 hover:bg-blue-50/20'} ${day ? '' : (isDark ? 'bg-slate-950/20' : 'bg-gray-50/30')}`}>
                  {day && <>
                    <span className={`text-xs sm:text-sm font-bold w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full transition-colors ${isToday ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>
                      {day}
                    </span>
                    <div className="space-y-1">
                      {birthdayContacts.map(c => (
                        <div key={c.id} onClick={() => onContactClick(c.id)} className={`flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-lg cursor-pointer border transition-all ${isDark ? 'bg-amber-900/20 border-amber-900/40 hover:bg-amber-900/30' : 'bg-amber-50 border-amber-100 hover:bg-amber-100'}`}>
                          <span className={`text-[9px] sm:text-[10px] font-bold truncate ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>{c.firstName}</span>
                        </div>
                      ))}
                    </div>
                  </>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
