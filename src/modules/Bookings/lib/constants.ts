/**
 * Все даты и «сейчас» считаются в часовом поясе офиса, а не браузера:
 * иначе клиент и сервер по-разному решат, что уже в прошлом.
 */
export const OFFICE_TIME_ZONE = 'Asia/Bishkek';

/** Рабочий день, минуты от начала суток. */
export const WORK_DAY_START = 9 * 60;
export const WORK_DAY_END = 18 * 60;

/** Шаг сетки выбора времени. */
export const TIME_STEP = 15;

export const MIN_DURATION = 30;
export const MAX_DURATION = 2 * 60;

export const TITLE_MAX_LENGTH = 100;
