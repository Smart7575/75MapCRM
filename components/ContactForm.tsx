
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

    onSave({ ...formData as Contact, id: contactId, addressId, updatedAt: new Date().toISOString(), interactions: updatedInteractions }, { ...addrData as Address, id: addressId }, localRelations);
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
        
        <div className={`pt-4 border-t space-y-4 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <h3 className="text-[10px] font-black uppercase text-blue-500">{t('planningInteraction')}</h3>
          <FormInput label={t('lastDate')} type="date" value={formData.lastInteractionDate?.split('T')[0]} onChange={v => setFormData({...formData, lastInteractionDate: v ? new Date(v).toISOString() : ''})} isDark={isDark} />
          <textarea className={`w-full p-3 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-gray-50 border-gray-200'}`} placeholder={t('recordNow')} value={lastInteractionNotes} onChange={e => setLastInteractionNotes(e.target.value)} />
        </div>

        <div className={`pt-4 border-t space-y-4 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase text-gray-500">{t('location')}</h3>
            <button onClick={() => setIsChoosingExisting(!isChoosingExisting)} className="text-[10px] font-bold text-blue-500 hover:text-blue-400 transition-colors">{isChoosingExisting ? t('manualEntry') : t('searchExisting')}</button>
          </div>
          {isChoosingExisting ? (
             <div className="space-y-2">
               <input className={`w-full p-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-gray-50 border-gray-200'}`} placeholder={t('search')} value={addressSearch} onChange={e => setAddressSearch(e.target.value)} />
               {filteredAddresses.map(a => <button key={a.id} onClick={() => { setAddrData(a); setIsChoosingExisting(false); }} className={`w-full text-left p-2 border rounded-lg text-[10px] font-bold transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>{a.street} {a.houseNumber}, {a.city}</button>)}
             </div>
          ) : (
             <div className="grid grid-cols-3 gap-2"><div className="col-span-2"><FormInput label="Straat" value={addrData.street} onChange={v => setAddrData({...addrData, street: v})} isDark={isDark} /></div><div><FormInput label="Nr" value={addrData.houseNumber} onChange={v => setAddrData({...addrData, houseNumber: v})} isDark={isDark} /></div></div>
          )}
        </div>

        <div className={`pt-4 border-t space-y-2 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
           <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-500"><span>{t('hobbies')}</span></div>
           <input 
             className={`w-full p-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-gray-50 border-gray-200'}`} 
             placeholder={t('newHobby')} 
             onKeyDown={e => { if (e.key === 'Enter') { setFormData({...formData, hobbies: [...(formData.hobbies || []), e.currentTarget.value]}); e.currentTarget.value = ''; } }} 
           />
           <div className="flex flex-wrap gap-1 mt-2">
             {(formData.hobbies || []).map((h, i) => (
               <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-600'}`}>{h}</span>
             ))}
           </div>
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
