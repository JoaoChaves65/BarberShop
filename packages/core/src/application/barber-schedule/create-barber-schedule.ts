import {
  createBarberSchedule,
  type BarberSchedule,
  type CreateBarberScheduleInput,
} from '../../domain/barber-schedule';
import { EntityNotFoundError } from '../../domain/errors';
import type { BarberRepository, BarberScheduleRepository } from '../../persistence/interfaces';
import type { Command } from '../interfaces';

export class CreateBarberSchedule implements Command<CreateBarberScheduleInput, BarberSchedule> {
  constructor(
    private readonly schedules: BarberScheduleRepository,
    private readonly barbers: BarberRepository
  ) {}

  async execute(input: CreateBarberScheduleInput): Promise<BarberSchedule> {
    const barber = await this.barbers.findById(input.barberId);
    if (!barber) {
      throw new EntityNotFoundError('Barber', input.barberId);
    }

    const existing = await this.schedules.findByBarberIdAndDay(input.barberId, input.dayOfWeek);
    if (existing) {
      throw new EntityNotFoundError('BarberSchedule', `Schedule for day ${input.dayOfWeek} already exists`);
    }

    const schedule = createBarberSchedule(input);
    return this.schedules.create(schedule);
  }
}