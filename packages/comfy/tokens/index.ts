import tokens from "./tokens.json";

/** Raw palette hex values, for places CSS variables can't reach (e.g. MapLibre paint properties). */
export const palette = Object.fromEntries(
  Object.entries(tokens.color.palette).map(([name, t]) => [name, t.$value]),
) as { [K in keyof typeof tokens.color.palette]: string };

export { tokens };
