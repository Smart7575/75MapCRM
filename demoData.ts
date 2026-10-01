import { Contact, Address, Relation, Event, RelationType } from './types.ts';

export const SF_DEMO_ADDRESSES: Address[] = [
  {
    id: 'demo-sf-addr-valencia',
    street: 'Valencia Street',
    houseNumber: '742',
    postalCode: '94110',
    city: 'San Francisco',
    lat: 37.7594,
    lng: -122.4215,
    country: 'USA'
  },
  {
    id: 'demo-sf-addr-howard',
    street: 'Howard Street',
    houseNumber: '480',
    postalCode: '94105',
    city: 'San Francisco',
    lat: 37.7876,
    lng: -122.3992,
    country: 'USA'
  },
  {
    id: 'demo-sf-addr-chestnut',
    street: 'Chestnut Street',
    houseNumber: '2150',
    postalCode: '94123',
    city: 'San Francisco',
    lat: 37.8004,
    lng: -122.4411,
    country: 'USA'
  },
  {
    id: 'demo-sf-addr-hayes',
    street: 'Hayes Street',
    houseNumber: '512',
    postalCode: '94102',
    city: 'San Francisco',
    lat: 37.7766,
    lng: -122.4255,
    country: 'USA'
  },
  {
    id: 'demo-sf-addr-castro',
    street: 'Castro Street',
    houseNumber: '420',
    postalCode: '94114',
    city: 'San Francisco',
    lat: 37.7612,
    lng: -122.4352,
    country: 'USA'
  },
  {
    id: 'demo-sf-addr-columbus',
    street: 'Columbus Avenue',
    houseNumber: '1350',
    postalCode: '94133',
    city: 'San Francisco',
    lat: 37.8038,
    lng: -122.4172,
    country: 'USA'
  },
  {
    id: 'demo-sf-addr-sunset',
    street: '9th Avenue',
    houseNumber: '1220',
    postalCode: '94122',
    city: 'San Francisco',
    lat: 37.7651,
    lng: -122.4665,
    country: 'USA'
  }
];

const now = new Date();
const daysAgoIso = (days: number) => {
  const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
};
const daysFutureIso = (days: number) => {
  const d = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return d.toISOString();
};

export const SF_DEMO_CONTACTS: Contact[] = [
  {
    id: 'demo-sf-c-sarah',
    firstName: 'Sarah',
    lastName: 'Jenkins',
    sortName: 'Jenkins, Sarah',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    birthDate: '1992-04-14',
    addressId: 'demo-sf-addr-valencia',
    typeId: '2', // Friend
    phones: ['+1 (415) 555-0142'],
    emails: ['sarah.jenkins@bayreach.io'],
    pets: [{ type: 'Dog', name: 'Bailey' }],
    children: [],
    socialLinks: {
      linkedin: 'https://linkedin.com/in/sarahjenkins-design',
      instagram: 'sarah_in_sf'
    },
    hobbies: ['Specialty Coffee', 'Embarcadero Cycling', 'Ceramics'],
    notes: 'Senior Product Designer at a climate-tech startup. Loves meeting up for iced mint mojitos at Philz on 24th St.',
    isFavorite: true,
    createdAt: daysAgoIso(90),
    updatedAt: daysAgoIso(2),
    interactionIntervalDays: 14,
    lastInteractionDate: daysAgoIso(3),
    interactions: [
      {
        id: 'demo-sf-int-1',
        type: 'physical',
        date: daysAgoIso(12),
        notes: 'Coffee and pastries catch-up at Tartine Bakery in the Mission.'
      },
      {
        id: 'demo-sf-int-2',
        type: 'phone',
        date: daysAgoIso(3),
        notes: 'Quick call to discuss the weekend Marin Headlands hiking route.'
      }
    ]
  },
  {
    id: 'demo-sf-c-michael',
    firstName: 'Michael',
    lastName: 'Chen',
    sortName: 'Chen, Michael',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    birthDate: '1987-11-20',
    addressId: 'demo-sf-addr-howard',
    typeId: '4', // Colleague / Acquaintance
    phones: ['+1 (415) 555-0188'],
    emails: ['m.chen@sftechpulse.com'],
    pets: [{ type: 'Cat', name: 'Mochi' }],
    children: [{ name: 'Lucas', birthDate: '2020-08-11' }],
    socialLinks: {
      linkedin: 'https://linkedin.com/in/michaelchen-dev'
    },
    hobbies: ['Bay Sailing', 'Rock Climbing', 'Generative AI'],
    notes: 'Engineering Director. Collaborated on open-source pipelines. Lives walking distance from Salesforce Park.',
    isFavorite: true,
    createdAt: daysAgoIso(120),
    updatedAt: daysAgoIso(5),
    interactionIntervalDays: 21,
    lastInteractionDate: daysAgoIso(14),
    interactions: [
      {
        id: 'demo-sf-int-3',
        type: 'physical',
        date: daysAgoIso(14),
        notes: 'Lunch at the Ferry Building Farmers Market.'
      }
    ]
  },
  {
    id: 'demo-sf-c-david',
    firstName: 'David',
    lastName: 'Miller',
    sortName: 'Miller, David',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    birthDate: '1984-07-09',
    addressId: 'demo-sf-addr-chestnut',
    typeId: '1', // Family
    phones: ['+1 (415) 555-0219'],
    emails: ['david.miller@skylinebay.org'],
    pets: [{ type: 'Dog', name: 'Waffles' }],
    children: [{ name: 'Chloe', birthDate: '2019-02-18' }],
    socialLinks: {
      instagram: 'david_sf_architecture'
    },
    hobbies: ['Running Crissy Field', 'Sourdough Baking', 'Golf'],
    notes: 'Architect focused on sustainable timber structures. Always hosts Thanksgiving dinner in the Marina.',
    isFavorite: true,
    createdAt: daysAgoIso(180),
    updatedAt: daysAgoIso(10),
    interactionIntervalDays: 7,
    lastInteractionDate: daysAgoIso(5),
    interactions: [
      {
        id: 'demo-sf-int-4',
        type: 'physical',
        date: daysAgoIso(5),
        notes: 'Family dinner at A16 on Chestnut Street.'
      }
    ]
  },
  {
    id: 'demo-sf-c-emily',
    firstName: 'Emily',
    lastName: 'Rodriguez-Miller',
    sortName: 'Rodriguez-Miller, Emily',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    birthDate: '1986-09-28',
    addressId: 'demo-sf-addr-chestnut',
    typeId: '1', // Family
    phones: ['+1 (415) 555-0220'],
    emails: ['emily.miller@ucsf.edu'],
    pets: [],
    children: [{ name: 'Chloe', birthDate: '2019-02-18' }],
    socialLinks: {
      linkedin: 'https://linkedin.com/in/emily-rodriguez-md'
    },
    hobbies: ['Tennis', 'Wine Tasting in Napa', 'Book Club'],
    notes: 'Pediatric specialist at UCSF Benioff Children’s Hospital. Married to David.',
    isFavorite: false,
    createdAt: daysAgoIso(180),
    updatedAt: daysAgoIso(10),
    interactionIntervalDays: 14,
    lastInteractionDate: daysAgoIso(5),
    interactions: [
      {
        id: 'demo-sf-int-5',
        type: 'physical',
        date: daysAgoIso(5),
        notes: 'Family dinner in the Marina.'
      }
    ]
  },
  {
    id: 'demo-sf-c-marcus',
    firstName: 'Marcus',
    lastName: 'Washington',
    sortName: 'Washington, Marcus',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
    birthDate: '1990-01-15',
    addressId: 'demo-sf-addr-hayes',
    typeId: '2', // Friend
    phones: ['+1 (415) 555-0351'],
    emails: ['marcus.w@bayareajazz.org'],
    pets: [],
    children: [],
    socialLinks: {
      instagram: 'marcus_grooves'
    },
    hobbies: ['Jazz Saxophone', 'Vintage Vinyl', 'Urban Gardening'],
    notes: 'Musician and arts curator in Hayes Valley. Regularly organizes outdoor jam sessions near Patricia’s Green.',
    isFavorite: false,
    createdAt: daysAgoIso(75),
    updatedAt: daysAgoIso(8),
    interactionIntervalDays: 30,
    lastInteractionDate: daysAgoIso(20),
    interactions: [
      {
        id: 'demo-sf-int-6',
        type: 'app',
        date: daysAgoIso(20),
        notes: 'Exchanged playlist recommendations and tickets for SFJazz Center.'
      }
    ]
  },
  {
    id: 'demo-sf-c-chloe',
    firstName: 'Chloe',
    lastName: 'Bennett',
    sortName: 'Bennett, Chloe',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    birthDate: '1993-08-04',
    addressId: 'demo-sf-addr-castro',
    typeId: '2', // Friend
    phones: ['+1 (415) 555-0477'],
    emails: ['chloe.bennett@sfcommunity.org'],
    pets: [{ type: 'Cat', name: 'Cleo' }],
    children: [],
    socialLinks: {
      instagram: 'chloe_sf_streets'
    },
    hobbies: ['Film Photography', 'Trail Running in Marin', 'Literature'],
    notes: 'Non-profit director focused on youth mentorship and neighborhood community projects.',
    isFavorite: false,
    createdAt: daysAgoIso(60),
    updatedAt: daysAgoIso(12),
    interactionIntervalDays: 30,
    lastInteractionDate: daysAgoIso(25),
    interactions: []
  },
  {
    id: 'demo-sf-c-alex',
    firstName: 'Alex',
    lastName: 'Rivera',
    sortName: 'Rivera, Alex',
    photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
    birthDate: '1989-12-03',
    addressId: 'demo-sf-addr-columbus',
    typeId: '4', // Acquaintance / Colleague
    phones: ['+1 (415) 555-0592'],
    emails: ['arivera@peninsulastrategy.com'],
    pets: [],
    children: [],
    socialLinks: {
      linkedin: 'https://linkedin.com/in/alex-rivera-consulting'
    },
    hobbies: ['Espresso Connoisseur', 'Cycling Hawk Hill', 'Historical Architecture'],
    notes: 'Strategy consultant in North Beach. Knows the best hidden cafes and roasters in Telegraph Hill.',
    isFavorite: false,
    createdAt: daysAgoIso(45),
    updatedAt: daysAgoIso(15),
    interactionIntervalDays: 45,
    lastInteractionDate: daysAgoIso(30),
    interactions: []
  },
  {
    id: 'demo-sf-c-jessica',
    firstName: 'Jessica',
    lastName: 'Taylor',
    sortName: 'Taylor, Jessica',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    birthDate: '1991-05-19',
    addressId: 'demo-sf-addr-sunset',
    typeId: '2', // Friend
    phones: ['+1 (415) 555-0630'],
    emails: ['jess.taylor@botanicalbay.com'],
    pets: [{ type: 'Dog', name: 'Kona' }],
    children: [],
    socialLinks: {
      instagram: 'jess_botanical_sf'
    },
    hobbies: ['Botanical Illustration', 'Ocean Beach Surfing', 'Pottery'],
    notes: 'Landscape designer. Lives in the Inner Sunset right next to Golden Gate Park Arboretum.',
    isFavorite: true,
    createdAt: daysAgoIso(90),
    updatedAt: daysAgoIso(4),
    interactionIntervalDays: 14,
    lastInteractionDate: daysAgoIso(6),
    interactions: [
      {
        id: 'demo-sf-int-7',
        type: 'physical',
        date: daysAgoIso(6),
        notes: 'Walked dogs together through Golden Gate Park conservatory grounds.'
      }
    ]
  }
];

export const SF_DEMO_RELATIONS: Relation[] = [
  {
    id: 'demo-sf-rel-1',
    contactAId: 'demo-sf-c-sarah',
    contactBId: 'demo-sf-c-marcus',
    type: RelationType.FRIEND,
    createdAt: daysAgoIso(75)
  },
  {
    id: 'demo-sf-rel-2',
    contactAId: 'demo-sf-c-david',
    contactBId: 'demo-sf-c-emily',
    type: RelationType.PARTNER,
    createdAt: daysAgoIso(180)
  },
  {
    id: 'demo-sf-rel-3',
    contactAId: 'demo-sf-c-michael',
    contactBId: 'demo-sf-c-alex',
    type: RelationType.COLLEAGUE,
    createdAt: daysAgoIso(45)
  },
  {
    id: 'demo-sf-rel-4',
    contactAId: 'demo-sf-c-sarah',
    contactBId: 'demo-sf-c-chloe',
    type: RelationType.BEST_FRIEND,
    createdAt: daysAgoIso(60)
  }
];

export const SF_DEMO_EVENTS: Event[] = [
  {
    id: 'demo-sf-event-1',
    title: 'Mission District Taco Tour & Philz Coffee',
    date: daysFutureIso(4),
    type: 'physical',
    notes: 'Catch up on 24th street and try out the new murals tour in Balmy Alley.',
    contactIds: ['demo-sf-c-sarah', 'demo-sf-c-marcus'],
    createdAt: daysAgoIso(2)
  },
  {
    id: 'demo-sf-event-2',
    title: 'Golden Gate Park Weekend Picnic & Dog Walk',
    date: daysFutureIso(10),
    type: 'physical',
    notes: 'Bring blankets and snacks near the Conservatory of Flowers with Bailey and Kona.',
    contactIds: ['demo-sf-c-david', 'demo-sf-c-emily', 'demo-sf-c-jessica'],
    createdAt: daysAgoIso(1)
  }
];

export const isDemoId = (id: string) => id.startsWith('demo-sf-');
