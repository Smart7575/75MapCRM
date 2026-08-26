
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, Save, Camera, Plus, Trash, RefreshCw, 
  ImageIcon, Upload, Loader2, Heart, 
  MapPin, Users, Search, Phone, Mail, Calendar, 
  Dog, Info, GitPullRequest, Trash2, Baby,
  Facebook, Instagram, Linkedin, Clock, Smartphone, UserCheck, MessageSquare, Activity
} from 'lucide-react';
import { Contact, Address, ContactType, Pet, Relation, RelationType, ContactChild, SocialLinks, InteractionMode, Interaction } from '../types.ts';
import { compressImageBase64 } from '../utils.ts';

interface ContactFormProps {
  contact: Contact | null;
  types: ContactType[];
  addresses: Address[];
  contacts: Contact[];
  relations: Relation[];
  initialCoords: [number, number] | null;
  initialAddressId: string | null;
  onClose: () => void;
  onSave: (contact: Contact, address: Address, relations: Relation[]) => void;
  t: (key: any) => string;
  theme?: string;
}

const ContactForm: React.FC<ContactFormProps> = ({ 
  contact, types, addresses, contacts, relations, initialCoords, initialAddressId, onClose, onSave, t, theme 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [hobbyInput, setHobbyInput] = useState('');
  const [addressSearch, setAddressSearch] = useState('');
  const [relationSearch, setRelationSearch] = useState('');
  const [isChoosingExisting, setIsChoosingExisting] = useState(false);
  const [lastInteractionType, setLastInteractionType] = useState<InteractionMode>('physical');
  const [lastInteractionNotes, setLastInteractionNotes] = useState('');
  const isDark = theme === 'dark';

  const [formData, setFormData] = useState<Partial<Contact>>(() => {
    return contact || {
      firstName: '', lastName: '', phones: [''], emails: [''], typeId: types[0].id,
      notes: '', isFavorite: false, pets: [], children: [], socialLinks: {},
      hobbies: [], photoUrl: '', lastInteractionDate: '', interactions: [], interactionIntervalDays: 0
    };
  });

  const [addrData, setAddrData] = useState<Partial<Address>>(() => {
    if (contact?.addressId) return addresses.find(a => a.id === contact.addressId) || {};
    if (initialAddressId) return addresses.find(a => a.id === initialAddressId) || {};
    return { street: '', houseNumber: '', postalCode: '', city: '', lat: initialCoords?.[0] || 52.37, lng: initialCoords?.[1] || 4.89, country: 'NL' };
  });

  const [localRelations, setLocalRelations] = useState<Relation[]>(() => {
    if (!contact) return [];
    return relations.filter(r => r.contactAId === contact.id || r.contactBId === contact.id);
  });

  useEffect(() => {
    if (initialCoords && !contact && !initialAddressId) {
      const [lat, lng] = initialCoords;
      setIsLoadingAddress(true);
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`)
        .then(res => res.json())
        .then(data => {
          if (data && data.address) {
            const addr = data.address;
            const street = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || '';
            const houseNumber = addr.house_number || '';
            const postalCode = addr.postcode || '';
            const city = addr.city || addr.town || addr.village || addr.municipality || '';
            const country = addr.country_code?.toUpperCase() || 'NL';
            setAddrData(prev => ({
              ...prev,
              street,
              houseNumber,
              postalCode,
              city,
              country,
              lat,
              lng
            }));
          }
        })
        .catch(err => {
          console.error("Geocoding failed:", err);
        })
        .finally(() => {
          setIsLoadingAddress(false);
        });
    }
  }, [initialCoords, contact, initialAddressId]);

  const filteredAddresses = useMemo(() => {
    if (!addressSearch) return addresses;
    return addresses.filter(a => a.street.toLowerCase().includes(addressSearch.toLowerCase()) || a.city.toLowerCase().includes(addressSearch.toLowerCase()));
  }, [addresses, addressSearch]);

  const filteredContactsForRelation = useMemo(() => {
    if (!relationSearch) return [];
    const q = relationSearch.toLowerCase();
    return contacts.filter(c => c.id !== contact?.id && !localRelations.some(r => r.contactAId === c.id || r.contactBId === c.id) && (c.firstName.toLowerCase().includes(q) || (c.lastName || '').toLowerCase().includes(q))).slice(0, 5);
  }, [contacts, relationSearch, localRelations, contact?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const addressId = addrData.id || `addr-${Date.now()}`;
    const contactId = contact?.id || `c-${Date.now()}`;
    
    let updatedInteractions = [...(formData.interactions || [])];
    if (lastInteractionNotes.trim() !== "") {
      updatedInteractions.push({ id: `int-form-${Date.now()}`, type: lastInteractionType, date: formData.lastInteractionDate || new Date().toISOString(), notes: lastInteractionNotes });
    }

    // Map temp relationship IDs to the final contactId
    const finalRelations = localRelations.map(r => {
      let updatedRel = { ...r };
      if (updatedRel.contactAId === 'temp-id' || updatedRel.contactAId === '') {
        updatedRel.contactAId = contactId;
      }
      if (updatedRel.contactBId === 'temp-id' || updatedRel.contactBId === '') {
        updatedRel.contactBId = contactId;
      }
      return updatedRel;
    });

    onSave({ ...formData as Contact, id: contactId, addressId, updatedAt: new Date().toISOString(), interactions: updatedInteractions }, { ...addrData as Address, id: addressId }, finalRelations);
    setIsSaving(false);
  };

  const selectedType = types.find(t_obj => t_obj.id === formData.typeId) || types[0];

  return (
    <div className={`absolute top-0 right-0 w-full sm:w-96 h-full shadow-2xl z-[150] border-l flex flex-col animate-in slide-in-from-right duration-300 ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'}`}>
      <div className="relative shrink-0">
        <div className={`h-32 w-full ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
           <img src={`https://picsum.photos/seed/${addrData.id || 'new'}/600/300`} className="w-full h-full object-cover brightness-75" />
           <button onClick={onClose} className={`absolute top-4 left-4 p-2 rounded-full backdrop-blur-md ${isDark ? 'bg-black/40 text-slate-100' : 'bg-white/20 text-white'}`}><X size={20}/></button>
        </div>
        <div className="px-6 -mt-10 relative z-10 flex items-end justify-between">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <img src={formData.photoUrl || `https://ui-avatars.com/api/?name=${formData.firstName || '?'}`} className={`w-24 h-24 rounded-full border-4 ${isDark ? 'bg-slate-900 border-slate-900' : 'bg-white border-white'}`} style={{ borderColor: selectedType.color }} />
            <input type="file" ref={fileInputRef} onChange={async e => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = async () => setFormData({...formData, photoUrl: await compressImageBase64(reader.result as string)}); reader.readAsDataURL(file); } }} className="hidden" />
          </div>
          <button onClick={() => setFormData({...formData, isFavorite: !formData.isFavorite})} className={`p-2 rounded-full border shadow-sm transition-all ${formData.isFavorite ? 'bg-red-50 text-red-500 border-red-100 dark:bg-red-900/20 dark:border-red-900/30' : (isDark ? 'bg-slate-800 text-slate-600 border-slate-700' : 'bg-white text-gray-300 border-gray-100')}`}><Heart className={formData.isFavorite ? 'fill-current' : ''} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <FormInput label={t('firstName')} value={formData.firstName} onChange={v => setFormData({...formData, firstName: v})} placeholder="Jan" isDark={isDark} />
        <FormInput label={t('lastName')} value={formData.lastName} onChange={v => setFormData({...formData, lastName: v})} placeholder="Jansen" isDark={isDark} />
        
        {/* Contact Info: Phone and Email */}
        <FormInput label={t('phone')} value={formData.phones?.[0]} onChange={v => setFormData({...formData, phones: [v]})} placeholder="+31 6 12345678" isDark={isDark} />
        <FormInput label={t('email')} type="email" value={formData.emails?.[0]} onChange={v => setFormData({...formData, emails: [v]})} placeholder="jan@example.com" isDark={isDark} />

        <div className="space-y-2">
          <p className="text-[10px] font-black text-gray-500 uppercase">{t('contactType')}</p>
          <div className="flex flex-wrap gap-2">
            {types.map(t_obj => (
              <button
                key={t_obj.id}
                type="button"
                onClick={() => setFormData({ ...formData, typeId: t_obj.id })}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                  formData.typeId === t_obj.id 
                    ? 'shadow-md scale-105' 
                    : `hover:border-gray-300 ${isDark ? 'border-slate-800' : 'border-gray-100'}`
                }`}
                style={{ 
                  backgroundColor: formData.typeId === t_obj.id ? t_obj.color : 'transparent',
                  borderColor: formData.typeId === t_obj.id ? t_obj.color : undefined,
                  color: formData.typeId === t_obj.id ? 'white' : (isDark ? '#94a3b8' : '#64748b')
                }}
              >
                {t_obj.name}
              </button>
            ))}
          </div>
        </div>

        <FormInput label={t('birthDate')} type="date" value={formData.birthDate} onChange={v => setFormData({...formData, birthDate: v})} isDark={isDark} />
        
        {/* Planning & Interaction */}
        <div className={`pt-4 border-t space-y-4 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <h3 className="text-[10px] font-black uppercase text-blue-500">{t('planningInteraction')}</h3>
          <FormInput label={t('lastDate')} type="date" value={formData.lastInteractionDate?.split('T')[0]} onChange={v => setFormData({...formData, lastInteractionDate: v ? new Date(v).toISOString() : ''})} isDark={isDark} />
          
          <FormInput 
            label="Gewenste Frequentie (in dagen)" 
            type="number" 
            value={formData.interactionIntervalDays !== undefined ? String(formData.interactionIntervalDays) : ''} 
            onChange={v => setFormData({...formData, interactionIntervalDays: v ? parseInt(v, 10) : undefined})} 
            placeholder="Bijv. 30" 
            isDark={isDark} 
          />

          <textarea className={`w-full p-3 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-gray-50 border-gray-200'}`} placeholder={t('recordNow')} value={lastInteractionNotes} onChange={e => setLastInteractionNotes(e.target.value)} />
        </div>

        {/* Location */}
        <div className={`pt-4 border-t space-y-4 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-1.5">
              {t('location')}
              {isLoadingAddress && <Loader2 size={12} className="animate-spin text-blue-500" />}
            </h3>
            <button onClick={() => setIsChoosingExisting(!isChoosingExisting)} className="text-[10px] font-bold text-blue-500 hover:text-blue-400 transition-colors">{isChoosingExisting ? t('manualEntry') : t('searchExisting')}</button>
          </div>
          {isChoosingExisting ? (
             <div className="space-y-2">
               <input className={`w-full p-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-gray-50 border-gray-200'}`} placeholder={t('search')} value={addressSearch} onChange={e => setAddressSearch(e.target.value)} />
               {filteredAddresses.map(a => <button key={a.id} onClick={() => { setAddrData(a); setIsChoosingExisting(false); }} className={`w-full text-left p-2 border rounded-lg text-[10px] font-bold transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>{a.street} {a.houseNumber}, {a.city}</button>)}
             </div>
          ) : (
             <div className="space-y-3">
               <div className="grid grid-cols-3 gap-2">
                 <div className="col-span-2">
                   <FormInput label="Straat" value={addrData.street} onChange={v => setAddrData({...addrData, street: v})} isDark={isDark} />
                 </div>
                 <div>
                   <FormInput label="Nr" value={addrData.houseNumber} onChange={v => setAddrData({...addrData, houseNumber: v})} isDark={isDark} />
                 </div>
               </div>
               <div className="grid grid-cols-3 gap-2">
                 <div>
                   <FormInput label="Postcode" value={addrData.postalCode} onChange={v => setAddrData({...addrData, postalCode: v})} isDark={isDark} />
                 </div>
                 <div className="col-span-2">
                   <FormInput label="Plaats" value={addrData.city} onChange={v => setAddrData({...addrData, city: v})} isDark={isDark} />
                 </div>
               </div>
             </div>
          )}
        </div>

        {/* Kinderen Sectie */}
        <div className={`pt-4 border-t space-y-3 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <h3 className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-1.5">
            <Baby size={14} className="text-pink-500" />
            {t('children')}
          </h3>
          
          {formData.children && formData.children.length > 0 && (
            <div className="space-y-2">
              {formData.children.map((child, index) => (
                <div key={index} className={`flex items-center justify-between p-2 border rounded-xl text-xs ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-gray-50/50 border-gray-100'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{child.name}</p>
                    {child.birthDate && <p className="text-[10px] text-gray-400">Jarig op: {child.birthDate}</p>}
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      const newChildren = (formData.children || []).filter((_, idx) => idx !== index);
                      setFormData({ ...formData, children: newChildren });
                    }}
                    className="text-red-500 hover:text-red-600 p-1"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={`p-3 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-800/20 border-slate-800' : 'bg-gray-50/30 border-gray-100'}`}>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Kind Toevoegen</p>
            <div className="grid grid-cols-2 gap-2">
              <input 
                id="new-child-name"
                className={`p-2 border rounded-xl text-xs outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-gray-200'}`} 
                placeholder="Naam" 
              />
              <input 
                id="new-child-date"
                type="date"
                className={`p-2 border rounded-xl text-xs outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-gray-200'}`} 
              />
            </div>
            <button 
              type="button"
              onClick={() => {
                const nameEl = document.getElementById('new-child-name') as HTMLInputElement;
                const dateEl = document.getElementById('new-child-date') as HTMLInputElement;
                if (nameEl && nameEl.value.trim()) {
                  const name = nameEl.value.trim();
                  const birthDate = dateEl?.value || undefined;
                  const newChildren = [...(formData.children || []), { name, birthDate }];
                  setFormData({ ...formData, children: newChildren });
                  nameEl.value = '';
                  if (dateEl) dateEl.value = '';
                }
              }}
              className="w-full py-1.5 bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-colors font-sans"
            >
              + {t('addChild')}
            </button>
          </div>
        </div>

        {/* Huisdieren Sectie */}
        <div className={`pt-4 border-t space-y-3 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <h3 className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-1.5">
            <Dog size={14} className="text-blue-500" />
            {t('pets')}
          </h3>
          
          {formData.pets && formData.pets.length > 0 && (
            <div className="space-y-2">
              {formData.pets.map((pet, index) => (
                <div key={index} className={`flex items-center justify-between p-2 border rounded-xl text-xs ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-gray-50/50 border-gray-100'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{pet.name}</p>
                    <p className="text-[10px] text-gray-400">Soort: {pet.type}</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      const newPets = (formData.pets || []).filter((_, idx) => idx !== index);
                      setFormData({ ...formData, pets: newPets });
                    }}
                    className="text-red-500 hover:text-red-600 p-1"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={`p-3 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-800/20 border-slate-800' : 'bg-gray-50/30 border-gray-100'}`}>
            <p className="text-[10px] font-bold text-gray-400 uppercase font-sans">Huisdier Toevoegen</p>
            <div className="grid grid-cols-2 gap-2">
              <input 
                id="new-pet-name"
                className={`p-2 border rounded-xl text-xs outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-gray-200'}`} 
                placeholder="Naam (bijv. Max)" 
              />
              <input 
                id="new-pet-type"
                className={`p-2 border rounded-xl text-xs outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-gray-200'}`} 
                placeholder="Soort (bijv. Hond)" 
              />
            </div>
            <button 
              type="button"
              onClick={() => {
                const nameEl = document.getElementById('new-pet-name') as HTMLInputElement;
                const typeEl = document.getElementById('new-pet-type') as HTMLInputElement;
                if (nameEl && nameEl.value.trim() && typeEl && typeEl.value.trim()) {
                  const name = nameEl.value.trim();
                  const type = typeEl.value.trim();
                  const newPets = [...(formData.pets || []), { name, type }];
                  setFormData({ ...formData, pets: newPets });
                  nameEl.value = '';
                  typeEl.value = '';
                }
              }}
              className="w-full py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-colors font-sans"
            >
              + Huisdier Toevoegen
            </button>
          </div>
        </div>

        {/* Relaties Sectie */}
        <div className={`pt-4 border-t space-y-3 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <h3 className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-1.5">
            <Users size={14} className="text-teal-500" />
            {t('relations') || 'Relaties'}
          </h3>
          
          {localRelations && localRelations.length > 0 && (
            <div className="space-y-2">
              {localRelations.map((rel, index) => {
                const otherId = rel.contactAId === (contact?.id || 'temp-id') ? rel.contactBId : rel.contactAId;
                const otherContact = contacts.find(c => c.id === otherId);
                return (
                  <div key={rel.id || index} className={`flex items-center justify-between p-2 border rounded-xl text-xs ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-gray-50/50 border-gray-100'}`}>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <img src={otherContact?.photoUrl || `https://ui-avatars.com/api/?name=${otherContact?.firstName || '?'}`} className="w-6 h-6 rounded-full shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate">{otherContact ? `${otherContact.firstName} ${otherContact.lastName || ''}` : 'Onbekend contact'}</p>
                        <select
                          value={rel.type}
                          onChange={(e) => {
                            const newType = e.target.value as RelationType;
                            const updated = localRelations.map((r, idx) => idx === index ? { ...r, type: newType } : r);
                            setLocalRelations(updated);
                          }}
                          className={`text-[10px] font-semibold bg-transparent border-none outline-none p-0 cursor-pointer ${isDark ? 'text-teal-400' : 'text-teal-600'}`}
                        >
                          {Object.values(RelationType).map(val => (
                            <option key={val} value={val} className={isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-gray-900'}>
                              {val}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        const newRels = localRelations.filter((_, idx) => idx !== index);
                        setLocalRelations(newRels);
                      }}
                      className="text-red-500 hover:text-red-600 p-1 shrink-0"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className={`p-3 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-800/20 border-slate-800' : 'bg-gray-50/30 border-gray-100'}`}>
            <p className="text-[10px] font-bold text-gray-400 uppercase font-sans">Relatie Toevoegen</p>
            <div className="relative">
              <input 
                type="text"
                value={relationSearch}
                onChange={e => setRelationSearch(e.target.value)}
                placeholder="Zoek contact..."
                className={`w-full p-2 pl-8 border rounded-xl text-xs outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-gray-200'}`} 
              />
              <Search size={12} className="absolute left-2.5 top-3.5 text-gray-400" />
              
              {relationSearch && (
                <button 
                  type="button"
                  onClick={() => setRelationSearch('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 text-[10px] font-bold"
                >
                  Wissen
                </button>
              )}
            </div>

            {relationSearch && filteredContactsForRelation.length > 0 && (
              <div className={`border rounded-xl divide-y max-h-36 overflow-y-auto ${isDark ? 'border-slate-800 bg-slate-900 divide-slate-800' : 'border-gray-100 bg-white divide-gray-100'}`}>
                {filteredContactsForRelation.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      const alreadyExists = localRelations.some(r => r.contactAId === c.id || r.contactBId === c.id);
                      if (!alreadyExists) {
                        const newRel: Relation = {
                          id: `rel-${Date.now()}`,
                          contactAId: contact?.id || 'temp-id',
                          contactBId: c.id,
                          type: RelationType.PARTNER,
                          createdAt: new Date().toISOString()
                        };
                        setLocalRelations([...localRelations, newRel]);
                        setRelationSearch('');
                      }
                    }}
                    className={`w-full p-2 text-left flex items-center gap-2 text-xs transition-colors ${isDark ? 'hover:bg-slate-800/50 text-slate-200' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    <img src={c.photoUrl || `https://ui-avatars.com/api/?name=${c.firstName}`} className="w-5 h-5 rounded-full" />
                    <span className="font-semibold">{c.firstName} {c.lastName || ''}</span>
                  </button>
                ))}
              </div>
            )}
            
            {relationSearch && filteredContactsForRelation.length === 0 && (
              <p className="text-[10px] text-gray-400 italic">Geen andere contacten gevonden.</p>
            )}
          </div>
        </div>

        {/* Social Media Sectie */}
        <div className={`pt-4 border-t space-y-3 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <h3 className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-1.5">
            <Facebook size={14} className="text-indigo-500" />
            {t('socialMedia')}
          </h3>
          <div className="space-y-3">
            <FormInput 
              label="Facebook URL" 
              value={formData.socialLinks?.facebook} 
              onChange={v => setFormData({ ...formData, socialLinks: { ...(formData.socialLinks || {}), facebook: v } })} 
              placeholder="https://facebook.com/..." 
              isDark={isDark} 
            />
            <FormInput 
              label="Instagram URL" 
              value={formData.socialLinks?.instagram} 
              onChange={v => setFormData({ ...formData, socialLinks: { ...(formData.socialLinks || {}), instagram: v } })} 
              placeholder="https://instagram.com/..." 
              isDark={isDark} 
            />
            <FormInput 
              label="LinkedIn URL" 
              value={formData.socialLinks?.linkedin} 
              onChange={v => setFormData({ ...formData, socialLinks: { ...(formData.socialLinks || {}), linkedin: v } })} 
              placeholder="https://linkedin.com/in/..." 
              isDark={isDark} 
            />
          </div>
        </div>

        {/* Hobbies */}
        <div className={`pt-4 border-t space-y-2 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
           <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-500"><span>{t('hobbies')}</span></div>
           <input 
             className={`w-full p-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-gray-50 border-gray-200'}`} 
             placeholder={t('newHobby')} 
             onKeyDown={e => { if (e.key === 'Enter') { setFormData({...formData, hobbies: [...(formData.hobbies || []), e.currentTarget.value]}); e.currentTarget.value = ''; } }} 
           />
           <div className="flex flex-wrap gap-1 mt-2">
             {(formData.hobbies || []).map((h, i) => (
                <span key={i} className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                  {h}
                  <button 
                    type="button" 
                    onClick={() => {
                      const newHobbies = (formData.hobbies || []).filter((_, idx) => idx !== i);
                      setFormData({ ...formData, hobbies: newHobbies });
                    }}
                    className="hover:text-red-500 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </span>
             ))}
           </div>
        </div>

        {/* Bijzonderheden Sectie */}
        <div className={`pt-4 border-t space-y-2 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <h3 className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-1.5">
            <Info size={14} className="text-yellow-500" />
            {t('notes')}
          </h3>
          <textarea 
            className={`w-full p-3 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-gray-50 border-gray-200'}`} 
            placeholder="Bijv. eet vegetarisch, heeft een hekel aan vliegen..." 
            value={formData.notes || ''} 
            onChange={e => setFormData({...formData, notes: e.target.value})} 
            rows={3}
          />
        </div>
      </div>

      <div className={`p-6 border-t flex justify-end gap-3 sticky bottom-0 z-20 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
        <button onClick={onClose} className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-400 transition-colors">{t('cancel')}</button>
        <button onClick={handleSubmit} className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100" disabled={isSaving || !formData.firstName}>{isSaving ? t('processing') : t('save')}</button>
      </div>
    </div>
  );
};

const FormInput = ({ label, value, onChange, placeholder, type = 'text', isDark }: any) => (
  <div className="space-y-1">
    <p className="text-[10px] font-black text-gray-500 uppercase">{label}</p>
    <input 
      type={type} 
      value={value || ''} 
      onChange={e => onChange(e.target.value)} 
      placeholder={placeholder} 
      className={`w-full text-sm font-semibold border-b outline-none pb-1 focus:border-blue-500 transition-colors ${isDark ? 'text-slate-200 bg-transparent border-slate-800 placeholder:text-slate-600' : 'text-gray-800 bg-transparent border-gray-200 placeholder:text-gray-300'}`} 
    />
  </div>
);

export default ContactForm;
