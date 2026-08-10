import { useColorScheme } from '@/components/useColorScheme';
import { Theme } from '@/constants/Theme';

export function useThemeColors() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    isDark,
    colorScheme,
    // Main backgrounds
    background: isDark ? '#09090b' : '#ffffff',
    backgroundSecondary: isDark ? '#121215' : '#f1f5f9',
    cardBackground: isDark ? '#18181b' : '#ffffff',
    headerBg: isDark ? 'rgba(9, 9, 11, 0.96)' : 'rgba(255, 255, 255, 0.95)',
    // Inputs & Borders
    inputBg: isDark ? '#1c1917' : '#f8fafc',
    inputBorder: isDark ? '#27272a' : '#e2e8f0',
    border: isDark ? '#27272a' : '#e2e8f0',
    // Typography
    text: isDark ? '#f8fafc' : '#0f172a',
    textSecondary: isDark ? '#a1a1aa' : '#475569',
    textMuted: isDark ? '#71717a' : '#94a3b8',
    titleText: isDark ? '#ffffff' : '#0f172a',
    // Primary accents
    primary: isDark ? '#3b82f6' : Theme.primary,
    primaryDark: isDark ? '#2563eb' : Theme.primaryDark,
    // Cards & elements
    iconBg: isDark ? '#27272a' : Theme.inputBg,
    catCircleBg: isDark ? '#18181b' : Theme.inputBg,
    catCircleBorder: isDark ? '#27272a' : Theme.inputBorder,
    trustSectionBg: isDark ? '#121215' : '#fafaf9',
    trustSectionBorder: isDark ? '#27272a' : '#e7e5e4',
    trustCardBg: isDark ? '#18181b' : '#ffffff',
    trustCardTitle: isDark ? '#f8fafc' : '#1c1917',
    badgeBorder: isDark ? '#09090b' : '#ffffff',
    // Bottom Tab Bar
    tabBarBg: isDark ? '#09090b' : '#ffffff',
    tabBarBorder: isDark ? '#27272a' : Theme.inputBorder,
    tabActive: isDark ? '#60a5fa' : Theme.primary,
    tabInactive: isDark ? '#71717a' : Theme.textMuted,
  };
}
