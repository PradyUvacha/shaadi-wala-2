export const MOTIVATIONAL_QUOTES = [
  "शादी एक नई शुरुआत है — The best story begins with 'I do' ✨",
  'Every detail you plan brings magic to your big day 🪔',
  "Love is not about perfection, it's about the journey together 💐",
  'आपकी शादी, आपके सपनों की तरह हो — May your wedding be as beautiful as your dreams 🌸',
]

export const ACHIEVEMENTS = [
  { id: 'first_task', icon: '🏆', title: 'First Task', desc: 'Create your first task', threshold: 1, type: 'tasks_completed' },
  { id: 'five_tasks', icon: '⭐', title: '5 Tasks Done', desc: 'Complete 5 tasks', threshold: 5, type: 'tasks_completed' },
  { id: 'ten_tasks', icon: '🎯', title: '10 Tasks Done', desc: 'Complete 10 tasks', threshold: 10, type: 'tasks_completed' },
  { id: 'budget_set', icon: '💰', title: 'Budget Boss', desc: 'Add first budget item', threshold: 1, type: 'budget_items' },
  { id: 'guests_10', icon: '💝', title: '10 RSVPs', desc: 'Add 10 guests', threshold: 10, type: 'guests_total' },
  { id: 'guests_5', icon: '👥', title: 'Social Star', desc: 'Add 5 guests', threshold: 5, type: 'guests_total' },
] as const

export type AchievementType = (typeof ACHIEVEMENTS)[number]['type']
