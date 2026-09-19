/**
 * In-memory AppointmentRepository for unit tests.
 */

import { AppointmentStatus } from '../../domain/appointment';
import type { Appointment } from '../../domain/appointment';
import type { PaginationParams, PaginatedResponse } from '../../shared/pagination';
import type { AppointmentRepository } from '../interfaces';
import { InMemoryRepository } from './base';

const CONFLICTING_STATUSES: readonly AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
];

export class InMemoryAppointmentRepository
  extends InMemoryRepository<Appointment>
  implements AppointmentRepository
{
  async create(appointment: Appointment): Promise<Appointment> {
    return this.store(appointment);
  }

  async update(appointment: Appointment): Promise<Appointment> {
    return this.replace(appointment);
  }

  async findById(id: string): Promise<Appointment | null> {
    return this.get(id);
  }

  async findAll(params: PaginationParams): Promise<PaginatedResponse<Appointment>> {
    return this.list(params);
  }

  async findConflictingAppointments(barberId: string, startDateTime: Date, endDateTime: Date): Promise<Appointment[]> {
    const results: Appointment[] = [];
    for (const appointment of this.items.values()) {
      if (appointment.barberId === barberId && CONFLICTING_STATUSES.includes(appointment.status)) {
        if (appointment.dateTime < endDateTime) {
          const serviceDuration = 30;
          const appointmentEnd = new Date(appointment.dateTime.getTime() + serviceDuration * 60 * 1000);
          if (appointmentEnd > startDateTime) {
            results.push(appointment);
          }
        }
      }
    }
    return results;
  }
}
