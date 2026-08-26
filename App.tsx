
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Map as MapIcon, 
  Users, 
  LayoutDashboard, 
  Calendar,
  Gift,
  BarChart3, 
  Plus, 
  Search, 
  Filter,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  X,
  FileJson,
  Loader2,
  ShieldAlert,
  ExternalLink,
  Clock,
  Activity,
  Globe,
  Sun,
  Moon
} from 'lucide-react';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  signOut, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  handleFirestoreError
} from "./firebase.ts";
import { Contact, Address, ContactType, ViewMode, Relation, Event } from './types.ts';
import { DEFAULT_TYPES, INITIAL_CONTACTS, INITIAL_ADDRESSES } from './constants.tsx';
import { translations } from './translations.ts';
import MapView from './components/MapView.tsx';
import ContactList from './components/ContactList.tsx';
import Dashboard from './components/Dashboard.tsx';
import StatsView from './components/StatsView.tsx';
import ContactForm from './components/ContactForm.tsx';
import EventForm from './components/EventForm.tsx';
import EventsView from './components/EventsView.tsx';
import ContactDetails from './components/ContactDetails.tsx';
import CalendarView from './components/CalendarView.tsx';
import AuthScreen from './components/AuthScreen.tsx';
import PlanningView from './components/PlanningView.tsx';
import { compressImageBase64, removeUndefinedFields } from './utils.ts';

const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataSyncing, setIsDataSyncing] = useState(false);
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const [language, setLanguage] = useState<'nl' | 'en'>('nl');
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('mapcrm_theme');
    if (saved) return saved as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [types, setTypes] = useState<ContactType[]>(DEFAULT_TYPES);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [initialCoords, setInitialCoords] = useState<[number, number] | null>(null);
  const [initialAddressId, setInitialAddressId] = useState<string | null>(null);

  // Translation helper
  const t = (key: keyof typeof translations['nl']) => translations[language][key] || key;

  // Import states
  const [importPendingData, setImportPendingData] = useState<any>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Theme effect
  useEffect(() => {
    localStorage.setItem('mapcrm_theme', theme);
  }, [theme]);

  // Authentication observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch data from Firestore when user logs in
  useEffect(() => {
    if (!currentUser) {
      setContacts([]);
      setAddresses([]);
      setRelations([]);
      setTypes(DEFAULT_TYPES);
      setHasPermissionError(false);
      return;
    }

    const fetchData = async () => {
      setIsDataSyncing(true);
      setHasPermissionError(false);
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const contactsSnap = await getDocs(collection(userRef, 'contacts')).catch(e => handleFirestoreError(e, 'list', `users/${currentUser.uid}/contacts`));
        const addressesSnap = await getDocs(collection(userRef, 'addresses')).catch(e => handleFirestoreError(e, 'list', `users/${currentUser.uid}/addresses`));
        const relationsSnap = await getDocs(collection(userRef, 'relations')).catch(e => handleFirestoreError(e, 'list', `users/${currentUser.uid}/relations`));
        const eventsSnap = await getDocs(collection(userRef, 'events')).catch(e => handleFirestoreError(e, 'list', `users/${currentUser.uid}/events`));
        const typesSnap = await getDocs(collection(userRef, 'types')).catch(e => handleFirestoreError(e, 'list', `users/${currentUser.uid}/types`));

        const loadedContacts = contactsSnap.docs
          .map(d => d.data() as Contact)
          .filter(c => c && c.firstName);
          
        const loadedAddresses = addressesSnap.docs
          .map(d => d.data() as Address)
          .filter(a => a && a.street);
          
        const loadedRelations = relationsSnap.docs
          .map(d => d.data() as Relation)
          .filter(r => r && r.contactAId && r.contactBId);
          
        const loadedEvents = eventsSnap.docs
          .map(d => d.data() as Event)
          .filter(e => e && e.title);
          
        const loadedTypes = typesSnap.docs
          .map(d => d.data() as ContactType)
          .filter(t => t && t.name);

        setContacts(loadedContacts);
        setAddresses(loadedAddresses);
        setRelations(loadedRelations);
        setEvents(loadedEvents);
        
        const mergedTypes = [...DEFAULT_TYPES];
        loadedTypes.forEach(lt => {
          const idx = mergedTypes.findIndex(mt => mt.id === lt.id);
          if (idx > -1) {
            mergedTypes[idx] = lt;
          } else {
            mergedTypes.push(lt);
          }
        });
        setTypes(mergedTypes);
        
      } catch (err: any) {
        console.error("Error fetching Firestore data:", err);
        if (err.code === 'permission-denied') {
          setHasPermissionError(true);
        }
      } finally {
        setIsDataSyncing(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return contacts.filter(c => {
      if (!c || typeof c.firstName !== 'string') return false;
      const addr = addresses.find(a => a.id === c.addressId);
      return (
        c.firstName.toLowerCase().includes(q) ||
        (c.lastName || '').toLowerCase().includes(q) ||
        (addr?.city || '').toLowerCase().includes(q) ||
        (addr?.street || '').toLowerCase().includes(q)
      );
    });
  }, [contacts, addresses, searchQuery]);

  const selectedContact = useMemo(() => 
    selectedContactId ? contacts.find(c => c.id === selectedContactId) : null
  , [selectedContactId, contacts]);

  const selectedAddress = useMemo(() => 
    selectedContact ? addresses.find(a => a.id === selectedContact.addressId) : null
  , [selectedContact, addresses]);

  const selectedType = useMemo(() => 
    selectedContact ? types.find(t => t.id === selectedContact.typeId) : null
  , [selectedContact, types]);

  const otherResidents = useMemo(() => 
    selectedContact ? contacts.filter(c => c.addressId === selectedContact.addressId && c.id !== selectedContact.id) : []
  , [selectedContact, contacts]);

  const handleAddContact = (coords?: [number, number], addressId?: string) => {
    setInitialCoords(coords || null);
    setInitialAddressId(addressId || null);
    setEditContact(null);
    setIsFormOpen(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditContact(contact);
    setInitialAddressId(null);
    setInitialCoords(null);
    setIsFormOpen(true);
  };

  const handleUpdateContact = async (updatedContact: Contact) => {
    if (!currentUser) return;
    setContacts(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c));
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(doc(userRef, 'contacts', updatedContact.id), removeUndefinedFields(updatedContact));
    } catch (err) {
      console.error("Firestore update failed", err);
      handleFirestoreError(err, 'update', `users/${currentUser.uid}/contacts/${updatedContact.id}`);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!currentUser) return;
    setSelectedContactId(null);
    setContacts(prev => prev.filter(c => c.id !== id));
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await deleteDoc(doc(userRef, 'contacts', id));
      const relationsToDelete = relations.filter(r => r.contactAId === id || r.contactBId === id);
      for (const rel of relationsToDelete) {
        await deleteDoc(doc(userRef, 'relations', rel.id));
      }
    } catch (err) {
      console.error("Delete from Firestore failed", err);
      handleFirestoreError(err, 'delete', `users/${currentUser.uid}/contacts/${id}`);
    }
  };

  const handleSetMapAvatar = async (addressId: string, contactId: string) => {
    if (!currentUser) return;
    setAddresses(prev => prev.map(a => 
      a.id === addressId ? { ...a, mapAvatarId: contactId } : a
    ));
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const addr = addresses.find(a => a.id === addressId);
      if (addr) {
        await setDoc(doc(userRef, 'addresses', addressId), removeUndefinedFields({ ...addr, mapAvatarId: contactId }));
      }
    } catch (err) {
      console.error("Avatar update failed", err);
      handleFirestoreError(err, 'update', `users/${currentUser.uid}/addresses/${addressId}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const saveContact = async (contact: Contact, address: Address, contactRelations: Relation[]) => {
    if (!currentUser) return;
    setAddresses(prev => {
      const exists = prev.find(a => a.id === address.id);
      return exists ? prev.map(a => a.id === address.id ? address : a) : [...prev, address];
    });
    setContacts(prev => {
      const exists = prev.find(c => c.id === contact.id);
      return exists ? prev.map(c => c.id === contact.id ? contact : c) : [...prev, contact];
    });
    setRelations(prev => {
      const otherRelations = prev.filter(r => r.contactAId !== contact.id && r.contactBId !== contact.id);
      return [...otherRelations, ...contactRelations];
    });
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const batch = writeBatch(db);
      batch.set(doc(userRef, 'addresses', address.id), removeUndefinedFields(address));
      batch.set(doc(userRef, 'contacts', contact.id), removeUndefinedFields(contact));
      
      // Delete relationships that were removed locally
      const oldContactRelations = relations.filter(r => r.contactAId === contact.id || r.contactBId === contact.id);
      const contactRelationsIds = new Set(contactRelations.map(r => r.id));
      const relationsToDelete = oldContactRelations.filter(r => !contactRelationsIds.has(r.id));
      for (const rel of relationsToDelete) {
        batch.delete(doc(userRef, 'relations', rel.id));
      }

      for (const rel of contactRelations) {
        batch.set(doc(userRef, 'relations', rel.id), removeUndefinedFields(rel));
      }
      await batch.commit();
    } catch (err) {
      console.error("Firestore save failed", err);
      handleFirestoreError(err, 'write', `users/${currentUser.uid}/*`);
    }
    setIsFormOpen(false);
  };

  const saveEvent = async (event: Event) => {
    if (!currentUser) return;
    
    // Check if we are updating an existing event
    const oldEvent = events.find(e => e.id === event.id);
    
    // Update events local state
    if (oldEvent) {
      setEvents(prev => prev.map(e => e.id === event.id ? event : e));
    } else {
      setEvents(prev => [...prev, event]);
    }

    // Prepare updated contacts list
    const interactionIdPrefix = `int-${event.id}`;
    
    // Contacts that were in the event (old but not new needs cleanup, or just update all linked contacts)
    const allRelevantIds = Array.from(new Set([
      ...(oldEvent ? oldEvent.contactIds : []),
      ...event.contactIds
    ]));

    const updatedContacts = contacts.map(c => {
      if (allRelevantIds.includes(c.id)) {
        // Filter out any old versions of this event's interaction
        let interactions = (c.interactions || []).filter(i => !i.id.startsWith(interactionIdPrefix));
        
        // Add new interaction if the contact is in the new attendee list
        if (event.contactIds.includes(c.id)) {
          const newInteraction = {
            id: `${interactionIdPrefix}-${c.id}`,
            type: event.type,
            date: event.date,
            notes: event.title + (event.notes ? `: ${event.notes}` : '')
          };
          interactions = [newInteraction, ...interactions];
          
          // Re-sort interactions by date
          interactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          return { 
            ...c, 
            interactions,
            lastInteractionDate: interactions[0]?.date || null,
            updatedAt: new Date().toISOString()
          };
        } else {
          // Contact was removed from event, just update without it
          return {
            ...c,
            interactions,
            lastInteractionDate: interactions[0]?.date || null,
            updatedAt: new Date().toISOString()
          };
        }
      }
      return c;
    });

    setContacts(updatedContacts);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const batch = writeBatch(db);
      
      // Save event
      batch.set(doc(userRef, 'events', event.id), removeUndefinedFields(event));
      
      // Update contacts affected by this event
      allRelevantIds.forEach(cId => {
        const contact = updatedContacts.find(c => c.id === cId);
        if (contact) {
          batch.set(doc(userRef, 'contacts', cId), removeUndefinedFields(contact));
        }
      });

      await batch.commit();
    } catch (err) {
      console.error("Firestore event save failed", err);
      handleFirestoreError(err, 'write', `users/${currentUser.uid}/events/*`);
    }
    setIsEventFormOpen(false);
    setEditEvent(null);
  };

  const deleteEvent = async (id: string) => {
    if (!currentUser) return;
    
    const event = events.find(e => e.id === id);
    if (!event) return;

    // Remove event from state
    setEvents(prev => prev.filter(e => e.id !== id));

    // Cleanup interactions for all participants
    const interactionIdPrefix = `int-${id}`;
    const updatedContacts = contacts.map(c => {
      if (event.contactIds.includes(c.id)) {
        const interactions = (c.interactions || []).filter(i => !i.id.startsWith(interactionIdPrefix));
        return {
          ...c,
          interactions,
          lastInteractionDate: interactions[0]?.date || null,
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    });
    setContacts(updatedContacts);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const batch = writeBatch(db);
      
      batch.delete(doc(userRef, 'events', id));
      
      event.contactIds.forEach(cId => {
        const contact = updatedContacts.find(c => c.id === cId);
        if (contact) {
          batch.set(doc(userRef, 'contacts', cId), removeUndefinedFields(contact));
        }
      });

      await batch.commit();
    } catch (err) {
      console.error("Firestore event deletion failed", err);
      handleFirestoreError(err, 'delete', `users/${currentUser.uid}/events/${id}`);
    }
    setIsEventFormOpen(false);
    setEditEvent(null);
  };

  const handleExportData = () => {
    const data = { contacts, addresses, types, relations, version: '2.2', exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mapcrm_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);
        if (data && typeof data === 'object' && Array.isArray(data.contacts) && Array.isArray(data.addresses)) {
          setImportPendingData(data);
          setShowImportModal(true);
          setImportError(null);
        } else {
          setImportError('Ongeldige bestandsstructuur.');
        }
      } catch (err) {
        setImportError('Kan bestand niet lezen.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const executeImport = async () => {
    if (!importPendingData || !currentUser) return;
    setIsDataSyncing(true);
    try {
      const data = importPendingData;
      const userRef = doc(db, 'users', currentUser.uid);
      const batch = writeBatch(db);
      const sanitizedContacts = await Promise.all(data.contacts
        .filter((c: any) => c && c.firstName)
        .map(async (c: any) => {
          let photoUrl = c.photoUrl;
          if (photoUrl && photoUrl.startsWith('data:image')) {
            photoUrl = await compressImageBase64(photoUrl);
          }
          return {
            ...c,
            photoUrl,
            phones: Array.isArray(c.phones) ? c.phones : (c.phone ? [c.phone] : []),
            emails: Array.isArray(c.emails) ? c.emails : (c.email ? [c.email] : []),
            pets: Array.isArray(c.pets) ? c.pets : [],
            children: Array.isArray(c.children) ? c.children : [],
            socialLinks: c.socialLinks || {},
            hobbies: Array.isArray(c.hobbies) ? c.hobbies : [],
            interactions: Array.isArray(c.interactions) ? c.interactions : [],
            isFavorite: !!c.isFavorite,
            createdAt: c.createdAt || new Date().toISOString(),
            updatedAt: c.updatedAt || new Date().toISOString(),
          };
        })
      );
      for (const c of sanitizedContacts) batch.set(doc(userRef, 'contacts', c.id), c);
      for (const a of data.addresses) batch.set(doc(userRef, 'addresses', a.id), a);
      if (data.types) for (const t of data.types) batch.set(doc(userRef, 'types', t.id), t);
      if (data.relations) for (const r of data.relations) batch.set(doc(userRef, 'relations', r.id), r);
      if (data.events) for (const e of data.events) batch.set(doc(userRef, 'events', e.id), e);
      try {
        await batch.commit();
      } catch (e) {
        handleFirestoreError(e, 'write', `users/${currentUser.uid}/* (batch import)`);
      }
      setContacts(sanitizedContacts);
      setAddresses(data.addresses);
      const mergedTypes = [...DEFAULT_TYPES];
      if (data.types) {
        data.types.forEach((lt: ContactType) => {
          const idx = mergedTypes.findIndex(mt => mt.id === lt.id);
          if (idx > -1) mergedTypes[idx] = lt;
          else mergedTypes.push(lt);
        });
      }
      setTypes(mergedTypes);
      if (data.relations) setRelations(data.relations);
      if (data.events) setEvents(data.events);
      setSelectedContactId(null);
      setImportPendingData(null);
      setShowImportModal(false);
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
    } catch (err) {
      setImportError('Fout tijdens synchronisatie.');
    } finally {
      setIsDataSyncing(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className={`h-screen w-full flex items-center justify-center ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-blue-50 text-blue-900'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 animate-pulse">
            <Users size={28} />
          </div>
          <p className="font-bold tracking-tight">{t('authenticating')}</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen language={language} onLanguageChange={setLanguage} />;
  }

  return (
    <div className={`flex h-screen w-full ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'} overflow-hidden`}>
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} border-r transition-all duration-300 flex flex-col z-50 shadow-sm`}
      >
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg">
            <Users size={24} />
          </div>
          {isSidebarOpen && <h1 className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-blue-400' : 'text-blue-900'}`}>MapCRM</h1>}
        </div>

        <nav className="flex-1 mt-6 px-2 space-y-1 overflow-y-auto">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label={t('dashboard')} 
            active={viewMode === 'dashboard'} 
            expanded={isSidebarOpen} 
            onClick={() => setViewMode('dashboard')} 
            theme={theme}
          />
          <NavItem 
            icon={<MapIcon size={20} />} 
            label={t('map')} 
            active={viewMode === 'map'} 
            expanded={isSidebarOpen} 
            onClick={() => setViewMode('map')} 
            theme={theme}
          />
          <NavItem 
            icon={<Users size={20} />} 
            label={t('contacts')} 
            active={viewMode === 'list'} 
            expanded={isSidebarOpen} 
            onClick={() => setViewMode('list')} 
            theme={theme}
          />
          <NavItem 
            icon={<Activity size={20} />} 
            label={t('planning')} 
            active={viewMode === 'planning'} 
            expanded={isSidebarOpen} 
            onClick={() => setViewMode('planning')} 
            theme={theme}
          />
          <NavItem 
            icon={<Gift size={20} />} 
            label={t('birthdays')} 
            active={viewMode === 'calendar'} 
            expanded={isSidebarOpen} 
            onClick={() => setViewMode('calendar')} 
            theme={theme}
          />
          <NavItem 
            icon={<Calendar size={20} />} 
            label={t('events')} 
            active={viewMode === 'events'} 
            expanded={isSidebarOpen} 
            onClick={() => setViewMode('events')} 
            theme={theme}
          />
          <NavItem 
            icon={<BarChart3 size={20} />} 
            label={t('stats')} 
            active={viewMode === 'stats'} 
            expanded={isSidebarOpen} 
            onClick={() => setViewMode('stats')} 
            theme={theme}
          />
        </nav>

        <div className={`px-2 pt-4 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-gray-100'} flex flex-col gap-1`}>
          <NavItem 
            icon={<Download size={20} />} 
            label={t('export')} 
            active={false} 
            expanded={isSidebarOpen} 
            onClick={handleExportData} 
            theme={theme}
          />
          <NavItem 
            icon={<Upload size={20} />} 
            label={t('import')} 
            active={false} 
            expanded={isSidebarOpen} 
            onClick={() => fileInputRef.current?.click()} 
            theme={theme}
          />
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportData} 
            accept=".json" 
            className="hidden" 
          />
        </div>

        <div className={`p-2 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-gray-100'} mt-2`}>
          <NavItem 
            icon={<LogOut size={20} />} 
            label={t('logout')} 
            active={false} 
            expanded={isSidebarOpen} 
            onClick={handleLogout} 
            theme={theme}
          />
        </div>

        <div className="p-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`w-full flex items-center justify-center p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative min-0 overflow-hidden">
        <header className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} h-16 border-b flex items-center justify-between px-6 z-40 shrink-0`}>
          <div className="flex-1 max-xl flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder={t('search')} 
                className={`w-full pl-10 pr-4 py-2 border-none rounded-full focus:ring-2 focus:ring-blue-500 text-sm transition-all ${theme === 'dark' ? 'bg-slate-800 text-slate-100' : 'bg-gray-100 text-black'}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {isDataSyncing && (
              <div className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest animate-pulse">
                <Loader2 size={12} className="animate-spin" />
                {t('sync')}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 ml-4">
            {/* Theme Toggle */}
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`p-2 rounded-xl border transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-gray-100 border-gray-200 text-blue-600 hover:bg-gray-200'}`}
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Language Switcher */}
            <div className={`flex p-1 rounded-xl shadow-inner border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200/50'}`}>
              <button 
                onClick={() => setLanguage('nl')} 
                className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-tighter transition-all ${language === 'nl' ? (theme === 'dark' ? 'bg-slate-900 text-blue-400' : 'bg-white shadow-sm text-blue-600') : 'text-gray-400 hover:text-gray-600'}`}
              >
                NL
              </button>
              <button 
                onClick={() => setLanguage('en')} 
                className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-tighter transition-all ${language === 'en' ? (theme === 'dark' ? 'bg-slate-900 text-blue-400' : 'bg-white shadow-sm text-blue-600') : 'text-gray-400 hover:text-gray-600'}`}
              >
                EN
              </button>
            </div>

            <button 
              onClick={() => setIsEventFormOpen(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full font-bold text-sm transition-all shadow-md active:scale-95"
            >
              <Calendar size={18} />
              <span className="hidden sm:inline">{t('newEvent')}</span>
            </button>

            <button 
              onClick={() => handleAddContact()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full font-bold text-sm transition-all shadow-md active:scale-95"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">{t('newContact')}</span>
            </button>
            <div className={`h-8 w-px ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ring-2 uppercase ${theme === 'dark' ? 'bg-blue-900/50 text-blue-400 ring-slate-800' : 'bg-blue-100 text-blue-700 ring-white'}`}>
              {currentUser?.email?.slice(0, 2) || 'US'}
            </div>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden">
          {hasPermissionError ? (
            <div className={`absolute inset-0 z-50 flex items-center justify-center p-6 ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
              <div className={`max-w-md w-full rounded-[2.5rem] shadow-2xl p-10 text-center border space-y-6 animate-in zoom-in-95 duration-300 ${theme === 'dark' ? 'bg-slate-900 border-red-900/30' : 'bg-white border-red-100'}`}>
                <div className="mx-auto w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-3xl flex items-center justify-center text-red-500 shadow-inner">
                  <ShieldAlert size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className={`text-2xl font-black ${theme === 'dark' ? 'text-slate-100' : 'text-gray-900'}`}>Configuratie Vereist</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Firestore blokkeert de toegang. Pas de Security Rules aan in de Firebase Console.
                  </p>
                </div>
                <a 
                  href="https://console.firebase.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-blue-100 active:scale-95"
                >
                  Firebase Console Openen
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          ) : (
            <>
              {viewMode === 'map' && (
                <MapView 
                  contacts={filteredContacts} 
                  addresses={addresses} 
                  types={types}
                  onContactClick={(id) => setSelectedContactId(id)}
                  onMapClick={handleAddContact}
                  onAddResident={(addrId) => handleAddContact(undefined, addrId)}
                  t={t}
                  theme={theme}
                />
              )}
              {viewMode === 'list' && (
                <ContactList 
                  contacts={filteredContacts} 
                  addresses={addresses} 
                  types={types}
                  onContactClick={(id) => setSelectedContactId(id)}
                  t={t}
                  theme={theme}
                />
              )}
              {viewMode === 'dashboard' && (
                <Dashboard 
                  contacts={contacts} 
                  addresses={addresses} 
                  types={types}
                  onContactClick={(id) => {
                    setSelectedContactId(id);
                    setViewMode('map');
                  }}
                  onAddContact={() => handleAddContact()}
                  t={t}
                  theme={theme}
                />
              )}
              {viewMode === 'planning' && (
                <PlanningView 
                  contacts={contacts} 
                  addresses={addresses} 
                  types={types}
                  onContactClick={(id) => setSelectedContactId(id)}
                  t={t}
                  theme={theme}
                />
              )}
              {viewMode === 'calendar' && (
                <CalendarView 
                  contacts={contacts}
                  types={types}
                  onContactClick={(id) => {
                    setSelectedContactId(id);
                    setViewMode('map');
                  }}
                  language={language}
                  theme={theme}
                />
              )}
              {viewMode === 'stats' && (
                <StatsView 
                  contacts={contacts} 
                  types={types} 
                  addresses={addresses}
                  t={t}
                  theme={theme}
                />
              )}
              {viewMode === 'events' && (
                <EventsView 
                  events={events}
                  contacts={contacts}
                  onContactClick={(id) => {
                    setSelectedContactId(id);
                    setViewMode('list');
                  }}
                  onEditEvent={(event) => {
                    setEditEvent(event);
                    setIsEventFormOpen(true);
                  }}
                  t={t}
                  theme={theme}
                />
              )}

              {selectedContact && (
                <ContactDetails 
                  contact={selectedContact}
                  address={selectedAddress || { id: 'unknown', street: '?', city: '?', houseNumber: '?', zipCode: '?', lat: 0, lng: 0, photoUrl: '', type: 'home', additionalInfo: '', createdAt: '' }}
                  type={selectedType || types[0]}
                  contacts={contacts}
                  relations={relations}
                  otherResidents={otherResidents}
                  onClose={() => setSelectedContactId(null)}
                  onEdit={handleEditContact}
                  onUpdate={handleUpdateContact}
                  onDelete={handleDeleteContact}
                  onAddResident={(addrId) => handleAddContact(undefined, addrId)}
                  onSetMapAvatar={handleSetMapAvatar}
                  onContactClick={(id) => setSelectedContactId(id)}
                  t={t}
                  theme={theme}
                />
              )}
            </>
          )}

          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none">
            {importSuccess && (
              <div className="animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
                <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500">
                  <CheckCircle2 size={24} />
                  <div>
                    <p className="font-bold text-sm">{t('import_succes')}</p>
                  </div>
                </div>
              </div>
            )}
            {importError && (
              <div className="animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
                <div className="bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-500">
                  <AlertTriangle size={24} />
                  <div>
                    <p className="font-bold text-sm">{t('sync_mislukt')}</p>
                  </div>
                  <button onClick={() => setImportError(null)} className="ml-2 hover:bg-white/20 p-1 rounded-full"><X size={16}/></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {isFormOpen && (
        <ContactForm 
          contact={editContact}
          types={types}
          addresses={addresses}
          contacts={contacts}
          relations={relations}
          initialCoords={initialCoords}
          initialAddressId={initialAddressId}
          onClose={() => setIsFormOpen(false)}
          onSave={saveContact}
          t={t}
          theme={theme}
        />
      )}

      {isEventFormOpen && (
        <EventForm 
          contacts={contacts}
          onClose={() => {
            setIsEventFormOpen(false);
            setEditEvent(null);
          }}
          initialData={editEvent || undefined}
          onSave={saveEvent}
          onDelete={deleteEvent}
          t={t}
          theme={theme}
        />
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-white/50 text-gray-900'} rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border`}>
            <div className="p-8 text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-3xl flex items-center justify-center text-amber-500 shadow-inner">
                <FileJson size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-black mb-2">{t('backup_terugzetten')}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Bestand zal bestaande gegevens overschrijven.
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={executeImport}
                  disabled={isDataSyncing}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-blue-200 active:scale-95 disabled:opacity-50"
                >
                  {isDataSyncing ? t('processing') : t('ja_overschrijf')}
                </button>
                <button 
                  onClick={() => {
                    setImportPendingData(null);
                    setShowImportModal(false);
                  }}
                  className={`w-full py-4 rounded-2xl font-bold transition-all border ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400' : 'bg-white hover:bg-gray-50 border-gray-100 text-gray-500'}`}
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  expanded?: boolean;
  onClick: () => void;
  theme?: string;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, expanded, onClick, theme }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
      active 
        ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-400 shadow-sm' : 'bg-blue-50 text-blue-600 shadow-sm') 
        : (theme === 'dark' ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-100 font-semibold' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-semibold')
    }`}
  >
    <span className={`${active ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-600') : 'text-gray-400'}`}>{icon}</span>
    {expanded && <span className="font-bold text-sm truncate">{label}</span>}
    {active && expanded && <div className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-600'}`} />}
  </button>
);

export default App;
