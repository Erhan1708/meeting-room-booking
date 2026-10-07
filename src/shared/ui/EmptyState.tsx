import type { ReactNode } from 'react';

import { CalendarOutlined } from '@ant-design/icons';

type Props = {
  title?: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title = 'Ничего не найдено', description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-busy text-primary">
        <CalendarOutlined style={{ fontSize: 20 }} aria-hidden />
      </div>
      <div className="text-base font-medium">{title}</div>
      {description && <div className="max-w-md text-sm text-muted">{description}</div>}
      {action}
    </div>
  );
}
