/** Small stroke icons, until comfy ships an icon set (comfy/docs/07-iconography.md). */
const PATHS = {
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  close: "M6 6l12 12M18 6L6 18",
  open: "M8 16L16 8M9 8h7v7",
  back: "M15 5l-7 7 7 7",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 12.5l9 5 9-5M3 17l9 5 9-5",
  sound: "M4 9.5v5h3.5L12 19V5L7.5 9.5H4zM15.5 9a4.2 4.2 0 010 6M18 6.5a8 8 0 010 11",
  muted: "M4 9.5v5h3.5L12 19V5L7.5 9.5H4zM16 9.5l5 5M21 9.5l-5 5",
  pin: "M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11zM12 12.2a2.2 2.2 0 100-4.4 2.2 2.2 0 000 4.4z",
  ticket: "M4 8a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 000-4V8zM14 6v12",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.600 12 3z",
  instagram: "M7.500 3.500h9a4 4 0 014 4v9a4 4 0 01-4 4h-9a4 4 0 01-4-4v-9a4 4 0 014-4zM12 15.800a3.800 3.800 0 100-7.600 3.800 3.800 0 000 7.600zM17 7h.01",
  chat: "M5 5h14a2 2 0 012 2v8a2 2 0 01-2 2h-7l-5 4v-4H5a2 2 0 01-2-2V7a2 2 0 012-2z",
  news: "M5 4h11v16H6a2 2 0 01-2-2V5a1 1 0 011-1zM16 9h3a1 1 0 011 1v8a2 2 0 01-2 2h-2M7.500 8h5M7.500 12h5M7.500 16h5",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
