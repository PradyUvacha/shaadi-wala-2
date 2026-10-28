/**
 * Product switches. Flip the matching SQL function in the same change:
 * - ACTUAL_COUNTS_DONE_TASKS_ONLY ↔ task_cost_counts_when_done() (OQ-14)
 * - PLANNER_CAN_EDIT_TASK_COSTS ↔ planner_can_edit_task_costs() (OQ-15)
 * - SPLIT_EDITABLE is display-only until a later edit flow (OQ-18)
 * - ODD_RUPEE_SIDE is the extra rupee after a half-up 50/50 split (OQ-19)
 */
export const ACTUAL_COUNTS_DONE_TASKS_ONLY = true
export const PLANNER_CAN_EDIT_TASK_COSTS = false
export const SPLIT_EDITABLE = false
export const ODD_RUPEE_SIDE = 'bride' as const

export const MIGRATED_PAYMENT_NOTE = 'Earlier spend (migrated)'

export const DEFAULT_BUDGET_CATEGORIES = [
  'Attire',
  'Catering',
  'Decor',
  'Invitations',
  'Make Up Artists',
  'Photography',
  'Venue',
] as const

export const WHOLE_RUPEE_MESSAGE = 'Enter whole rupees, digits only.'

export const MOVE_LINKS_BEFORE_DELETE = 'Move linked tasks and payments before deleting this category.'
