import type { Appointment, AppointmentStatus } from '../../../domain/appointment';
import type { AppointmentRepository } from '../../../persistence/interfaces';
import type { SqlExecutor } from '../../../persistence/interfaces';
import type { PaginatedResponse } from '../../../shared/pagination';
import { BasePgRepository } from './base';

export class PgAppointmentRepository
  extends BasePgRepository<Appointment>
  implements AppointmentRepository
{
  constructor(executor: SqlExecutor) {
    super(executor, 'appointments');
  }

  protected mapRow(row: Record<string, unknown>): Appointment {
    return {
      id: row.id as string,
      customerId: row.customer_id as string,
      barberId: row.barber_id as string,
      serviceId: row.service_id as string,
      dateTime: row.date_time as Date,
      status: row.status as AppointmentStatus,
      notes: row.notes as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  async create(appointment: Appointment): Promise<Appointment> {
    await this.executor.execute(
      `INSERT INTO appointments (id, customer_id, barber_id, service_id, date_time, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        appointment.id,
        appointment.customerId,
        appointment.barberId,
        appointment.serviceId,
        appointment.dateTime,
        appointment.status,
        appointment.notes,
        appointment.createdAt,
        appointment.updatedAt,
      ]
    );
    return appointment;
  }

  async update(appointment: Appointment): Promise<Appointment> {
    await this.executor.execute(
      `UPDATE appointments
       SET customer_id = $2, barber_id = $3, service_id = $4, date_time = $5, status = $6, notes = $7, updated_at = $8
       WHERE id = $1`,
      [
        appointment.id,
        appointment.customerId,
        appointment.barberId,
        appointment.serviceId,
        appointment.dateTime,
        appointment.status,
        appointment.notes,
        appointment.updatedAt,
      ]
    );
    return appointment;
  }

  async findAll(params: { page: number; limit: number; status?: string; startDate?: string; endDate?: string }): Promise<PaginatedResponse<Appointment>> {
    const { page, limit, status, startDate, endDate } = params;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const values: unknown[] = [];
    let paramIndex = 1;

    const conditions: string[] = [];

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (startDate) {
      conditions.push(`date_time >= $${paramIndex++}`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`date_time <= $${paramIndex++}`);
      values.push(endDate);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const countQuery = `SELECT COUNT(*)::int as total FROM appointments ${whereClause}`;
    const countResult = await this.executor.queryOne(countQuery, values);
    const total = countResult?.total ?? 0;

    values.push(limit, offset);

    const dataQuery = `
      SELECT * FROM appointments
      ${whereClause}
      ORDER BY date_time ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const rows = await this.executor.query(dataQuery, values);
    const data = rows.map(row => this.mapRow(row));

    return {
      data,
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  async findConflictingAppointments(barberId: string, startDateTime: Date, endDateTime: Date): Promise<Appointment[]> {
    const rows = await this.executor.query(
      `SELECT a.*
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       WHERE a.barber_id = $1
         AND a.status IN ('PENDING', 'CONFIRMED')
         AND a.date_time < $2
         AND a.date_time + (s.duration_minutes || ' minutes')::interval > $3`,
      [barberId, endDateTime, startDateTime]
    );
    return rows.map(row => this.mapRow(row));
  }
}
