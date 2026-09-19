import type { BarberBlock } from '../../../domain/barber-block';
import type { BarberBlockRepository } from '../../../persistence/interfaces';
import type { SqlExecutor } from '../../../persistence/interfaces';
import type { PaginationParams, PaginatedResponse } from '../../../shared/pagination';
import { BasePgRepository } from './base';

export class PgBarberBlockRepository
  extends BasePgRepository<BarberBlock>
  implements BarberBlockRepository
{
  constructor(executor: SqlExecutor) {
    super(executor, 'barber_blocks');
  }

  protected mapRow(row: Record<string, unknown>): BarberBlock {
    return {
      id: row.id as string,
      barberId: row.barber_id as string,
      startDateTime: row.start_date_time as Date,
      endDateTime: row.end_date_time as Date,
      reason: row.reason as BarberBlock['reason'],
      recurring: row.recurring as boolean,
      recurrenceRule: row.recurrence_rule as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  async create(block: BarberBlock): Promise<BarberBlock> {
    await this.executor.execute(
      `INSERT INTO barber_blocks (id, barber_id, start_date_time, end_date_time, reason, recurring, recurrence_rule, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        block.id,
        block.barberId,
        block.startDateTime,
        block.endDateTime,
        block.reason,
        block.recurring,
        block.recurrenceRule,
        block.createdAt,
        block.updatedAt,
      ]
    );
    return block;
  }

  async update(block: BarberBlock): Promise<BarberBlock> {
    await this.executor.execute(
      `UPDATE barber_blocks
       SET barber_id = $2, start_date_time = $3, end_date_time = $4, reason = $5, recurring = $6, recurrence_rule = $7, updated_at = $8
       WHERE id = $1`,
      [
        block.id,
        block.barberId,
        block.startDateTime,
        block.endDateTime,
        block.reason,
        block.recurring,
        block.recurrenceRule,
        block.updatedAt,
      ]
    );
    return block;
  }

  async findByBarberId(barberId: string): Promise<BarberBlock[]> {
    const rows = await this.executor.query(
      `SELECT * FROM barber_blocks WHERE barber_id = $1 ORDER BY start_date_time ASC`,
      [barberId]
    );
    return rows.map(row => this.mapRow(row));
  }

  async findOverlapping(barberId: string, startDateTime: Date, endDateTime: Date): Promise<BarberBlock[]> {
    const rows = await this.executor.query(
      `SELECT * FROM barber_blocks
       WHERE barber_id = $1
         AND start_date_time < $2
         AND end_date_time > $3
       ORDER BY start_date_time ASC`,
      [barberId, endDateTime, startDateTime]
    );
    return rows.map(row => this.mapRow(row));
  }

  async delete(id: string): Promise<void> {
    await this.executor.execute(`DELETE FROM barber_blocks WHERE id = $1`, [id]);
  }

  async findAll(params: PaginationParams): Promise<PaginatedResponse<BarberBlock>> {
    return super.findAll(params);
  }
}