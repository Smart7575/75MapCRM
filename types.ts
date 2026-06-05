
export enum ContactCategory {
  FAMILY = 'Familie',
  FRIEND = 'Vriend',
  ACQUAINTANCE = 'Kennis',
  UNKNOWN = 'Onbekend'
}

export interface ContactType {
  id: string;
  name: string;
  color: string;
}

export interface Address {
  id: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  lat: number;
  lng: number;
  country: string;
  mapAvatarId?: string;
}

export interface Pet {
  type: string;
  name: string;
}

export interface ContactChild {
  name: string;
  birthDate?: string;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
}

export type InteractionMode = 'physical' | 'app' | 'phone' | 'other' | 'interaction';

export interface Interaction {
  id: string;
  type: InteractionMode;
  date: string;
  notes: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  birthDate?: string;
  addressId: string;
  typeId: string;
  phones: string[];
  emails: string[];
  pets: Pet[];
  children: ContactChild[];
  socialLinks: SocialLinks;
  hobbies: string[];
  notes: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  interactions: Interaction[];
  lastInteractionDate?: string;
  interactionIntervalDays?: number;
}

export enum RelationType {
  PARENT = 'Ouder',
  CHILD = 'Kind',
  PARTNER = 'Partner',
  EX_PARTNER = 'Ex-partner',
  SIBLING = 'Broer/Zus',
  UNCLE_AUNT = 'Oom/Tante',
  NEPHEW_NIECE = 'Neef/Nicht',
  GRANDPARENT = 'Opa/Oma',
  GRANDCHILD = 'Kleinzoon/Kleindochter',
  FRIEND = 'Vriend',
  BEST_FRIEND = 'Beste vriend',
  COLLEAGUE = 'Collega',
  ROOMMATE = 'Huisgenoot'
}

export interface Relation {
  id: string;
  contactAId: string;
  contactBId: string;
  type: RelationType;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  type: InteractionMode;
  notes: string;
  contactIds: string[];
  createdAt: string;
}

export type ViewMode = 'map' | 'list' | 'dashboard' | 'calendar' | 'stats' | 'planning' | 'events';
