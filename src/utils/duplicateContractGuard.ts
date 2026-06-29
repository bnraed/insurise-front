let lastShownAt = 0
const WINDOW_MS = 3000

export function markDuplicateShown(): void {
  lastShownAt = Date.now()
}

export function isDuplicateRecentlyShown(): boolean {
  return Date.now() - lastShownAt < WINDOW_MS
}
