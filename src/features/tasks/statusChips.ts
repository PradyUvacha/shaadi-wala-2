/** 14px semibold Poppins is about 7.4px per character. Used to prove the three chips fit a 320px phone. */
export const STATUS_CHIP_CHAR_PX = 7.4
export const STATUS_CHIP_PAD_X = 12
export const STATUS_CHIP_GAP = 6
export const STATUS_CHIP_ROW_PAD_X = 8

/** A classic scrollbar on a 320px phone leaves about 304px. The labels must fit without clipping. */
export function statusChipRowFits(labels: readonly string[], rowWidth: number): boolean {
  const widths = labels.map((label) => label.length * STATUS_CHIP_CHAR_PX + STATUS_CHIP_PAD_X * 2)
  const gaps = STATUS_CHIP_GAP * Math.max(0, labels.length - 1)
  const total = widths.reduce((sum, width) => sum + width, 0) + gaps + STATUS_CHIP_ROW_PAD_X * 2
  return total <= rowWidth
}
