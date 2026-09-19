import type { BarberSchedule } from '../../domain/barber-schedule';
import type { BarberScheduleRepository } from '../../persistence/interfaces';
import type { PaginatedQuery } from '../interfaces';
import { validatePagination } from '../../shared/pagination';
import type { PaginatedResponse } from '../../shared/pagination';
import type { ListInput } from '../types';

export class ListBarberSchedules implements PaginatedQuery<ListInput, BarberSchedule> {
  constructor(private readonly schedules: BarberScheduleRepository) {}

  async execute(input: ListInput): Promise<PaginatedResponse<BarberSchedule>> {
    return this.schedules.findAll(validatePagination(input));
  }
}