import type { Category, Priority, TemplateTask } from '../types.ts'
import { TEMPLATE_SLUG } from '../types.ts'

export const HINDU_TEMPLATE_SLUG = TEMPLATE_SLUG

export const HINDU_TEMPLATE_NAME = 'Hindu wedding checklist'

type Ritual = [string, string, string, Category, Priority]

const RITUALS: Ritual[] = [
  ['Roka', 'Roka Ceremony', 'Formal agreement between both families that the wedding will happen.', 'Other', 'High'],
  ['Roka', 'Roka date and home', 'Confirm whose home hosts the roka and the time.', 'Venue', 'High'],
  ['Roka', 'Roka outfits', 'Clothes for the couple and both sets of parents.', 'Attire', 'Medium'],
  ['Roka', 'Roka mithai and gifts', 'Sweets and the gifts the families exchange.', 'Other', 'Medium'],
  ['Roka', 'Roka tilak thali', 'Thali, roli, rice, and the coconut.', 'Other', 'High'],
  ['Roka', 'Roka guest list', 'The close family who should be in the room.', 'Other', 'Medium'],
  ['Sagai', 'Sagai/Engagement', 'Exchange rings and announce the engagement.', 'Other', 'High'],
  ['Sagai', 'Engagement rings', 'Choose and size both rings.', 'Attire', 'High'],
  ['Sagai', 'Sagai outfits', 'Engagement clothes for the couple.', 'Attire', 'Medium'],
  ['Sagai', 'Sagai venue and decor', 'Hall or home, flowers, and seating.', 'Decor', 'High'],
  ['Sagai', 'Sagai invitation cards', 'Cards or a message for the engagement.', 'Invitations', 'Medium'],
  ['Sagai', 'Sagai photographer', 'Photos of the ring exchange.', 'Other', 'Medium'],
  ['Haldi', 'Haldi Ceremony Prep', 'Turmeric ceremony clothes, seating, and ritual items.', 'Other', 'Medium'],
  ['Haldi', 'Haldi outfits in yellow', 'Yellow clothes for the couple and siblings.', 'Attire', 'Medium'],
  ['Haldi', 'Haldi paste and ritual items', 'Turmeric, oil, and the bowls.', 'Other', 'High'],
  ['Haldi', 'Haldi seating and decor', 'Floor seating, marigolds, and a wash area.', 'Decor', 'Medium'],
  ['Haldi', 'Haldi music', 'A short playlist for the haldi.', 'Other', 'Low'],
  ['Mehendi', 'Mehendi Ceremony Setup', 'Book the mehendi artist and set up seating.', 'Decor', 'Medium'],
  ['Mehendi', 'Mehendi artist booking', 'Confirm the artist, the hours, and a trial if you want one.', 'Other', 'High'],
  ['Mehendi', 'Bridal mehendi design', 'Agree the bridal design and when it starts.', 'Other', 'High'],
  ['Mehendi', 'Mehendi seating and cushions', 'Low seating, cushions, and trays.', 'Decor', 'Medium'],
  ['Mehendi', 'Mehendi outfits', 'Clothes that stay clear of the fresh mehendi.', 'Attire', 'Medium'],
  ['Mehendi', 'Mehendi snacks and drinks', 'A light menu while the mehendi dries.', 'Catering', 'Low'],
  ['Sangeet', 'Sangeet Arrangements', 'Music, stage, and family performances for sangeet night.', 'Decor', 'High'],
  ['Sangeet', 'Sangeet performance list', 'Who dances or sings, and the song list.', 'Other', 'High'],
  ['Sangeet', 'Sangeet rehearsals', 'A rehearsal slot, and a choreographer if you want one.', 'Other', 'Medium'],
  ['Sangeet', 'Sangeet stage and lighting', 'Stage size, lights, and a sound check.', 'Decor', 'High'],
  ['Sangeet', 'Sangeet DJ or band', 'Music for the performances and the dance floor.', 'Other', 'High'],
  ['Sangeet', 'Sangeet dinner menu', 'The meal served at sangeet.', 'Catering', 'Medium'],
  ['Wedding', 'Book Wedding Venue', 'Confirm the hall, mandap space, and reception venue.', 'Venue', 'High'],
  ['Wedding', 'Book Pandit Ji', 'Confirm the priest for Saat Phere and the other rites.', 'Other', 'High'],
  ['Wedding', 'Mandap Decoration', 'Flowers, drape, and the sacred fire space.', 'Decor', 'High'],
  ['Wedding', 'Bridal Lehenga/Saree', 'Finalise the bride wedding outfit and fittings.', 'Attire', 'High'],
  ['Wedding', "Groom's Sherwani", 'Finalise the groom sherwani or achkan.', 'Attire', 'High'],
  ['Wedding', 'Bridal Jewelry', 'Polki, gold, and the pieces to borrow or buy.', 'Attire', 'High'],
  ['Wedding', 'Wedding Invitations', 'Design, print, and send the cards.', 'Invitations', 'High'],
  ['Wedding', 'Book Caterer', 'Lock the caterer and the guest count.', 'Catering', 'High'],
  ['Wedding', 'Menu Tasting', 'Taste and confirm the wedding menu.', 'Catering', 'Medium'],
  ['Wedding', 'Saat Phere Setup', 'Havan kund, pheras space, and ritual samagri.', 'Other', 'High'],
  ['Wedding', 'Var Mala/Jaimala Arrangements', 'Garlands for the jaimala.', 'Decor', 'High'],
  ['Wedding', 'Baraat Vehicle (Ghodi/Car)', 'Horse, car, or both for the baraat.', 'Other', 'High'],
  ['Wedding', 'Flower Decoration', 'Florals for the mandap, entrance, and stage.', 'Decor', 'High'],
  ['Wedding', 'Book Photographer', 'Book the photographer for every ceremony.', 'Other', 'High'],
  ['Vidaai', 'Bidaai Preparations', 'The farewell, the car, and the immediate family plan.', 'Other', 'High'],
  ['Vidaai', 'Vidaai car decoration', 'Flowers for the car that leaves with the couple.', 'Decor', 'Medium'],
  ['Vidaai', 'Vidaai gifts', 'Gifts the bride takes to her new home.', 'Other', 'Medium'],
  ['Vidaai', 'Vidaai ritual tray', 'Rice, coins, and the other farewell items the pandit asks for.', 'Other', 'High'],
  ['Reception', 'Reception Planning', 'Reception flow, outfits, and hosting.', 'Venue', 'High'],
  ['Reception', 'Reception couple outfits', 'The reception outfit change.', 'Attire', 'Medium'],
  ['Reception', 'Reception stage and entrance', 'Entry song, stage, and seating.', 'Decor', 'High'],
  ['Reception', 'Sweets/Mithai Order', 'Order mithai for ceremonies and return boxes.', 'Catering', 'Medium'],
  ['Reception', 'Return Gifts', 'Favours for guests.', 'Other', 'Low'],
  ['Reception', 'Thank You Cards', 'Notes to send after the wedding.', 'Invitations', 'Low'],
]

/** Hindu wedding rituals. The database copies the whole list onto a new wedding. */
export const HINDU_CHECKLIST: TemplateTask[] = RITUALS.map(([ceremony, title, description, category, priority], index) => ({
  ceremony,
  title,
  description,
  category,
  priority,
  sortOrder: index + 1,
}))
