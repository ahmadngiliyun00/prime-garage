import { colorScheme } from 'nativewind';
import { Platform } from 'react-native';

/**
 * Web only: dark mode follows the system theme (tailwind `darkMode: 'class'`, see tailwind.config.js).
 * The `dark` class is set on <html> before the first render so there is no light flash, then kept in
 * sync when the system theme changes. Native follows the system theme on its own.
 */
if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = (dark: boolean) => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      colorScheme.set(dark ? 'dark' : 'light');
    } catch {
      // NativeWind may not have read its CSS flags yet; the class above is enough until it does.
    }
  };
  apply(query.matches);
  query.addEventListener('change', (e) => apply(e.matches));
}
