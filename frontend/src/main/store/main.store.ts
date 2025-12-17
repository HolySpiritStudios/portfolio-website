import { ThunkDispatch, UnknownAction, combineReducers, configureStore } from '@reduxjs/toolkit';

import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE, persistStore } from 'redux-persist';

import { EnvironmentSlice } from '../../config/slices/environment-slice/environment.slice';
import { userManagementSliceReducer } from '../../user-management/slices/user-management-slice/user-management.slice';
import { AppLifecycleSlice } from '../slices/app-lifecycle-slice/app-lifecycle.slice';
import { AppSettingsSlice } from '../slices/app-settings-slice/app-settings.slice';
import { ThemeSlice } from '../slices/theme-slice/theme.slice';

export const rootReducer = combineReducers({
  appLifecycle: AppLifecycleSlice,
  appSettings: AppSettingsSlice,
  environment: EnvironmentSlice,
  theme: ThemeSlice,
  userManagement: userManagementSliceReducer,
});

export const MainStore = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        disableCache: false,
      },
    }),
});

export const MainPersistStore = persistStore(MainStore);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof MainStore.dispatch;
export type MainStoreType = typeof MainStore;

interface AsyncThunkConfig {
  state?: unknown;
  dispatch?: ThunkDispatch<unknown, unknown, UnknownAction>;
  extra?: unknown;
  rejectValue?: unknown;
  serializedErrorType?: unknown;
  pendingMeta?: unknown;
  fulfilledMeta?: unknown;
  rejectedMeta?: unknown;
}

export interface ThunkApiConfigType extends AsyncThunkConfig {
  state: RootState;
}
