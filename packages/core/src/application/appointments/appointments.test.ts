import { describe, it, expect, beforeEach } from 'vitest';
import { CreateAppointment } from './create-appointment';
import {
  ConfirmAppointment,
  CancelAppointment,
  CompleteAppointment,
} from './change-appointment-status';
import { GetAppointment } from './get-appointment';
import { ListAppointments } from './list-appointments';
import { AppointmentStatus } from '../../domain/appointment';
import { createBarber } from '../../domain/barber';
import { createCustomer } from '../../domain/customer';
import { createService } from '../../domain/service';
import { Money } from '../../domain/money';
import {
  EntityNotFoundError,
  InactiveBarberError,
  InactiveServiceError,
  InvalidStatusTransitionError,
} from '../../domain/errors';
import { InMemoryRepositoryFactory } from '../../persistence/in-memory/factory';
import { createInMemorySqlExecutor } from '../../persistence/in-memory/sql-executor';

describe('Appointment use cases', () => {
  let factory: InMemoryRepositoryFactory;
  let executor: ReturnType<typeof createInMemorySqlExecutor>;
  let customerId: string;
  let barberId: string;
  let serviceId: string;

  beforeEach(async () => {
    factory = new InMemoryRepositoryFactory();
    executor = createInMemorySqlExecutor();

    const customers = factory.createCustomerRepository(executor);
    const barbers = factory.createBarberRepository(executor);
    const services = factory.createServiceRepository(executor);

    const customer = await customers.create(createCustomer({ name: 'Carlos', phone: '(11) 99999-1111' }));
    customerId = customer.id;
    barberId = (await barbers.create(createBarber({ name: 'João' }))).id;
    serviceId = (
      await services.create(
        createService({ name: 'Corte', price: Money.fromDecimal('50.00'), durationMinutes: 45 })
      )
    ).id;
  });

  const buildUseCase = () => new CreateAppointment(factory, executor);

  describe('CreateAppointment', () => {
    it('creates a PENDING appointment', async () => {
      const created = await buildUseCase().execute({
        customerId,
        barberId,
        serviceId,
        dateTime: new Date('2026-09-01T14:00:00Z'),
      });
      expect(created.status).toBe(AppointmentStatus.PENDING);
    });

    it('rejects unknown customer', async () => {
      await expect(
        buildUseCase().execute({
          customerId: 'missing',
          barberId,
          serviceId,
          dateTime: new Date(),
        })
      ).rejects.toThrow(EntityNotFoundError);
    });

    it('rejects unknown barber', async () => {
      await expect(
        buildUseCase().execute({
          customerId,
          barberId: 'missing',
          serviceId,
          dateTime: new Date(),
        })
      ).rejects.toThrow(EntityNotFoundError);
    });

    it('rejects inactive barber', async () => {
      const barbers = factory.createBarberRepository(executor);
      const barber = await barbers.findById(barberId);
      await barbers.update({ ...barber!, active: false });
      await expect(
        buildUseCase().execute({ customerId, barberId, serviceId, dateTime: new Date() })
      ).rejects.toThrow(InactiveBarberError);
    });

    it('rejects unknown service', async () => {
      await expect(
        buildUseCase().execute({
          customerId,
          barberId,
          serviceId: 'missing',
          dateTime: new Date(),
        })
      ).rejects.toThrow(EntityNotFoundError);
    });

    it('rejects inactive service', async () => {
      const services = factory.createServiceRepository(executor);
      const service = await services.findById(serviceId);
      await services.update({ ...service!, active: false });
      await expect(
        buildUseCase().execute({ customerId, barberId, serviceId, dateTime: new Date() })
      ).rejects.toThrow(InactiveServiceError);
    });
  });

  describe('status transitions', () => {
    const createOne = () =>
      buildUseCase().execute({
        customerId,
        barberId,
        serviceId,
        dateTime: new Date('2026-09-01T14:00:00Z'),
      });

    it('confirms a PENDING appointment', async () => {
      const appointment = await createOne();
      const confirmed = await new ConfirmAppointment(factory.createAppointmentRepository(executor)).execute({ id: appointment.id });
      expect(confirmed.status).toBe(AppointmentStatus.CONFIRMED);
    });

    it('cancels a PENDING appointment', async () => {
      const appointment = await createOne();
      const cancelled = await new CancelAppointment(factory.createAppointmentRepository(executor)).execute({ id: appointment.id });
      expect(cancelled.status).toBe(AppointmentStatus.CANCELLED);
    });

    it('completes a CONFIRMED appointment', async () => {
      const appointment = await createOne();
      await new ConfirmAppointment(factory.createAppointmentRepository(executor)).execute({ id: appointment.id });
      const completed = await new CompleteAppointment(factory.createAppointmentRepository(executor)).execute({ id: appointment.id });
      expect(completed.status).toBe(AppointmentStatus.COMPLETED);
    });

    it('rejects completing a PENDING appointment', async () => {
      const appointment = await createOne();
      await expect(
        new CompleteAppointment(factory.createAppointmentRepository(executor)).execute({ id: appointment.id })
      ).rejects.toThrow(InvalidStatusTransitionError);
    });

    it('rejects confirming an already-completed appointment', async () => {
      const appointment = await createOne();
      await new ConfirmAppointment(factory.createAppointmentRepository(executor)).execute({ id: appointment.id });
      await new CompleteAppointment(factory.createAppointmentRepository(executor)).execute({ id: appointment.id });
      await expect(
        new ConfirmAppointment(factory.createAppointmentRepository(executor)).execute({ id: appointment.id })
      ).rejects.toThrow(InvalidStatusTransitionError);
    });

    it('rejects transition of an unknown appointment', async () => {
      await expect(new ConfirmAppointment(factory.createAppointmentRepository(executor)).execute({ id: 'missing' })).rejects.toThrow(
        EntityNotFoundError
      );
    });
  });

  describe('GetAppointment', () => {
    it('gets an existing appointment', async () => {
      const created = await buildUseCase().execute({
        customerId,
        barberId,
        serviceId,
        dateTime: new Date('2026-09-01T14:00:00Z'),
      });
      const useCase = new GetAppointment(factory.createAppointmentRepository(executor));
      expect((await useCase.execute({ id: created.id }))?.id).toBe(created.id);
    });

    it('returns null when not found', async () => {
      const useCase = new GetAppointment(factory.createAppointmentRepository(executor));
      expect(await useCase.execute({ id: 'missing' })).toBeNull();
    });
  });

  describe('ListAppointments', () => {
    it('lists appointments with pagination', async () => {
      const useCase = buildUseCase();
      await useCase.execute({ customerId, barberId, serviceId, dateTime: new Date() });
      await useCase.execute({ customerId, barberId, serviceId, dateTime: new Date('2026-09-02') });

      const list = new ListAppointments(factory.createAppointmentRepository(executor));
      const result = await list.execute({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });
});
