import type { BarberSchedule } from '../../domain/barber-schedule';
import type { BarberBlock } from '../../domain/barber-block';
import type { Barber } from '../../domain/barber';
import type { BarberScheduleRepository, BarberBlockRepository, BarberRepository } from '../../persistence/interfaces';
import type { Query } from '../interfaces';
import { validatePagination } from '../../shared/pagination';

export interface WeeklyScheduleItem {
  barberId: string;
  barberName: string;
  schedules: BarberSchedule[];
  blocks: BarberBlock[];
}

export interface GetWeeklyScheduleInput {
  startDate: Date;
  barberIds?: string[];
}

export class GetWeeklySchedule implements Query<GetWeeklyScheduleInput, WeeklyScheduleItem[]> {
  constructor(
    private readonly schedules: BarberScheduleRepository,
    private readonly blocks: BarberBlockRepository,
    private readonly barbers: BarberRepository
  ) {}

  async execute(input: GetWeeklyScheduleInput): Promise<WeeklyScheduleItem[]> {
    const barbersResult = input.barberIds
      ? await Promise.all(input.barberIds.map(id => this.barbers.findById(id)))
      : await this.barbers.findAll(validatePagination({ page: 1, limit: 100 }));

    const barberList = Array.isArray(barbersResult) ? barbersResult : barbersResult.data;
    const activeBarbers = barberList.filter((b): b is Barber => b !== null && b.active);

    const endDate = new Date(input.startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    const result: WeeklyScheduleItem[] = [];

    for (const barber of activeBarbers) {
      const barberSchedules = await this.schedules.findByBarberId(barber.id);
      const barberBlocks = await this.blocks.findByBarberId(barber.id);

      const relevantBlocks = barberBlocks.filter(b =>
        b.startDateTime < endDate && b.endDateTime > input.startDate
      );

      result.push({
        barberId: barber.id,
        barberName: barber.name,
        schedules: barberSchedules,
        blocks: relevantBlocks,
      });
    }

    return result;
  }
}