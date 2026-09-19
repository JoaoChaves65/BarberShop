import type { BarberScheduleRepository, BarberBlockRepository, ServiceRepository, AppointmentRepository } from '../../persistence/interfaces';
import type { Query } from '../interfaces';
import { timeToMinutes } from '../../domain/barber-schedule';
import { doesBlockOverlap } from '../../domain/barber-block';

export interface GetBarberAvailabilityInput {
  barberId: string;
  date: Date;
  serviceId: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export class GetBarberAvailability implements Query<GetBarberAvailabilityInput, TimeSlot[]> {
  constructor(
    private readonly schedules: BarberScheduleRepository,
    private readonly blocks: BarberBlockRepository,
    private readonly services: ServiceRepository,
    private readonly appointments: AppointmentRepository
  ) {}

  async execute(input: GetBarberAvailabilityInput): Promise<TimeSlot[]> {
    const dayOfWeek = input.date.getDay();

    const schedule = await this.schedules.findByBarberIdAndDay(input.barberId, dayOfWeek);
    if (!schedule || !schedule.active) {
      return [];
    }

    const service = await this.services.findById(input.serviceId);
    if (!service || !service.active) {
      return [];
    }

    const serviceDuration = service.durationMinutes;
    const scheduleStart = timeToMinutes(schedule.startTime);
    const scheduleEnd = timeToMinutes(schedule.endTime);

    const blocks = await this.blocks.findByBarberId(input.barberId);
    const dayStart = new Date(input.date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(input.date);
    dayEnd.setHours(23, 59, 59, 999);

    const dayBlocks = blocks.filter(b =>
      b.startDateTime < dayEnd && b.endDateTime > dayStart
    );

    const conflictingAppointments = await this.appointments.findConflictingAppointments(
      input.barberId,
      dayStart,
      dayEnd
    );

    const slots: TimeSlot[] = [];
    const slotInterval = 15;

    for (let minutes = scheduleStart; minutes + serviceDuration <= scheduleEnd; minutes += slotInterval) {
      if (schedule.breakStart && schedule.breakEnd) {
        const breakStart = timeToMinutes(schedule.breakStart);
        const breakEnd = timeToMinutes(schedule.breakEnd);
        if (minutes < breakEnd && minutes + serviceDuration > breakStart) {
          continue;
        }
      }

      const slotStart = new Date(input.date);
      slotStart.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60 * 1000);

      const hasBlockConflict = dayBlocks.some(b => doesBlockOverlap(b, slotStart, slotEnd));

      const hasAppointmentConflict = conflictingAppointments.some(appt => {
        const apptStart = appt.dateTime;
        const apptEnd = new Date(apptStart.getTime() + serviceDuration * 60 * 1000);
        return apptStart < slotEnd && apptEnd > slotStart;
      });

      slots.push({
        start: this.formatTime(slotStart),
        end: this.formatTime(slotEnd),
        available: !hasBlockConflict && !hasAppointmentConflict,
      });
    }

    return slots;
  }

  private formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5);
  }
}