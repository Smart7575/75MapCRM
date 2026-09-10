
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Filter, MoreHorizontal, Mail, Phone, 
  MapPin, Star, Heart, Grid, List as ListIcon,
  ChevronDown, Clock, Activity, ChevronRight, ArrowUpDown
} from 'lucide-react';
import { Contact, Address, ContactType } from '../types.ts';
import { cleanPhoneNumber, dialPhoneNumber, getContactSortName } from '../utils.ts';

interface ContactListProps {
  contacts: Contact[];
  addresses: Address[];
  types: ContactType[];
  onContactClick: (id: string) => void;
  onCall?: (contact: Contact, phoneNumber?: string, e?: React.MouseEvent | React.TouchEvent) => void;
  t: (key: any) => string;
  theme?: string;
}

const ContactList: React.FC<ContactListProps> = ({ contacts, addresses, types, onContactClick, onCall, t, theme }) => {
  // Standaard lijstweergave ('table') tenzij eerder door de gebruiker gewijzigd en opgeslagen
  const [viewStyle, setViewStyle] = useState<'grid' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mapcrm_contact_view_style') || 
                    localStorage.getItem('mapcrm_contact_view_mobile') || 
                    localStorage.getItem('mapcrm_contact_view_desktop');
      if (saved === 'grid' || saved === 'table') return saved;
    }
    return 'table';
  });

  const [selectedTypeId, setSelectedTypeId] = useState<string>('all');

  // Standaard sorteren op achternaam ('lastName') tenzij eerder door de gebruiker gewijzigd en opgeslagen
  const [sortField, setSortField] = useState<'firstName' | 'lastName'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mapcrm_contact_sort_field');
      if (saved === 'firstName' || saved === 'lastName') return saved;
    }
    return 'lastName';
  });
  const isDark = theme === 'dark';

  const handleSortFieldChange = (newSort: 'firstName' | 'lastName') => {
    setSortField(newSort);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mapcrm_contact_sort_field', newSort);
    }
  };

  const handleViewStyleChange = (style: 'grid' | 'table') => {
    setViewStyle(style);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mapcrm_contact_view_style', style);
      localStorage.setItem('mapcrm_contact_view_mobile', style);
      localStorage.setItem('mapcrm_contact_view_desktop', style);
    }
  };

  const processedContacts = useMemo(() => {
    let result = [...contacts];
    if (selectedTypeId !== 'all') result = result.filter(c => c.typeId === selectedTypeId);
    return result.sort((a, b) => {
      if (sortField === 'lastName') {
        const sortA = getContactSortName(a).toLowerCase();
        const sortB = getContactSortName(b).toLowerCase();
        return sortA.localeCompare(sortB, 'nl', { sensitivity: 'base' });
      } else {
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB, 'nl', { sensitivity: 'base' });
      }
    });
  }, [contacts, selectedTypeId, sortField]);

  const getTimeSinceLastContact = (dateString?: string) => {
    if (!dateString || dateString.trim() === "") return t('never');
    const lastDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
    const diffDays = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('today');
    if (diffDays === 1) return t('yesterday');
    if (diffDays < 7) return `${diffDays} ${t('days')} ${t('ago') || 'ago'}`;
    return lastDate.toLocaleDateString();
  };

  return (
    <div className={`h-full w-full overflow-y-auto ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-24">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{t('overview')}</h2>
            <p className="text-sm text-gray-500">{processedContacts.length} {t('peopleShown')}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative group">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <select 
                value={selectedTypeId} 
                onChange={e => setSelectedTypeId(e.target.value)} 
                className={`pl-9 pr-8 py-2 border rounded-xl text-xs font-bold outline-none appearance-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer ${isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-gray-200 text-gray-700'}`}
              >
                <option value="all">{t('allTypes')}</option>
                {types.map(t_obj => <option key={t_obj.id} value={t_obj.id}>{t(t_obj.name)}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            </div>

            {/* Sorteeroptie: Voornaam / Achternaam */}
            <div className="relative group">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <select 
                value={sortField} 
                onChange={e => handleSortFieldChange(e.target.value as 'firstName' | 'lastName')} 
                className={`pl-9 pr-8 py-2 border rounded-xl text-xs font-bold outline-none appearance-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer ${isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-gray-200 text-gray-700'}`}
                title={t('sortBy')}
              >
                <option value="firstName">{t('sortBy')}: {t('sortByFirstName')}</option>
                <option value="lastName">{t('sortBy')}: {t('sortByLastName')}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            </div>

            <div className={`h-8 w-px ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`} />
            <div className={`flex p-1 rounded-xl ${isDark ? 'bg-slate-900' : 'bg-gray-100'}`}>
              <button 
                onClick={() => handleViewStyleChange('grid')} 
                className={`p-2 rounded-lg transition-all ${viewStyle === 'grid' ? (isDark ? 'bg-slate-800 text-blue-400' : 'bg-white shadow-sm text-blue-600') : 'text-gray-400'}`} 
                title={t('gridView')}
              >
                <Grid size={18} />
              </button>
              <button 
                onClick={() => handleViewStyleChange('table')} 
                className={`p-2 rounded-lg transition-all ${viewStyle === 'table' ? (isDark ? 'bg-slate-800 text-blue-400' : 'bg-white shadow-sm text-blue-600') : 'text-gray-400'}`} 
                title={t('listView')}
              >
                <ListIcon size={18} />
              </button>
            </div>
          </div>
        </div>

        {viewStyle === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {processedContacts.map(contact => {
              const addr = addresses.find(a => a.id === contact.addressId);
              const type = types.find(t_obj => t_obj.id === contact.typeId);
              return (
                <div 
                  key={contact.id} 
                  onClick={() => onContactClick(contact.id)} 
                  className={`rounded-3xl p-5 border shadow-sm cursor-pointer transition-all group relative ${isDark ? 'bg-slate-900 border-slate-800 hover:border-blue-500 hover:shadow-xl' : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-xl'}`}
                >
                  {contact.isFavorite && <Heart className="absolute top-4 right-4 text-red-500 fill-current" size={16} />}
                  <div className="flex flex-col items-center text-center">
                    <img src={contact.photoUrl || `https://ui-avatars.com/api/?name=${contact.firstName}+${contact.lastName || ''}`} className="w-24 h-24 rounded-3xl object-cover border-4 mb-4" style={{ borderColor: type?.color }} />
                    <h3 className={`text-lg font-bold group-hover:text-blue-500 transition-colors ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                      {sortField === 'lastName' ? getContactSortName(contact) : `${contact.firstName} ${contact.lastName || ''}`}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 justify-center mb-4">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t(type?.name)}</p>
                      <span className="text-gray-300">•</span>
                      <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-500'}`}>
                         <Clock size={10} /> {getTimeSinceLastContact(contact.lastInteractionDate)}
                      </div>
                    </div>
                    <div className="w-full space-y-2 text-sm">
                      <div className={`flex items-center gap-2 p-2 rounded-xl text-gray-500 ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                        <MapPin size={14} className="shrink-0" />
                        <span className="truncate">{addr ? `${addr.city}` : t('never')}</span>
                      </div>
                      {contact.phones && contact.phones.length > 0 && contact.phones[0] && (
                        <a
                          href={`tel:${cleanPhoneNumber(contact.phones[0])}`}
                          onClick={(e) => {
                            if (onCall) {
                              onCall(contact, contact.phones[0], e);
                            } else {
                              dialPhoneNumber(contact.phones[0], e);
                            }
                          }}
                          title={`${t('call')}: ${contact.phones[0]}`}
                          className={`flex items-center gap-2 p-2 rounded-xl transition-colors active:scale-95 group/call ${
                            isDark 
                              ? 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/60 border border-emerald-800/50' 
                              : 'bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/70'
                          }`}
                        >
                          <Phone size={14} className="shrink-0 fill-current" />
                          <span className="truncate text-xs font-semibold group-hover/call:underline">{contact.phones[0]}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            {/* Mobile-optimized List View (< sm screens) */}
            <div className={`sm:hidden rounded-2xl border shadow-sm divide-y overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800 divide-slate-800' : 'bg-white border-gray-100 divide-gray-100'}`}>
              {processedContacts.map(contact => {
                const addr = addresses.find(a => a.id === contact.addressId);
                const type = types.find(t_obj => t_obj.id === contact.typeId);
                return (
                  <div 
                    key={contact.id}
                    onClick={() => onContactClick(contact.id)}
                    className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors active:scale-[0.99] ${isDark ? 'hover:bg-slate-800/70 active:bg-slate-800' : 'hover:bg-blue-50/40 active:bg-blue-50/60'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img 
                          src={contact.photoUrl || `https://ui-avatars.com/api/?name=${contact.firstName}+${contact.lastName || ''}`} 
                          className="w-12 h-12 rounded-2xl object-cover border-2 shrink-0" 
                          style={{ borderColor: type?.color || '#3b82f6' }}
                          alt=""
                        />
                        {contact.isFavorite && (
                          <div className="absolute -top-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-sm">
                            <Heart className="text-red-500 fill-current" size={12} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-bold text-sm truncate ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                          {sortField === 'lastName' ? getContactSortName(contact) : `${contact.firstName} ${contact.lastName || ''}`}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          <span 
                            className="inline-block w-2 h-2 rounded-full shrink-0" 
                            style={{ backgroundColor: type?.color }} 
                          />
                          <span className="truncate">{t(type?.name)}</span>
                          {addr?.city && (
                            <>
                              <span className="text-gray-300 dark:text-gray-600">•</span>
                              <span className="truncate text-gray-400">{addr.city}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {contact.phones && contact.phones.length > 0 && contact.phones[0] && (
                        <a
                          href={`tel:${cleanPhoneNumber(contact.phones[0])}`}
                          onClick={(e) => {
                            if (onCall) {
                              onCall(contact, contact.phones[0], e);
                            } else {
                              dialPhoneNumber(contact.phones[0], e);
                            }
                          }}
                          title={`${t('call')}: ${contact.phones[0]}`}
                          className={`p-2 rounded-xl transition-all active:scale-90 flex items-center justify-center ${
                            isDark 
                              ? 'bg-emerald-950/70 text-emerald-400 hover:bg-emerald-900 border border-emerald-800/60 shadow-sm' 
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200/80 shadow-sm'
                          }`}
                        >
                          <Phone size={14} className="fill-current" />
                        </a>
                      )}
                      <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        {getTimeSinceLastContact(contact.lastInteractionDate)}
                      </div>
                      <ChevronRight size={16} className="text-gray-400 shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tablet & Desktop Table View (>= sm screens) */}
            <div className={`hidden sm:block rounded-3xl border shadow-sm overflow-hidden overflow-x-auto ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b ${isDark ? 'bg-slate-800/50 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t('contacts')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t('contactType')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t('phone')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t('location')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{t('lastSpoken')}</th>
                  </tr>
                </thead>
                <tbody>
                  {processedContacts.map(contact => {
                    const addr = addresses.find(a => a.id === contact.addressId);
                    const type = types.find(t_obj => t_obj.id === contact.typeId);
                    return (
                      <tr 
                        key={contact.id} 
                        className={`cursor-pointer border-b transition-colors ${isDark ? 'hover:bg-slate-800 border-slate-800' : 'hover:bg-blue-50/30 border-gray-50'}`} 
                        onClick={() => onContactClick(contact.id)}
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <img 
                              src={contact.photoUrl || `https://ui-avatars.com/api/?name=${contact.firstName}+${contact.lastName || ''}`} 
                              className="w-9 h-9 rounded-xl object-cover border-2 shrink-0" 
                              style={{ borderColor: type?.color }} 
                              alt=""
                            />
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                                {sortField === 'lastName' ? getContactSortName(contact) : `${contact.firstName} ${contact.lastName || ''}`}
                              </span>
                              {contact.isFavorite && <Heart className="text-red-500 fill-current shrink-0" size={13} />}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white" style={{ backgroundColor: type?.color }}>
                            {t(type?.name)}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          {contact.phones && contact.phones.length > 0 && contact.phones[0] ? (
                            <a
                              href={`tel:${cleanPhoneNumber(contact.phones[0])}`}
                              onClick={(e) => {
                                if (onCall) {
                                  onCall(contact, contact.phones[0], e);
                                } else {
                                  dialPhoneNumber(contact.phones[0], e);
                                }
                              }}
                              title={`${t('call')}: ${contact.phones[0]}`}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                                isDark 
                                  ? 'bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/80 border border-emerald-800/60' 
                                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              <Phone size={12} className="fill-current" />
                              <span>{contact.phones[0]}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                          {addr?.city ? `${addr.city}` : '—'}
                        </td>
                        <td className={`px-6 py-3.5 text-xs font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                          {getTimeSinceLastContact(contact.lastInteractionDate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {processedContacts.length === 0 && (
          <div className={`text-center py-20 rounded-[2.5rem] border border-dashed ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
            <p className="text-gray-400 font-bold">{t('noneFound')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactList;
