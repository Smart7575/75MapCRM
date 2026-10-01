
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
  Moon,
  Settings,
  Phone,
  MapPin
} from 'lucide-react';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  signOut, 
  collection, 
  doc, 
  getDoc,
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
import { SettingsView } from './components/SettingsView.tsx';
import { compressImageBase64, removeUndefinedFields, dialPhoneNumber } from './utils.ts';
import { 
  SF_DEMO_ADDRESSES, 
  SF_DEMO_CONTACTS, 
  SF_DEMO_RELATIONS, 
  SF_DEMO_EVENTS, 
  isDemoId 
} from './demoData.ts';

const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataSyncing, setIsDataSyncing] = useState(false);
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const [language, setLanguage] = useState<'nl' | 'en'>(() => {
    const saved = localStorage.getItem('mapcrm_language');
    if (saved === 'nl' || saved === 'en') {
      return saved;
    }
    return 'en'; // Default to English the first time the app runs
  });

  const handleLanguageChange = (newLang: 'nl' | 'en') => {
    setLanguage(newLang);
    localStorage.setItem('mapcrm_language', newLang);
    if (currentUser) {
      const userRef = doc(db, 'users', currentUser.uid);
      setDoc(userRef, { language: newLang }, { merge: true }).catch(() => {});
    }
  };
  
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
  const [callToast, setCallToast] = useState<{ name: string } | null>(null);
  const lastCallTimeRef = useRef<{ [contactId: string]: number }>({});

  // Search dropdown states and refs
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Language persistence effect
  useEffect(() => {
    localStorage.setItem('mapcrm_language', language);
  }, [language]);

  // Theme effect
  useEffect(() => {
    localStorage.setItem('mapcrm_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
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
        
        // Optionally sync language from user document if stored in profile
        try {
          const userDocSnap = await getDoc(userRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData?.language && (userData.language === 'nl' || userData.language === 'en')) {
              const localSaved = localStorage.getItem('mapcrm_language');
              if (!localSaved) {
                setLanguage(userData.language);
                localStorage.setItem('mapcrm_language', userData.language);
              }
            }
          }
        } catch {
          // Non-critical profile sync
        }

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
        if (
          err.code === 'permission-denied' || 
          (err.message && (err.message.includes('permission-denied') || err.message.includes('Permission denied')))
        ) {
          setHasPermissionError(true);
        }
      } finally {
        setIsDataSyncing(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const filteredContacts = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return contacts;

    const words = trimmed.split(/\s+/).filter(Boolean);

    return contacts.filter(c => {
      if (!c || typeof c.firstName !== 'string') return false;
      const addr = addresses.find(a => a.id === c.addressId);
      const type = types.find(t => t.id === c.typeId);

      const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
      const reverseName = `${c.lastName || ''} ${c.firstName || ''}`.toLowerCase();
      const phonesStr = (c.phones || []).join(' ').toLowerCase();
      const rawDigits = (c.phones || []).map(p => p.replace(/\D/g, '')).join(' ');
      const emailsStr = (c.emails || []).join(' ').toLowerCase();
      const streetStr = `${addr?.street || ''} ${addr?.houseNumber || ''}`.toLowerCase();
      const cityStr = (addr?.city || '').toLowerCase();
      const postalStr = (addr?.postalCode || '').toLowerCase();
      const countryStr = (addr?.country || '').toLowerCase();
      const notesStr = (c.notes || '').toLowerCase();
      const typeStr = (type?.name || '').toLowerCase();
      const hobbiesStr = (c.hobbies || []).join(' ').toLowerCase();

      const combined = `${fullName} ${reverseName} ${phonesStr} ${rawDigits} ${emailsStr} ${streetStr} ${cityStr} ${postalStr} ${countryStr} ${notesStr} ${typeStr} ${hobbiesStr}`;

      return words.every(word => combined.includes(word));
    });
  }, [contacts, addresses, types, searchQuery]);

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
            notes: (event.notes && event.notes.trim() !== '' && event.notes.trim().toLowerCase() !== event.title.trim().toLowerCase())
              ? `${event.title}: ${event.notes}`
              : (event.notes || event.title)
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

  const handleCallContact = async (contact: Contact, phoneNumber?: string, e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const phoneToDial = phoneNumber || (contact.phones && contact.phones[0]);
    if (!phoneToDial) return;

    // Launch native phone dialer
    dialPhoneNumber(phoneToDial, e);

    // Prevent duplicate recording if clicked multiple times within 3 seconds
    const now = Date.now();
    const lastCalled = lastCallTimeRef.current[contact.id] || 0;
    if (now - lastCalled < 3000) {
      return;
    }
    lastCallTimeRef.current[contact.id] = now;

    // Register phone call event on that day with description 'telefoongesprek'
    const todayIso = new Date().toISOString();
    const eventId = `event-call-${now}`;
    const callEvent: Event = {
      id: eventId,
      title: 'telefoongesprek',
      date: todayIso,
      type: 'phone',
      notes: 'telefoongesprek',
      contactIds: [contact.id],
      createdAt: todayIso
    };

    const contactName = `${contact.firstName} ${contact.lastName || ''}`.trim();
    setCallToast({ name: contactName });
    setTimeout(() => {
      setCallToast(null);
    }, 4000);

    await saveEvent(callEvent);
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

  const demoContactsCount = useMemo(() => {
    return contacts.filter(c => isDemoId(c.id)).length;
  }, [contacts]);

  const handleLoadDemoData = async () => {
    if (!currentUser) return;
    setIsDataSyncing(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const batch = writeBatch(db);

      for (const addr of SF_DEMO_ADDRESSES) {
        batch.set(doc(userRef, 'addresses', addr.id), removeUndefinedFields(addr));
      }
      for (const contact of SF_DEMO_CONTACTS) {
        batch.set(doc(userRef, 'contacts', contact.id), removeUndefinedFields(contact));
      }
      for (const rel of SF_DEMO_RELATIONS) {
        batch.set(doc(userRef, 'relations', rel.id), removeUndefinedFields(rel));
      }
      for (const ev of SF_DEMO_EVENTS) {
        batch.set(doc(userRef, 'events', ev.id), removeUndefinedFields(ev));
      }

      await batch.commit();

      setAddresses(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const toAdd = SF_DEMO_ADDRESSES.filter(a => !existingIds.has(a.id));
        const updated = prev.map(a => {
          const demoA = SF_DEMO_ADDRESSES.find(d => d.id === a.id);
          return demoA || a;
        });
        return [...updated, ...toAdd];
      });

      setContacts(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const toAdd = SF_DEMO_CONTACTS.filter(c => !existingIds.has(c.id));
        const updated = prev.map(c => {
          const demoC = SF_DEMO_CONTACTS.find(d => d.id === c.id);
          return demoC || c;
        });
        return [...updated, ...toAdd];
      });

      setRelations(prev => {
        const existingIds = new Set(prev.map(r => r.id));
        const toAdd = SF_DEMO_RELATIONS.filter(r => !existingIds.has(r.id));
        return [...prev, ...toAdd];
      });

      setEvents(prev => {
        const existingIds = new Set(prev.map(e => e.id));
        const toAdd = SF_DEMO_EVENTS.filter(e => !existingIds.has(e.id));
        return [...prev, ...toAdd];
      });
    } catch (err) {
      console.error("Error loading demo data:", err);
      handleFirestoreError(err, 'write', `users/${currentUser.uid} (demo data)`);
      throw err;
    } finally {
      setIsDataSyncing(false);
    }
  };

  const handleRemoveDemoData = async () => {
    if (!currentUser) return;
    setIsDataSyncing(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const batch = writeBatch(db);

      const demoContactIds = SF_DEMO_CONTACTS.map(c => c.id);
      const demoAddressIds = SF_DEMO_ADDRESSES.map(a => a.id);
      const demoRelationIds = SF_DEMO_RELATIONS.map(r => r.id);
      const demoEventIds = SF_DEMO_EVENTS.map(e => e.id);

      for (const cid of demoContactIds) {
        batch.delete(doc(userRef, 'contacts', cid));
      }
      for (const aid of demoAddressIds) {
        batch.delete(doc(userRef, 'addresses', aid));
      }
      for (const rid of demoRelationIds) {
        batch.delete(doc(userRef, 'relations', rid));
      }
      for (const eid of demoEventIds) {
        batch.delete(doc(userRef, 'events', eid));
      }

      await batch.commit();

      setContacts(prev => prev.filter(c => !isDemoId(c.id)));
      setAddresses(prev => prev.filter(a => !isDemoId(a.id)));
      setRelations(prev => prev.filter(r => !isDemoId(r.id)));
      setEvents(prev => prev.filter(e => !isDemoId(e.id)));
      if (selectedContactId && isDemoId(selectedContactId)) {
        setSelectedContactId(null);
      }
    } catch (err) {
      console.error("Error removing demo data:", err);
      handleFirestoreError(err, 'delete', `users/${currentUser.uid} (demo data)`);
      throw err;
    } finally {
      setIsDataSyncing(false);
    }
  };

  const handleClearAllData = async () => {
    if (!currentUser) return;
    setIsDataSyncing(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);

      const clearSubcollection = async (sub: string) => {
        const snap = await getDocs(collection(userRef, sub));
        if (snap.empty) return;
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i += 400) {
          const chunk = docs.slice(i, i + 400);
          const batch = writeBatch(db);
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      };

      await clearSubcollection('contacts');
      await clearSubcollection('addresses');
      await clearSubcollection('relations');
      await clearSubcollection('events');

      setContacts([]);
      setAddresses([]);
      setRelations([]);
      setEvents([]);
      setSelectedContactId(null);
    } catch (err) {
      console.error("Error clearing all data:", err);
      handleFirestoreError(err, 'delete', `users/${currentUser.uid} (clear all)`);
      throw err;
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
    return <AuthScreen language={language} onLanguageChange={handleLanguageChange} />;
  }

  return (
    <div className={`flex flex-col lg:flex-row h-screen h-[100dvh] w-full ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'} overflow-hidden`}>
      {/* Hidden file input for backup restoration */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImportData} 
        accept=".json" 
        className="hidden" 
      />

      {/* Desktop Sidebar (visible on large landscape screens, hidden on phones & tablet portrait) */}
      <aside 
        className={`hidden lg:flex ${
          isSidebarOpen ? 'w-64' : 'w-20'
        } ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} border-r transition-all duration-300 flex-col z-50 shadow-sm shrink-0`}
      >
        {/* Top Header with Brand & Blue Collapse/Expand Button */}
        <div className={`h-16 px-3.5 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} border-b ${theme === 'dark' ? 'border-slate-800' : 'border-gray-100'} shrink-0 transition-all`}>
          {isSidebarOpen ? (
            <>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/25">
                  <Users size={22} />
                </div>
                <h1 className={`text-xl font-bold tracking-tight truncate ${theme === 'dark' ? 'text-blue-400' : 'text-blue-900'}`}>
                  MapCRM75
                </h1>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                title={t('collapseSidebar')}
                aria-label={t('collapseSidebar')}
                className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-600 dark:bg-blue-950/70 dark:hover:bg-blue-600 text-blue-600 hover:text-white dark:text-blue-400 dark:hover:text-white border border-blue-200 dark:border-blue-800/80 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm group shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {/* Beautiful blue arrow/triangle pointing left to collapse */}
                <svg 
                  className="w-3.5 h-3.5 fill-blue-600 dark:fill-blue-400 group-hover:fill-white transition-all duration-200 group-hover:-translate-x-0.5" 
                  viewBox="0 0 24 24"
                >
                  <path d="M16 6.2a1 1 0 0 0-1.6-.8l-7 5.8a1.2 1.2 0 0 0 0 1.8l7 5.8a1 1 0 0 0 1.6-.8V6.2z" />
                </svg>
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              title={t('expandSidebar')}
              aria-label={t('expandSidebar')}
              className="w-10 h-10 rounded-xl bg-blue-50 hover:bg-blue-600 dark:bg-blue-950/70 dark:hover:bg-blue-600 text-blue-600 hover:text-white dark:text-blue-400 dark:hover:text-white border border-blue-200 dark:border-blue-800/80 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm group shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {/* Beautiful blue arrow/triangle pointing right to expand */}
              <svg 
                className="w-4 h-4 fill-blue-600 dark:fill-blue-400 group-hover:fill-white transition-all duration-200 group-hover:translate-x-0.5" 
                viewBox="0 0 24 24"
              >
                <path d="M8 6.2a1 1 0 0 1 1.6-.8l7 5.8a1.2 1.2 0 0 1 0 1.8l-7 5.8a1 1 0 0 1-1.6-.8V6.2z" />
              </svg>
            </button>
          )}
        </div>

        <nav className="flex-1 mt-3 px-2 space-y-1 overflow-y-auto">
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
          <NavItem 
            icon={<Settings size={20} />} 
            label={t('settings')} 
            active={viewMode === 'settings'} 
            expanded={isSidebarOpen} 
            onClick={() => setViewMode('settings')} 
            theme={theme}
          />
        </nav>

        <div className={`p-2 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-gray-100'} mt-auto`}>
          <NavItem 
            icon={<LogOut size={20} />} 
            label={t('logout')} 
            active={false} 
            expanded={isSidebarOpen} 
            onClick={handleLogout} 
            theme={theme}
          />
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative min-w-0 min-h-0 overflow-hidden w-full">
        <header className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} h-16 border-b flex items-center justify-between px-3 sm:px-4 lg:px-6 z-40 shrink-0 gap-2 w-full min-w-0`}>
          <div ref={searchContainerRef} className="flex-1 min-w-0 max-w-xs sm:max-w-sm flex items-center gap-2 sm:gap-4 relative">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder={t('search')} 
                className={`w-full pl-9 sm:pl-10 pr-8 sm:pr-9 py-2 border-none rounded-full focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm transition-all ${theme === 'dark' ? 'bg-slate-800 text-slate-100 placeholder:text-slate-500' : 'bg-gray-100 text-black placeholder:text-gray-400'}`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchDropdownOpen(true);
                }}
                onFocus={() => {
                  if (searchQuery.trim()) {
                    setIsSearchDropdownOpen(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredContacts.length > 0) {
                      setViewMode('list');
                      setIsSearchDropdownOpen(false);
                    }
                  } else if (e.key === 'Escape') {
                    setIsSearchDropdownOpen(false);
                  }
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchDropdownOpen(false);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
                  title={t('clearSearch')}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Live Search Results Dropdown */}
            {isSearchDropdownOpen && searchQuery.trim() !== '' && (
              <div 
                className={`absolute top-full left-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl border z-50 overflow-hidden ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
                } animate-in fade-in slide-in-from-top-2 duration-150`}
              >
                <div className={`px-4 py-2.5 border-b flex items-center justify-between text-xs font-semibold ${
                  theme === 'dark' ? 'border-slate-800 bg-slate-900/80 text-slate-400' : 'border-gray-100 bg-gray-50/80 text-gray-500'
                }`}>
                  <span>{t('searchResults')} ({filteredContacts.length})</span>
                  <button 
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchDropdownOpen(false);
                    }}
                    className="text-[11px] text-blue-500 hover:underline"
                  >
                    {t('clearSearch')}
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
                  {filteredContacts.length > 0 ? (
                    filteredContacts.slice(0, 6).map((contact) => {
                      const addr = addresses.find(a => a.id === contact.addressId);
                      const type = types.find(t_item => t_item.id === contact.typeId);
                      const photo = contact.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.firstName)}+${encodeURIComponent(contact.lastName || '')}`;
                      const phone = contact.phones?.[0];

                      return (
                        <div
                          key={contact.id}
                          onClick={() => {
                            setSelectedContactId(contact.id);
                            setIsSearchDropdownOpen(false);
                          }}
                          className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                            theme === 'dark' ? 'hover:bg-slate-800/70' : 'hover:bg-blue-50/60'
                          }`}
                        >
                          <img 
                            src={photo} 
                            alt={`${contact.firstName} ${contact.lastName || ''}`}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 border"
                            style={{ borderColor: type?.color || '#3b82f6' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 justify-between">
                              <span className="font-bold text-sm truncate">
                                {contact.firstName} {contact.lastName || ''}
                              </span>
                              {type && (
                                <span 
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                                  style={{ backgroundColor: `${type.color}20`, color: type.color }}
                                >
                                  {type.name}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 truncate mt-0.5">
                              {addr && (
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin size={11} className="shrink-0" />
                                  {addr.city}{addr.street ? `, ${addr.street}` : ''}
                                </span>
                              )}
                              {phone && (
                                <span className="flex items-center gap-1 truncate text-gray-400">
                                  <Phone size={10} className="shrink-0" />
                                  {phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-sm text-gray-400">
                      <p className="font-medium">{t('noResultsFound')}</p>
                      <p className="text-xs text-gray-500 mt-1">"{searchQuery}"</p>
                    </div>
                  )}
                </div>

                {filteredContacts.length > 0 && (
                  <div className={`p-2 border-t flex items-center justify-between gap-2 text-xs ${
                    theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-gray-100 bg-gray-50/50'
                  }`}>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('list');
                        setIsSearchDropdownOpen(false);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-center transition-colors"
                    >
                      {t('viewInList')} ({filteredContacts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('map');
                        setIsSearchDropdownOpen(false);
                      }}
                      className={`py-1.5 px-3 rounded-lg border font-medium transition-colors ${
                        theme === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-slate-200' : 'border-gray-200 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {t('viewOnMap')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {isDataSyncing && (
              <div className="flex items-center gap-1 sm:gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest animate-pulse shrink-0">
                <Loader2 size={12} className="animate-spin" />
                <span className="hidden md:inline">{t('sync')}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 ml-1 sm:ml-2 shrink-0">
            {/* Theme Toggle */}
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`p-2 rounded-xl border transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-gray-100 border-gray-200 text-blue-600 hover:bg-gray-200'}`}
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Language Switcher */}
            <div className={`flex p-0.5 sm:p-1 rounded-xl shadow-inner border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200/50'}`}>
              <button 
                onClick={() => handleLanguageChange('nl')} 
                className={`px-1.5 sm:px-2.5 py-1 rounded-lg text-[10px] font-black tracking-tighter transition-all ${language === 'nl' ? (theme === 'dark' ? 'bg-slate-900 text-blue-400' : 'bg-white shadow-sm text-blue-600') : 'text-gray-400 hover:text-gray-600'}`}
              >
                NL
              </button>
              <button 
                onClick={() => handleLanguageChange('en')} 
                className={`px-1.5 sm:px-2.5 py-1 rounded-lg text-[10px] font-black tracking-tighter transition-all ${language === 'en' ? (theme === 'dark' ? 'bg-slate-900 text-blue-400' : 'bg-white shadow-sm text-blue-600') : 'text-gray-400 hover:text-gray-600'}`}
              >
                EN
              </button>
            </div>

            <button 
              onClick={() => setIsEventFormOpen(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 sm:px-4 md:px-5 py-2 rounded-full font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 shrink-0"
              title={t('newEvent')}
            >
              <Calendar size={16} className="shrink-0" />
              <span>{t('group')}</span>
            </button>

            <button 
              onClick={() => handleAddContact()}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-2.5 sm:px-3.5 py-2 rounded-full font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 shrink-0"
              title={t('newContact')}
            >
              <Plus size={16} />
              <span className="hidden sm:inline">{t('newContact')}</span>
            </button>
            
            {/* Settings button - desktop only (on mobile & tablet portrait it's in bottom bar) */}
            <button 
              onClick={() => setViewMode('settings')}
              className={`hidden lg:flex p-2 rounded-xl border transition-all ${viewMode === 'settings' ? (theme === 'dark' ? 'bg-blue-600 border-blue-500 text-white shadow-sm' : 'bg-blue-600 border-blue-600 text-white shadow-sm') : (theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200')}`}
              title={t('settings')}
            >
              <Settings size={17} />
            </button>

            <div className={`hidden lg:block h-8 w-px ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-200'}`} />
            <button 
              onClick={() => setViewMode('settings')}
              title={`${t('settings')} (${currentUser?.email})`}
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ring-2 uppercase transition-all hover:scale-105 active:scale-95 shrink-0 ${theme === 'dark' ? 'bg-blue-900/50 text-blue-400 ring-slate-800 hover:ring-blue-500' : 'bg-blue-100 text-blue-700 ring-white hover:ring-blue-300'}`}
            >
              {currentUser?.email?.slice(0, 2) || 'US'}
            </button>
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
                  <h3 className={`text-2xl font-black ${theme === 'dark' ? 'text-slate-100' : 'text-gray-900'}`}>{t('configRequired')}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {t('configRequiredDesc')}
                  </p>
                </div>
                <a 
                  href="https://console.firebase.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-blue-100 active:scale-95"
                >
                  {t('openFirebaseConsole')}
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
                  onCall={handleCallContact}
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
                  onCall={handleCallContact}
                  t={t}
                  theme={theme}
                />
              )}
              {(viewMode === 'dashboard' || viewMode === 'planning') && (
                <Dashboard 
                  contacts={contacts} 
                  addresses={addresses} 
                  types={types}
                  onContactClick={(id) => setSelectedContactId(id)}
                  onCall={handleCallContact}
                  onAddContact={() => handleAddContact()}
                  t={t}
                  theme={theme}
                  searchQuery={searchQuery}
                  filteredContacts={filteredContacts}
                  onViewAllInList={() => setViewMode('list')}
                  onClearSearch={() => setSearchQuery('')}
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
                  events={events}
                  t={t}
                  theme={theme}
                  onContactClick={(id) => setSelectedContactId(id)}
                />
              )}
              {viewMode === 'events' && (
                <EventsView 
                  events={events}
                  contacts={contacts}
                  onContactClick={(id) => {
                    setSelectedContactId(id);
                  }}
                  onEditEvent={(event) => {
                    setEditEvent(event);
                    setIsEventFormOpen(true);
                  }}
                  onDeleteEvent={deleteEvent}
                  onUpdateContact={handleUpdateContact}
                  onNewEvent={() => setIsEventFormOpen(true)}
                  t={t}
                  theme={theme}
                />
              )}
              {viewMode === 'settings' && currentUser && (
                <SettingsView 
                  currentUser={currentUser}
                  theme={theme}
                  onThemeChange={setTheme}
                  language={language}
                  onLanguageChange={handleLanguageChange}
                  contactsCount={contacts.length}
                  addressesCount={addresses.length}
                  relationsCount={relations.length}
                  eventsCount={events.length}
                  typesCount={types.length}
                  onExportData={handleExportData}
                  onImportClick={() => fileInputRef.current?.click()}
                  onLogout={handleLogout}
                  t={t}
                  onLoadDemoData={handleLoadDemoData}
                  onRemoveDemoData={handleRemoveDemoData}
                  onClearAllData={handleClearAllData}
                  demoContactsCount={demoContactsCount}
                  onNavigateToMap={() => setViewMode('map')}
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
                  onCall={handleCallContact}
                  t={t}
                  theme={theme}
                />
              )}
            </>
          )}

          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none">
            {callToast && (
              <div className="animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
                <div className="bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500">
                  <Phone size={20} className="fill-current animate-pulse shrink-0" />
                  <div>
                    <p className="font-bold text-sm">{t('callRegisteredToast') || 'Telefoongesprek geregistreerd'}</p>
                    <p className="text-xs text-emerald-100 font-medium">{callToast.name}</p>
                  </div>
                </div>
              </div>
            )}
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

      {/* Mobile & Tablet Portrait Bottom Navigation Bar */}
      <nav 
        aria-label="Navigation"
        className={`lg:hidden shrink-0 border-t ${
          theme === 'dark' 
            ? 'bg-slate-900/95 border-slate-800' 
            : 'bg-white/95 border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]'
        } backdrop-blur-md z-40 px-1 sm:px-3 py-1 flex items-center justify-between gap-0.5 sm:gap-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]`}
      >
        <MobileNavItem 
          icon={<LayoutDashboard size={19} />} 
          label={t('dashboard')} 
          active={viewMode === 'dashboard'} 
          onClick={() => setViewMode('dashboard')} 
          theme={theme} 
        />
        <MobileNavItem 
          icon={<MapIcon size={19} />} 
          label={t('map')} 
          active={viewMode === 'map'} 
          onClick={() => setViewMode('map')} 
          theme={theme} 
        />
        <MobileNavItem 
          icon={<Users size={19} />} 
          label={t('contacts')} 
          active={viewMode === 'list'} 
          onClick={() => setViewMode('list')} 
          theme={theme} 
        />
        <MobileNavItem 
          icon={<Gift size={19} />} 
          label={t('birthdays')} 
          active={viewMode === 'calendar'} 
          onClick={() => setViewMode('calendar')} 
          theme={theme} 
        />
        <MobileNavItem 
          icon={<Calendar size={19} />} 
          label={t('events')} 
          active={viewMode === 'events'} 
          onClick={() => setViewMode('events')} 
          theme={theme} 
        />
        <MobileNavItem 
          icon={<BarChart3 size={19} />} 
          label={t('stats')} 
          active={viewMode === 'stats'} 
          onClick={() => setViewMode('stats')} 
          theme={theme} 
        />
        <MobileNavItem 
          icon={<Settings size={19} />} 
          label={t('settings')} 
          active={viewMode === 'settings'} 
          onClick={() => setViewMode('settings')} 
          theme={theme} 
        />
      </nav>

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

interface MobileNavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  theme: string;
}

const MobileNavItem: React.FC<MobileNavItemProps> = ({ icon, label, active, onClick, theme }) => (
  <button 
    type="button"
    onClick={onClick}
    className={`flex-1 min-w-0 py-1.5 sm:py-2 px-0.5 sm:px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
      active 
        ? (theme === 'dark' ? 'text-blue-400 bg-blue-950/40 font-bold' : 'text-blue-600 bg-blue-50 font-bold') 
        : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-900')
    }`}
    title={label}
  >
    <span className="relative flex items-center justify-center">
      {icon}
      {active && (
        <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-600'}`} />
      )}
    </span>
    <span className="text-[9px] sm:text-[11px] tracking-tight truncate w-full text-center leading-tight">
      {label}
    </span>
  </button>
);

export default App;
