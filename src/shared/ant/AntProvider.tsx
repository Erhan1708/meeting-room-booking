import type { ReactNode } from 'react';

import { App as AntApp, ConfigProvider } from 'antd';

import { ruRU } from './locale';
import { antTheme } from './theme';

export function AntProvider({ children }: { children?: ReactNode }) {
  return (
    <ConfigProvider theme={antTheme} locale={ruRU}>
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}
