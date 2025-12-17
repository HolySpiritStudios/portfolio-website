import type { RootState } from '../../../store/main.store';

export const selectThemeMode = (state: RootState) => state.theme.mode;
