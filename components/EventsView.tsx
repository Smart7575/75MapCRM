import React, { useState, useMemo } from 'react';
import { 
  Calendar, Users, Clock, MessageSquare, ChevronRight, 
  Edit2, Trash2, Plus, Search, Phone, Smartphone, 
  Activity, Check, X, Filter, UserCheck, Sparkles 
} from 'lucide-react';
import { Event, Contact, InteractionMode, Interaction } from '../types.ts';

interface EventsViewProps {
  events: Event[];
  contacts: Contact[];
  onContactClick: (id: string) => void;
  onEditEvent: (event: Event) => void;
  onDeleteEvent?: (id: string) => void;
  onUpdateContact?: (contact: Contact) => void;
  onNewEvent?: () => void;
  t: (key: any) => string;
  theme?: string;
}

interface UnifiedInteractionItem {
  id: string;
  kind: 'contact' | 'event';
  title: string;
  date: string;
  type: InteractionMode;
  notes: string;
  contact?: Contact;
  contacts?: Contact[];
  rawEvent?: Event;
  interactionId?: string;
}

const EventsView: React.FC<EventsViewProps> = ({ 
  events, 
  contacts, 
  onContactClick, 
  onEditEvent, 
  onDeleteEvent,
  onUpdateContact,
  onNewEvent,
  t, 
  theme 
}) => {
  const isDark = theme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'contacts' | 'events'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // State for editing a 1-on-1 contact interaction
  const [editingContactItem, setEditingContactItem] = useState<{
    contact: Contact;
    interactionId: string;
  } | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editType, setEditType] = useState<InteractionMode>('physical');
  const [editNotes, setEditNotes] = useState<string>('');

  // Collect and unify all interactions (excluding 1-on-1 duplicates that are part of a group interaction)
  const allUnifiedInteractions = useMemo(() => {
    const list: UnifiedInteractionItem[] = [];

    // Helper to check if a contact's interaction belongs to any group event
    const isPartOfEvent = (contactId: string, item: { id: string; date: string; notes?: string }) => {
      return events.some(event => {
        // Must include this contact in the event
        if (!event.contactIds || !event.contactIds.includes(contactId)) {
          return false;
        }

        // 1. Direct ID match (App.tsx stores: int-${event.id}-${contact.id})
        if (item.id && (item.id.startsWith(`int-${event.id}`) || item.id.includes(event.id))) {
          return true;
        }

        // 2. Check if date matches the event date
        if (item.date && event.date) {
          const itemTime = new Date(item.date).getTime();
          const eventTime = new Date(event.date).getTime();
          if (!isNaN(itemTime) && !isNaN(eventTime) && Math.abs(itemTime - eventTime) < 60000) {
            return true;
          }
          // Same calendar day if note references the event or same date
          if (item.date.split('T')[0] === event.date.split('T')[0]) {
            if (event.title && item.notes && (item.notes.includes(event.title) || event.title.includes(item.notes))) {
              return true;
            }
            // If contact is in event and date matches exactly
            return true;
          }
        }
        return false;
      });
    };

    // 1. First, add all group events (multi-contact interactions)
    events.forEach(event => {
      const attendees = (event.contactIds || [])
        .map(cid => contacts.find(c => c.id === cid))
        .filter((c): c is Contact => Boolean(c));

      list.push({
        id: `event-${event.id}`,
        kind: 'event',
        title: event.title,
        date: event.date,
        type: event.type || 'physical',
        notes: event.notes || '',
        contacts: attendees,
        rawEvent: event
      });
    });

    // 2. Add individual 1-on-1 contact interactions ONLY if they are NOT already part of a group interaction
    contacts.forEach(contact => {
      const contactInteractions = contact.interactions || [];

      contactInteractions.forEach(item => {
        // Skip if this interaction belongs to a group event
        if (isPartOfEvent(contact.id, item)) {
          return;
        }

        const rawNotes = item.notes?.trim();
        const displayTitle = (rawNotes && rawNotes !== '')
          ? rawNotes
          : (t('nu_vastleggen') || 'Interactie vastgelegd');

        list.push({
          id: `contact-${contact.id}-${item.id}`,
          kind: 'contact',
          title: displayTitle,
          date: item.date,
          type: item.type || 'physical',
          notes: item.notes || '',
          contact,
          contacts: [contact],
          interactionId: item.id
        });
      });

      // Also support legacy/single lastInteractionDate if not in interactions array and not part of an event
      if (contact.lastInteractionDate && contact.lastInteractionDate.trim() !== '') {
        const lastDateStr = new Date(contact.lastInteractionDate).toLocaleDateString();
        const alreadyInList = contactInteractions.some(i => {
          try {
            return new Date(i.date).toLocaleDateString() === lastDateStr;
          } catch {
            return false;
          }
        });
        const isFromEvent = isPartOfEvent(contact.id, {
          id: 'virtual-last',
          date: contact.lastInteractionDate,
          notes: ''
        });

        if (!alreadyInList && !isFromEvent) {
          list.push({
            id: `virtual-${contact.id}`,
            kind: 'contact',
            title: t('nu_vastleggen') || 'Interactie vastgelegd',
            date: contact.lastInteractionDate,
            type: 'physical',
            notes: t('nu_vastleggen') || 'Interactie vastgelegd',
            contact,
            contacts: [contact],
            interactionId: 'virtual-last'
          });
        }
      }
    });

    // Sort chronologically (most recent first)
    return list.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });
  }, [contacts, events, t]);

  // Counts for tabs
  const countAll = allUnifiedInteractions.length;
  const countContacts = allUnifiedInteractions.filter(i => i.kind === 'contact').length;
  const countEvents = allUnifiedInteractions.filter(i => i.kind === 'event').length;

  // Filtered list
  const filteredInteractions = useMemo(() => {
    return allUnifiedInteractions.filter(item => {
      // Tab filter
      if (activeTab === 'contacts' && item.kind !== 'contact') return false;
      if (activeTab === 'events' && item.kind !== 'event') return false;

      // Type filter
      if (typeFilter !== 'all') {
        const normalizedItemType = item.type === 'phone' ? 'call' : item.type;
        const normalizedFilter = typeFilter === 'call' ? 'phone' : typeFilter;
        if (item.type !== typeFilter && normalizedItemType !== typeFilter && item.type !== normalizedFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesNotes = item.notes.toLowerCase().includes(q);
        const matchesAttendee = item.contacts?.some(c => 
          `${c.firstName} ${c.lastName || ''}`.toLowerCase().includes(q)
        );
        if (!matchesTitle && !matchesNotes && !matchesAttendee) return false;
      }

      return true;
    });
  }, [allUnifiedInteractions, activeTab, typeFilter, searchQuery]);

  const getInteractionIcon = (mode: InteractionMode, size = 16) => {
    switch(mode) {
      case 'physical': return <Users size={size} />;
      case 'app': return <Smartphone size={size} />;
      case 'phone': return <Phone size={size} />;
      default: return <MessageSquare size={size} />;
    }
  };

  const getRelativeTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const diffTime = today.getTime() - target.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return t('today');
      if (diffDays === 1) return t('yesterday');
      if (diffDays > 1 && diffDays < 7) return `${diffDays} ${t('daysAgo')}`;
      if (diffDays >= 7 && diffDays < 30) return `${Math.floor(diffDays / 7)} ${t('weeksAgo')}`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  // Start editing a 1-on-1 contact interaction
  const handleStartEditContact = (item: UnifiedInteractionItem) => {
    if (!item.contact) return;
    const d = new Date(item.date);
    const formatted = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    setEditDate(formatted);
    setEditType(item.type === 'interaction' ? 'physical' : item.type);
    const initialText = item.notes && item.notes !== t('nu_vastleggen')
      ? item.notes
      : (item.title && item.title !== t('nu_vastleggen') && item.title !== 'Interactie vastgelegd' ? item.title : '');
    setEditNotes(initialText);
    setEditingContactItem({
      contact: item.contact,
      interactionId: item.interactionId || 'virtual-last'
    });
  };

  // Save edited 1-on-1 contact interaction
  const handleSaveContactInteraction = () => {
    if (!editingContactItem || !onUpdateContact) return;
    const { contact, interactionId } = editingContactItem;
    const selectedDateTime = new Date(editDate);
    const validDate = isNaN(selectedDateTime.getTime()) ? new Date() : selectedDateTime;
    const isoDate = validDate.toISOString();
    let updatedInteractions = [...(contact.interactions || [])];

    const savedNotes = editNotes.trim() || t('nu_vastleggen') || 'Interactie vastgelegd';

    if (interactionId && interactionId !== 'virtual-last') {
      updatedInteractions = updatedInteractions.map(i => 
        i.id === interactionId 
          ? { ...i, type: editType, date: isoDate, notes: savedNotes } 
          : i
      );
    } else {
      const newEntry: Interaction = { 
        id: `int-${Date.now()}`, 
        type: editType, 
        date: isoDate, 
        notes: savedNotes 
      };
      updatedInteractions = [newEntry, ...updatedInteractions];
    }

    const latestDate = [...updatedInteractions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date || '';
    onUpdateContact({
      ...contact,
      interactions: updatedInteractions,
      lastInteractionDate: latestDate,
      updatedAt: new Date().toISOString()
    });
    setEditingContactItem(null);
  };

  // Delete a 1-on-1 contact interaction
  const handleDeleteContactInteraction = (contact: Contact, interactionId: string) => {
    if (!onUpdateContact) return;
    let remaining = (contact.interactions || []).filter(i => i.id !== interactionId);
    if (interactionId === 'virtual-last') {
      const sorted = [...(contact.interactions || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (sorted.length > 0) {
        remaining = remaining.filter(i => i.id !== sorted[0].id);
      }
    }
    const sortedRemaining = [...remaining].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestDate = sortedRemaining[0]?.date || '';
    onUpdateContact({
      ...contact,
      interactions: remaining,
      lastInteractionDate: latestDate,
      updatedAt: new Date().toISOString()
    });
    setDeletingId(null);
  };

  return (
    <div className={`h-full flex flex-col p-4 sm:p-6 lg:p-8 space-y-6 overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <span>{t('events')}</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              isDark ? 'bg-slate-800 text-slate-300' : 'bg-blue-100 text-blue-800'
            }`}>
              {countAll}
            </span>
          </h2>
        </div>

        {onNewEvent && (
          <button 
            type="button"
            onClick={onNewEvent}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 shrink-0 self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>{t('newEvent')}</span>
          </button>
        )}
      </header>

      {/* Filter and Search Bar */}
      <div className="space-y-3 shrink-0">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Tabs */}
          <div className={`flex p-1 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} shadow-sm self-start flex-wrap`}>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? isDark ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{t('allInteractions')}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'all' ? 'bg-blue-700 text-white' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-600'
              }`}>
                {countAll}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('contacts')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'contacts'
                  ? isDark ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{t('contactInteractions')}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'contacts' ? 'bg-blue-700 text-white' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-600'
              }`}>
                {countContacts}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('events')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'events'
                  ? isDark ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{t('groupInteractions')}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'events' ? 'bg-blue-700 text-white' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-600'
              }`}>
                {countEvents}
              </span>
            </button>
          </div>

          {/* Search and Type Filter */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder={t('searchInteractions')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 text-xs rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-blue-500 ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Type selector */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label={t('allTypes')}
              className={`text-xs font-bold py-2 px-3 rounded-2xl border outline-none transition-all ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-gray-200 text-gray-700'
              }`}
            >
              <option value="all">{t('allTypes')}</option>
              <option value="physical">{t('physical')}</option>
              <option value="call">{t('call')}</option>
              <option value="app">{t('app')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Interaction List */}
      <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar space-y-4">
        {filteredInteractions.length === 0 ? (
          <div className={`p-12 text-center rounded-[2.5rem] border-2 border-dashed ${
            isDark ? 'bg-slate-900/40 border-slate-800 text-slate-500' : 'bg-white border-gray-200 text-gray-400'
          }`}>
            <Calendar size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold text-sm">{t('noInteractions')}</p>
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs text-blue-500 hover:underline font-bold"
              >
                {t('clearSearch')}
              </button>
            )}
          </div>
        ) : (
          filteredInteractions.map(item => {
            const isDeleting = deletingId === item.id;
            const isContactKind = item.kind === 'contact';
            const relativeTimeStr = getRelativeTime(item.date);

            return (
              <div 
                key={item.id}
                className={`p-5 sm:p-6 rounded-[2rem] border transition-all hover:shadow-md ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100 shadow-sm'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  {/* Avatar / Icon + Title */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      isContactKind
                        ? isDark ? 'bg-blue-900/30 text-blue-400 border border-blue-800/40' : 'bg-blue-50 text-blue-600 border border-blue-100'
                        : isDark ? 'bg-purple-900/30 text-purple-400 border border-purple-800/40' : 'bg-purple-50 text-purple-600 border border-purple-100'
                    }`}>
                      {isContactKind ? getInteractionIcon(item.type, 20) : <Users size={20} />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold break-words whitespace-normal leading-snug" title={item.title}>
                          {item.title}
                        </h3>

                        <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          isContactKind
                            ? isDark ? 'bg-blue-950 text-blue-400 border border-blue-900' : 'bg-blue-50 text-blue-700 border border-blue-100'
                            : isDark ? 'bg-purple-950 text-purple-400 border border-purple-900' : 'bg-purple-50 text-purple-700 border border-purple-100'
                        }`}>
                          {!isContactKind ? <Users size={11} className="shrink-0" /> : <UserCheck size={11} className="shrink-0" />}
                          <span>{isContactKind ? t('individualInteraction') : t('multiContactEvent')}</span>
                          {!isContactKind && item.contacts && item.contacts.length > 1 && (
                            <span className="opacity-80">({item.contacts.length})</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 font-medium flex-wrap">
                        <span>{new Date(item.date).toLocaleDateString()}</span>
                        {relativeTimeStr && (
                          <>
                            <span>•</span>
                            <span className={isDark ? 'text-slate-400' : 'text-gray-600'}>{relativeTimeStr}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Always visible Pencil and Delete */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                    {/* Interaction Type Badge */}
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                      isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {getInteractionIcon(item.type)}
                      <span>{t(item.type === 'phone' ? 'call' : item.type)}</span>
                    </span>

                    {/* Delete Confirmation Flow */}
                    {isDeleting ? (
                      <div className="flex items-center bg-red-600 text-white rounded-xl px-2.5 py-1 gap-1.5 text-xs font-bold animate-in fade-in zoom-in-95 duration-150 shadow-sm">
                        <span className="text-[10px] font-black uppercase">{t('deleteConfirm')}?</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (isContactKind && item.contact) {
                              handleDeleteContactInteraction(item.contact, item.interactionId || 'virtual-last');
                            } else if (item.rawEvent && onDeleteEvent) {
                              onDeleteEvent(item.rawEvent.id);
                              setDeletingId(null);
                            }
                          }}
                          title={t('deleteConfirm')}
                          className="bg-white text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          title={t('cancel')}
                          className="text-white p-1 hover:opacity-80 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {/* Potlood (Wijzigen) */}
                        <button
                          type="button"
                          onClick={() => {
                            if (isContactKind && item.contact) {
                              handleStartEditContact(item);
                            } else if (item.rawEvent) {
                              onEditEvent(item.rawEvent);
                            }
                          }}
                          title={t('edit')}
                          className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                            isDark 
                              ? 'bg-slate-800 border-slate-700 text-blue-400 hover:bg-slate-750 hover:text-blue-300' 
                              : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50'
                          }`}
                        >
                          <Edit2 size={13} className="text-blue-500" />
                          <span className="text-[11px]">{t('edit')}</span>
                        </button>

                        {/* Wis (Verwijderen) */}
                        <button
                          type="button"
                          onClick={() => setDeletingId(item.id)}
                          title={t('delete')}
                          className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
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

                {/* Notes content if different from title */}
                {item.notes && item.notes.trim() !== '' && item.notes.trim() !== item.title.trim() && item.notes !== t('nu_vastleggen') && (
                  <div className={`mt-3 p-3.5 rounded-2xl text-xs sm:text-sm whitespace-pre-wrap leading-relaxed ${
                    isDark ? 'bg-slate-800/40 text-slate-300 border border-slate-800' : 'bg-gray-50 text-gray-700 border border-gray-100'
                  }`}>
                    {item.notes}
                  </div>
                )}

                {/* Attendees list (Aanwezigen) - presented identically for both 1-on-1 and group interactions */}
                {item.contacts && item.contacts.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-dashed space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('attendees')}</p>
                    <div className="flex flex-wrap gap-2">
                      {item.contacts.map(contact => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => onContactClick(contact.id)}
                          className={`flex items-center gap-2 p-1.5 pr-3 rounded-full border text-xs font-bold transition-all active:scale-95 ${
                            isDark 
                              ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' 
                              : 'bg-white border-gray-200 hover:border-blue-300 text-gray-700 shadow-sm'
                          }`}
                        >
                          <img 
                            src={contact.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.firstName)}`} 
                            alt={contact.firstName}
                            className="w-5 h-5 rounded-full object-cover" 
                          />
                          <span>{contact.firstName} {contact.lastName || ''}</span>
                          <ChevronRight size={12} className="opacity-40" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal for editing 1-on-1 contact interaction */}
      {editingContactItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className={`p-6 rounded-3xl w-full max-w-sm shadow-2xl space-y-4 border animate-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-100 text-gray-900'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Edit2 size={16} className="text-blue-500" />
                <span>{t('interactionEdit')}</span>
              </h3>
              <button 
                type="button"
                onClick={() => setEditingContactItem(null)} 
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Relatie als aanwezige */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('attendees')}</label>
              <div className={`flex items-center gap-2 p-1.5 pr-3 rounded-full border text-xs font-bold w-fit ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}>
                <img 
                  src={editingContactItem.contact.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(editingContactItem.contact.firstName)}`} 
                  alt={editingContactItem.contact.firstName}
                  className="w-5 h-5 rounded-full object-cover" 
                />
                <span>{editingContactItem.contact.firstName} {editingContactItem.contact.lastName || ''}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase">{t('eventTitle')}</label>
              <textarea 
                value={editNotes} 
                onChange={e => setEditNotes(e.target.value)} 
                placeholder={t('recordNow')}
                rows={2} 
                className={`w-full p-2.5 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase">{t('date')}</label>
              <input 
                type="date" 
                value={editDate} 
                onChange={e => setEditDate(e.target.value)} 
                className={`w-full p-2.5 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase">{t('contactType')}</label>
              <div className="grid grid-cols-3 gap-2">
                {(['physical', 'call', 'app'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEditType(type === 'call' ? 'phone' : type)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      (editType === type || (type === 'call' && editType === 'phone'))
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    {getInteractionIcon(type === 'call' ? 'phone' : type)}
                    <span className="capitalize">{t(type)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="button"
                onClick={() => setEditingContactItem(null)} 
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs border ${
                  isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t('cancel')}
              </button>
              <button 
                type="button"
                onClick={handleSaveContactInteraction} 
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsView;
