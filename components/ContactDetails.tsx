
import React, { useState, useMemo } from 'react';
import { 
  X, Phone, Mail, MapPin, Calendar, Heart, 
  Dog, Info, Edit2, Trash2, Check,
  MessageSquare, ExternalLink, Clock, Users, Plus,
  GitPullRequest, Baby, Facebook, Instagram, Linkedin,
  CheckCircle2, Smartphone, UserCheck
} from 'lucide-react';
import { Contact, Address, ContactType, Relation, Interaction, InteractionMode } from '../types.ts';
import { cleanPhoneNumber, dialPhoneNumber } from '../utils.ts';

interface ContactDetailsProps {
  contact: Contact;
  address: Address;
  type: ContactType;
  contacts: Contact[];
  relations: Relation[];
  otherResidents: Contact[];
  onClose: () => void;
  onEdit: (contact: Contact) => void;
  onUpdate: (contact: Contact) => void;
  onDelete: (id: string) => void;
  onAddResident: (addressId: string) => void;
  onSetMapAvatar: (addressId: string, contactId: string) => void;
  onContactClick: (id: string) => void;
  onCall?: (contact: Contact, phoneNumber?: string, e?: React.MouseEvent | React.TouchEvent) => void;
  t: (key: any) => string;
  theme?: string;
}

const ContactDetails: React.FC<ContactDetailsProps> = ({ 
  contact, address, type, contacts, relations, otherResidents, onClose, onEdit, onUpdate, onDelete, onAddResident, onSetMapAvatar, onContactClick, onCall, t, theme
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [editingInteractionId, setEditingInteractionId] = useState<string | null>(null);
  const [deletingInteractionId, setDeletingInteractionId] = useState<string | null>(null);
  const [newInteractionType, setNewInteractionType] = useState<InteractionMode>('physical');
  const [newInteractionNotes, setNewInteractionNotes] = useState('');
  const [newInteractionDate, setNewInteractionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const isDark = theme === 'dark';
  
  const allResidents = [...otherResidents, contact].sort((a, b) => {
    const dateA = a?.createdAt || '';
    const dateB = b?.createdAt || '';
    return dateA.localeCompare(dateB);
  });
  const contactRelations = useMemo(() => {
    return relations
      .filter(r => r.contactAId === contact.id || r.contactBId === contact.id)
      .map(r => {
        const otherId = r.contactAId === contact.id ? r.contactBId : r.contactAId;
        const otherContact = contacts.find(c => c.id === otherId);
        return { relation: r, contact: otherContact, displayType: r.type };
      })
      .filter(item => item.contact);
  }, [contact.id, relations, contacts]);

  const displayInteractions = useMemo(() => {
    let list = [...(contact.interactions || [])];
    const lastInteractionStr = contact.lastInteractionDate;
    if (lastInteractionStr && lastInteractionStr.trim() !== "") {
      const lastDateStr = new Date(lastInteractionStr).toLocaleDateString();
      if (!list.some(i => new Date(i.date).toLocaleDateString() === lastDateStr)) {
        list.push({ id: 'virtual-last', type: 'interaction', date: lastInteractionStr, notes: t('nu_vastleggen') });
      }
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [contact.interactions, contact.lastInteractionDate, t]);

  const getTimeSinceLastContact = (dateString?: string) => {
    if (!dateString || dateString.trim() === "") return t('never');
    const lastDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('today');
    if (diffDays === 1) return t('yesterday');
    if (diffDays < 7) return `${diffDays} ${t('daysAgo')}`;
    return lastDate.toLocaleDateString();
  };

  const handleOpenNewInteraction = () => {
    setEditingInteractionId(null);
    setNewInteractionDate(new Date().toISOString().split('T')[0]);
    setNewInteractionType('physical');
    setNewInteractionNotes('');
    setShowInteractionModal(true);
  };

  const handleStartEditInteraction = (log: Interaction | { id: string; type: any; date: string; notes: string }) => {
    setEditingInteractionId(log.id);
    const d = new Date(log.date);
    const formatted = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    setNewInteractionDate(formatted);
    setNewInteractionType(log.type === 'interaction' ? 'physical' : log.type);
    setNewInteractionNotes(log.notes && log.notes !== t('nu_vastleggen') ? log.notes : '');
    setShowInteractionModal(true);
  };

  const handleDeleteInteraction = (logId: string) => {
    let remaining = (contact.interactions || []).filter(i => i.id !== logId);
    if (logId === 'virtual-last' || logId === 'last-card') {
      const sorted = [...(contact.interactions || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (sorted.length > 0) {
        remaining = remaining.filter(i => i.id !== sorted[0].id);
      }
    }
    const sortedRemaining = [...remaining].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestDate = sortedRemaining[0]?.date || '';
    onUpdate({
      ...contact,
      interactions: remaining,
      lastInteractionDate: latestDate,
      updatedAt: new Date().toISOString()
    });
    setDeletingInteractionId(null);
    if (editingInteractionId === logId) {
      setShowInteractionModal(false);
      setEditingInteractionId(null);
    }
  };

  const handleSaveInteraction = () => {
    const selectedDateTime = new Date(newInteractionDate);
    const validDate = isNaN(selectedDateTime.getTime()) ? new Date() : selectedDateTime;
    const isoDate = validDate.toISOString();
    let updatedInteractions = [...(contact.interactions || [])];

    if (editingInteractionId && editingInteractionId !== 'virtual-last') {
      updatedInteractions = updatedInteractions.map(i => 
        i.id === editingInteractionId 
          ? { ...i, type: newInteractionType, date: isoDate, notes: newInteractionNotes || t('nu_vastleggen') } 
          : i
      );
    } else {
      const newEntry: Interaction = { 
        id: `int-${Date.now()}`, 
        type: newInteractionType, 
        date: isoDate, 
        notes: newInteractionNotes || t('nu_vastleggen') 
      };
      updatedInteractions = [newEntry, ...updatedInteractions];
    }

    const latestInteractionDate = [...updatedInteractions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date || '';
    onUpdate({ 
      ...contact, 
      lastInteractionDate: latestInteractionDate, 
      interactions: updatedInteractions, 
      updatedAt: new Date().toISOString() 
    });
    setShowInteractionModal(false);
    setEditingInteractionId(null);
  };

  const getInteractionIcon = (type_in: InteractionMode) => {
    switch(type_in) {
      case 'physical': return <Users size={14} />;
      case 'app': return <Smartphone size={14} />;
      case 'phone': return <Phone size={14} />;
      default: return <Clock size={14} />;
    }
  };

  return (
    <div className={`absolute top-0 right-0 w-full sm:w-96 h-full shadow-2xl z-[100] border-l flex flex-col animate-in slide-in-from-right duration-300 ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'}`}>
      <div className="relative shrink-0">
        <div className={`h-32 w-full relative ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
          <img src={`https://picsum.photos/seed/${contact.addressId}/600/300`} className="w-full h-full object-cover brightness-75" />
          <button onClick={onClose} className={`absolute top-4 left-4 p-2 rounded-full backdrop-blur-md ${isDark ? 'bg-black/40 text-slate-100' : 'bg-white/20 text-white'}`}><X size={20} /></button>
          <div className="absolute top-4 right-4 flex gap-2">
            {!isConfirmingDelete ? (
              <>
                <button onClick={() => onEdit(contact)} className={`p-2 rounded-full backdrop-blur-md ${isDark ? 'bg-black/40 text-slate-100' : 'bg-white/20 text-white'}`}><Edit2 size={18} /></button>
                <button onClick={() => setIsConfirmingDelete(true)} className="p-2 bg-red-500/80 text-white rounded-full"><Trash2 size={18} /></button>
              </>
            ) : (
              <div className="flex items-center bg-red-600 rounded-full p-1 pr-3 gap-2">
                <button onClick={() => onDelete(contact.id)} className="bg-white text-red-600 p-1.5 rounded-full"><Check size={16} /></button>
                <button onClick={() => setIsConfirmingDelete(false)} className="text-white"><X size={16} /></button>
                <span className="text-[10px] text-white font-black uppercase">{t('wissen')}</span>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 -mt-10 relative z-10 flex items-end justify-between">
          <img src={contact.photoUrl || `https://ui-avatars.com/api/?name=${contact.firstName}`} className={`w-24 h-24 rounded-full border-4 ${isDark ? 'bg-slate-900 border-slate-900' : 'bg-white border-white'}`} style={{ borderColor: type.color }} />
          {contact.isFavorite && <Heart className="p-2 bg-red-50 text-red-500 rounded-full fill-current dark:bg-red-900/20" size={40} />}
        </div>
        <div className="px-6 mt-4">
          <h2 className="text-2xl font-bold">{contact.firstName} {contact.lastName}</h2>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: type.color }}>{t(type.name)}</span>
            {contact.sortName && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-gray-100 text-gray-600 border border-gray-200'}`} title={t('sortField')}>
                {contact.sortName}
              </span>
            )}
          </div>
          
          {/* Social Links */}
          {contact.socialLinks && (contact.socialLinks.facebook || contact.socialLinks.instagram || contact.socialLinks.linkedin) && (
            <div className="flex gap-2.5 mt-3">
              {contact.socialLinks.facebook && (
                <a href={contact.socialLinks.facebook.startsWith('http') ? contact.socialLinks.facebook : `https://${contact.socialLinks.facebook}`} target="_blank" rel="noopener noreferrer" className={`p-1.5 rounded-full transition-colors ${isDark ? 'bg-slate-800 text-blue-400 hover:bg-slate-700' : 'bg-gray-100 text-blue-600 hover:bg-gray-200'}`} title="Facebook">
                  <Facebook size={14} />
                </a>
              )}
              {contact.socialLinks.instagram && (
                <a href={contact.socialLinks.instagram.startsWith('http') ? contact.socialLinks.instagram : `https://${contact.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" className={`p-1.5 rounded-full transition-colors ${isDark ? 'bg-slate-800 text-pink-400 hover:bg-slate-700' : 'bg-gray-100 text-pink-600 hover:bg-gray-200'}`} title="Instagram">
                  <Instagram size={14} />
                </a>
              )}
              {contact.socialLinks.linkedin && (
                <a href={contact.socialLinks.linkedin.startsWith('http') ? contact.socialLinks.linkedin : `https://${contact.socialLinks.linkedin}`} target="_blank" rel="noopener noreferrer" className={`p-1.5 rounded-full transition-colors ${isDark ? 'bg-slate-800 text-blue-400 hover:bg-slate-700' : 'bg-gray-100 text-blue-700 hover:bg-gray-200'}`} title="LinkedIn">
                  <Linkedin size={14} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className={`${isDark ? 'bg-blue-900/20 border-blue-900/30' : 'bg-blue-50/60 border-blue-100'} p-4 sm:p-5 rounded-2xl border space-y-3`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-wider">
                  {t('lastSpoken')}
                </span>
                {contact.lastInteractionDate && contact.lastInteractionDate.trim() !== '' && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isDark ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60' : 'bg-blue-100/80 text-blue-800'
                  }`}>
                    {new Date(contact.lastInteractionDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              <p className={`text-base font-bold mt-1 ${isDark ? 'text-blue-200' : 'text-blue-950'}`}>
                {getTimeSinceLastContact(contact.lastInteractionDate)}
              </p>

              {contact.interactionIntervalDays ? (
                <p className={`text-[10px] font-semibold mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {t('desiredFrequency')}: {contact.interactionIntervalDays} {t('days')}
                </p>
              ) : null}
            </div>

            <button 
              type="button"
              onClick={handleOpenNewInteraction} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0 active:scale-95"
            >
              <Plus size={14} />
              <span>{t('recordNow')}</span>
            </button>
          </div>

          {/* Contactmoment Acties: Duidelijk potlood- en wissymbool */}
          {contact.lastInteractionDate && contact.lastInteractionDate.trim() !== '' && (
            <div className={`pt-2.5 border-t flex items-center justify-between gap-2 flex-wrap ${
              isDark ? 'border-blue-900/40' : 'border-blue-100'
            }`}>
              <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                {t('contactMoment')}:
              </span>

              {deletingInteractionId === 'last-card' ? (
                <div className="flex items-center bg-red-600 text-white rounded-xl px-2.5 py-1 gap-2 text-xs font-bold animate-in fade-in zoom-in-95 duration-150 shadow-sm">
                  <span className="text-[10px] uppercase font-black">{t('deleteContactMomentConfirm')}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const latest = displayInteractions[0];
                      handleDeleteInteraction(latest ? latest.id : 'virtual-last');
                    }}
                    title={t('deleteConfirm')}
                    className="bg-white text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Check size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingInteractionId(null)}
                    title={t('cancel')}
                    className="text-white p-1 hover:opacity-80 transition-opacity"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const latest = displayInteractions[0] || {
                        id: 'virtual-last',
                        type: 'physical',
                        date: contact.lastInteractionDate!,
                        notes: ''
                      };
                      handleStartEditInteraction(latest);
                    }}
                    title={t('interactionEdit')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                      isDark 
                        ? 'bg-slate-800 border-slate-700 text-blue-400 hover:bg-slate-750 hover:text-blue-300' 
                        : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300'
                    }`}
                  >
                    <Edit2 size={13} className="text-blue-500" />
                    <span>{t('edit')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingInteractionId('last-card')}
                    title={t('deleteInteraction')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                      isDark 
                        ? 'bg-slate-800 border-slate-700 text-red-400 hover:bg-slate-750 hover:text-red-300' 
                        : 'bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'
                    }`}
                  >
                    <Trash2 size={13} className="text-red-500" />
                    <span>{t('delete')}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <DetailItem 
            icon={<Phone size={18} className={contact.phones?.[0] ? 'fill-current' : ''} />} 
            label={t('phone')} 
            value={
              contact.phones && contact.phones.length > 0 && contact.phones[0] ? (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex flex-col">
                    {contact.phones.map((p, idx) => (
                      <a
                        key={idx}
                        href={`tel:${cleanPhoneNumber(p)}`}
                        onClick={(e) => {
                          if (onCall) {
                            onCall(contact, p, e);
                          } else {
                            dialPhoneNumber(p, e);
                          }
                        }}
                        title={`${t('call')}: ${p}`}
                        className={`font-semibold hover:underline flex items-center gap-1.5 transition-colors ${
                          isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'
                        }`}
                      >
                        <span>{p}</span>
                      </a>
                    ))}
                  </div>
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                      isDark 
                        ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/80 hover:bg-emerald-900' 
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <Phone size={13} className="fill-current" />
                    <span>{t('call')}</span>
                  </a>
                </div>
              ) : (
                <span className="text-gray-400 font-normal">{t('never')}</span>
              )
            } 
            actionHref={contact.phones?.[0] ? `tel:${cleanPhoneNumber(contact.phones[0])}` : undefined}
            actionTitle={contact.phones?.[0] ? `${t('call')}: ${contact.phones[0]}` : undefined}
            actionType="phone"
            onActionClick={(e: any) => {
              if (onCall) {
                onCall(contact, contact.phones[0], e);
              } else {
                dialPhoneNumber(contact.phones[0], e);
              }
            }}
            isDark={isDark} 
          />
          <DetailItem 
            icon={<Mail size={18} />} 
            label={t('email')} 
            value={
              contact.emails && contact.emails.length > 0 && contact.emails[0] ? (
                <div className="flex flex-col">
                  {contact.emails.map((m, idx) => (
                    <a
                      key={idx}
                      href={`mailto:${m}`}
                      onClick={(e) => e.stopPropagation()}
                      title={`E-mail: ${m}`}
                      className={`font-semibold hover:underline flex items-center gap-1.5 transition-colors ${
                        isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                      }`}
                    >
                      <span>{m}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400 font-normal">{t('never')}</span>
              )
            } 
            actionHref={contact.emails?.[0] ? `mailto:${contact.emails[0]}` : undefined}
            actionTitle={contact.emails?.[0] ? `E-mail: ${contact.emails[0]}` : undefined}
            actionType="email"
            isDark={isDark} 
          />
          <DetailItem 
            icon={<MapPin size={18} />} 
            label={t('address')} 
            value={
              <div className="flex flex-col">
                <span>{address.street} {address.houseNumber}</span>
                {(address.postalCode || address.city) && (
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'} font-normal mt-0.5`}>
                    {address.postalCode} {address.city}
                  </span>
                )}
              </div>
            } 
            isDark={isDark} 
          />
          <DetailItem icon={<Calendar size={18} />} label={t('birthday')} value={contact.birthDate || t('notSet')} isDark={isDark} />
        </div>

        {contact.children.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">{t('children')}</h3>
            {contact.children.map((c, i) => (
              <div key={i} className={`text-sm font-bold p-3 rounded-xl mb-1 flex justify-between items-center ${isDark ? 'bg-pink-900/20 text-pink-300' : 'bg-pink-50 text-pink-800'}`}>
                <span>{c.name}</span>
                {c.birthDate && (
                  <span className={`text-[10px] font-normal opacity-85 flex items-center gap-1 ${isDark ? 'text-pink-400' : 'text-pink-700'}`}>
                    <Calendar size={11} /> {c.birthDate}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">{t('relations')}</h3>
          {contactRelations.map(item => (
            <div key={item.relation.id} onClick={() => onContactClick(item.contact!.id)} className={`flex items-center gap-3 p-2 rounded-xl mb-1 cursor-pointer transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'}`}>
              <img src={item.contact?.photoUrl || `https://ui-avatars.com/api/?name=${item.contact?.firstName}`} className="w-8 h-8 rounded-full" />
              <div className="min-w-0 flex-1"><p className="text-xs font-bold">{item.contact?.firstName}</p><p className="text-[9px] text-gray-500 uppercase">{t(item.displayType)}</p></div>
            </div>
          ))}
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">{t('residentsAtAddress')}</h3>
          {allResidents.map(res => (
            <div key={res.id} className={`flex items-center justify-between p-2 rounded-xl mb-1 text-xs ${isDark ? 'bg-slate-800' : 'bg-gray-50'}`}>
              <span className="font-bold">{res.firstName} {res.id === contact.id && t('ditContact')}</span>
              <button onClick={() => onSetMapAvatar(address.id, res.id)} className={`p-1 rounded ${address.mapAvatarId === res.id ? 'bg-blue-600 text-white' : 'text-gray-400'}`}><MapPin size={14}/></button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className={`${isDark ? 'bg-blue-900/10' : 'bg-blue-50'} p-4 rounded-xl`}>
            <h4 className="text-xs font-bold text-blue-500 uppercase mb-2">{t('pets')}</h4>
            <div className="text-xs font-semibold">
              {contact.pets.length > 0 ? (
                <div className="space-y-1">
                  {contact.pets.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span>{p.name}</span>
                      <span className="text-[10px] font-normal opacity-75">({p.type})</span>
                    </div>
                  ))}
                </div>
              ) : (
                t('never')
              )}
            </div>
          </div>
          <div className={`${isDark ? 'bg-purple-900/10' : 'bg-purple-50'} p-4 rounded-xl`}>
            <h4 className="text-xs font-bold text-purple-500 uppercase mb-2">{t('hobbies')}</h4>
            <div className="text-xs font-semibold">{contact.hobbies.length > 0 ? contact.hobbies.join(', ') : t('never')}</div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">{t('notes')}</h3>
          <div className={`p-4 rounded-xl italic text-sm ${isDark ? 'bg-amber-900/10 text-amber-200' : 'bg-yellow-50 text-gray-700'}`}>{contact.notes || t('noInteractions')}</div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase">{t('history')}</h3>
            <button 
              type="button"
              onClick={handleOpenNewInteraction}
              className="text-xs text-blue-500 hover:text-blue-600 font-bold flex items-center gap-1 transition-colors"
            >
              <Plus size={14} />
              <span>{t('recordNow')}</span>
            </button>
          </div>

          {displayInteractions.length === 0 ? (
            <p className={`text-xs italic ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('noInteractions')}</p>
          ) : (
            displayInteractions.map(log => {
              const isDeleting = deletingInteractionId === log.id;
              return (
                <div key={log.id} className={`pl-6 border-l mb-4 relative group ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
                  <div className={`absolute -left-2 top-1 border rounded-full p-0.5 ${isDark ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-white border-gray-200 text-gray-500'}`}>
                    {getInteractionIcon(log.type)}
                  </div>
                  
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[10px] text-gray-500 font-bold uppercase">
                          {new Date(log.date).toLocaleDateString()}
                        </p>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                          isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {t(log.type === 'phone' ? 'call' : log.type)}
                        </span>
                      </div>
                      <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{log.notes}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isDeleting ? (
                        <div className="flex items-center bg-red-600 text-white rounded-xl px-2.5 py-1 gap-1.5 text-xs font-bold animate-in fade-in zoom-in-95 duration-150 shadow-sm">
                          <span className="text-[10px] font-black uppercase tracking-wider">{t('deleteConfirm')}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteInteraction(log.id)}
                            title={t('deleteConfirm')}
                            className="bg-white text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingInteractionId(null)}
                            title={t('cancel')}
                            className="text-white p-0.5 hover:opacity-80 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditInteraction(log)}
                            title={t('interactionEdit')}
                            className={`px-2 py-1 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 shadow-sm active:scale-95 ${
                              isDark 
                                ? 'bg-slate-800 border-slate-700 text-blue-400 hover:bg-slate-750 hover:text-blue-300' 
                                : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50'
                            }`}
                          >
                            <Edit2 size={13} className="text-blue-500" />
                            <span className="text-[11px]">{t('edit')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingInteractionId(log.id)}
                            title={t('deleteInteraction')}
                            className={`px-2 py-1 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 shadow-sm active:scale-95 ${
                              isDark 
                                ? 'bg-slate-800 border-slate-700 text-red-400 hover:bg-slate-750 hover:text-red-300' 
                                : 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                            }`}
                          >
                            <Trash2 size={13} className="text-red-500" />
                            <span className="text-[11px]">{t('delete')}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showInteractionModal && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className={`p-6 rounded-3xl w-full max-w-xs shadow-2xl space-y-4 border ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-100 text-gray-900'}`}>
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold">{editingInteractionId ? t('interactionEdit') : t('interactionTitle')}</h4>
              <button 
                type="button"
                onClick={() => {
                  setShowInteractionModal(false);
                  setEditingInteractionId(null);
                }} 
                className={`p-1 rounded-full transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400">{t('date')}</label>
              <input 
                type="date" 
                value={newInteractionDate} 
                onChange={e => setNewInteractionDate(e.target.value)} 
                className={`w-full p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-gray-50 border-gray-200 text-black'}`} 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400">{t('planningInteraction') || 'Type'}</label>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  type="button"
                  onClick={() => setNewInteractionType('physical')} 
                  className={`p-2 rounded-xl border text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${
                    newInteractionType === 'physical' 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                      : (isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100')
                  }`}
                >
                  <Users size={14} />
                  <span>{t('physical')}</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setNewInteractionType('app')} 
                  className={`p-2 rounded-xl border text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${
                    newInteractionType === 'app' 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                      : (isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100')
                  }`}
                >
                  <Smartphone size={14} />
                  <span>{t('app')}</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setNewInteractionType('phone')} 
                  className={`p-2 rounded-xl border text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${
                    newInteractionType === 'phone' 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                      : (isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100')
                  }`}
                >
                  <Phone size={14} />
                  <span>{t('call')}</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400">{t('notes')}</label>
              <textarea 
                value={newInteractionNotes} 
                onChange={e => setNewInteractionNotes(e.target.value)} 
                className={`w-full p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-gray-50 border-gray-200 text-black'}`} 
                placeholder={t('recordNow')}
                rows={3} 
              />
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button 
                type="button"
                onClick={handleSaveInteraction} 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
              >
                {t('save')}
              </button>

              {editingInteractionId && (
                <button
                  type="button"
                  onClick={() => handleDeleteInteraction(editingInteractionId)}
                  className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>{t('deleteInteraction')}</span>
                </button>
              )}

              <button 
                type="button"
                onClick={() => {
                  setShowInteractionModal(false);
                  setEditingInteractionId(null);
                }} 
                className="w-full text-gray-400 hover:text-gray-300 font-bold text-sm py-1 transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailItem = ({ icon, label, value, isDark, actionHref, actionTitle, actionType, onActionClick }: any) => {
  const isPhone = actionType === 'phone' && actionHref;
  const isEmail = actionType === 'email' && actionHref;

  return (
    <div className="flex items-start gap-3">
      {actionHref ? (
        <a 
          href={actionHref}
          onClick={(e) => {
            e.stopPropagation();
            if (onActionClick) {
              onActionClick(e);
            } else if (isPhone) {
              window.location.href = actionHref;
            }
          }}
          title={actionTitle}
          className={`p-2.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer shrink-0 flex items-center justify-center ${
            isPhone
              ? (isDark 
                  ? 'bg-emerald-950/80 text-emerald-400 hover:bg-emerald-900 border border-emerald-800/70 hover:border-emerald-600' 
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300')
              : isEmail
              ? (isDark 
                  ? 'bg-blue-950/80 text-blue-400 hover:bg-blue-900 border border-blue-800/70' 
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200')
              : (isDark ? 'bg-slate-800 text-gray-400 hover:bg-slate-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100')
          }`}
        >
          {icon}
        </a>
      ) : (
        <div className={`p-2.5 rounded-xl text-gray-500 shrink-0 ${isDark ? 'bg-slate-800' : 'bg-gray-50'}`}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-gray-500 uppercase">{label}</p>
        <div className={`text-sm font-semibold mt-0.5 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{value}</div>
      </div>
    </div>
  );
};

export default ContactDetails;
