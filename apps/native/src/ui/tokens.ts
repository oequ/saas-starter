/** Design tokens — aligned with web light theme roles (not Spartan components). */
export const tokens = {
  color: {
    background: '#ffffff',
    foreground: '#171717',
    primary: '#1a1a1a',
    primaryForeground: '#fafafa',
    muted: '#f5f5f5',
    mutedForeground: '#737373',
    border: '#e5e5e5',
    destructive: '#c2410c',
    sheet: '#ffffff',
    backdrop: 'rgba(0,0,0,0.4)',
  },
  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    control: 10,
    sheet: 20,
  },
  type: {
    title: 28,
    body: 16,
    caption: 13,
    button: 16,
  },
  font: {
    display: 'Fraunces_600SemiBold',
    body: 'DMSans_400Regular',
    bodyMedium: 'DMSans_500Medium',
    bodySemibold: 'DMSans_600SemiBold',
  },
  motion: {
    pressScale: 0.97,
    enterMs: 320,
  },
} as const;
