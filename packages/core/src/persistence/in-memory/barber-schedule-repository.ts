import type { BarberSchedule } from '../../domain/barber-schedule';
import type { BarberScheduleRepository } from '../../persistence/interfaces';
import type { PaginationParams, PaginatedResponse } from '../../shared/pagination';
import { InMemoryRepository } from './base';

export class InMemoryBarberScheduleRepository
  extends InMemoryRepository<BarberSchedule>
  implements BarberScheduleRepository
{
  async create(schedule: BarberSchedule): Promise<BarberSchedule> {
    return this.store(schedule);
  }

  async update(schedule: BarberSchedule): Promise<BarberSchedule> {
    return this.replace(schedule);
  }

  async findById(id: string): Promise<BarberSchedule | null> {
    return this.get(id);
  }

  async findByBarberId(barberId: string): Promise<BarberSchedule[]> {
    const results: BarberSchedule[] = [];
    for (const schedule of this.items.values()) {
      if (schedule.barberId === barberId) {
        results.push(schedule);
      }
    }
    return results.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }

  async findByBarberIdAndDay(barberId: string, dayOfWeek: number): Promise<BarberSchedule | null> {
    for (const schedule of this.items.values()) {
      if (schedule.barberId === barberId && schedule.dayOfWeek === dayOfWeek) {
        return schedule;
      }
    }
    return null;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }

  async findAll(params: PaginationParams): Promise<PaginatedResponse<BarberSchedule>> {
    return this.list(params);
  }
}