import { describe, it, expect, beforeEach } from 'vitest';
import { CreateBarberSchedule } from './create-barber-schedule';
import { UpdateBarberSchedule } from './update-barber-schedule';
import { GetBarberSchedule } from './get-barber-schedule';
import { ListBarberSchedules } from './list-barber-schedules';
import { DeleteBarberSchedule } from './delete-barber-schedule';
import { GetBarberAvailability } from './get-barber-availability';
import { GetWeeklySchedule } from './get-weekly-schedule';
import { createBarber, type Barber } from '../../domain/barber';
import { createService, type Service } from '../../domain/service';
import { AppointmentStatus } from '../../domain/appointment';
import { Money } from '../../domain/money';
import { EntityNotFoundError } from '../../domain/errors';
import { InMemoryBarberScheduleRepository } from '../../persistence/in-memory/barber-schedule-repository';
import { InMemoryBarberBlockRepository } from '../../persistence/in-memory/barber-block-repository';
import { InMemoryBarberRepository } from '../../persistence/in-memory/barber-repository';
import { InMemoryServiceRepository } from '../../persistence/in-memory/service-repository';
import { InMemoryAppointmentRepository } from '../../persistence/in-memory/appointment-repository';

describe('BarberSchedule use cases', () => {
  let schedules: InMemoryBarberScheduleRepository;
  let blocks: InMemoryBarberBlockRepository;
  let barbers: InMemoryBarberRepository;
  let services: InMemoryServiceRepository;
  let appointments: InMemoryAppointmentRepository;
  let barber: Barber;
  let service: Service;

  beforeEach(async () => {
    schedules = new InMemoryBarberScheduleRepository();
    blocks = new InMemoryBarberBlockRepository();
    barbers = new InMemoryBarberRepository();
    services = new InMemoryServiceRepository();
    appointments = new InMemoryAppointmentRepository();

    barber = createBarber({ name: 'João Barbeiro' });
    await barbers.create(barber);

    service = createService({ name: 'Corte', price: Money.fromCents(4500), durationMinutes: 30 });
    await services.create(service);
  });

  describe('CreateBarberSchedule', () => {
    it('creates a schedule for a barber', async () => {
      const useCase = new CreateBarberSchedule(schedules, barbers);
      const schedule = await useCase.execute({
        barberId: barber.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
      });
      expect(schedule.barberId).toBe(barber.id);
      expect(schedule.dayOfWeek).toBe(1);
      expect(schedule.active).toBe(true);
    });

    it('rejects creating schedule for non-existent barber', async () => {
      const useCase = new CreateBarberSchedule(schedules, barbers);
      await expect(
        useCase.execute({
          barberId: 'missing',
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '18:00',
        })
      ).rejects.toThrow(EntityNotFoundError);
    });

    it('rejects duplicate schedule for same day', async () => {
      const useCase = new CreateBarberSchedule(schedules, barbers);
      await useCase.execute({
        barberId: barber.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
      });
      await expect(
        useCase.execute({
          barberId: barber.id,
          dayOfWeek: 1,
          startTime: '10:00',
          endTime: '19:00',
        })
      ).rejects.toThrow(EntityNotFoundError);
    });

    it('accepts break times', async () => {
      const useCase = new CreateBarberSchedule(schedules, barbers);
      const schedule = await useCase.execute({
        barberId: barber.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
        breakStart: '12:00',
        breakEnd: '13:00',
      });
      expect(schedule.breakStart).toBe('12:00');
      expect(schedule.breakEnd).toBe('13:00');
    });
  });

  describe('UpdateBarberSchedule', () => {
    it('updates schedule times', async () => {
      const create = new CreateBarberSchedule(schedules, barbers);
      const created = await create.execute({
        barberId: barber.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
      });

      const update = new UpdateBarberSchedule(schedules);
      const updated = await update.execute({
        id: created.id,
        startTime: '10:00',
        endTime: '19:00',
      });

      expect(updated.startTime).toBe('10:00');
      expect(updated.endTime).toBe('19:00');
    });

    it('throws when schedule does not exist', async () => {
      const update = new UpdateBarberSchedule(schedules);
      await expect(
        update.execute({ id: 'missing', startTime: '10:00' })
      ).rejects.toThrow(EntityNotFoundError);
    });

    it('rejects changing to existing day', async () => {
      const create = new CreateBarberSchedule(schedules, barbers);
      await create.execute({
        barberId: barber.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
      });
      const created2 = await create.execute({
        barberId: barber.id,
        dayOfWeek: 2,
        startTime: '09:00',
        endTime: '18:00',
      });

      const update = new UpdateBarberSchedule(schedules);
      await expect(
        update.execute({ id: created2.id, dayOfWeek: 1 })
      ).rejects.toThrow(EntityNotFoundError);
    });
  });

  describe('GetBarberSchedule', () => {
    it('gets an existing schedule', async () => {
      const create = new CreateBarberSchedule(schedules, barbers);
      const created = await create.execute({
        barberId: barber.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
      });

      const useCase = new GetBarberSchedule(schedules);
      const schedule = await useCase.execute({ id: created.id });
      expect(schedule?.id).toBe(created.id);
    });

    it('returns null when not found', async () => {
      const useCase = new GetBarberSchedule(schedules);
      expect(await useCase.execute({ id: 'missing' })).toBeNull();
    });
  });

  describe('ListBarberSchedules', () => {
    it('lists schedules with pagination', async () => {
      const create = new CreateBarberSchedule(schedules, barbers);
      await create.execute({ barberId: barber.id, dayOfWeek: 1, startTime: '09:00', endTime: '18:00' });
      await create.execute({ barberId: barber.id, dayOfWeek: 2, startTime: '09:00', endTime: '18:00' });

      const useCase = new ListBarberSchedules(schedules);
      const result = await useCase.execute({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });

  describe('DeleteBarberSchedule', () => {
    it('deletes a schedule', async () => {
      const create = new CreateBarberSchedule(schedules, barbers);
      const created = await create.execute({
        barberId: barber.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
      });

      const useCase = new DeleteBarberSchedule(schedules);
      await useCase.execute({ id: created.id });

      const get = new GetBarberSchedule(schedules);
      expect(await get.execute({ id: created.id })).toBeNull();
    });
  });

  describe('GetBarberAvailability', () => {
    it('returns available slots for a day with schedule', async () => {
      const create = new CreateBarberSchedule(schedules, barbers);
      await create.execute({
        barberId: barber.id,
        dayOfWeek: 1, // Monday
        startTime: '09:00',
        endTime: '12:00',
      });

      const useCase = new GetBarberAvailability(schedules, blocks, services, appointments);
      const monday = new Date();
      monday.setDate(monday.getDate() + ((1 + 7 - monday.getDay()) % 7));
      monday.setHours(0, 0, 0, 0);

      const slots = await useCase.execute({
        barberId: barber.id,
        date: monday,
        serviceId: service.id,
      });

      expect(slots.length).toBeGreaterThan(0);
      expect(slots.every(s => s.available === true)).toBe(true);
    });

    it('returns empty array when no schedule for day', async () => {
      const useCase = new GetBarberAvailability(schedules, blocks, services, appointments);
      const sunday = new Date();
      sunday.setDate(sunday.getDate() + ((0 + 7 - sunday.getDay()) % 7));
      sunday.setHours(0, 0, 0, 0);

      const slots = await useCase.execute({
        barberId: barber.id,
        date: sunday,
        serviceId: service.id,
      });

      expect(slots).toHaveLength(0);
    });

    it('marks slots as unavailable when block overlaps', async () => {
      const create = new CreateBarberSchedule(schedules, barbers);
      await create.execute({
        barberId: barber.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '12:00',
      });

      const monday = new Date();
      monday.setDate(monday.getDate() + ((1 + 7 - monday.getDay()) % 7));
      monday.setHours(0, 0, 0, 0);

      const blockStart = new Date(monday);
      blockStart.setHours(10, 0, 0, 0);
      const blockEnd = new Date(monday);
      blockEnd.setHours(11, 0, 0, 0);

      await blocks.create({
        id: 'block-1',
        barberId: barber.id,
        startDateTime: blockStart,
        endDateTime: blockEnd,
        reason: 'TIME_OFF',
        recurring: false,
        recurrenceRule: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const useCase = new GetBarberAvailability(schedules, blocks, services, appointments);
      const slots = await useCase.execute({
        barberId: barber.id,
        date: monday,
        serviceId: service.id,
      });

      const blockedSlots = slots.filter(s => !s.available);
      expect(blockedSlots.length).toBeGreaterThan(0);
    });

    it('uses the existing appointment service duration when marking slots', async () => {
      const create = new CreateBarberSchedule(schedules, barbers);
      await create.execute({
        barberId: barber.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '13:00',
      });

      const longService = createService({
        name: 'Combo longo',
        price: Money.fromCents(8000),
        durationMinutes: 60,
      });
      await services.create(longService);

      const monday = new Date();
      monday.setDate(monday.getDate() + ((1 + 7 - monday.getDay()) % 7));
      monday.setHours(10, 0, 0, 0);
      await appointments.create({
        id: 'long-appointment',
        customerId: 'customer-1',
        barberId: barber.id,
        serviceId: longService.id,
        dateTime: monday,
        status: AppointmentStatus.CONFIRMED,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const day = new Date(monday);
      day.setHours(0, 0, 0, 0);
      const useCase = new GetBarberAvailability(schedules, blocks, services, appointments);
      const slots = await useCase.execute({
        barberId: barber.id,
        date: day,
        serviceId: service.id,
      });

      expect(slots.find(slot => slot.start === '10:30')?.available).toBe(false);
    });
  });

  describe('GetWeeklySchedule', () => {
    it('returns weekly schedule for all active barbers', async () => {
      const create = new CreateBarberSchedule(schedules, barbers);
      await create.execute({
        barberId: barber.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
      });

      const useCase = new GetWeeklySchedule(schedules, blocks, barbers);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - startDate.getDay());
      startDate.setHours(0, 0, 0, 0);

      const result = await useCase.execute({ startDate });

      expect(result.length).toBe(1);
      expect(result[0].barberId).toBe(barber.id);
      expect(result[0].schedules.length).toBe(1);
    });
  });
});