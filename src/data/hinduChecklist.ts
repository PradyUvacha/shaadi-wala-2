import type { TemplateTask } from '../types.ts'
import { TEMPLATE_SLUG } from '../types.ts'

export const HINDU_TEMPLATE_SLUG = TEMPLATE_SLUG

export const HINDU_TEMPLATE_NAME = 'Hindu wedding checklist'

/** Starter ritual checklist. Couples copy these into their wedding and edit them. */
export const HINDU_CHECKLIST: TemplateTask[] = [
  { title: 'Roka Ceremony', description: 'Formal agreement between both families that the wedding will happen.', category: 'Other', priority: 'High', sortOrder: 1 },
  { title: 'Sagai/Engagement', description: 'Exchange rings and announce the engagement.', category: 'Other', priority: 'High', sortOrder: 2 },
  { title: 'Book Wedding Venue', description: 'Confirm the hall, mandap space, and reception venue.', category: 'Venue', priority: 'High', sortOrder: 3 },
  { title: 'Book Pandit Ji', description: 'Confirm the priest for Saat Phere and the other rites.', category: 'Other', priority: 'High', sortOrder: 4 },
  { title: 'Sangeet Arrangements', description: 'Music, stage, and family performances for sangeet night.', category: 'Decor', priority: 'High', sortOrder: 5 },
  { title: 'Mehendi Ceremony Setup', description: 'Book the mehendi artist and set up seating.', category: 'Decor', priority: 'Medium', sortOrder: 6 },
  { title: 'Haldi Ceremony Prep', description: 'Turmeric ceremony clothes, seating, and ritual items.', category: 'Other', priority: 'Medium', sortOrder: 7 },
  { title: 'Mandap Decoration', description: 'Flowers, drape, and the sacred fire space.', category: 'Decor', priority: 'High', sortOrder: 8 },
  { title: 'Bridal Lehenga/Saree', description: 'Finalise the bride wedding outfit and fittings.', category: 'Attire', priority: 'High', sortOrder: 9 },
  { title: "Groom's Sherwani", description: 'Finalise the groom sherwani or achkan.', category: 'Attire', priority: 'High', sortOrder: 10 },
  { title: 'Bridal Jewelry', description: 'Polki, gold, and the pieces to borrow or buy.', category: 'Attire', priority: 'High', sortOrder: 11 },
  { title: 'Wedding Invitations', description: 'Design, print, and send the cards.', category: 'Invitations', priority: 'High', sortOrder: 12 },
  { title: 'Book Caterer', description: 'Lock the caterer and the guest count.', category: 'Catering', priority: 'High', sortOrder: 13 },
  { title: 'Menu Tasting', description: 'Taste and confirm the wedding menu.', category: 'Catering', priority: 'Medium', sortOrder: 14 },
  { title: 'Sweets/Mithai Order', description: 'Order mithai for ceremonies and return boxes.', category: 'Catering', priority: 'Medium', sortOrder: 15 },
  { title: 'Book Photographer', description: 'Book the photographer for every ceremony.', category: 'Other', priority: 'High', sortOrder: 16 },
  { title: 'Book Videographer', description: 'Book video coverage and a highlight film.', category: 'Other', priority: 'High', sortOrder: 17 },
  { title: 'Pre-Wedding Photoshoot', description: 'Pick outfits, a location, and a date.', category: 'Other', priority: 'Medium', sortOrder: 18 },
  { title: 'Book DJ/Band', description: 'Music for sangeet and the reception.', category: 'Other', priority: 'High', sortOrder: 19 },
  { title: 'Flower Decoration', description: 'Florals for the mandap, entrance, and stage.', category: 'Decor', priority: 'High', sortOrder: 20 },
  { title: 'Lighting Setup (Diyas)', description: 'Diyas, fairy lights, and ceremony lighting.', category: 'Decor', priority: 'Medium', sortOrder: 21 },
  { title: 'Baraat Vehicle (Ghodi/Car)', description: 'Horse, car, or both for the baraat.', category: 'Other', priority: 'High', sortOrder: 22 },
  { title: 'Guest Transportation', description: 'Cars or a bus between venues.', category: 'Other', priority: 'Medium', sortOrder: 23 },
  { title: 'Finalize Guest List', description: 'Names, sides, and a working headcount.', category: 'Other', priority: 'High', sortOrder: 24 },
  { title: 'Book Hotel Rooms for Guests', description: 'Rooms for out-of-town family.', category: 'Venue', priority: 'Medium', sortOrder: 25 },
  { title: 'Var Mala/Jaimala Arrangements', description: 'Garlands for the jaimala.', category: 'Decor', priority: 'High', sortOrder: 26 },
  { title: 'Saat Phere Setup', description: 'Havan kund, pheras space, and ritual samagri.', category: 'Other', priority: 'High', sortOrder: 27 },
  { title: 'Bidaai Preparations', description: 'The farewell, the car, and the immediate family plan.', category: 'Other', priority: 'High', sortOrder: 28 },
  { title: 'Reception Planning', description: 'Reception flow, outfits, and hosting.', category: 'Venue', priority: 'High', sortOrder: 29 },
  { title: 'Honeymoon Planning', description: 'Travel dates and bookings.', category: 'Other', priority: 'Medium', sortOrder: 30 },
  { title: 'Return Gifts', description: 'Favours for guests.', category: 'Other', priority: 'Low', sortOrder: 31 },
  { title: 'Thank You Cards', description: 'Notes to send after the wedding.', category: 'Invitations', priority: 'Low', sortOrder: 32 },
]
