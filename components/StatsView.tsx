import React, { useState, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { Contact, ContactType, Address, Event } from '../types.ts';
import { Activity, User, MapPin, PieChart as PieIcon, BarChart2, Users, AlertTriangle, RotateCcw } from 'lucide-react';
import WeeklyInteractionsChart from './WeeklyInteractionsChart.tsx';

interface StatsViewProps {
  contacts: Contact[];
  types: ContactType[];
  addresses: Address[];
  events?: Event[];
  t: (key: any) => string;
  theme?: string;
}

// Resilient Error Boundary to ensure stats never crash the page
interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
  isDark: boolean;
  retryText?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class StatsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("Stats error caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { isDark, fallbackMessage, retryText } = this.props;
      return (
        <div className={`p-8 rounded-3xl border text-center space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-gray-100 text-gray-800'
        }`}>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <AlertTriangle size={24} />
          </div>
          <p className="font-bold text-base">
            {fallbackMessage || "Grafiek kon niet worden geladen"}
          </p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm"
          >
            <RotateCcw size={14} />
            {retryText || "Opnieuw proberen"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Interactive SVG Donut Chart Component
interface DonutSlice {
  name: string;
  value: number;
  color: string;
  percent: number;
}

interface DonutChartProps {
  data: DonutSlice[];
  total: number;
  isDark: boolean;
  t: (key: any) => string;
}

const DonutChart: React.FC<DonutChartProps> = ({ data, total, isDark, t }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0 || total === 0) {
    return (
      <div className={`h-80 flex flex-col items-center justify-center rounded-2xl border border-dashed text-center p-6 ${
        isDark ? 'border-slate-800 text-slate-500 bg-slate-900/40' : 'border-gray-200 text-gray-400 bg-gray-50/50'
      }`}>
        <PieIcon size={40} className="mb-2 opacity-30" />
        <p className="text-sm font-semibold">{t('noDataTypes') || 'Nog geen contacten met een type ingedeeld.'}</p>
      </div>
    );
  }

  // Calculate SVG arc paths
  const cx = 100;
  const cy = 100;
  const baseOuterR = 80;
  const baseInnerR = 52;

  let cumulativeAngle = 0;

  const paths = data.map((slice, index) => {
    const isHovered = hoveredIdx === index;
    const outerR = isHovered ? baseOuterR + 4 : baseOuterR;
    const innerR = isHovered ? baseInnerR - 2 : baseInnerR;

    const angle = (slice.value / total) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    // Convert angles to radians (SVG coordinates start from top = -90deg)
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    // Handle full 360 circle or near-full slice
    if (angle >= 359.9) {
      return {
        path: `M ${cx} ${cy - outerR} A ${outerR} ${outerR} 0 1 1 ${cx} ${cy + outerR} A ${outerR} ${outerR} 0 1 1 ${cx} ${cy - outerR} M ${cx} ${cy - innerR} A ${innerR} ${innerR} 0 1 0 ${cx} ${cy + innerR} A ${innerR} ${innerR} 0 1 0 ${cx} ${cy - innerR} Z`,
        slice,
        index,
        isHovered
      };
    }

    const x1_outer = cx + outerR * Math.cos(startRad);
    const y1_outer = cy + outerR * Math.sin(startRad);
    const x2_outer = cx + outerR * Math.cos(endRad);
    const y2_outer = cy + outerR * Math.sin(endRad);

    const x1_inner = cx + innerR * Math.cos(startRad);
    const y1_inner = cy + innerR * Math.sin(startRad);
    const x2_inner = cx + innerR * Math.cos(endRad);
    const y2_inner = cy + innerR * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${x1_outer} ${y1_outer}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2_outer} ${y2_outer}`,
      `L ${x2_inner} ${y2_inner}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x1_inner} ${y1_inner}`,
      'Z'
    ].join(' ');

    return {
      path: pathData,
      slice,
      index,
      isHovered
    };
  });

  const activeSlice = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="flex flex-col items-center">
      {/* SVG Donut */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72">
        <svg 
          viewBox="0 0 200 200" 
          className="w-full h-full transform transition-transform filter drop-shadow-sm"
        >
          <g>
            {paths.map(({ path, slice, index, isHovered }) => (
              <path
                key={`slice-${index}`}
                d={path}
                fill={slice.color}
                stroke={isDark ? '#0f172a' : '#ffffff'}
                strokeWidth={paths.length > 1 ? 2.5 : 0}
                className="cursor-pointer transition-all duration-200"
                style={{
                  opacity: hoveredIdx !== null && !isHovered ? 0.45 : 1,
                  filter: isHovered ? 'brightness(1.08)' : 'none'
                }}
                onMouseEnter={() => setHoveredIdx(index)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            ))}
          </g>
        </svg>

        {/* Center content */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-200"
          style={{ padding: '24%' }}
        >
          {activeSlice ? (
            <div className="text-center animate-in fade-in zoom-in-95 duration-150">
              <span 
                className="inline-block w-2.5 h-2.5 rounded-full mb-1" 
                style={{ backgroundColor: activeSlice.color }} 
              />
              <p className="text-xs font-bold truncate max-w-[120px]" title={activeSlice.name}>
                {activeSlice.name}
              </p>
              <p className="text-2xl font-black tracking-tight" style={{ color: activeSlice.color }}>
                {activeSlice.value}
              </p>
              <p className="text-[10px] font-bold text-gray-400">
                {activeSlice.percent}% {t('ofTotal') || 'van totaal'}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <Users size={18} className="mx-auto text-gray-400 mb-0.5" />
              <p className="text-2xl font-black tracking-tight">{total}</p>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                {t('totalContactsLabel') || 'Totaal'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Legend */}
      <div className="w-full mt-6 grid grid-cols-2 gap-2.5 sm:gap-3">
        {data.map((item, idx) => {
          const isSelected = hoveredIdx === idx;
          return (
            <div
              key={`legend-${idx}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                isSelected
                  ? isDark 
                    ? 'bg-slate-800 border-slate-700 shadow-md scale-[1.02]' 
                    : 'bg-white border-blue-200 shadow-md scale-[1.02]'
                  : isDark 
                    ? 'bg-slate-850/40 border-slate-800/80 hover:bg-slate-800/60' 
                    : 'bg-gray-50/70 border-gray-100 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span 
                  className="w-3 h-3 rounded-full shrink-0 shadow-xs" 
                  style={{ backgroundColor: item.color }} 
                />
                <span className="text-xs font-bold truncate" title={item.name}>
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span className="text-xs font-black">{item.value}</span>
                <span className="text-[10px] font-bold text-gray-400">({item.percent}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Resilient Bar Chart Component for Top Locations
interface LocationItem {
  city: string;
  count: number;
}

interface LocationBarChartProps {
  data: LocationItem[];
  totalWithCity: number;
  isDark: boolean;
  t: (key: any) => string;
}

const LocationBarChart: React.FC<LocationBarChartProps> = ({ data, totalWithCity, isDark, t }) => {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  if (data.length === 0 || totalWithCity === 0) {
    return (
      <div className={`h-80 flex flex-col items-center justify-center rounded-2xl border border-dashed text-center p-6 ${
        isDark ? 'border-slate-800 text-slate-500 bg-slate-900/40' : 'border-gray-200 text-gray-400 bg-gray-50/50'
      }`}>
        <MapPin size={40} className="mb-2 opacity-30" />
        <p className="text-sm font-semibold">{t('noDataCities') || 'Nog geen contacten met een bekende woonplaats.'}</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="space-y-4 pt-1">
      {data.map((item, idx) => {
        const percentOfMax = Math.round((item.count / maxCount) * 100);
        const percentOfTotal = Math.round((item.count / totalWithCity) * 100);
        const isHovered = hoveredCity === item.city;

        // Visual rank badge colors
        const rankColors = [
          'bg-amber-500 text-white',
          'bg-slate-400 text-white',
          'bg-amber-700/80 text-white'
        ];
        const rankColor = idx < 3 ? rankColors[idx] : isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-200 text-gray-600';

        return (
          <div
            key={`city-${item.city}`}
            onMouseEnter={() => setHoveredCity(item.city)}
            onMouseLeave={() => setHoveredCity(null)}
            className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
              isHovered
                ? isDark 
                  ? 'bg-slate-800/80 border-blue-500/40 shadow-md' 
                  : 'bg-white border-blue-200 shadow-md'
                : isDark 
                  ? 'bg-slate-850/40 border-slate-800/80' 
                  : 'bg-gray-50/60 border-gray-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${rankColor}`}>
                  {idx + 1}
                </span>
                <MapPin size={15} className="text-blue-500 shrink-0" />
                <span className="text-sm font-bold truncate text-slate-800 dark:text-slate-100" title={item.city}>
                  {item.city}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-sm font-black text-blue-500">{item.count}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {item.count === 1 ? t('contactsCountSingle') : t('contactsCountPlural')}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-200 text-gray-700'
                }`}>
                  {percentOfTotal}%
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-gray-200/80'}`}>
              <div
                className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600"
                style={{
                  width: `${percentOfMax}%`,
                  filter: isHovered ? 'brightness(1.15)' : 'none'
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Main StatsView Component
const StatsView: React.FC<StatsViewProps> = ({ contacts, types, addresses, events = [], t, theme }) => {
  const isDark = theme === 'dark';

  // Process contact types data with percentages
  const { typeData, totalTypedContacts } = useMemo(() => {
    const rawList = types
      .map(t_obj => {
        const count = contacts.filter(c => c && c.typeId === t_obj.id).length;
        return {
          name: t(t_obj.name as any) || t_obj.name,
          value: count,
          color: t_obj.color || '#3b82f6'
        };
      })
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);

    const sum = rawList.reduce((acc, curr) => acc + curr.value, 0);

    const listWithPercent: DonutSlice[] = rawList.map(item => ({
      ...item,
      percent: sum > 0 ? Math.round((item.value / sum) * 100) : 0
    }));

    return {
      typeData: listWithPercent,
      totalTypedContacts: sum
    };
  }, [contacts, types, t]);

  // Process locations data
  const { cityData, totalWithCity } = useMemo(() => {
    const counts: Record<string, number> = {};
    let validCount = 0;

    contacts.forEach(c => {
      if (!c) return;
      const addr = addresses.find(a => a && a.id === c.addressId);
      const city = (addr && addr.city && addr.city.trim() !== '') ? addr.city.trim() : (t('unknownCity') || 'Onbekend');
      counts[city] = (counts[city] || 0) + 1;
      validCount++;
    });

    const sortedList: LocationItem[] = Object.entries(counts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      cityData: sortedList,
      totalWithCity: validCount
    };
  }, [contacts, addresses, t]);

  // Top 10 interactions in last 180 days
  const topInteractions180Data = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 180);

    return contacts
      .filter(Boolean)
      .map(c => {
        const recentInteractions = (c.interactions || []).filter(i => {
          if (!i || !i.date) return false;
          const d = new Date(i.date);
          return !isNaN(d.getTime()) && d >= cutoff;
        });

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
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-24">
        
        {/* Weekly Interactions Chart (Top of page) */}
        <StatsErrorBoundary isDark={isDark} fallbackMessage={t('chartErrorFallback')} retryText={t('tryAgain')}>
          <WeeklyInteractionsChart 
            contacts={contacts}
            events={events}
            isDark={isDark}
            t={t}
          />
        </StatsErrorBoundary>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          
          {/* Contact Types Donut Chart */}
          <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'} p-5 sm:p-7 lg:p-8 rounded-3xl border shadow-sm flex flex-col`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${isDark ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                  <PieIcon size={20} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold">{t('contactType')}</h3>
                  <p className="text-xs text-gray-400 font-medium">
                    {t('distributionContactTypes') || 'Verdeling per categorie'}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600'
              }`}>
                {totalTypedContacts} {t('totalContactsLabel') || 'Totaal'}
              </span>
            </div>

            <StatsErrorBoundary isDark={isDark} fallbackMessage={t('chartErrorFallback')} retryText={t('tryAgain')}>
              <DonutChart 
                data={typeData} 
                total={totalTypedContacts} 
                isDark={isDark} 
                t={t} 
              />
            </StatsErrorBoundary>
          </div>

          {/* Top Locations Bar Chart */}
          <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'} p-5 sm:p-7 lg:p-8 rounded-3xl border shadow-sm flex flex-col`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${isDark ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                  <BarChart2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold">{t('topLocations')}</h3>
                  <p className="text-xs text-gray-400 font-medium">
                    {t('topLocationsSubtitle')}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600'
              }`}>
                Top {cityData.length}
              </span>
            </div>

            <StatsErrorBoundary isDark={isDark} fallbackMessage={t('chartErrorFallback')} retryText={t('tryAgain')}>
              <LocationBarChart 
                data={cityData} 
                totalWithCity={totalWithCity} 
                isDark={isDark} 
                t={t} 
              />
            </StatsErrorBoundary>
          </div>

          {/* Top 10 Interactions (180 days) */}
          <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'} lg:col-span-2 p-5 sm:p-7 lg:p-8 rounded-3xl border shadow-sm`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${isDark ? 'bg-purple-900/30 text-purple-400 border border-purple-800/50' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold">{t('topInteractions180')}</h3>
                  <p className="text-xs text-gray-400 font-medium">
                    {t('topInteractions180Subtitle')}
                  </p>
                </div>
              </div>
              {topInteractions180Data.length > 0 && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600'
                }`}>
                  {topInteractions180Data.length} {t('relationsCount')}
                </span>
              )}
            </div>
            
            <div className="space-y-3">
              {topInteractions180Data.length > 0 ? (
                topInteractions180Data.map((c, idx) => {
                  const typeColor = types.find(t_obj => t_obj.id === c.typeId)?.color || '#3b82f6';
                  const typeName = types.find(t_obj => t_obj.id === c.typeId)?.name || '';

                  return (
                    <div 
                      key={c.id} 
                      className={`${
                        isDark 
                          ? 'bg-slate-850/40 border-slate-800/80 hover:bg-slate-800' 
                          : 'bg-gray-50/70 border-gray-100 hover:bg-white'
                      } flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border hover:shadow-md transition-all group`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="text-base sm:text-lg font-black text-gray-400/60 w-5 sm:w-6 shrink-0 text-center">
                          {idx + 1}
                        </div>
                        <img 
                          src={c.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.firstName || '')}+${encodeURIComponent(c.lastName || '')}`} 
                          alt={`${c.firstName} ${c.lastName}`}
                          className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl object-cover border-2 shadow-xs shrink-0"
                          style={{ borderColor: typeColor }}
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-sm sm:text-base group-hover:text-blue-500 transition-colors truncate">
                            {c.firstName} {c.lastName}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 truncate">
                            {t(typeName as any) || typeName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <div className="text-right">
                          <p className="text-base sm:text-lg font-black text-blue-500">{c.interactionCount}</p>
                          <p className="text-[9px] font-black uppercase tracking-tighter text-gray-400">
                            {c.interactionCount === 1 ? t('interactionUnitSingle') : t('interactionsUnit')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={`text-center py-12 text-gray-400 rounded-2xl border border-dashed ${
                  isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-gray-50/50 border-gray-200'
                }`}>
                  <User size={36} className="mx-auto mb-2 opacity-20" />
                  <p className="font-bold text-sm">{t('noInteractionsInPeriod')}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('recordInteractionsHint')}</p>
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
