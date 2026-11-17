/** Small per-browser preferences (mute, map layers). Falls back quietly when storage is unavailable. */
export function loadPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const value = JSON.parse(raw) as unknown;
    if (typeof value !== typeof fallback || value === null) return fallback;
    return typeof fallback === "object" ? { ...fallback, ...(value as object) } : (value as T);
  } catch {
    return fallback;
  }
}

export function savePref(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private mode or storage full; the setting just won't stick
  }
}
