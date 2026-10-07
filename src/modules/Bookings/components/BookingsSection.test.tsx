import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RootLayout } from 'app';

import { mockSettings } from '@/mocks/devtools';

// 2026-10-07 10:00 по Бишкеку. Демо-данные на сегодня: 09:00–09:30 и 14:00–15:30.
const NOW = new Date('2026-10-07T04:00:00Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe('Бронирование: конфликт 409', () => {
  it('сохраняет введённые данные, показывает понятное сообщение и обновляет список', async () => {
    const user = userEvent.setup();
    render(<RootLayout />);

    const list = await screen.findByRole('list', { name: 'Брони на выбранную дату' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: /Забронировать/ }));
    const dialog = await screen.findByRole('dialog');
    // Форма предзаполнена ближайшим свободным временем.
    expect(within(dialog).getByTitle('10:00')).toBeInTheDocument();
    expect(within(dialog).getByTitle('11:00')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Название'), 'Демо');

    // Пока пользователь заполнял форму, слот занял другой сотрудник.
    mockSettings.set({ conflictNext: true });
    await user.click(within(dialog).getByRole('button', { name: 'Забронировать' }));

    expect(await within(dialog).findByText('Это время только что заняли')).toBeInTheDocument();
    expect(within(dialog).getByText(/Занято: 10:00–11:00/)).toBeInTheDocument();
    // Данные формы не потеряны.
    expect(within(dialog).getByLabelText('Название')).toHaveValue('Демо');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Список перезапрошен и уже содержит чужую бронь.
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(3));
    expect(within(list).getByText('Бронь другого сотрудника')).toBeInTheDocument();
  });
});
