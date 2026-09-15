export interface ColorPalette {
  brandDark: string;
  brandAccent: string;
  brandAccentHover: string;
  bgMain: string;
  bgCard: string;
  textMain: string;
  textMuted: string;
  borderColor: string;
  borderSecondary: string;
  surfaceSubtle: string;
  danger: string;
  warning: string;
  info: string;
  success: string;
}

export const lightTheme: ColorPalette = {
  brandDark: '#1C232D', // Oxford Blue
  brandAccent: '#19D38C', // Shamrock Green
  brandAccentHover: '#15B376',
  bgMain: '#F4F7F9',
  bgCard: '#FFFFFF',
  textMain: '#1C232D',
  textMuted: '#64748B',
  borderColor: '#E2E8F0',
  borderSecondary: 'rgba(28, 35, 45, 0.15)',
  surfaceSubtle: 'rgba(25, 211, 140, 0.05)',
  danger: '#DC3545',
  warning: '#FFC107',
  info: '#0DCAF0',
  success: '#19D38C',
};

export const darkTheme: ColorPalette = {
  brandDark: '#070B13',
  brandAccent: '#19D38C',
  brandAccentHover: '#15B376',
  bgMain: '#0A1016',
  bgCard: '#1C232D',
  textMain: '#F1F5F9',
  textMuted: '#94A3B8',
  borderColor: '#2D3748',
  borderSecondary: 'rgba(255, 255, 255, 0.15)',
  surfaceSubtle: 'rgba(25, 211, 140, 0.08)',
  danger: '#FF4D4D',
  warning: '#FFC107',
  info: '#0DCAF0',
  success: '#19D38C',
};

export const Colors = {
  light: lightTheme,
  dark: darkTheme,
};

export type ThemeColor = keyof ColorPalette;

export const StatusColors = {
  pending: {
    bg: 'rgba(255, 193, 7, 0.12)',
    border: '#FFC107',
    text: '#FFC107',
    label: 'PENDING',
  },
  approved: {
    bg: 'rgba(13, 202, 240, 0.12)',
    border: '#0DCAF0',
    text: '#0DCAF0',
    label: 'APPROVED',
  },
  tested: {
    bg: 'rgba(13, 110, 253, 0.12)',
    border: '#0D6EFD',
    text: '#0D6EFD',
    label: 'TESTED',
  },
  encoded: {
    bg: 'rgba(102, 16, 242, 0.12)',
    border: '#6610F2',
    text: '#6610F2',
    label: 'ENCODED',
  },
  released: {
    bg: 'rgba(25, 211, 140, 0.12)',
    border: '#19D38C',
    text: '#19D38C',
    label: 'RELEASED',
  },
  returned: {
    bg: 'rgba(220, 53, 69, 0.12)',
    border: '#DC3545',
    text: '#DC3545',
    label: 'RETURNED',
  },
  retest: {
    bg: 'rgba(253, 126, 20, 0.12)',
    border: '#FD7E14',
    text: '#FD7E14',
    label: 'RETEST',
  },
  canceled: {
    bg: 'rgba(108, 117, 125, 0.12)',
    border: '#6C757D',
    text: '#6C757D',
    label: 'CANCELED',
  },
  expired: {
    bg: 'rgba(176, 42, 55, 0.12)',
    border: '#B02A37',
    text: '#B02A37',
    label: 'EXPIRED',
  },
};

export const Typography = {
  fontFamily: 'System',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
    black: '900' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  half: 2,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 20,
  pill: 9999,
};

export const MaxContentWidth = 600;
export const BottomTabInset = 16;