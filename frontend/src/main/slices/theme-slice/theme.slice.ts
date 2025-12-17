import { PayloadAction, createSlice } from '@reduxjs/toolkit';

import { PersistConfig, persistReducer } from 'redux-persist';

import { getReduxStorageUtil } from '../../utils/storage/redux-storage.util';

import { THEME_SLICE_NAME, ThemeMode, ThemeSliceState } from './theme.slice.types';

const initialState: ThemeSliceState = {
  mode: 'system',
  systemPreference: 'light',
};

const persistConfig: PersistConfig<ThemeSliceState> = {
  key: THEME_SLICE_NAME,
  storage: getReduxStorageUtil(),
  whitelist: ['mode'],
};

const themeSlice = createSlice({
  name: THEME_SLICE_NAME,
  initialState,
  reducers: {
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      state.mode = action.payload;
    },
    setSystemPreference: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.systemPreference = action.payload;
    },
  },
});

export const { setThemeMode, setSystemPreference } = themeSlice.actions;
export const ThemeSlice = persistReducer(persistConfig, themeSlice.reducer);
