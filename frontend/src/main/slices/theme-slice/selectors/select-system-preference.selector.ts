import type { RootState } from '../../../store/main.store';

export const selectSystemPreference = (state: RootState) => state.theme.systemPreference;
