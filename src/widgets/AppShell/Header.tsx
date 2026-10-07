import { TeamOutlined } from '@ant-design/icons';

export function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
          <TeamOutlined aria-hidden />
        </span>
        <div>
          <h1 className="m-0 text-lg leading-tight font-semibold">Переговорная</h1>
          <p className="m-0 text-xs text-muted">Рабочий день 09:00–18:00 · время Бишкека</p>
        </div>
      </div>
    </header>
  );
}
