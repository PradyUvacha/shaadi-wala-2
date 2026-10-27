export const DUPLICATE_CATEGORY_MESSAGE = 'A category with this name already exists.'

export function categoryNameKey(name: string): string {
  return name.trim().toLowerCase()
}

/** True when another category in this wedding already uses the same name. */
export function duplicateCategoryName(
  items: readonly { id: string; category: string }[],
  name: string,
  exceptId?: string,
): boolean {
  const key = categoryNameKey(name)
  if (!key) return false
  return items.some((item) => item.id !== exceptId && categoryNameKey(item.category) === key)
}
