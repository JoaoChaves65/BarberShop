import {
  updateBarberSchedule,
  type BarberSchedule,
  type UpdateBarberScheduleInput,
} from '../../domain/barber-schedule';
import { EntityNotFoundError } from '../../domain/errors';
import type { BarberScheduleRepository } from '../../persistence/interfaces';
import type { Command } from '../interfaces';

export interface UpdateBarberScheduleCommandInput extends UpdateBarberScheduleInput {
  id: string;
}

export class UpdateBarberSchedule implements Command<UpdateBarberScheduleCommandInput, BarberSchedule> {
  constructor(private readonly schedules: BarberScheduleRepository) {}

  async execute(input: UpdateBarberScheduleCommandInput): Promise<BarberSchedule> {
    const existing = await this.schedules.findById(input.id);
    if (!existing) {
      throw new EntityNotFoundError('BarberSchedule', input.id);
    }

    if (input.dayOfWeek !== undefined && input.dayOfWeek !== existing.dayOfWeek) {
      const conflict = await this.schedules.findByBarberIdAndDay(existing.barberId, input.dayOfWeek);
      if (conflict && conflict.id !== input.id) {
        throw new EntityNotFoundError('BarberSchedule', `Schedule for day ${input.dayOfWeek} already exists`);
      }
    }

    const updated = updateBarberSchedule(existing, input);
    return this.schedules.update(updated);
  }
}