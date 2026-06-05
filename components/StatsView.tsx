
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Contact, ContactType, Address } from '../types.ts';
import { Activity, User } from 'lucide-react';

interface StatsViewProps {
  contacts: Contact[];
  types: ContactType[];
  addresses: Address[];
  t: (key: any) => string;
  theme?: string;
}

const StatsView: React.FC<StatsViewProps> = ({ contacts, types, addresses, t, theme }) => {
  const isDark = theme === 'dark';
  
  const typeData = types.map(t_obj => ({
    name: t(t_obj.name as any),
    value: contacts.filter(c => c.typeId === t_obj.id).length,
    color: t_obj.color
  })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  const cityCounts = contacts.reduce((acc: any, c) => {
    const addr = addresses.find(a => a.id === c.addressId);
    const city = addr?.city || t('Onbekend');
    acc[city] = (acc[city] || 0) + 1;
    return acc;
  }, {});

  const cityData = Object.entries(cityCounts).map(([city, count]) => ({ city, count: count as number })).sort((a, b) => b.count - a.count).slice(0, 5);

  const topInteractions180Data = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 180);

    return contacts
      .map(c => {
        const recentInteractions = (c.interactions || []).filter(i => new Date(i.date) >= cutoff);
        return {
          ...c,
          interactionCount: recentInteractions.length
        };
      })
      .filter(c => c.interactionCount > 0)
      .sort((a, b) => b.interactionCount - a.interactionCount)
      .slice(0, 10);
  }, [contacts]);

  return (
    <div className={`h-full w-full overflow-y-auto ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="p-8 max-w-7xl mx-auto space-y-10 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'} p-8 rounded-3xl border shadow-sm`}>
            <h3 className="text-xl font-bold mb-6">{t('contactType')}</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {typeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '1rem', 
                      border: 'none', 
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      color: isDark ? '#f1f5f9' : '#0f172a',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                    }} 
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'} p-8 rounded-3xl border shadow-sm`}>
            <h3 className="text-xl font-bold mb-6">{t('topLocations')}</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cityData}>
                  <XAxis dataKey="city" stroke={isDark ? "#475569" : "#94a3b8"} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke={isDark ? "#475569" : "#94a3b8"} fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: isDark ? '#1e293b' : '#f8fafc'}} 
                    contentStyle={{ 
                      borderRadius: '1rem', 
                      border: 'none',
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      color: isDark ? '#f1f5f9' : '#0f172a'
                    }} 
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'} lg:col-span-2 p-8 rounded-3xl border shadow-sm`}>
            <div className="flex items-center gap-3 mb-8">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                <Activity size={20} />
              </div>
              <h3 className="text-xl font-bold">{t('topInteractions180')}</h3>
            </div>
            
            <div className="space-y-4">
              {topInteractions180Data.length > 0 ? topInteractions180Data.map((c, idx) => {
                const typeColor = types.find(t_obj => t_obj.id === c.typeId)?.color || '#3b82f6';
                const typeName = types.find(t_obj => t_obj.id === c.typeId)?.name || '';
                return (
                  <div key={c.id} className={`${isDark ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800' : 'bg-gray-50/50 border-gray-100/50 hover:bg-white'} flex items-center justify-between p-4 rounded-2xl border hover:shadow-md transition-all group`}>
                    <div className="flex items-center gap-4">
                      <div className="text-lg font-black text-gray-400/50 w-6">{idx + 1}</div>
                      <img 
                        src={c.photoUrl || `https://ui-avatars.com/api/?name=${c.firstName}+${c.lastName || ''}`} 
                        className="w-12 h-12 rounded-xl object-cover border-2 shadow-sm"
                        style={{ borderColor: typeColor }}
                      />
                      <div>
                        <p className="font-bold group-hover:text-blue-500 transition-colors">{c.firstName} {c.lastName}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{t(typeName)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-black text-blue-500">{c.interactionCount}</p>
                        <p className="text-[9px] font-black uppercase tracking-tighter text-gray-500">{t('interactions')}</p>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className={`text-center py-10 text-gray-400 rounded-2xl border border-dashed ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                  <User size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="font-bold text-sm">Geen interacties gevonden in deze periode.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsView;
