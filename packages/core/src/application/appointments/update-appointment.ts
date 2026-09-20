import type { Appointment } from '../../domain/appointment';
import { isBarberActive } from '../../domain/barber';
import { doesBlockOverlap } from '../../domain/barber-block';
import { timeToMinutes } from '../../domain/barber-schedule';
import {
  ConflictError,
  EntityNotFoundError,
  InactiveBarberError,
  InactiveServiceError,
  InsufficientPermissionsError,
  InvalidDomainError,
} from '../../domain/errors';
import { isServiceActive } from '../../domain/service';
import type { RepositoryFactory, SqlExecutor } from '../../persistence/interfaces';
import type { Command } from '../interfaces';

export type AppointmentActorRole = 'CUSTOMER' | 'BARBER' | 'ADMIN';

export interface UpdateAppointmentInput {
  id: string;
  dateTime?: Date;
  barberId?: string;
  serviceId?: string;
  notes?: string | null;
  actor: {
    userId: string;
    role: AppointmentActorRole;
  };
}

export class UpdateAppointment implements Command<UpdateAppointmentInput, Appointment> {
  constructor(
    private readonly factory: RepositoryFactory,
    private readonly executor: SqlExecutor
  ) {}

  async execute(input: UpdateAppointmentInput): Promise<Appointment> {
    return this.executor.transaction(async txExecutor => {
      const appointments = this.factory.createAppointmentRepository(txExecutor);
      const customers = this.factory.createCustomerRepository(txExecutor);
      const barbers = this.factory.createBarberRepository(txExecutor);
      const services = this.factory.createServiceRepository(txExecutor);
      const schedules = this.factory.createBarberScheduleRepository(txExecutor);
      const blocks = this.factory.createBarberBlockRepository(txExecutor);

      const appointment = await appointments.findById(input.id);
      if (!appointment) {
        throw new EntityNotFoundError('Appointment', input.id);
      }

      if (input.actor.role === 'CUSTOMER') {
        const customer = await customers.findByUserId(input.actor.userId);
        if (!customer || customer.id !== appointment.customerId) {
          throw new InsufficientPermissionsError('Customers can only update their own appointments');
        }
      } else if (input.actor.role === 'BARBER') {
        const barber = await barbers.findByUserId(input.actor.userId);
        if (!barber || barber.id !== appointment.barberId) {
          throw new InsufficientPermissionsError('Barbers can only update their own appointments');
        }
      } else if (input.actor.role !== 'ADMIN') {
        throw new InsufficientPermissionsError('Insufficient permissions');
      }

      if (appointment.status === 'COMPLETED' || appointment.status === 'CANCELLED') {
        throw new ConflictError('Terminal appointments cannot be updated');
      }

      const customer = await customers.findById(appointment.customerId);
      if (!customer) {
        throw new EntityNotFoundError('Customer', appointment.customerId);
      }

      const barberId = input.barberId ?? appointment.barberId;
      const serviceId = input.serviceId ?? appointment.serviceId;
      const dateTime = input.dateTime ?? appointment.dateTime;

      if (Number.isNaN(dateTime.getTime())) {
        throw new InvalidDomainError('dateTime', 'dateTime must be a valid date/time');
      }

      const barber = await barbers.findById(barberId);
      if (!barber) {
        throw new EntityNotFoundError('Barber', barberId);
      }
      if (!isBarberActive(barber)) {
        throw new InactiveBarberError(barber.id);
      }

      const service = await services.findById(serviceId);
      if (!service) {
        throw new EntityNotFoundError('Service', serviceId);
      }
      if (!isServiceActive(service)) {
        throw new InactiveServiceError(service.id);
      }

      const serviceDuration = service.durationMinutes;
      const endDateTime = new Date(dateTime.getTime() + serviceDuration * 60 * 1000);
      const schedule = await schedules.findByBarberIdAndDay(barberId, dateTime.getDay());

      if (!schedule || !schedule.active) {
        throw new ConflictError('Appointment time is outside barber schedule');
      }

      const startMinutes = dateTime.getHours() * 60 + dateTime.getMinutes();
      const endMinutes = startMinutes + serviceDuration;
      if (
        startMinutes < timeToMinutes(schedule.startTime) ||
        endMinutes > timeToMinutes(schedule.endTime)
      ) {
        throw new ConflictError('Appointment time is outside barber schedule');
      }

      if (
        schedule.breakStart &&
        schedule.breakEnd &&
        startMinutes < timeToMinutes(schedule.breakEnd) &&
        endMinutes > timeToMinutes(schedule.breakStart)
      ) {
        throw new ConflictError('Appointment time overlaps barber break');
      }

      const barberBlocks = await blocks.findByBarberId(barberId);
      if (barberBlocks.some(block => doesBlockOverlap(block, dateTime, endDateTime))) {
        throw new ConflictError('Appointment time overlaps barber block');
      }

      const conflictingAppointments = await appointments.findConflictingAppointments(
        barberId,
        dateTime,
        endDateTime,
        appointment.id
      );
      if (conflictingAppointments.length > 0) {
        throw new ConflictError('Time slot is not available');
      }

      const updatedAppointment: Appointment = {
        ...appointment,
        barberId,
        serviceId,
        dateTime,
        notes: input.notes !== undefined ? input.notes?.trim() || null : appointment.notes,
        updatedAt: new Date(),
      };

      return appointments.update(updatedAppointment);
    });
  }
}
