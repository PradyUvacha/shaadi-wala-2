export function communityLabel(community: string | null | undefined): string {
  const text = (community ?? '').trim()
  if (!text) return 'Hindu'
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Swap one row with its neighbour and rewrite positions as 1..n. Equal positions still move. */
export function moveByPosition<T extends { id: string; position: number }>(
  items: readonly T[],
  id: string,
  direction: -1 | 1,
): T[] {
  const ordered = [...items].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
  const index = ordered.findIndex((item) => item.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= ordered.length) return items as T[]
  const swapped = [...ordered]
  const [moved] = swapped.splice(index, 1)
  swapped.splice(target, 0, moved!)
  return swapped.map((item, position) => ({ ...item, position: position + 1 }))
}
