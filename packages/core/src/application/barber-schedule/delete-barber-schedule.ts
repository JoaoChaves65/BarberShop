import { EntityNotFoundError } from '../../domain/errors';
import type { BarberScheduleRepository } from '../../persistence/interfaces';
import type { Command } from '../interfaces';
import type { IdInput } from '../types';

export class DeleteBarberSchedule implements Command<IdInput, void> {
  constructor(private readonly schedules: BarberScheduleRepository) {}

  async execute(input: IdInput): Promise<void> {
    const existing = await this.schedules.findById(input.id);
    if (!existing) {
      throw new EntityNotFoundError('BarberSchedule', input.id);
    }
    await this.schedules.delete(input.id);
  }
}