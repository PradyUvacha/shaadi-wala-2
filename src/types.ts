import type { FunctionPhase } from './config/phases.ts'

export const CATEGORIES = ['Venue', 'Catering', 'Decor', 'Attire', 'Invitations', 'Other'] as const
export const PRIORITIES = ['High', 'Medium', 'Low'] as const
export const TASK_STATUSES = ['Pending', 'In Progress', 'Completed'] as const
export const RSVP_STATUSES = ['Pending', 'Maybe', 'Confirmed', 'Declined'] as const
export const MILESTONE_STATUSES = ['Upcoming', 'Completed'] as const
export const MEALS = ['', 'Vegetarian', 'Non-Vegetarian', 'Jain', 'Vegan'] as const
export const CURRENCY_CODES = ['INR', 'USD', 'EUR', 'GBP'] as const
export const PAYERS = ['bride', 'groom', 'both', 'custom'] as const
export const MEMBER_ROLES = ['bride', 'groom', 'family', 'friend', 'planner'] as const
export const INVITE_ROLES = MEMBER_ROLES
export const TEMPLATE_SLUG = 'hindu-starter'

export type Category = (typeof CATEGORIES)[number]
export type Priority = (typeof PRIORITIES)[number]
export type TaskStatus = (typeof TASK_STATUSES)[number]
export type RsvpStatus = (typeof RSVP_STATUSES)[number]
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number]
export type CurrencyCode = (typeof CURRENCY_CODES)[number]
export type Payer = (typeof PAYERS)[number]
export type Side = 'bride' | 'groom'
export type GuestSide = '' | Side | 'both'
export type PaymentSide = '' | 'bride' | 'groom' | 'other'
export type MemberRole = (typeof MEMBER_ROLES)[number]
export type InviteRole = MemberRole | 'open'

export type TemplateTask = {
  title: string
  description: string
  category: Category
  priority: Priority
  ceremony: string
  sortOrder: number
}

export type TaskDraft = {
  title: string
  description: string
  category: Category
  priority: Priority
  ceremony: string
  status: TaskStatus
  dueDate: string
  templateTitle?: string | null
  functionId?: string | null
  position?: number
  assignedTo?: string | null
  actualCost?: number | null
  budgetCategoryId?: string | null
}

export type Task = {
  id: string
  title: string
  description: string
  category: Category
  priority: Priority
  ceremony: string
  status: TaskStatus
  dueDate: string
  templateTitle: string | null
  sortOrder: number
  functionId: string | null
  position: number
  assignedTo: string | null
  side: Side | null
  updatedAt: string
  actualCost: number | null
  budgetCategoryId: string | null
  costUpdatedAt: string
}

export type WeddingFunction = {
  id: string
  name: string
  position: number
  phase: FunctionPhase | null
  updatedAt: string
}

export type WeddingMember = {
  id: string
  userId: string
  role: MemberRole
  side: Side | null
  displayName: string
}

export type SplitDraft = {
  name: string
  pct: number
  side: PaymentSide
}

export type Split = SplitDraft & { id: string }

export type PartPaymentDraft = {
  amount: number
  paidBy: string
  paidBySide: PaymentSide
  date: string
  notes: string
}

export type PartPayment = PartPaymentDraft & { id: string }

export type BudgetDraft = {
  category: string
  currency: CurrencyCode
  estimated: number
  actual: number
  paid: boolean
  notes: string
  paidBySide: Payer
  splits: SplitDraft[]
  partPayments?: PartPaymentDraft[]
}

export type BudgetItem = {
  id: string
  category: string
  currency: CurrencyCode
  estimated: number
  actual: number
  paid: boolean
  notes: string
  paidBySide: Payer
  splits: Split[]
  partPayments: PartPayment[]
}

export type GuestDraft = {
  name: string
  email: string
  phone: string
  status: RsvpStatus
  meal: string
  plusOnes: number
  side: GuestSide
  functionIds: string[]
}

export type Guest = GuestDraft & { id: string }

export type MilestoneDraft = {
  name: string
  date: string
  status: MilestoneStatus
  description: string
}

export type Milestone = MilestoneDraft & { id: string }

export type WeddingSettings = {
  coupleNames: string
  weddingDate: string
  city: string
  side: Side
  displayName: string
}

export type WeddingBundle = {
  wedding: {
    id: string
    coupleNames: string
    weddingDate: string
    city: string
    community: string
  }
  membership: {
    id: string
    role: MemberRole
    side: Side | null
    displayName: string
  }
  displayName: string
  members: WeddingMember[]
  functions: WeddingFunction[]
  tasks: Task[]
  budget: BudgetItem[]
  guests: Guest[]
  milestones: Milestone[]
}

export type CreateWeddingInput = WeddingSettings & {
  seed: 'template' | 'demo' | 'empty'
  ceremonies?: string[]
}

export type WeddingInvite = {
  id: string
  code: string
  role: InviteRole
  side: Side | null
  expiresAt: string | null
  acceptedAt: string | null
}
