import { useAppTheme } from '@/src/contexts/ThemeContext';

export function useColorScheme(): 'light' | 'dark' {
  const { colorScheme } = useAppTheme();
  return colorScheme;
}
