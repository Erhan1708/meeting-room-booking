import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import { globalModalReducer } from 'shared/global-modal/model/slice';

import { baseApi } from '../api';

export const makeStore = () =>
  configureStore({
    reducer: {
      globalModal: globalModalReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    devTools: import.meta.env.DEV,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['globalModal/openModal'],
          ignoredPaths: ['globalModal.body', 'globalModal.title'],
        },
      }).concat(baseApi.middleware),
  });

export const store = makeStore();

setupListeners(store.dispatch);

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
