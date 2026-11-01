/**
 * Brand colors from the PrimeGarage logo: orange, white and black.
 * Tailwind classes use the same values (tailwind.config.js `brand` and the neutral `slate`).
 * Red stays reserved for destructive actions and the "due" component status.
 */
export const BRAND = {
  /** Logo orange, for icons, accents and the active tab. */
  orange: '#ff7a00',
  /** Button background and links: a little darker so white text stays readable. */
  orangeStrong: '#ea6a00',
  black: '#0a0a0a',
  white: '#ffffff',
} as const;
