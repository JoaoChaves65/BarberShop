import type { BarberSchedule } from '../../domain/barber-schedule';
import type { BarberScheduleRepository } from '../../persistence/interfaces';
import type { Query } from '../interfaces';
import type { IdInput } from '../types';

export class GetBarberSchedule implements Query<IdInput, BarberSchedule | null> {
  constructor(private readonly schedules: BarberScheduleRepository) {}

  async execute(input: IdInput): Promise<BarberSchedule | null> {
    return this.schedules.findById(input.id);
  }
}