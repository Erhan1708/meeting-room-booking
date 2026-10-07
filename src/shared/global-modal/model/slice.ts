import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type { GlobalModalState } from './types';

const initialState: GlobalModalState = {
  body: null,
};

const slice = createSlice({
  name: 'globalModal',
  initialState,
  reducers: {
    openModal(_state, action: PayloadAction<GlobalModalState>) {
      return { ...initialState, ...action.payload };
    },
    closeModal(state) {
      state.body = null;
    },
  },
});

export const { openModal, closeModal } = slice.actions;
export const globalModalReducer = slice.reducer;
