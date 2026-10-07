import { useState, useSyncExternalStore } from 'react';

import { ExperimentOutlined } from '@ant-design/icons';
import { Button, Card, Segmented, Switch } from 'antd';
import { baseApi, toast, useAppDispatch } from 'shared';

import { db } from './db';
import { mockSettings } from './devtools';

const LATENCY_OPTIONS = [
  { label: '0 мс', value: 0 },
  { label: '400 мс', value: 400 },
  { label: '2 с', value: 2000 },
];

/**
 * Панель управления mock-сервером. Монтируется только при VITE_API_MOCKS=true
 * и только из main.tsx — сам UI приложения о ней не знает.
 */
export function MockDevPanel() {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const settings = useSyncExternalStore(mockSettings.subscribe, mockSettings.get);

  const resetData = () => {
    db.reset();
    dispatch(baseApi.util.resetApiState());
    toast.success('Демо-данные восстановлены');
  };

  if (!open) {
    return (
      <Button
        className="!fixed bottom-4 left-4 z-50 shadow-md"
        icon={<ExperimentOutlined />}
        onClick={() => setOpen(true)}
        aria-label="Открыть панель mock-сервера"
      >
        <span className="hidden sm:inline">Mock API</span>
      </Button>
    );
  }

  return (
    <section aria-label="Панель mock-сервера">
      <Card
        size="small"
        title="Mock API (dev)"
        className="!fixed bottom-4 left-4 z-50 w-[300px] max-w-[calc(100vw-2rem)] shadow-lg"
        extra={
          <Button type="text" size="small" onClick={() => setOpen(false)}>
            Свернуть
          </Button>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="space-y-1">
            <div id="latency-label">Задержка сети</div>
            <Segmented
              block
              size="small"
              aria-labelledby="latency-label"
              options={LATENCY_OPTIONS}
              value={settings.latency}
              onChange={(latency) => mockSettings.set({ latency })}
            />
          </div>

          <div className="flex items-start justify-between gap-3">
            <span id="conflict-label">
              Конфликт при следующем сохранении
              <span className="block text-xs text-muted">
                «Другой сотрудник» займёт этот слот за мгновение до вас → 409
              </span>
            </span>
            <Switch
              aria-labelledby="conflict-label"
              checked={settings.conflictNext}
              onChange={(conflictNext) => mockSettings.set({ conflictNext })}
            />
          </div>

          <div className="flex items-start justify-between gap-3">
            <span id="fail-label">
              Ошибка 500 на следующем запросе
              <span className="block text-xs text-muted">Проверка состояния ошибки и повтора</span>
            </span>
            <Switch
              aria-labelledby="fail-label"
              checked={settings.failNext}
              onChange={(failNext) => mockSettings.set({ failNext })}
            />
          </div>

          <p className="text-xs text-muted">
            Данные хранятся в localStorage. Откройте вторую вкладку, чтобы получить настоящий
            конфликт.
          </p>

          <Button block danger onClick={resetData}>
            Сбросить демо-данные
          </Button>
        </div>
      </Card>
    </section>
  );
}
