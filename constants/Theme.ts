/**
 * TOLA app theme — matches tola.co (primary blue, red accent, green for sold/verified).
 * Website uses a prominent medium-dark blue for banner, ALL CATEGORIES, Cart, logo, active states.
 */
export const Theme = {
  // Primary blue — banner, ALL CATEGORIES, Cart, logo, buttons, active tab, SEE ALL
  primary: '#1a56db',
  primaryDark: '#0f3d82',
  gradientStart: '#1a56db',
  gradientEnd: '#0f3d82',
  // Backgrounds — clean, high contrast
  background: '#ffffff',
  backgroundSecondary: '#f1f5f9',
  backgroundTertiary: '#e2e8f0',
  // Text
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  // Links and accents
  link: '#2563eb',
  // Inputs
  inputBg: '#f8fafc',
  inputBorder: '#e2e8f0',
  // TOLA accent red — SOLD OUT, TOLA Pay “Pay”
  accent: '#ea580c',
  accentRed: '#dc2626',
  // Green — “X SOLD” badges, VERIFIED BY TOLA
  soldBadge: '#16a34a',
  verified: '#16a34a',
  // Category pastels (Home screen)
  categoryFresh: '#dcfce7',
  categoryHandmade: '#fce7f3',
  categoryServices: '#dbeafe',
  categoryShipping: '#ffedd5',
  categoryElectronics: '#e0e7ff',
  categoryHealth: '#fae8ff',
  success: '#16a34a',
  error: '#dc2626',
  shadowSm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  shadowMd: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 4 },
  shadowLg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8 },
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
};
