import { useEffect, useState } from 'react';
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api/client';
import { UserRole } from '../../types/api';
import type {
  Appointment,
  AppointmentStatus,
  Barber,
  BarberBlock,
  BarberSchedule,
  Customer,
  Service,
  WeeklyScheduleItem,
} from '../../types/api';

const DAYS_OF_WEEK = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatWeekRange(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.getDate().toString().padStart(2, '0')}/${(start.getMonth() + 1).toString().padStart(2, '0')} - ${end.getDate().toString().padStart(2, '0')}/${(end.getMonth() + 1).toString().padStart(2, '0')}`;
}

function formatDateForAPI(date: Date): string {
  return date.toISOString();
}

function formatTimeFromISO(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDateTimeLocalValue(date: Date): string {
  const pad = (value: number): string => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getScheduleForDay(weeklySchedule: WeeklyScheduleItem[], barberId: string, dayOfWeek: number): BarberSchedule | undefined {
  const item = weeklySchedule.find(w => w.barberId === barberId);
  return item?.schedules.find(schedule => schedule.dayOfWeek === dayOfWeek && schedule.active);
}

function getTimeSlots(schedule: BarberSchedule | undefined): string[] {
  if (!schedule) return [];

  const startParts = schedule.startTime.split(':');
  const endParts = schedule.endTime.split(':');
  const startHour = Number(startParts[0]);
  const startMin = Number(startParts[1]);
  const endHour = Number(endParts[0]);
  const endMin = Number(endParts[1]);

  if (Number.isNaN(startHour) || Number.isNaN(startMin) || Number.isNaN(endHour) || Number.isNaN(endMin)) {
    return [];
  }

  const slots: string[] = [];
  let currentHour = startHour;
  let currentMin = startMin;

  while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
    slots.push(`${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`);
    currentMin += 30;
    if (currentMin >= 60) {
      currentMin = 0;
      currentHour += 1;
    }
  }

  return slots;
}

function getBlocksForDay(weeklySchedule: WeeklyScheduleItem[], barberId: string, date: Date): BarberBlock[] {
  const item = weeklySchedule.find(w => w.barberId === barberId);
  if (!item) return [];

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return item.blocks.filter(block => {
    const blockStart = new Date(block.startDateTime);
    const blockEnd = new Date(block.endDateTime);
    return blockStart < dayEnd && blockEnd > dayStart;
  });
}

function getAppointmentsForDay(appointments: Appointment[], barberId: string, date: Date): Appointment[] {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return appointments.filter(appt => {
    if (appt.barberId !== barberId) return false;
    const apptDate = new Date(appt.dateTime);
    return apptDate >= dayStart && apptDate <= dayEnd;
  });
}

function isSlotBlocked(weeklySchedule: WeeklyScheduleItem[], barberId: string, date: Date, slotTime: string): boolean {
  const blocks = getBlocksForDay(weeklySchedule, barberId, date);
  const slotParts = slotTime.split(':');
  const slotHour = Number(slotParts[0]);
  const slotMin = Number(slotParts[1]);

  if (Number.isNaN(slotHour) || Number.isNaN(slotMin)) return false;

  const slotDate = new Date(date);
  slotDate.setHours(slotHour, slotMin, 0, 0);
  const slotEnd = new Date(slotDate.getTime() + 30 * 60 * 1000);

  return blocks.some(block => {
    const blockStart = new Date(block.startDateTime);
    const blockEnd = new Date(block.endDateTime);
    return blockStart < slotEnd && blockEnd > slotDate;
  });
}

function getAppointmentAtSlot(appointments: Appointment[], barberId: string, date: Date, slotTime: string): Appointment | undefined {
  const slotParts = slotTime.split(':');
  const slotHour = Number(slotParts[0]);
  const slotMin = Number(slotParts[1]);

  if (Number.isNaN(slotHour) || Number.isNaN(slotMin)) {
    return undefined;
  }

  const slotDate = new Date(date);
  slotDate.setHours(slotHour, slotMin, 0, 0);

  return getAppointmentsForDay(appointments, barberId, date).find(appt => {
    const apptDate = new Date(appt.dateTime);
    return apptDate.getTime() === slotDate.getTime();
  });
}

function getAppointmentStatusColor(status: AppointmentStatus): React.CSSProperties {
  switch (status) {
    case 'PENDING':
      return { backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' };
    case 'CONFIRMED':
      return { backgroundColor: '#dbeafe', color: '#1e40af', borderColor: '#93c5fd' };
    case 'COMPLETED':
      return { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' };
    case 'CANCELLED':
      return { backgroundColor: '#fef2f2', color: '#991b1b', borderColor: '#fecaca' };
    default:
      return { backgroundColor: 'var(--color-background)', color: 'var(--color-text-muted)' };
  }
}

export function AgendaPage(): JSX.Element {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState<Date>(() => getStartOfWeek(new Date()));
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    barberId: string;
    barberName: string;
    date: Date;
    slotTime: string;
  } | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [barbersList, setBarbersList] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [modalDataLoading, setModalDataLoading] = useState(false);

  const [formData, setFormData] = useState({
    customerId: '',
    barberId: '',
    serviceId: '',
    dateTime: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const today = new Date();
  const isCurrentWeek = today >= weekStart && today <= addDays(weekStart, 6);

  const loadAgenda = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError('');

      const [weeklyResponse, appointmentsResponse] = await Promise.all([
        api.getWeeklySchedule({ startDate: formatDateForAPI(weekStart) }),
        api.getAppointments({
          startDate: formatDateForAPI(weekStart),
          endDate: formatDateForAPI(addDays(weekStart, 6)),
          limit: 500,
        }),
      ]);

      setWeeklySchedule(weeklyResponse.data ?? []);
      setAppointments(appointmentsResponse.data ?? []);
    } catch {
      setError('Erro ao carregar a agenda.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadModalData = async (): Promise<void> => {
    try {
      setModalDataLoading(true);
      const [customersResponse, barbersResponse, servicesResponse] = await Promise.all([
        api.getCustomers({ limit: 100 }),
        api.getBarbers({ limit: 100 }),
        api.getServices({ limit: 100 }),
      ]);

      const allCustomers = customersResponse.data ?? [];
      const visibleCustomers =
        user?.role === UserRole.CUSTOMER
          ? allCustomers.filter(customer => customer.userId === user.id)
          : allCustomers;

      setCustomers(visibleCustomers);
      setBarbersList((barbersResponse.data ?? []).filter(barber => barber.active));
      setServices((servicesResponse.data ?? []).filter(service => service.active));

      if (user?.role === UserRole.CUSTOMER && visibleCustomers.length > 0) {
        const defaultCustomerId = visibleCustomers[0]?.id ?? '';
        setFormData(current => ({
          ...current,
          customerId: current.customerId || defaultCustomerId,
        }));
      }
    } catch {
      setFormError('Erro ao carregar clientes, barbeiros e serviços.');
    } finally {
      setModalDataLoading(false);
    }
  };

  useEffect(() => {
    void loadAgenda();
  }, [weekStart]);

  const goToPreviousWeek = (): void => {
    setWeekStart(current => addDays(current, -7));
  };

  const goToNextWeek = (): void => {
    setWeekStart(current => addDays(current, 7));
  };

  const goToToday = (): void => {
    setWeekStart(getStartOfWeek(new Date()));
  };

  const handleSlotClick = (barberId: string, barberName: string, date: Date, slotTime: string): void => {
    const [hoursValue, minutesValue] = slotTime.split(':');
    const hours = Number(hoursValue);
    const minutes = Number(minutesValue);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return;
    }

    const slotDate = new Date(date);
    slotDate.setHours(hours, minutes, 0, 0);

    const defaultCustomerId =
      user?.role === UserRole.CUSTOMER
        ? customers.find(customer => customer.userId === user.id)?.id ?? ''
        : '';

    setSelectedSlot({ barberId, barberName, date, slotTime });
    setFormData({
      customerId: defaultCustomerId,
      barberId,
      serviceId: '',
      dateTime: toDateTimeLocalValue(slotDate),
      notes: '',
    });
    setFormError('');
    setShowModal(true);
    void loadModalData();
  };

  const closeModal = (): void => {
    setShowModal(false);
    setSelectedSlot(null);
    setFormError('');
  };

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = event.target;
    setFormData(current => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');

    if (!formData.customerId || !formData.barberId || !formData.serviceId || !formData.dateTime) {
      setFormError('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setFormSubmitting(true);
      await api.createAppointment({
        customerId: formData.customerId,
        barberId: formData.barberId,
        serviceId: formData.serviceId,
        dateTime: new Date(formData.dateTime).toISOString(),
        notes: formData.notes || undefined,
      });

      setShowModal(false);
      setSelectedSlot(null);
      setFormData({
        customerId: '',
        barberId: '',
        serviceId: '',
        dateTime: '',
        notes: '',
      });
      void loadAgenda();
    } catch (error) {
      const status = Number((error as { status?: number })?.status ?? 0);
      const errorMessage = (error as { message?: string })?.message ?? '';

      if (status === 409 || /conflito|indispon|overlap|not available/i.test(errorMessage)) {
        setFormError('Horário indisponível para este barbeiro. Escolha outro horário ou serviço.');
        return;
      }

      setFormError('Não foi possível criar o agendamento.');
    } finally {
      setFormSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>Carregando agenda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error} role="alert">
        {error}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Agenda</h1>
        <div style={styles.headerActions}>
          <div style={styles.weekNavigation}>
            <button type="button" onClick={goToPreviousWeek} style={styles.navButton} aria-label="Semana anterior">
              ←
            </button>
            <span style={styles.weekLabel}>{formatWeekRange(weekStart)}</span>
            <button type="button" onClick={goToNextWeek} style={styles.navButton} aria-label="Próxima semana">
              →
            </button>
          </div>
          <button
            type="button"
            onClick={goToToday}
            style={{ ...styles.todayButton, ...(isCurrentWeek ? styles.todayButtonActive : {}) }}
          >
            Hoje
          </button>
        </div>
      </header>

      {weeklySchedule.length === 0 && (
        <div style={styles.emptyState}>
          <p>Nenhum barbeiro com agenda configurada para esta semana.</p>
        </div>
      )}

      <div style={styles.gridContainer} role="grid" aria-label="Agenda semanal">
        <div style={styles.timeColumnHeader} />
        {DAYS_OF_WEEK.map((day, dayIndex) => (
          <div key={day} style={styles.dayColumnHeader}>
            <span>{day}</span>
            <span style={styles.dayDate}>
              {addDays(weekStart, dayIndex).getDate().toString().padStart(2, '0')}/
              {(weekStart.getMonth() + 1).toString().padStart(2, '0')}
            </span>
          </div>
        ))}

        {weeklySchedule.map(barberItem => {
          const barberId = barberItem.barberId;
          const barberName = barberItem.barberName;

          return (
            <div key={barberId} style={styles.barberRow}>
              <div style={styles.barberNameCell}>
                <strong>{barberName}</strong>
              </div>

              {DAYS_OF_WEEK.map((_, dayIndex) => {
                const schedule = getScheduleForDay(weeklySchedule, barberId, dayIndex);
                const slots = getTimeSlots(schedule);
                const dayDate = addDays(weekStart, dayIndex);

                return (
                  <div key={`${barberId}-${dayIndex}`} style={styles.dayCell}>
                    {slots.map(slotTime => {
                      const isBlocked = isSlotBlocked(weeklySchedule, barberId, dayDate, slotTime);
                      const appointment = getAppointmentAtSlot(appointments, barberId, dayDate, slotTime);
                      const isToday = dayIndex === today.getDay() && isCurrentWeek;

                      return (
                        <div
                          key={`${barberId}-${dayIndex}-${slotTime}`}
                          style={{
                            ...styles.timeSlot,
                            ...(isBlocked ? styles.timeSlotBlocked : {}),
                            ...(appointment ? styles.timeSlotAppointment : {}),
                            ...(isToday && !isBlocked && !appointment ? styles.timeSlotToday : {}),
                          }}
                          onClick={() => !isBlocked && !appointment && handleSlotClick(barberId, barberName, dayDate, slotTime)}
                        >
                          {appointment ? (
                            <div
                              style={{
                                ...styles.appointmentCard,
                                ...getAppointmentStatusColor(appointment.status),
                              }}
                              title={`${formatTimeFromISO(appointment.dateTime)} - ${appointment.status}`}
                            >
                              <div style={styles.appointmentTime}>{formatTimeFromISO(appointment.dateTime)}</div>
                              <div style={styles.appointmentStatus}>{appointment.status}</div>
                            </div>
                          ) : isBlocked ? (
                            <div style={styles.blockedSlot} title="Horário bloqueado">
                              —
                            </div>
                          ) : (
                            <div style={styles.availableSlot} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={event => event.stopPropagation()}>
            <header style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Novo Agendamento</h2>
              <button type="button" onClick={closeModal} style={styles.closeButton} disabled={modalDataLoading || formSubmitting}>
                ×
              </button>
            </header>

            <form onSubmit={handleSubmit} style={styles.form}>
              {modalDataLoading ? (
                <div style={styles.loadingContainer}>
                  <div style={styles.spinner} />
                  <p>Carregando clientes, barbeiros e serviços...</p>
                </div>
              ) : (
                <>
                  {formError && (
                    <div style={styles.formError} role="alert">
                      {formError}
                    </div>
                  )}

                  <div style={styles.formField}>
                    <label htmlFor="customerId" style={styles.label}>
                      Cliente *
                    </label>
                    <select
                      id="customerId"
                      name="customerId"
                      value={formData.customerId}
                      onChange={handleFormChange}
                      required
                      style={styles.select}
                      disabled={formSubmitting}
                    >
                      <option value="">Selecione um cliente</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} ({customer.phone || 'sem telefone'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formField}>
                    <label htmlFor="barberId" style={styles.label}>
                      Barbeiro *
                    </label>
                    <select
                      id="barberId"
                      name="barberId"
                      value={formData.barberId || selectedSlot?.barberId || ''}
                      onChange={handleFormChange}
                      required
                      style={styles.select}
                      disabled={formSubmitting}
                    >
                      <option value="">Selecione um barbeiro</option>
                      {barbersList.map(barber => (
                        <option key={barber.id} value={barber.id}>
                          {barber.name} {barber.specialty ? `(${barber.specialty})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formField}>
                    <label htmlFor="serviceId" style={styles.label}>
                      Serviço *
                    </label>
                    <select
                      id="serviceId"
                      name="serviceId"
                      value={formData.serviceId}
                      onChange={handleFormChange}
                      required
                      style={styles.select}
                      disabled={formSubmitting}
                    >
                      <option value="">Selecione um serviço</option>
                      {services.map(service => (
                        <option key={service.id} value={service.id}>
                          {service.name} - R$ {parseFloat(service.price).toFixed(2).replace('.', ',')} ({service.durationMinutes} min)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formField}>
                    <label htmlFor="dateTime" style={styles.label}>
                      Data e Hora *
                    </label>
                    <input
                      type="datetime-local"
                      id="dateTime"
                      name="dateTime"
                      value={formData.dateTime}
                      onChange={handleFormChange}
                      required
                      style={styles.input}
                      disabled={formSubmitting}
                    />
                  </div>

                  <div style={styles.formField}>
                    <label htmlFor="notes" style={styles.label}>
                      Observações
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleFormChange}
                      style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                      disabled={formSubmitting}
                    />
                  </div>

                  <div style={styles.formActions}>
                    <button type="button" onClick={closeModal} style={styles.secondaryButton} disabled={formSubmitting}>
                      Cancelar
                    </button>
                    <button type="submit" style={styles.primaryButton} disabled={formSubmitting}>
                      {formSubmitting ? 'Criando...' : 'Criar'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '100%',
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--spacing-lg)',
    paddingBottom: 'var(--spacing-md)',
    borderBottom: '1px solid var(--color-border)',
    flexWrap: 'wrap',
    gap: 'var(--spacing-md)',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--color-text)',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-md)',
  },
  weekNavigation: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
  },
  navButton: {
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    cursor: 'pointer',
    color: 'var(--color-text)',
    transition: 'background-color var(--transition-fast), border-color var(--transition-fast)',
  },
  weekLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--color-text)',
    minWidth: '200px',
    textAlign: 'center',
  },
  todayButton: {
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    color: 'var(--color-text)',
    transition: 'background-color var(--transition-fast), border-color var(--transition-fast)',
  },
  todayButtonActive: {
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    borderColor: 'var(--color-primary)',
  },
  gridContainer: {
    overflowX: 'auto',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    minWidth: '100%',
  },
  timeColumnHeader: {
    width: '80px',
    minWidth: '80px',
    padding: 'var(--spacing-sm)',
    backgroundColor: 'var(--color-background)',
    borderRight: '1px solid var(--color-border)',
    borderBottom: '1px solid var(--color-border)',
    fontWeight: 600,
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
  },
  dayColumnHeader: {
    flex: 1,
    minWidth: '140px',
    padding: 'var(--spacing-sm)',
    backgroundColor: 'var(--color-background)',
    borderRight: '1px solid var(--color-border)',
    borderBottom: '1px solid var(--color-border)',
    textAlign: 'center',
  },
  dayDate: {
    display: 'block',
    fontSize: '0.7rem',
    color: 'var(--color-text-muted)',
    marginTop: 'var(--spacing-xs)',
  },
  barberRow: {
    display: 'flex',
    borderBottom: '1px solid var(--color-border)',
  },
  barberNameCell: {
    width: '80px',
    minWidth: '80px',
    padding: 'var(--spacing-sm)',
    backgroundColor: 'var(--color-background)',
    borderRight: '1px solid var(--color-border)',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'var(--color-text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dayCell: {
    flex: 1,
    minWidth: '140px',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid var(--color-border)',
  },
  timeSlot: {
    flex: 1,
    minHeight: '36px',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'background-color var(--transition-fast)',
    cursor: 'pointer',
  },
  timeSlotToday: {
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
  },
  timeSlotBlocked: {
    backgroundColor: '#fef2f2',
  },
  timeSlotAppointment: {
    backgroundColor: 'transparent',
  },
  availableSlot: {
    width: '100%',
    height: '100%',
  },
  blockedSlot: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#991b1b',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  appointmentCard: {
    width: '100%',
    height: '100%',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '0.7rem',
    fontWeight: 500,
    border: '1px solid',
    overflow: 'hidden',
  },
  appointmentTime: {
    fontSize: '0.65rem',
    fontWeight: 600,
  },
  appointmentStatus: {
    fontSize: '0.6rem',
    opacity: 0.9,
  },
  emptyState: {
    textAlign: 'center',
    padding: 'var(--spacing-xl)',
    color: 'var(--color-text-muted)',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--spacing-xl)',
    gap: 'var(--spacing-md)',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid var(--color-border)',
    borderTopColor: 'var(--color-primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-md)',
    color: '#991b1b',
    marginBottom: 'var(--spacing-lg)',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--spacing-md)',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-xl)',
    width: '100%',
    maxWidth: '560px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--spacing-md) var(--spacing-lg)',
    borderBottom: '1px solid var(--color-border)',
  },
  modalTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--color-text)',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    lineHeight: 1,
  },
  form: {
    padding: 'var(--spacing-lg)',
  },
  formError: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    color: '#991b1b',
    marginBottom: 'var(--spacing-md)',
    fontSize: '0.875rem',
  },
  formField: {
    marginBottom: 'var(--spacing-md)',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--color-text)',
    marginBottom: 'var(--spacing-xs)',
  },
  select: {
    width: '100%',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    fontSize: '0.875rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text)',
    boxSizing: 'border-box',
  },
  input: {
    width: '100%',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    fontSize: '0.875rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text)',
    boxSizing: 'border-box',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 'var(--spacing-md)',
    marginTop: 'var(--spacing-lg)',
  },
  primaryButton: {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'white',
    backgroundColor: 'var(--color-primary)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
  },
};
