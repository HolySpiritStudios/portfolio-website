export const THEME_SLICE_NAME = 'theme';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeSliceState {
  mode: ThemeMode;
  systemPreference: 'light' | 'dark';
}
