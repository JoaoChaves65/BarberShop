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
  SqlExecutor,
  RepositoryFactory,
} from '../../persistence/interfaces';
import type { Command } from '../interfaces';

export class CreateAppointment implements Command<CreateAppointmentInput, Appointment> {
  constructor(
    private readonly factory: RepositoryFactory,
    private readonly executor: SqlExecutor
  ) {}

  async execute(input: CreateAppointmentInput): Promise<Appointment> {
    return this.executor.transaction(async (txExecutor) => {
      const appointments = this.factory.createAppointmentRepository(txExecutor);
      const customers = this.factory.createCustomerRepository(txExecutor);
      const barbers = this.factory.createBarberRepository(txExecutor);
      const services = this.factory.createServiceRepository(txExecutor);

      const customer = await customers.findById(input.customerId);
      if (!customer) {
        throw new EntityNotFoundError('Customer', input.customerId);
      }

      const barber = await barbers.findById(input.barberId);
      if (!barber) {
        throw new EntityNotFoundError('Barber', input.barberId);
      }
      if (!isBarberActive(barber)) {
        throw new InactiveBarberError(barber.id);
      }

      const service = await services.findById(input.serviceId);
      if (!service) {
        throw new EntityNotFoundError('Service', input.serviceId);
      }
      if (!isServiceActive(service)) {
        throw new InactiveServiceError(service.id);
      }

      const serviceDuration = service.durationMinutes;
      const startDateTime = input.dateTime;
      const endDateTime = new Date(startDateTime.getTime() + serviceDuration * 60 * 1000);

      const conflictingAppointments = await appointments.findConflictingAppointments(input.barberId, startDateTime, endDateTime);
      if (conflictingAppointments.length > 0) {
        throw new ConflictError('Time slot is not available');
      }

      const appointment = createAppointment(input);
      return appointments.create(appointment);
    });
  }
}
