
import { ContactType, ContactCategory } from './types.ts';

export const DEFAULT_TYPES: ContactType[] = [
  { id: '1', name: ContactCategory.FAMILY, color: '#EF4444' }, // Red-500
  { id: '2', name: ContactCategory.FRIEND, color: '#10B981' }, // Emerald-500
  { id: '4', name: ContactCategory.ACQUAINTANCE, color: '#F59E0B' }, // Amber-500
  { id: '6', name: ContactCategory.UNKNOWN, color: '#9CA3AF' }, // Gray-400
];

export const INITIAL_ADDRESSES = [
  {
    id: 'addr-1',
    street: 'Damrak',
    houseNumber: '1',
    postalCode: '1012 LG',
    city: 'Amsterdam',
    lat: 52.3762,
    lng: 4.8979,
    country: 'NL'
  },
  {
    id: 'addr-2',
    street: 'Coolsingel',
    houseNumber: '40',
    postalCode: '3011 AD',
    city: 'Rotterdam',
    lat: 51.9225,
    lng: 4.4791,
    country: 'NL'
  }
];

export const INITIAL_CONTACTS = [
  {
    id: 'c-1',
    firstName: 'Jan',
    lastName: 'Jansen',
    photoUrl: 'https://picsum.photos/seed/jan/200',
    birthDate: '1985-06-15',
    addressId: 'addr-1',
    typeId: '1',
    phones: ['0612345678'],
    emails: ['jan@example.com'],
    pets: [{ type: 'Hond', name: 'Bowie' }],
    children: [],
    socialLinks: {},
    hobbies: ['Wandelen', 'Koken'],
    notes: 'Altijd in voor een praatje.',
    isFavorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    interactions: [],
  },
  {
    id: 'c-2',
    firstName: 'Maria',
    lastName: 'Vermeer',
    photoUrl: 'https://picsum.photos/seed/maria/200',
    birthDate: '1990-03-22',
    addressId: 'addr-2',
    typeId: '2',
    phones: ['0687654321'],
    emails: ['maria@example.com'],
    pets: [],
    children: [],
    socialLinks: {},
    hobbies: ['Schilderen'],
    notes: 'Goede vriendin van de universiteit.',
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    interactions: [],
  }
];
