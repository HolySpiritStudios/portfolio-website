import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { selectResolvedTheme } from '../../main/slices/theme-slice/selectors/select-resolved-theme.selector';
import { selectThemeMode } from '../../main/slices/theme-slice/selectors/select-theme-mode.selector';
import { setSystemPreference, setThemeMode } from '../../main/slices/theme-slice/theme.slice';
import type { ThemeMode } from '../../main/slices/theme-slice/theme.slice.types';

interface UseThemeReturn {
  /** The user's theme preference: 'light', 'dark', or 'system' */
  theme: ThemeMode;
  /** The actual theme being applied after resolving 'system' preference */
  resolvedTheme: 'light' | 'dark';
  /** Set the theme mode */
  setTheme: (theme: ThemeMode) => void;
}

/**
 * Hook for managing application theme
 *
 * @example
 * ```tsx
 * function ThemeToggle() {
 *   const { theme, resolvedTheme, setTheme } = useTheme();
 *
 *   return (
 *     <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
 *       {resolvedTheme === 'dark' ? '☀️' : '🌙'}
 *     </button>
 *   );
 * }
 * ```
 */
export const useTheme = (): UseThemeReturn => {
  const dispatch = useDispatch();
  const theme = useSelector(selectThemeMode);
  const resolvedTheme = useSelector(selectResolvedTheme);

  // Listen to system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      dispatch(setSystemPreference(e.matches ? 'dark' : 'light'));
    };

    // Set initial value
    handleChange(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [dispatch]);

  // Apply theme to DOM
  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#0f172a' : '#ffffff');
    }
  }, [resolvedTheme]);

  const handleSetTheme = (newTheme: ThemeMode) => {
    dispatch(setThemeMode(newTheme));
  };

  return {
    theme,
    resolvedTheme,
    setTheme: handleSetTheme,
  };
};
