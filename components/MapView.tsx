
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Contact, Address, ContactType } from '../types.ts';
import { Plus, User, Phone } from 'lucide-react';
import { cleanPhoneNumber, dialPhoneNumber } from '../utils.ts';

interface MapViewProps {
  contacts: Contact[];
  addresses: Address[];
  types: ContactType[];
  onContactClick: (id: string) => void;
  onMapClick: (coords: [number, number]) => void;
  onAddResident: (addressId: string) => void;
  onCall?: (contact: Contact, phoneNumber?: string, e?: React.MouseEvent | React.TouchEvent) => void;
  t: (key: any) => string;
  theme?: string;
}

const MapEvents = ({ onMapClick }: { onMapClick: (coords: [number, number]) => void }) => {
  useMapEvents({
    click(e) {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

const MapResizeHandler = () => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => map.invalidateSize(), 250);
    
    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [map]);
  return null;
};

const MapBoundsHandler = ({ addresses }: { addresses: Address[] }) => {
  const map = useMap();
  useEffect(() => {
    if (addresses.length === 0) return;
    const validAddresses = addresses.filter(
      a => typeof a.lat === 'number' && typeof a.lng === 'number' && !isNaN(a.lat) && !isNaN(a.lng)
    );
    if (validAddresses.length === 0) return;

    if (validAddresses.length === 1) {
      map.flyTo([validAddresses[0].lat, validAddresses[0].lng], 13);
    } else {
      const bounds = L.latLngBounds(validAddresses.map(a => [a.lat, a.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [addresses, map]);
  return null;
};

const MapView: React.FC<MapViewProps> = ({ contacts, addresses, types, onContactClick, onMapClick, onAddResident, onCall, t, theme }) => {
  const [mapCenter] = useState<[number, number]>([52.1326, 5.2913]);
  const isDark = theme === 'dark';

  const addressGroups = addresses.reduce((acc, addr) => {
    const residents = contacts.filter(c => c.addressId === addr.id);
    if (residents.length > 0) {
      acc.push({ address: addr, residents });
    }
    return acc;
  }, [] as { address: Address; residents: Contact[] }[]);

  const createIcon = (address: Address, residents: Contact[]) => {
    const mapAvatarId = address.mapAvatarId;
    const targetResident = residents.find(r => r.id === mapAvatarId) || 
                          [...residents].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))[0];
    const residentType = types.find(t => t.id === targetResident.typeId);
    const count = residents.length;
    const color = residentType?.color || '#3b82f6';
    const photo = targetResident.photoUrl || `https://ui-avatars.com/api/?name=${targetResident.firstName}+${targetResident.lastName || ''}`;
    
    return L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div style="position: relative; width: 44px; height: 44px;">
          <div style="width: 44px; height: 44px; background-color: ${isDark ? '#1e293b' : 'white'}; border-radius: 50%; border: 3.5px solid ${color}; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; z-index: 2;">
            <img src="${photo}" style="width: 100%; height: 100%; object-fit: cover;" alt="${targetResident.firstName}" />
          </div>
          <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 12px solid ${color}; z-index: 1;"></div>
          ${count > 1 ? `<div style="position: absolute; top: -4px; right: -4px; background: #EF4444; color: white; border: 2px solid ${isDark ? '#0f172a' : 'white'}; border-radius: 50%; min-width: 20px; height: 20px; font-size: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; box-shadow: 0 2px 5px rgba(0,0,0,0.3); z-index: 10; padding: 0 2px;">${count}</div>` : ''}
        </div>
      `,
      iconSize: [44, 52],
      iconAnchor: [22, 52],
      popupAnchor: [0, -52],
    });
  };

  return (
    <div className={`w-full h-full relative ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
      <MapContainer center={mapCenter} zoom={8} scrollWheelZoom={true} className="z-10" style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapEvents onMapClick={onMapClick} />
        <MapResizeHandler />
        <MapBoundsHandler addresses={addressGroups.length > 0 ? addressGroups.map(g => g.address) : addresses} />
        {addressGroups.map(({ address, residents }) => (
          <Marker key={address.id} position={[address.lat, address.lng]} icon={createIcon(address, residents)}>
            <Popup className={`${isDark ? 'dark-popup' : ''}`}>
              <div className={`p-1 min-w-[220px] ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>
                <div className={`mb-3 border-b pb-2 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.15em] mb-1">{t('location')}</p>
                  <p className="text-sm font-bold leading-tight">
                    {address.street} {address.houseNumber}<br/>
                    <span className="text-xs text-gray-500 font-medium">{address.postalCode} {address.city}</span>
                  </p>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {residents.map(res => {
                    const typeColor = types.find(t => t.id === res.typeId)?.color || '#F3F4F6';
                    const categoryName = types.find(t => t.id === res.typeId)?.name || '';
                    return (
                      <div key={res.id} className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all border border-transparent group ${isDark ? 'hover:bg-slate-800 hover:border-slate-700' : 'hover:bg-blue-50/50 hover:border-blue-100'}`} onClick={() => onContactClick(res.id)}>
                        <img src={res.photoUrl || `https://ui-avatars.com/api/?name=${res.firstName}+${res.lastName || ''}`} className="w-10 h-10 rounded-full object-cover border-2 shadow-sm" style={{ borderColor: typeColor }} />
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm truncate group-hover:text-blue-500 transition-colors ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>{res.firstName} {res.lastName}</p>
                          <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: typeColor }}>{t(categoryName)}</p>
                        </div>
                        {res.phones && res.phones.length > 0 && res.phones[0] && (
                          <a
                            href={`tel:${cleanPhoneNumber(res.phones[0])}`}
                            onClick={(e) => {
                              if (onCall) {
                                onCall(res, res.phones[0], e);
                              } else {
                                dialPhoneNumber(res.phones[0], e);
                              }
                            }}
                            title={`${t('call')}: ${res.phones[0]}`}
                            className={`p-1.5 rounded-lg transition-all active:scale-90 flex items-center justify-center shrink-0 ${
                              isDark 
                                ? 'bg-emerald-950/70 text-emerald-400 hover:bg-emerald-900 border border-emerald-800/60' 
                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            <Phone size={13} className="fill-current" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <button onClick={() => onAddResident(address.id)} className={`w-full font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm border ${isDark ? 'bg-slate-800 text-blue-400 border-slate-700 hover:bg-slate-700' : 'bg-white text-blue-600 border-blue-100 hover:bg-blue-50'}`}>
                    <Plus size={14} /> {t('addResident')}
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      <div className={`absolute bottom-6 left-6 z-20 backdrop-blur-md p-5 rounded-[2rem] shadow-2xl border space-y-3 min-w-[160px] ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-white/50'}`}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('legend')}</p>
        </div>
        <div className="space-y-2.5">
          {types.map(type => (
            <div key={type.id} className="flex items-center gap-3 group">
              {/* Fixed: Moved ringColor from style to className as Tailwind ring utility */}
              <div 
                className={`w-4 h-4 rounded-full shadow-sm ring-2 transition-transform group-hover:scale-110 ${isDark ? 'ring-slate-800' : 'ring-white'}`} 
                style={{ backgroundColor: type.color }} 
              />
              <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{t(type.name)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapView;
