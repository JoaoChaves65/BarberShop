import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgendaPage } from './AgendaPage';

const apiMock = vi.hoisted(() => ({
  getWeeklySchedule: vi.fn(),
  getAppointments: vi.fn(),
  getCustomers: vi.fn(),
  getBarbers: vi.fn(),
  getServices: vi.fn(),
  createAppointment: vi.fn(),
}));

const mockUser = vi.hoisted(() => ({ id: 'user-customer-1', role: 'CUSTOMER' }));

vi.mock('../../lib/api/client', () => ({
  api: apiMock,
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    hasRole: (role: string | string[]) => {
      const roles = Array.isArray(role) ? role : [role];
      return roles.includes(mockUser.role);
    },
  }),
}));

describe('AgendaPage', () => {
  const findAvailableSlot = (): HTMLElement => {
    const grid = screen.getByRole('grid');
    const candidates = Array.from(grid.querySelectorAll('div')).filter(
      element =>
        element.style.cursor === 'pointer' &&
        !element.querySelector('button') &&
        !element.textContent?.includes('Agenda') &&
        !element.textContent?.includes('Hoje')
    );

    if (candidates.length === 0) {
      throw new Error('Nenhum slot disponível encontrado na agenda');
    }

    return candidates[0] as HTMLElement;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    monday.setHours(0, 0, 0, 0);

    apiMock.getWeeklySchedule.mockResolvedValue({
      data: [
        {
          barberId: 'barber-1',
          barberName: 'Barbeiro Teste',
          schedules: [
            {
              id: 'sched-1',
              barberId: 'barber-1',
              dayOfWeek: monday.getDay() === 0 ? 1 : monday.getDay(),
              startTime: '09:00',
              endTime: '18:00',
              breakStart: null,
              breakEnd: null,
              active: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          blocks: [],
        },
      ],
    });

    apiMock.getAppointments.mockResolvedValue({ data: [] });
    apiMock.getCustomers.mockResolvedValue({
      data: [
        { id: 'customer-1', userId: 'user-customer-1', name: 'Cliente A', phone: '1111', email: null, birthDate: null, notes: null, createdAt: '', updatedAt: '' },
        { id: 'customer-2', userId: 'user-other', name: 'Cliente B', phone: '2222', email: null, birthDate: null, notes: null, createdAt: '', updatedAt: '' },
      ],
    });
    apiMock.getBarbers.mockResolvedValue({
      data: [{ id: 'barber-1', userId: 'user-barber-1', name: 'Barbeiro Teste', phone: null, specialty: 'Corte', hireDate: '', active: true, createdAt: '', updatedAt: '' }],
    });
    apiMock.getServices.mockResolvedValue({
      data: [{ id: 'service-1', name: 'Corte', description: null, price: '50.00', durationMinutes: 30, active: true, createdAt: '', updatedAt: '' }],
    });
  });

  it('filtra clientes do usuário logado antes de abrir o modal', async () => {
    render(<AgendaPage />);

    await screen.findByText('Agenda');

    const clickableSlot = findAvailableSlot();
    fireEvent.click(clickableSlot);

    expect(await screen.findByLabelText('Cliente *')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Cliente A/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Cliente B/ })).not.toBeInTheDocument();
    expect((screen.getByLabelText('Cliente *') as HTMLSelectElement).value).toBe('customer-1');
  });

  it('mostra mensagem específica quando o backend responde 409 por conflito de horário', async () => {
    apiMock.createAppointment.mockRejectedValue({ status: 409, message: 'Time slot is not available' });

    render(<AgendaPage />);
    await screen.findByText('Agenda');

    fireEvent.click(findAvailableSlot());

    await waitFor(() => {
      expect(screen.getByLabelText('Cliente *')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Cliente *'), { target: { value: 'customer-1' } });
    fireEvent.change(screen.getByLabelText('Serviço *'), { target: { value: 'service-1' } });
    fireEvent.change(screen.getByLabelText('Data e Hora *'), {
      target: { value: '2035-01-01T10:00' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));

    expect(await screen.findByText(/horário indisponível|conflito/i)).toBeInTheDocument();
  });
});
