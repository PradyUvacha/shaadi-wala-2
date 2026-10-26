/** First-run wizard. Creating the wedding from the last step seeds the chosen ceremonies. */
export const ONBOARDING_STEPS = [
  { id: 'names', title: 'Your name and the couple' },
  { id: 'date', title: 'Wedding date' },
  { id: 'city', title: 'City' },
  { id: 'side', title: 'Which side you are on' },
  { id: 'ceremonies', title: 'Pick the ceremonies' },
] as const
