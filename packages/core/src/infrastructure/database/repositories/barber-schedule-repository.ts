import type { BarberSchedule } from '../../../domain/barber-schedule';
import type { BarberScheduleRepository } from '../../../persistence/interfaces';
import type { SqlExecutor } from '../../../persistence/interfaces';
import type { PaginationParams, PaginatedResponse } from '../../../shared/pagination';
import { BasePgRepository } from './base';

export class PgBarberScheduleRepository
  extends BasePgRepository<BarberSchedule>
  implements BarberScheduleRepository
{
  constructor(executor: SqlExecutor) {
    super(executor, 'barber_schedules');
  }

  protected mapRow(row: Record<string, unknown>): BarberSchedule {
    return {
      id: row.id as string,
      barberId: row.barber_id as string,
      dayOfWeek: row.day_of_week as number,
      startTime: row.start_time as string,
      endTime: row.end_time as string,
      breakStart: row.break_start as string | null,
      breakEnd: row.break_end as string | null,
      active: row.active as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  async create(schedule: BarberSchedule): Promise<BarberSchedule> {
    await this.executor.execute(
      `INSERT INTO barber_schedules (id, barber_id, day_of_week, start_time, end_time, break_start, break_end, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        schedule.id,
        schedule.barberId,
        schedule.dayOfWeek,
        schedule.startTime,
        schedule.endTime,
        schedule.breakStart,
        schedule.breakEnd,
        schedule.active,
        schedule.createdAt,
        schedule.updatedAt,
      ]
    );
    return schedule;
  }

  async update(schedule: BarberSchedule): Promise<BarberSchedule> {
    await this.executor.execute(
      `UPDATE barber_schedules
       SET barber_id = $2, day_of_week = $3, start_time = $4, end_time = $5, break_start = $6, break_end = $7, active = $8, updated_at = $9
       WHERE id = $1`,
      [
        schedule.id,
        schedule.barberId,
        schedule.dayOfWeek,
        schedule.startTime,
        schedule.endTime,
        schedule.breakStart,
        schedule.breakEnd,
        schedule.active,
        schedule.updatedAt,
      ]
    );
    return schedule;
  }

  async findByBarberId(barberId: string): Promise<BarberSchedule[]> {
    const rows = await this.executor.query(
      `SELECT * FROM barber_schedules WHERE barber_id = $1 ORDER BY day_of_week ASC`,
      [barberId]
    );
    return rows.map(row => this.mapRow(row));
  }

  async findByBarberIdAndDay(barberId: string, dayOfWeek: number): Promise<BarberSchedule | null> {
    const row = await this.executor.queryOne(
      `SELECT * FROM barber_schedules WHERE barber_id = $1 AND day_of_week = $2`,
      [barberId, dayOfWeek]
    );
    return row ? this.mapRow(row) : null;
  }

  async delete(id: string): Promise<void> {
    await this.executor.execute(`DELETE FROM barber_schedules WHERE id = $1`, [id]);
  }

  async findAll(params: PaginationParams): Promise<PaginatedResponse<BarberSchedule>> {
    return super.findAll(params);
  }
}