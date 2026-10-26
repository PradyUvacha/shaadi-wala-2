import type { BudgetDraft, GuestDraft, MilestoneDraft, TaskDraft } from '../types.ts'

export const DEMO_COUPLE_NAMES = 'Priya & Rahul'
export const DEMO_WEDDING_DATE = '2026-06-20'
export const DEMO_CITY = 'Mumbai'

export const DEMO_TASKS: TaskDraft[] = [
  { title: 'Book Wedding Venue', description: 'Grand Palace Hotel confirmed', category: 'Venue', priority: 'High', ceremony: 'Wedding', status: 'Completed', dueDate: '2026-06-01' },
  { title: 'Book Pandit Ji', description: 'For Saat Phere & rituals', category: 'Other', priority: 'High', ceremony: 'Wedding', status: 'In Progress', dueDate: '2026-06-15' },
  { title: 'Bridal Lehenga', description: 'Visit Sabyasachi boutique', category: 'Attire', priority: 'High', ceremony: 'Wedding', status: 'Pending', dueDate: '2026-05-20' },
  { title: 'Mehendi Ceremony Setup', description: 'Artist booking & decor', category: 'Decor', priority: 'Medium', ceremony: 'Mehendi', status: 'Pending', dueDate: '2026-06-10' },
  { title: 'Book Caterer', description: '700 guest capacity required', category: 'Catering', priority: 'High', ceremony: 'Wedding', status: 'Completed', dueDate: '2026-05-15' },
  { title: 'Wedding Invitations', description: 'Design & print 500 cards', category: 'Invitations', priority: 'Medium', ceremony: 'Wedding', status: 'In Progress', dueDate: '2026-05-25' },
  { title: 'Sangeet Arrangements', description: 'DJ, stage, lighting', category: 'Decor', priority: 'Medium', ceremony: 'Sangeet', status: 'Pending', dueDate: '2026-06-08' },
  { title: 'Baraat Vehicle', description: 'Decorated horse + vintage car', category: 'Other', priority: 'Low', ceremony: 'Wedding', status: 'Pending', dueDate: '2026-06-20' },
]

export const DEMO_BUDGET: BudgetDraft[] = [
  {
    category: 'Venue',
    currency: 'INR',
    estimated: 500000,
    actual: 450000,
    paid: true,
    notes: 'Grand Palace Hotel',
    paidBySide: 'custom',
    splits: [
      { name: "Bride's Family", pct: 60, side: 'bride' },
      { name: "Groom's Family", pct: 40, side: 'groom' },
    ],
    partPayments: [
      { amount: 150000, paidBy: 'Mr. Sharma', paidBySide: 'bride', date: '2026-01-15', notes: 'Booking advance' },
      { amount: 300000, paidBy: 'Rahul', paidBySide: 'groom', date: '2026-03-01', notes: 'Second installment' },
    ],
  },
  {
    category: 'Catering',
    currency: 'INR',
    estimated: 350000,
    actual: 380000,
    paid: false,
    notes: '700 covers, veg + non-veg',
    paidBySide: 'both',
    splits: [
      { name: "Bride's Family", pct: 50, side: 'bride' },
      { name: "Groom's Family", pct: 50, side: 'groom' },
    ],
    partPayments: [
      { amount: 100000, paidBy: 'Priya', paidBySide: 'bride', date: '2026-02-10', notes: 'Advance' },
    ],
  },
  {
    category: 'Decor',
    currency: 'INR',
    estimated: 200000,
    actual: 185000,
    paid: true,
    notes: 'Floral + lighting + stage',
    paidBySide: 'groom',
    splits: [{ name: "Groom's Family", pct: 100, side: 'groom' }],
    partPayments: [],
  },
  {
    category: 'Attire',
    currency: 'USD',
    estimated: 3000,
    actual: 2800,
    paid: false,
    notes: 'Lehenga + Sherwani',
    paidBySide: 'custom',
    splits: [],
    partPayments: [],
  },
  {
    category: 'Invitations',
    currency: 'INR',
    estimated: 25000,
    actual: 22000,
    paid: true,
    notes: '500 cards printed',
    paidBySide: 'custom',
    splits: [],
    partPayments: [],
  },
  {
    category: 'Other',
    currency: 'INR',
    estimated: 80000,
    actual: 65000,
    paid: false,
    notes: 'Pandit, transportation, misc',
    paidBySide: 'custom',
    splits: [],
    partPayments: [],
  },
]

export const DEMO_GUESTS: GuestDraft[] = [
  { name: 'Mr. & Mrs. Sharma', email: 'sharma@email.com', phone: '9876543210', status: 'Confirmed', meal: 'Vegetarian', plusOnes: 2, side: 'bride' },
  { name: 'Anita Mehta', email: 'anita@email.com', phone: '9876543211', status: 'Confirmed', meal: 'Non-Vegetarian', plusOnes: 1, side: 'groom' },
  { name: 'Rajesh Kapoor', email: 'rajesh@email.com', phone: '', status: 'Pending', meal: 'Vegetarian', plusOnes: 0, side: '' },
  { name: 'Sunita Verma', email: 'sunita@email.com', phone: '9876543212', status: 'Declined', meal: '', plusOnes: 0, side: '' },
  { name: 'Vikram Singh', email: '', phone: '9876543213', status: 'Confirmed', meal: 'Jain', plusOnes: 3, side: 'groom' },
  { name: 'Pooja & Amit Joshi', email: 'pooja@email.com', phone: '9876543214', status: 'Pending', meal: 'Vegetarian', plusOnes: 2, side: 'bride' },
]

export const DEMO_MILESTONES: MilestoneDraft[] = [
  { name: 'Roka Ceremony', date: '2025-12-20', status: 'Completed', description: 'Official engagement announcement' },
  { name: 'Venue Booking', date: '2026-01-15', status: 'Completed', description: 'Grand Palace Hotel confirmed' },
  { name: 'Sangeet Night', date: '2026-06-18', status: 'Upcoming', description: 'Family performances & DJ night' },
  { name: 'Mehendi Ceremony', date: '2026-06-19', status: 'Upcoming', description: 'Traditional mehendi & haldi' },
  { name: 'Wedding Day', date: '2026-06-20', status: 'Upcoming', description: 'The Big Day! 🪔' },
]
