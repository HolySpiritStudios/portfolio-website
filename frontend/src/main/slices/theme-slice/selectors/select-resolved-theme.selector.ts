import type { RootState } from '../../../store/main.store';

/**
 * Returns the actual theme that should be applied ('light' or 'dark')
 * Takes into account the user's preference and system preference
 */
export const selectResolvedTheme = (state: RootState): 'light' | 'dark' => {
  const mode = state.theme.mode;
  const systemPreference = state.theme.systemPreference;

  if (mode === 'system') {
    return systemPreference;
  }

  return mode;
};
