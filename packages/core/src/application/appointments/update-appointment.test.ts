import { beforeEach, describe, expect, it } from 'vitest';
import { createBarber } from '../../domain/barber';
import { createBarberBlock } from '../../domain/barber-block';
import { createBarberSchedule } from '../../domain/barber-schedule';
import { createCustomer } from '../../domain/customer';
import { ConflictError, InsufficientPermissionsError } from '../../domain/errors';
import { Money } from '../../domain/money';
import { createService } from '../../domain/service';
import { CancelAppointment, ConfirmAppointment, CompleteAppointment } from './change-appointment-status';
import { CreateAppointment } from './create-appointment';
import { UpdateAppointment } from './update-appointment';
import { InMemoryRepositoryFactory } from '../../persistence/in-memory/factory';
import { createInMemorySqlExecutor } from '../../persistence/in-memory/sql-executor';

const mondayAt = (time: string): Date => {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(2026, 8, 21, hours, minutes, 0, 0);
};

describe('UpdateAppointment', () => {
  let factory: InMemoryRepositoryFactory;
  let executor: ReturnType<typeof createInMemorySqlExecutor>;
  let customerId: string;
  let customerUserId: string;
  let barberId: string;
  let otherBarberId: string;
  let barberUserId: string;
  let serviceId: string;
  let longServiceId: string;

  beforeEach(async () => {
    factory = new InMemoryRepositoryFactory();
    executor = createInMemorySqlExecutor();

    const customers = factory.createCustomerRepository(executor);
    const barbers = factory.createBarberRepository(executor);
    const services = factory.createServiceRepository(executor);
    const schedules = factory.createBarberScheduleRepository(executor);

    customerUserId = 'customer-user-1';
    customerId = (await customers.create(createCustomer({ userId: customerUserId, name: 'Carlos', phone: '111' }))).id;
    await customers.create(createCustomer({ userId: 'customer-user-2', name: 'Ana', phone: '222' }));
    barberUserId = 'barber-user-1';
    barberId = (await barbers.create(createBarber({ userId: barberUserId, name: 'Joao' }))).id;
    otherBarberId = (await barbers.create(createBarber({ userId: 'barber-user-2', name: 'Maria' }))).id;
    serviceId = (await services.create(createService({ name: 'Corte', price: Money.fromDecimal('50.00'), durationMinutes: 30 }))).id;
    longServiceId = (await services.create(createService({ name: 'Combo', price: Money.fromDecimal('80.00'), durationMinutes: 60 }))).id;

    await schedules.create(createBarberSchedule({ barberId, dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }));
    await schedules.create(createBarberSchedule({ barberId: otherBarberId, dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }));
  });

  const createAppointment = async (dateTime = mondayAt('10:00')) => {
    const appointments = factory.createAppointmentRepository(executor);
    return new CreateAppointment(factory, executor).execute({
      customerId,
      barberId,
      serviceId,
      dateTime,
    }).then(async appointment => {
      return appointments.findById(appointment.id);
    });
  };

  const update = (id: string, input: Record<string, unknown> = {}, actor = { userId: customerUserId, role: 'CUSTOMER' as const }) =>
    new UpdateAppointment(factory, executor).execute({ id, actor, ...input });

  it('updates dateTime and excludes the appointment itself from conflicts', async () => {
    const appointment = await createAppointment();
    const updated = await update(appointment!.id, { dateTime: mondayAt('11:00') });
    expect(updated.dateTime).toEqual(mondayAt('11:00'));
  });

  it('updates service and uses the selected service duration', async () => {
    const appointment = await createAppointment();
    const updated = await update(appointment!.id, { serviceId: longServiceId });
    expect(updated.serviceId).toBe(longServiceId);
  });

  it('updates barber and notes', async () => {
    const appointment = await createAppointment();
    const updated = await update(appointment!.id, {
      barberId: otherBarberId,
      notes: 'Cliente pediu acabamento',
    });
    expect(updated.barberId).toBe(otherBarberId);
    expect(updated.notes).toBe('Cliente pediu acabamento');
  });

  it('rejects an overlapping appointment', async () => {
    await createAppointment(mondayAt('10:00'));
    const appointment = await createAppointment(mondayAt('12:00'));
    await expect(update(appointment!.id, { dateTime: mondayAt('10:15') })).rejects.toThrow(ConflictError);
  });

  it('rejects a blocked time', async () => {
    const blocks = factory.createBarberBlockRepository(executor);
    await blocks.create(createBarberBlock({
      barberId,
      startDateTime: mondayAt('12:00'),
      endDateTime: mondayAt('13:00'),
      reason: 'LUNCH',
    }));
    const appointment = await createAppointment();
    await expect(update(appointment!.id, { dateTime: mondayAt('12:15') })).rejects.toThrow(ConflictError);
  });

  it('rejects a time outside the schedule', async () => {
    const appointment = await createAppointment();
    await expect(update(appointment!.id, { dateTime: mondayAt('18:00') })).rejects.toThrow(ConflictError);
  });

  it('rejects completed appointments', async () => {
    const appointment = await createAppointment();
    const repository = factory.createAppointmentRepository(executor);
    await new ConfirmAppointment(repository).execute({ id: appointment!.id });
    await new CompleteAppointment(repository).execute({ id: appointment!.id });
    await expect(update(appointment!.id, { notes: 'novo' })).rejects.toThrow(ConflictError);
  });

  it('rejects cancelled appointments', async () => {
    const appointment = await createAppointment();
    await new CancelAppointment(factory.createAppointmentRepository(executor)).execute({ id: appointment!.id });
    await expect(update(appointment!.id, { notes: 'novo' })).rejects.toThrow(ConflictError);
  });

  it('enforces customer ownership', async () => {
    const appointment = await createAppointment();
    await expect(
      update(appointment!.id, {}, { userId: 'customer-user-2', role: 'CUSTOMER' })
    ).rejects.toThrow(InsufficientPermissionsError);
  });

  it('enforces barber ownership', async () => {
    const appointment = await createAppointment();
    await expect(
      update(appointment!.id, {}, { userId: 'barber-user-2', role: 'BARBER' })
    ).rejects.toThrow(InsufficientPermissionsError);
  });

  it('allows admin updates', async () => {
    const appointment = await createAppointment();
    const updated = await update(appointment!.id, { notes: 'admin update' }, { userId: 'admin-user', role: 'ADMIN' });
    expect(updated.notes).toBe('admin update');
  });
});
