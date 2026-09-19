import {
  createAppointment,
  type Appointment,
  type CreateAppointmentInput,
} from '../../domain/appointment';
import { isBarberActive } from '../../domain/barber';
import {
  EntityNotFoundError,
  InactiveBarberError,
  InactiveServiceError,
  ConflictError,
} from '../../domain/errors';
import { isServiceActive } from '../../domain/service';
import type {
  AppointmentRepository,
  BarberRepository,
  CustomerRepository,
  ServiceRepository,
  SqlExecutor,
} from '../../persistence/interfaces';
import type { Command } from '../interfaces';

export class CreateAppointment implements Command<CreateAppointmentInput, Appointment> {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly customers: CustomerRepository,
    private readonly barbers: BarberRepository,
    private readonly services: ServiceRepository,
    private readonly executor: SqlExecutor
  ) {}

  async execute(input: CreateAppointmentInput): Promise<Appointment> {
    return this.executor.transaction(async (txExecutor) => {
      const { PgAppointmentRepository } = await import('../../infrastructure/database/repositories/appointment-repository.js');
      const { PgCustomerRepository } = await import('../../infrastructure/database/repositories/customer-repository.js');
      const { PgBarberRepository } = await import('../../infrastructure/database/repositories/barber-repository.js');
      const { PgServiceRepository } = await import('../../infrastructure/database/repositories/service-repository.js');

      const txAppointments = new PgAppointmentRepository(txExecutor);
      const txCustomers = new PgCustomerRepository(txExecutor);
      const txBarbers = new PgBarberRepository(txExecutor);
      const txServices = new PgServiceRepository(txExecutor);

      const customer = await txCustomers.findById(input.customerId);
      if (!customer) {
        throw new EntityNotFoundError('Customer', input.customerId);
      }

      const barber = await txBarbers.findById(input.barberId);
      if (!barber) {
        throw new EntityNotFoundError('Barber', input.barberId);
      }
      if (!isBarberActive(barber)) {
        throw new InactiveBarberError(barber.id);
      }

      const service = await txServices.findById(input.serviceId);
      if (!service) {
        throw new EntityNotFoundError('Service', input.serviceId);
      }
      if (!isServiceActive(service)) {
        throw new InactiveServiceError(service.id);
      }

      const serviceDuration = service.durationMinutes;
      const startDateTime = input.dateTime;
      const endDateTime = new Date(startDateTime.getTime() + serviceDuration * 60 * 1000);

      const conflictingAppointments = await txAppointments.findConflictingAppointments(input.barberId, startDateTime, endDateTime);
      if (conflictingAppointments.length > 0) {
        throw new ConflictError('Time slot is not available');
      }

      const appointment = createAppointment(input);
      return txAppointments.create(appointment);
    });
  }
}
