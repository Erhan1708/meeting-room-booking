import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import dayjs from 'dayjs';
import { cn } from 'shared';

import { useGetBookingsQuery } from '../api';
import { addDays, weekDates, weekdayIndex } from '../lib';
import type { IsoDate } from '../model';

/** Сколько дней достраивается у края ленты за раз. */
const CHUNK = 8 * 7;
/** Брони запрашиваются для видимых дней и запаса вокруг них, а не для всей ленты. */
const PREFETCH = 7;

type Props = {
  date: IsoDate;
  today: IsoDate;
  onChange: (date: IsoDate) => void;
  /** Действия справа от названия месяца (кнопка «Забронировать»). */
  actions?: ReactNode;
};

const mondayOf = (date: IsoDate) => weekDates(date)[0]!;
const daysBetween = (from: IsoDate, to: IsoDate) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

/**
 * Лента дней как в календаре с плавной горизонтальной прокруткой (тачпад, свайп, стрелки).
 * На десктопе видно две недели, на мобильном — одна. Лента бесконечна в обе стороны:
 * у краёв достраиваются новые недели. Выбранный день — круг, сегодня — обводка,
 * дни с бронями подсвечены и отмечены точкой.
 */
export function WeekStrip({ date, today, onChange, actions }: Props) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [range, setRange] = useState(() => ({
    start: addDays(mondayOf(date), -CHUNK),
    length: CHUNK * 3,
  }));
  const days = useMemo(
    () => Array.from({ length: range.length }, (_, i) => addDays(range.start, i)),
    [range],
  );

  const [firstIdx, setFirstIdx] = useState(CHUNK);
  const [visibleCount, setVisibleCount] = useState(14);
  /** Сколько дней добавили слева — на столько же сдвигаем прокрутку, чтобы вид не прыгнул. */
  const prepended = useRef(0);

  const cellWidth = () => {
    const el = scrollerRef.current;
    return el && el.children.length ? el.scrollWidth / el.children.length : 0;
  };

  /** Прокрутка так, чтобы день с индексом `index` оказался по центру ленты. */
  const scrollToCenter = useCallback((index: number, behavior: ScrollBehavior) => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ left: (index + 0.5) * cellWidth() - el.clientWidth / 2, behavior });
  }, []);

  // При открытии: ставим ленту на неделю раньше и плавно доезжаем до выбранного дня,
  // чтобы было видно, где он. Без анимации, если пользователь просит меньше движения.
  useLayoutEffect(() => {
    const index = daysBetween(range.start, date);
    const behavior = scrollBehavior();
    if (behavior === 'auto') return scrollToCenter(index, 'auto');

    scrollToCenter(index - 7, 'auto');
    const id = requestAnimationFrame(() => scrollToCenter(index, 'smooth'));
    return () => cancelAnimationFrame(id);
    // Только при монтировании.
    // oxlint-disable-next-line react/exhaustive-deps
  }, []);

  // Компенсация прокрутки после достраивания ленты слева.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (el && prepended.current) {
      el.scrollLeft += prepended.current * cellWidth();
      prepended.current = 0;
    }
  }, [range.start]);

  const frame = useRef(0);
  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = scrollerRef.current;
      const width = cellWidth();
      if (!el || !width) return;

      const first = Math.round(el.scrollLeft / width);
      const count = Math.max(1, Math.round(el.clientWidth / width));
      setFirstIdx(first);
      setVisibleCount(count);

      if (first < PREFETCH) {
        prepended.current = CHUNK;
        setFirstIdx(first + CHUNK);
        setRange((r) => ({ start: addDays(r.start, -CHUNK), length: r.length + CHUNK }));
      } else if (first + count > range.length - PREFETCH) {
        setRange((r) => ({ ...r, length: r.length + CHUNK }));
      }
    });
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // Дата сменилась извне (URL, «Сегодня») и не видна — плавно прокручиваем к ней.
  useEffect(() => {
    const index = daysBetween(range.start, date);
    if (index >= firstIdx && index < firstIdx + visibleCount) return;

    if (index < 0 || index >= range.length) {
      // Далеко за пределами ленты — перестраиваем её вокруг даты.
      setRange({ start: addDays(mondayOf(date), -CHUNK), length: CHUNK * 3 });
      requestAnimationFrame(() =>
        scrollToCenter(daysBetween(addDays(mondayOf(date), -CHUNK), date), 'auto'),
      );
      return;
    }
    scrollToCenter(index, scrollBehavior());
    // Реагируем только на смену выбранной даты, а не на прокрутку.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [date]);

  const scrollByWeek = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (el) el.scrollBy({ left: direction * 7 * cellWidth(), behavior: scrollBehavior() });
  };

  const firstVisible = days[firstIdx] ?? days[0]!;
  const lastVisible = days[Math.min(firstIdx + visibleCount, days.length) - 1] ?? firstVisible;
  const monthLabel = dayjs(firstVisible).isSame(lastVisible, 'month')
    ? dayjs(firstVisible).format('MMMM YYYY')
    : `${dayjs(firstVisible).format('MMMM')} – ${dayjs(lastVisible).format('MMMM YYYY')}`;
  const todayVisible = today >= firstVisible && today <= lastVisible;

  return (
    <nav aria-label="Выбор даты" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium first-letter:uppercase" aria-live="polite">
            {monthLabel}
          </span>
          {!todayVisible && (
            <Button type="link" size="small" onClick={() => onChange(today)}>
              Сегодня
            </Button>
          )}
        </div>
        {actions}
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="text"
          shape="circle"
          icon={<LeftOutlined />}
          aria-label="Предыдущая неделя"
          onClick={() => scrollByWeek(-1)}
        />
        <ul
          ref={scrollerRef}
          onScroll={onScroll}
          className={cn(
            'm-0 flex min-w-0 flex-1 list-none overflow-x-auto overscroll-x-contain p-0',
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            // Мягкое затухание по краям: частично видимые дни не выглядят обрезанными.
            '[mask-image:linear-gradient(to_right,transparent,black_32px,black_calc(100%-32px),transparent)]',
          )}
        >
          {days.map((d, i) => (
            <li key={d} className="shrink-0 basis-[calc(100%/7)] sm:basis-[calc(100%/14)]">
              <DayCell
                date={d}
                selected={d === date}
                today={d === today}
                active={i >= firstIdx - PREFETCH && i < firstIdx + visibleCount + PREFETCH}
                onSelect={onChange}
              />
            </li>
          ))}
        </ul>
        <Button
          type="text"
          shape="circle"
          icon={<RightOutlined />}
          aria-label="Следующая неделя"
          onClick={() => scrollByWeek(1)}
        />
      </div>
    </nav>
  );
}

type DayCellProps = {
  date: IsoDate;
  selected: boolean;
  today: boolean;
  /** День рядом с видимой областью — запрашиваем его брони. */
  active: boolean;
  onSelect: (date: IsoDate) => void;
};

function DayCell({ date, selected, today, active, onSelect }: DayCellProps) {
  // Тот же GET /api/bookings?date= из контракта: ответы кэшируются и
  // переиспользуются, когда пользователь открывает этот день.
  const { data } = useGetBookingsQuery(date, { skip: !active && !selected });
  const count = data?.length ?? 0;
  const weekend = weekdayIndex(date) >= 5;
  const d = dayjs(date);

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      aria-pressed={selected}
      aria-current={today ? 'date' : undefined}
      aria-label={`${d.format('dddd, D MMMM')}${count ? `, броней: ${count}` : ', броней нет'}`}
      className="group flex w-full cursor-pointer flex-col items-center gap-0.5 rounded-lg border-0 bg-transparent py-1 outline-none"
    >
      <span className={cn('text-[11px] uppercase', weekend ? 'text-gray-400' : 'text-muted')}>
        {d.format('dd')}
      </span>
      <span
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors',
          'group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-primary',
          selected
            ? 'bg-primary text-white'
            : count > 0
              ? 'bg-busy text-primary group-hover:bg-indigo-100'
              : cn('group-hover:bg-busy', weekend ? 'text-gray-400' : 'text-gray-900'),
          today && !selected && 'ring-2 ring-primary ring-inset',
        )}
      >
        {d.format('DD')}
      </span>
      <span
        aria-hidden
        className={cn('h-1.5 w-1.5 rounded-full', count > 0 ? 'bg-primary' : 'bg-transparent')}
      />
    </button>
  );
}
