import React, { useState, useMemo } from 'react';
import { Contact, Event, InteractionMode } from '../types.ts';
import { BarChart2, Users, Smartphone, Phone, MessageSquare, ArrowUpDown, Filter } from 'lucide-react';

interface WeeklyInteractionsChartProps {
  contacts: Contact[];
  events?: Event[];
  isDark: boolean;
  t: (key: any) => string;
}

type PeriodOption = '1m' | '3m' | '6m' | '12m';
type SortOrder = 'newest' | 'oldest';

interface UnifiedInteraction {
  id: string;
  date: string;
  timestamp: number;
  type: InteractionMode;
  kind: 'contact' | 'event';
  title: string;
  contactNames: string[];
}

interface WeekSlot {
  index: number;
  weekNum: number;
  year: number;
  start: Date;
  end: Date;
  count: number;
  interactions: UnifiedInteraction[];
  isCurrentWeek: boolean;
  label: string;
  dateRangeLabel: string;
}

function getMondayOfCurrentWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getISOWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

const PERIOD_CONFIG: Record<PeriodOption, { labelKey: string; defaultLabel: string; weeks: number }> = {
  '1m': { labelKey: 'period1Month', defaultLabel: 'Afgelopen maand', weeks: 5 },
  '3m': { labelKey: 'period3Months', defaultLabel: '3 maanden', weeks: 13 },
  '6m': { labelKey: 'period6Months', defaultLabel: '6 maanden', weeks: 26 },
  '12m': { labelKey: 'period12Months', defaultLabel: '12 maanden', weeks: 52 },
};

const WeeklyInteractionsChart: React.FC<WeeklyInteractionsChartProps> = ({
  contacts,
  events = [],
  isDark,
  t
}) => {
  // Default to 6 months as requested
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('6m');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [onlyWithInteractions, setOnlyWithInteractions] = useState(false);
  const [activeWeekKey, setActiveWeekKey] = useState<string | null>(null);

  // 1. Unify all interactions (1-on-1 + group events) avoiding double counts
  const allInteractions = useMemo(() => {
    const list: UnifiedInteraction[] = [];

    const isPartOfEvent = (contactId: string, item: { id?: string; date?: string }) => {
      return events.some(event => {
        const isContactInEvent = (event.contactIds || []).includes(contactId);
        if (!isContactInEvent) return false;

        if (item.id && (item.id.startsWith(`int-${event.id}`) || item.id.includes(event.id))) {
          return true;
        }
        if (item.date && event.date) {
          const itemTime = new Date(item.date).getTime();
          const eventTime = new Date(event.date).getTime();
          if (!isNaN(itemTime) && !isNaN(eventTime) && Math.abs(itemTime - eventTime) < 60000) {
            return true;
          }
          if (item.date.split('T')[0] === event.date.split('T')[0]) {
            return true;
          }
        }
        return false;
      });
    };

    // Add group events
    events.forEach(event => {
      const d = new Date(event.date);
      const timestamp = d.getTime();
      if (isNaN(timestamp)) return;

      const attendeeNames = (event.contactIds || [])
        .map(cid => {
          const c = contacts.find(contact => contact.id === cid);
          return c ? `${c.firstName} ${c.lastName || ''}`.trim() : '';
        })
        .filter(Boolean);

      list.push({
        id: `event-${event.id}`,
        date: event.date,
        timestamp,
        type: event.type || 'physical',
        kind: 'event',
        title: event.title || (t('groupInteractionFallback') || 'Groepsinteractie'),
        contactNames: attendeeNames
      });
    });

    // Add 1-on-1 contact interactions
    contacts.forEach(contact => {
      const contactInteractions = contact.interactions || [];

      contactInteractions.forEach(item => {
        if (isPartOfEvent(contact.id, item)) return;

        const d = new Date(item.date);
        const timestamp = d.getTime();
        if (isNaN(timestamp)) return;

        const rawNotes = item.notes?.trim();
        const displayTitle = (rawNotes && rawNotes !== '') 
          ? rawNotes 
          : (t('nu_vastleggen') || 'Interactie vastgelegd');

        list.push({
          id: `contact-${contact.id}-${item.id}`,
          date: item.date,
          timestamp,
          type: item.type || 'physical',
          kind: 'contact',
          title: displayTitle,
          contactNames: [`${contact.firstName} ${contact.lastName || ''}`.trim()]
        });
      });

      // Legacy fallback: lastInteractionDate if not in interactions array
      if (contact.lastInteractionDate && contact.lastInteractionDate.trim() !== '') {
        const d = new Date(contact.lastInteractionDate);
        const timestamp = d.getTime();
        if (!isNaN(timestamp)) {
          const lastDateStr = d.toLocaleDateString();
          const alreadyInList = contactInteractions.some(i => {
            try { return new Date(i.date).toLocaleDateString() === lastDateStr; } catch { return false; }
          });
          const isFromEvent = isPartOfEvent(contact.id, { id: 'virtual-last', date: contact.lastInteractionDate });

          if (!alreadyInList && !isFromEvent) {
            list.push({
              id: `virtual-${contact.id}`,
              date: contact.lastInteractionDate,
              timestamp,
              type: 'physical',
              kind: 'contact',
              title: t('nu_vastleggen') || 'Interactie vastgelegd',
              contactNames: [`${contact.firstName} ${contact.lastName || ''}`.trim()]
            });
          }
        }
      }
    });

    return list;
  }, [contacts, events, t]);

  // 2. Generate week slots according to selected period
  const { weekSlots, totalInPeriod, avgPerWeek, busiestWeek, activeWeeksCount } = useMemo(() => {
    const numWeeks = PERIOD_CONFIG[selectedPeriod].weeks;
    const currentMonday = getMondayOfCurrentWeek();
    const slots: WeekSlot[] = [];

    let total = 0;
    let activeWeeks = 0;
    let maxSlot: WeekSlot | null = null;

    for (let i = numWeeks - 1; i >= 0; i--) {
      const start = new Date(currentMonday);
      start.setDate(currentMonday.getDate() - (i * 7));
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const startTime = start.getTime();
      const endTime = end.getTime();

      const weekNum = getISOWeekNumber(start);
      const year = start.getFullYear();

      const matchingInteractions = allInteractions.filter(
        int => int.timestamp >= startTime && int.timestamp <= endTime
      );

      const count = matchingInteractions.length;
      total += count;
      if (count > 0) activeWeeks++;

      const isCurrentWeek = i === 0;
      const startStr = start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      const endStr = end.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

      const slot: WeekSlot = {
        index: numWeeks - 1 - i,
        weekNum,
        year,
        start,
        end,
        count,
        interactions: matchingInteractions,
        isCurrentWeek,
        label: `W${weekNum}`,
        dateRangeLabel: `${startStr} - ${endStr}`
      };

      if (!maxSlot || count > maxSlot.count) {
        maxSlot = slot;
      }

      slots.push(slot);
    }

    return {
      weekSlots: slots,
      totalInPeriod: total,
      avgPerWeek: (total / numWeeks).toFixed(1),
      busiestWeek: maxSlot && maxSlot.count > 0 ? maxSlot : null,
      activeWeeksCount: activeWeeks
    };
  }, [selectedPeriod, allInteractions]);

  // Max count for chart scaling (minimum 4 to preserve pleasing scale)
  const maxCount = useMemo(() => {
    const highest = Math.max(...weekSlots.map(w => w.count), 0);
    return Math.max(highest, 4);
  }, [weekSlots]);

  // Calculate clean X-axis step intervals (e.g. 0, 2, 4, 6...)
  const xAxisTicks = useMemo(() => {
    const ticks: number[] = [0];
    let step = 1;
    if (maxCount > 20) step = 5;
    else if (maxCount > 10) step = 2;
    else if (maxCount > 5) step = 2;
    else step = 1;

    for (let val = step; val <= maxCount; val += step) {
      ticks.push(val);
    }
    if (ticks[ticks.length - 1] < maxCount) {
      ticks.push(maxCount);
    }
    return ticks;
  }, [maxCount]);

  // Sorted and filtered week slots for horizontal display (Y-axis = weeks)
  const displayedSlots = useMemo(() => {
    let list = [...weekSlots];
    if (sortOrder === 'newest') {
      list.reverse(); // Current/most recent week at the top
    }
    if (onlyWithInteractions) {
      list = list.filter(w => w.count > 0);
    }
    return list;
  }, [weekSlots, sortOrder, onlyWithInteractions]);

  // Determine which week details to display in the inspect panel below
  const displayedWeek = useMemo(() => {
    if (activeWeekKey) {
      const found = weekSlots.find(w => `${w.year}-${w.weekNum}` === activeWeekKey);
      if (found) return found;
    }
    // Default to busiest week if available, otherwise current week (last slot)
    if (busiestWeek) return busiestWeek;
    return weekSlots[weekSlots.length - 1];
  }, [activeWeekKey, weekSlots, busiestWeek]);

  const getModeIcon = (mode: InteractionMode) => {
    switch(mode) {
      case 'physical': return <Users size={12} />;
      case 'app': return <Smartphone size={12} />;
      case 'phone': return <Phone size={12} />;
      default: return <MessageSquare size={12} />;
    }
  };

  return (
    <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'} p-5 sm:p-7 lg:p-8 rounded-3xl border shadow-sm flex flex-col space-y-6`}>
      {/* Header: Title & Period Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl ${
            isDark ? 'bg-indigo-900/30 text-indigo-400 border border-indigo-800/50' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
          }`}>
            <BarChart2 size={22} />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold">
              {t('interactionsPerWeek') || 'Interacties per week'}
            </h3>
            <p className="text-xs text-gray-400 font-medium">
              {t('interactionsPerWeekDesc') || 'Aantal contactmomenten per week in de geselecteerde periode'}
            </p>
          </div>
        </div>

        {/* Period Selector: 1m, 3m, 6m (default), 12m */}
        <div className={`flex items-center p-1 rounded-2xl border self-start md:self-auto ${
          isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-gray-100/90 border-gray-200/80'
        }`}>
          {(['1m', '3m', '6m', '12m'] as PeriodOption[]).map((period) => {
            const config = PERIOD_CONFIG[period];
            const isSelected = selectedPeriod === period;
            return (
              <button
                key={period}
                type="button"
                onClick={() => {
                  setSelectedPeriod(period);
                  setActiveWeekKey(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? isDark
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-blue-600 shadow-sm border border-gray-200/50'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                }`}
              >
                {t(config.labelKey) || config.defaultLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Totaal in periode */}
        <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-850/40 border-slate-800' : 'bg-gray-50/70 border-gray-100'
        }`}>
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
            {t('totalInPeriod') || 'Totaal in periode'}
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-2xl font-black text-blue-500">{totalInPeriod}</span>
            <span className="text-[11px] font-bold text-gray-400">
              {totalInPeriod === 1 ? (t('interactionUnitSingle') || 'interactie') : (t('interactionsUnit') || 'interacties')}
            </span>
          </div>
        </div>

        {/* Gemiddeld per week */}
        <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-850/40 border-slate-800' : 'bg-gray-50/70 border-gray-100'
        }`}>
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
            {t('avgPerWeek') || 'Gemiddeld per week'}
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-2xl font-black text-indigo-500">{avgPerWeek}</span>
            <span className="text-[11px] font-bold text-gray-400">/ week</span>
          </div>
        </div>

        {/* Drukste week */}
        <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-850/40 border-slate-800' : 'bg-gray-50/70 border-gray-100'
        }`}>
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
            {t('busiestWeek') || 'Drukste week'}
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            {busiestWeek ? (
              <>
                <span className="text-xl sm:text-2xl font-black text-purple-500">W{busiestWeek.weekNum}</span>
                <span className="text-[11px] font-bold text-gray-400">({busiestWeek.count}x)</span>
              </>
            ) : (
              <span className="text-sm font-bold text-gray-400">-</span>
            )}
          </div>
        </div>

        {/* Actieve weken */}
        <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-850/40 border-slate-800' : 'bg-gray-50/70 border-gray-100'
        }`}>
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
            {t('activeWeeks') || 'Weken met contact'}
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-2xl font-black text-emerald-500">{activeWeeksCount}</span>
            <span className="text-[11px] font-bold text-gray-400">/ {weekSlots.length}</span>
            <span className="text-[10px] font-bold text-gray-400">
              ({weekSlots.length > 0 ? Math.round((activeWeeksCount / weekSlots.length) * 100) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar: View options (Sort order & Active filter) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-gray-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          {/* Sort order toggle */}
          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isDark 
                ? 'bg-slate-800/70 border-slate-700/70 text-slate-300 hover:bg-slate-800' 
                : 'bg-gray-50 border-gray-200/80 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ArrowUpDown size={13} className="text-blue-500" />
            <span>
              {sortOrder === 'newest' 
                ? (t('sortNewestFirst') || 'Nieuwste eerst') 
                : (t('sortOldestFirst') || 'Oudste eerst')}
            </span>
          </button>

          {/* Filter only active weeks */}
          <button
            type="button"
            onClick={() => setOnlyWithInteractions(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              onlyWithInteractions
                ? isDark
                  ? 'bg-blue-950/70 border-blue-700/80 text-blue-300'
                  : 'bg-blue-50 border-blue-200 text-blue-700 font-bold'
                : isDark
                  ? 'bg-slate-800/70 border-slate-700/70 text-slate-400 hover:text-slate-300'
                  : 'bg-gray-50 border-gray-200/80 text-gray-600 hover:text-gray-900'
            }`}
          >
            <Filter size={12} className={onlyWithInteractions ? 'text-blue-500' : 'text-gray-400'} />
            <span>{(t('onlyActiveWeeks') || 'Alleen actieve weken')} ({activeWeeksCount})</span>
          </button>
        </div>

        <div className="text-[11px] text-gray-400 font-medium">
          {(t('chartAxesLegend') || 'Y-as: Weken • X-as: Aantal interacties • {count} weken weergegeven').replace('{count}', String(displayedSlots.length))}
        </div>
      </div>

      {/* Main Horizontal Bar Chart (Y-axis = Weeks, X-axis = Interaction Count) */}
      <div className="space-y-2">
        {/* X-Axis Scale Indicator & Grid Header at Top */}
        <div className="flex items-center pl-24 sm:pl-32 pr-4 text-[10px] font-bold text-gray-400">
          <div className="relative w-full flex justify-between items-center py-1">
            {xAxisTicks.map((tick) => {
              const leftPercent = (tick / maxCount) * 100;
              return (
                <div
                  key={`tick-${tick}`}
                  className="flex flex-col items-center -translate-x-1/2"
                  style={{ position: 'absolute', left: `${leftPercent}%` }}
                >
                  <span>{tick}</span>
                  <div className={`h-1.5 w-px ${isDark ? 'bg-slate-700' : 'bg-gray-300'} mt-0.5`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable container for rows to ensure responsive layout on all screen sizes */}
        <div className="max-h-[500px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar space-y-3.5 py-1">
          {displayedSlots.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              {t('noWeeklyData') || 'Geen interacties gevonden in deze periode'}
            </div>
          ) : (
            displayedSlots.map((slot) => {
              const weekKey = `${slot.year}-${slot.weekNum}`;
              const isSelected = displayedWeek && `${displayedWeek.year}-${displayedWeek.weekNum}` === weekKey;
              const barWidthPercent = slot.count > 0 
                ? Math.max((slot.count / maxCount) * 100, 3) 
                : 0;

              return (
                <div
                  key={`slot-${weekKey}`}
                  onClick={() => setActiveWeekKey(weekKey)}
                  className={`group rounded-2xl p-2.5 sm:p-3 transition-all cursor-pointer border ${
                    isSelected
                      ? isDark 
                        ? 'bg-slate-800/90 border-blue-500/70 shadow-md ring-1 ring-blue-500/40' 
                        : 'bg-blue-50/70 border-blue-300 shadow-sm ring-1 ring-blue-300/40'
                      : isDark
                        ? 'bg-slate-850/40 border-slate-800/60 hover:bg-slate-800/60 hover:border-slate-700'
                        : 'bg-gray-50/50 border-gray-100 hover:bg-gray-100/70 hover:border-gray-200'
                  }`}
                >
                  {/* Top Line: Number is clearly shown ABOVE the bar on every single week! */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {/* Left: Week & Date range */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-black tracking-wide ${
                        isSelected 
                          ? isDark ? 'text-blue-400' : 'text-blue-600'
                          : isDark ? 'text-slate-200' : 'text-gray-800'
                      }`}>
                        Week {slot.weekNum}
                      </span>

                      {slot.isCurrentWeek && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isDark 
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {t('currentWeekBadge') || 'Nu'}
                        </span>
                      )}

                      <span className="text-[11px] text-gray-400 truncate">
                        {slot.dateRangeLabel} {slot.year}
                      </span>
                    </div>

                    {/* Right: Exact count shown ABOVE the bar */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                        {t('countColon') || 'Aantal:'}
                      </span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-lg transition-all ${
                        slot.count > 0
                          ? isDark
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-blue-600 text-white shadow-xs'
                          : isDark
                            ? 'bg-slate-800 text-slate-500'
                            : 'bg-gray-200/80 text-gray-500'
                      }`}>
                        {slot.count}
                      </span>
                    </div>
                  </div>

                  {/* Chart Row: Y-axis vertical line & Horizontal bar along X-axis */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Y-axis label */}
                    <div className="w-12 sm:w-16 shrink-0 text-right pr-2 text-[11px] font-bold text-gray-400">
                      {slot.label}
                    </div>

                    {/* Y-Axis Line: All bars start cleanly aligned right on this axis! */}
                    <div className={`w-[2px] self-stretch rounded-full ${
                      slot.isCurrentWeek 
                        ? 'bg-emerald-500' 
                        : isDark ? 'bg-slate-700' : 'bg-gray-300'
                    }`} />

                    {/* Horizontal Bar Track along X-axis */}
                    <div className="relative flex-1 h-5 sm:h-6 rounded-lg bg-gray-100/90 dark:bg-slate-800/80 overflow-hidden flex items-center">
                      {/* Subtle vertical grid lines behind the bar */}
                      {xAxisTicks.map((tick) => {
                        if (tick === 0) return null;
                        const leftPercent = (tick / maxCount) * 100;
                        return (
                          <div
                            key={`grid-${slot.year}-${slot.weekNum}-${tick}`}
                            className={`absolute top-0 bottom-0 w-px ${
                              isDark ? 'bg-slate-700/40' : 'bg-gray-200/70'
                            }`}
                            style={{ left: `${leftPercent}%` }}
                          />
                        );
                      })}

                      {/* Filled horizontal bar */}
                      {slot.count > 0 ? (
                        <div
                          style={{ width: `${barWidthPercent}%` }}
                          className={`h-full rounded-r-lg transition-all duration-500 ease-out flex items-center justify-end pr-2 ${
                            slot.isCurrentWeek
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-400 shadow-xs'
                              : isSelected
                                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 shadow-xs'
                                : 'bg-gradient-to-r from-blue-600/90 to-indigo-500/90 group-hover:from-blue-600 group-hover:to-indigo-500'
                          }`}
                        >
                          {/* Inner number display if bar is wide enough */}
                          {barWidthPercent > 18 && (
                            <span className="text-[10px] font-black text-white drop-shadow-xs">
                              {slot.count}
                            </span>
                          )}
                        </div>
                      ) : (
                        /* Zero indicator marker */
                        <div className="w-1.5 h-full bg-transparent" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* X-Axis Baseline Scale Indicator at Bottom */}
        <div className="flex items-center pl-24 sm:pl-32 pr-4 text-[10px] font-bold text-gray-400 pt-1">
          <div className="relative w-full flex justify-between items-center">
            {xAxisTicks.map((tick) => {
              const leftPercent = (tick / maxCount) * 100;
              return (
                <div
                  key={`btick-${tick}`}
                  className="flex flex-col items-center -translate-x-1/2"
                  style={{ position: 'absolute', left: `${leftPercent}%` }}
                >
                  <div className={`h-1.5 w-px ${isDark ? 'bg-slate-700' : 'bg-gray-300'} mb-0.5`} />
                  <span>{tick}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Week Details Inspection Card */}
      {displayedWeek && (
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-850/60 border-slate-800' : 'bg-blue-50/40 border-blue-100/80'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                displayedWeek.isCurrentWeek
                  ? isDark ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : isDark ? 'bg-blue-950 text-blue-400 border border-blue-800' : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                Week {displayedWeek.weekNum}
                {displayedWeek.isCurrentWeek && ` • ${t('currentWeekBadge') || 'Nu'}`}
              </span>
              <span className="text-xs font-semibold text-gray-400">
                {displayedWeek.dateRangeLabel} {displayedWeek.year}
              </span>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-bold text-gray-500">
                {t('numberOfInteractionsColon') || 'Aantal interacties:'}
              </span>
              <span className={`text-sm font-black px-2.5 py-0.5 rounded-lg ${
                displayedWeek.count > 0
                  ? 'text-white bg-blue-600'
                  : 'text-gray-400 bg-gray-100 dark:bg-slate-800'
              }`}>
                {displayedWeek.count}
              </span>
            </div>
          </div>

          {/* List of interactions in this week */}
          {displayedWeek.interactions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {displayedWeek.interactions.map(item => (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                    isDark ? 'bg-slate-800/80 border-slate-700/70 text-slate-200' : 'bg-white border-gray-200/70 text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`p-1.5 rounded-lg shrink-0 ${
                      item.kind === 'event'
                        ? isDark ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-50 text-purple-600'
                        : isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {getModeIcon(item.type)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold truncate text-xs" title={item.title}>
                        {item.title}
                      </p>
                      {item.contactNames.length > 0 && (
                        <p className="text-[10px] text-gray-400 truncate">
                          {item.contactNames.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] text-gray-400 shrink-0 font-medium">
                    {new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic mt-1">
              {t('noInteractionsThisWeek') || 'Geen interacties vastgelegd in deze week.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default WeeklyInteractionsChart;
