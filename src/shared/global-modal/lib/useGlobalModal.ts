import { useAppDispatch } from 'shared/store';

import type { GlobalModalState } from '../model';
import { closeModal, openModal } from '../model';

export function useGlobalModal() {
  const dispatch = useAppDispatch();

  return {
    openModal: (payload: GlobalModalState) => dispatch(openModal(payload)),
    closeModal: () => dispatch(closeModal()),
  };
}
