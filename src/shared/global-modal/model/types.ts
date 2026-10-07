import type { ReactNode } from 'react';

export interface GlobalModalState {
  body: ReactNode | null;
  title?: ReactNode;
  closable?: boolean;
  width?: number | string;
}
