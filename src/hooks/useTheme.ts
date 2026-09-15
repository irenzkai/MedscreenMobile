import { Colors, ColorPalette } from '../constants/theme';
import { useColorScheme } from './useColorScheme';

export function useTheme(): ColorPalette {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light';
  return Colors[theme];
}