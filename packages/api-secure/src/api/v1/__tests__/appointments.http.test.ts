/* eslint-disable @typescript-eslint/consistent-type-imports */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { setupTestEnvironment } from './test-utils';
import { getTestPool } from '@barberlab/core/infrastructure';
import { randomUUID } from 'node:crypto';

describe('Appointments API - /api/v1/appointments', () => {
  let app: ReturnType<typeof import('../../../http/app').createApp>;
  let customer1Token: string;
  let customer2Token: string;
  let barber1Token: string;
  let barber2Token: string;
  let adminToken: string;
  let customer1CustId: string;
  let customer2CustId: string;
  let barber1BarberId: string;
  let service1Id: string;
  let service2Id: string;
  let service3Id: string;
  let pendingApptId: string;
  let confirmedApptId: string;
  let completedApptId: string;
  // Dedicated appointments for mutating tests (created in beforeAll)
  let barberConfirmApptId: string;
  let barberCompleteApptId: string;
  let adminTransitionApptId: string;
  let customerCancelApptId: string;

  beforeAll(async () => {
    const setup = await setupTestEnvironment();
    app = setup.app;
    customer1Token = setup.customer1Token;
    customer2Token = setup.customer2Token;
    barber1Token = setup.barber1Token;
    barber2Token = setup.barber2Token;
    adminToken = setup.adminToken;
    service1Id = setup.service1Id;
    service2Id = setup.service2Id;
    service3Id = setup.service3Id;
    pendingApptId = setup.appt1Id;
    confirmedApptId = setup.appt2Id;
    completedApptId = setup.appt3Id;
    customer1CustId = setup.customer1CustId;
    customer2CustId = setup.customer2CustId;
    barber1BarberId = setup.barber1BarberId;

    // Create dedicated appointments for mutating tests
    const pool = getTestPool();

    // Appointment for customer to cancel
    customerCancelApptId = randomUUID();
    await pool.query(
      `INSERT INTO appointments (id, customer_id, barber_id, service_id, date_time, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        customerCancelApptId,
        customer1CustId,
        barber1BarberId,
        service1Id,
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        'PENDING',
        'Customer cancel test',
        new Date(),
        new Date(),
      ]
    );

    // Appointment for barber to confirm (fresh, not cancelled by customer test)
    barberConfirmApptId = randomUUID();
    await pool.query(
      `INSERT INTO appointments (id, customer_id, barber_id, service_id, date_time, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        barberConfirmApptId,
        customer1CustId,
        barber1BarberId,
        service1Id,
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        'PENDING',
        'Barber confirm test',
        new Date(),
        new Date(),
      ]
    );

    barberCompleteApptId = randomUUID();
    await pool.query(
      `INSERT INTO appointments (id, customer_id, barber_id, service_id, date_time, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        barberCompleteApptId,
        customer1CustId,
        barber1BarberId,
        service2Id,
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        'CONFIRMED',
        'Barber complete test',
        new Date(),
        new Date(),
      ]
    );

    adminTransitionApptId = randomUUID();
    await pool.query(
      `INSERT INTO appointments (id, customer_id, barber_id, service_id, date_time, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        adminTransitionApptId,
        customer1CustId,
        barber1BarberId,
        service3Id,
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        'CONFIRMED',
        'Admin transition test',
        new Date(),
        new Date(),
      ]
    );

    const scheduledTime = new Date();
    scheduledTime.setDate(scheduledTime.getDate() + 1);
    scheduledTime.setHours(10, 0, 0, 0);
    await pool.query(
      `INSERT INTO barber_schedules (id, barber_id, day_of_week, start_time, end_time, break_start, break_end, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        randomUUID(),
        barber1BarberId,
        scheduledTime.getDay(),
        '09:00',
        '18:00',
        null,
        null,
        true,
        new Date(),
        new Date(),
      ]
    );
    await pool.query(
      `UPDATE appointments SET date_time = $1 WHERE id IN ($2, $3, $4)`,
      [scheduledTime, pendingApptId, confirmedApptId, completedApptId]
    );
  });

  describe('GET /api/v1/appointments', () => {
    it('CUSTOMER: lists own appointments', async () => {
      const res = await request(app)
        .get('/api/v1/appointments')
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(200);

      expect(
        res.body.data.every((a: { customerId: string }) => a.customerId === customer1CustId)
      ).toBe(true);
      expect(res.body.data[0].passwordHash).toBeUndefined();
    });

    it('BARBER: lists own appointments', async () => {
      const res = await request(app)
        .get('/api/v1/appointments')
        .set('Authorization', `Bearer ${barber1Token}`)
        .expect(200);

      expect(res.body.data.every((a: { barberId: string }) => a.barberId === barber1BarberId)).toBe(
        true
      );
    });

    it('ADMIN: lists all appointments', async () => {
      const res = await request(app)
        .get('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('CUSTOMER: cannot see other customer appointments', async () => {
      const res = await request(app)
        .get('/api/v1/appointments')
        .set('Authorization', `Bearer ${customer2Token}`)
        .expect(200);

      expect(
        res.body.data.every((a: { customerId: string }) => a.customerId !== customer1CustId)
      ).toBe(true);
    });
  });

  describe('GET /api/v1/appointments/:id', () => {
    it('CUSTOMER: accesses own appointment', async () => {
      const res = await request(app)
        .get(`/api/v1/appointments/${pendingApptId}`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(200);

      expect(res.body.id).toBe(pendingApptId);
      expect(res.body.customerId).toBe(customer1CustId);
    });

    it('CUSTOMER: accesses another customer appointment -> 403', async () => {
      await request(app)
        .get(`/api/v1/appointments/${confirmedApptId}`)
        .set('Authorization', `Bearer ${customer2Token}`)
        .expect(403);
    });

    it('BARBER: accesses own appointment', async () => {
      const res = await request(app)
        .get(`/api/v1/appointments/${pendingApptId}`)
        .set('Authorization', `Bearer ${barber1Token}`)
        .expect(200);

      expect(res.body.id).toBe(pendingApptId);
    });

    it('BARBER: accesses another barber appointment -> 403', async () => {
      await request(app)
        .get(`/api/v1/appointments/${confirmedApptId}`)
        .set('Authorization', `Bearer ${barber2Token}`)
        .expect(403);
    });

    it('ADMIN: accesses any appointment', async () => {
      const res = await request(app)
        .get(`/api/v1/appointments/${pendingApptId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(pendingApptId);
    });

    it('Non-existent appointment -> 404', async () => {
      await request(app)
        .get(`/api/v1/appointments/${randomUUID()}`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(404);
    });
  });

  describe('POST /api/v1/appointments', () => {
    it('CUSTOMER: creates appointment for self', async () => {
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          customerId: customer1CustId,
          barberId: barber1BarberId,
          serviceId: service1Id,
          dateTime: dayAfterTomorrow,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.customerId).toBe(customer1CustId);
      expect(res.body.barberId).toBe(barber1BarberId);
      expect(res.body.serviceId).toBe(service1Id);
      expect(res.body.status).toBe('PENDING');
    });

    it('CUSTOMER: tries to create for another customer -> 403', async () => {
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          customerId: customer2CustId,
          barberId: barber1BarberId,
          serviceId: service1Id,
          dateTime: dayAfterTomorrow,
        })
        .expect(403);
    });

    it('ADMIN: creates appointment for any customer', async () => {
      const threeDaysFromNow = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customer1CustId,
          barberId: barber1BarberId,
          serviceId: service1Id,
          dateTime: threeDaysFromNow,
        })
        .expect(201);

      expect(res.body.customerId).toBe(customer1CustId);
    });

    it('Invalid barber -> 404', async () => {
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          customerId: customer1CustId,
          barberId: randomUUID(),
          serviceId: service1Id,
          dateTime: dayAfterTomorrow,
        })
        .expect(404);
    });

    it('Invalid service -> 404', async () => {
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          customerId: customer1CustId,
          barberId: barber1BarberId,
          serviceId: randomUUID(),
          dateTime: dayAfterTomorrow,
        })
        .expect(404);
    });

    it('Past dateTime -> 201', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          customerId: customer1CustId,
          barberId: barber1BarberId,
          serviceId: service1Id,
          dateTime: yesterday,
        })
        .expect(201);
    });

    it('Missing fields -> 400', async () => {
      await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          barberId: barber1BarberId,
        })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/appointments/:id/status', () => {
    it('CUSTOMER: cancels own pending appointment', async () => {
      const res = await request(app)
        .patch(`/api/v1/appointments/${customerCancelApptId}/status`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ action: 'cancel' })
        .expect(200);

      expect(res.body.status).toBe('CANCELLED');
    });

    it('CUSTOMER: tries to cancel another customer appointment -> 403', async () => {
      await request(app)
        .patch(`/api/v1/appointments/${confirmedApptId}/status`)
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({ action: 'cancel' })
        .expect(403);
    });

    it('CUSTOMER: tries to confirm -> 403', async () => {
      await request(app)
        .patch(`/api/v1/appointments/${barberConfirmApptId}/status`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ action: 'confirm' })
        .expect(403);
    });

    it('BARBER: confirms own pending appointment', async () => {
      const res = await request(app)
        .patch(`/api/v1/appointments/${barberConfirmApptId}/status`)
        .set('Authorization', `Bearer ${barber1Token}`)
        .send({ action: 'confirm' })
        .expect(200);

      expect(res.body.status).toBe('CONFIRMED');
    });

    it('BARBER: completes own confirmed appointment', async () => {
      const res = await request(app)
        .patch(`/api/v1/appointments/${barberCompleteApptId}/status`)
        .set('Authorization', `Bearer ${barber1Token}`)
        .send({ action: 'complete' })
        .expect(200);

      expect(res.body.status).toBe('COMPLETED');
    });

    it('BARBER: tries to access another barber appointment -> 403', async () => {
      await request(app)
        .patch(`/api/v1/appointments/${confirmedApptId}/status`)
        .set('Authorization', `Bearer ${barber2Token}`)
        .send({ action: 'complete' })
        .expect(403);
    });

    it('BARBER: tries to cancel -> 403', async () => {
      await request(app)
        .patch(`/api/v1/appointments/${barberConfirmApptId}/status`)
        .set('Authorization', `Bearer ${barber1Token}`)
        .send({ action: 'cancel' })
        .expect(403);
    });

    it('ADMIN: can perform any valid status transition', async () => {
      const res = await request(app)
        .patch(`/api/v1/appointments/${adminTransitionApptId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'cancel' })
        .expect(200);

      expect(res.body.status).toBe('CANCELLED');
    });

    it('Invalid transition -> 409', async () => {
      await request(app)
        .patch(`/api/v1/appointments/${confirmedApptId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'confirm' })
        .expect(409);
    });

    it('Non-existent appointment -> 404', async () => {
      await request(app)
        .patch(`/api/v1/appointments/${randomUUID()}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'cancel' })
        .expect(404);
    });
  });

  describe('PATCH /api/v1/appointments/:id', () => {
    it('ADMIN: updates dateTime, service, barber and notes', async () => {
      const rescheduleTime = new Date();
      rescheduleTime.setDate(rescheduleTime.getDate() + 1);
      rescheduleTime.setHours(12, 0, 0, 0);

      const res = await request(app)
        .patch(`/api/v1/appointments/${pendingApptId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dateTime: rescheduleTime.toISOString(),
          barberId: barber1BarberId,
          serviceId: service3Id,
          notes: 'Reagendado pelo administrador',
        })
        .expect(200);

      expect(res.body.serviceId).toBe(service3Id);
      expect(res.body.barberId).toBe(barber1BarberId);
      expect(res.body.notes).toBe('Reagendado pelo administrador');
    });

    it('rejects invalid payload -> 400', async () => {
      await request(app)
        .patch(`/api/v1/appointments/${pendingApptId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 123 })
        .expect(400);
    });

    it('requires authentication -> 401', async () => {
      await request(app)
        .patch(`/api/v1/appointments/${pendingApptId}`)
        .send({ notes: 'sem token' })
        .expect(401);
    });

    it('CUSTOMER cannot update another customer appointment -> 403', async () => {
      await request(app)
        .patch(`/api/v1/appointments/${confirmedApptId}`)
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({ notes: 'não permitido' })
        .expect(403);
    });

    it('BARBER cannot update another barber appointment -> 403', async () => {
      await request(app)
        .patch(`/api/v1/appointments/${confirmedApptId}`)
        .set('Authorization', `Bearer ${barber2Token}`)
        .send({ notes: 'não permitido' })
        .expect(403);
    });

    it('non-existent appointment -> 404', async () => {
      await request(app)
        .patch(`/api/v1/appointments/${randomUUID()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'não encontrado' })
        .expect(404);
    });

    it('conflicting appointment -> 409', async () => {
      const pool = getTestPool();
      const scheduledTime = new Date();
      scheduledTime.setDate(scheduledTime.getDate() + 1);
      scheduledTime.setHours(10, 0, 0, 0);
      await pool.query('UPDATE appointments SET date_time = $1 WHERE id = $2', [scheduledTime, confirmedApptId]);

      await request(app)
        .patch(`/api/v1/appointments/${pendingApptId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ dateTime: scheduledTime.toISOString() })
        .expect(409);
    });

    it('completed appointment -> 409', async () => {
      await request(app)
        .patch(`/api/v1/appointments/${completedApptId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'não permitido' })
        .expect(409);
    });

    it('cancelled appointment -> 409', async () => {
      await request(app)
        .patch(`/api/v1/appointments/${customerCancelApptId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'não permitido' })
        .expect(409);
    });
  });
});
