import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { createApp } from '../../../http/app';
import { setupTestEnvironment } from './test-utils';

describe('Barber Schedules API - /api/v1/barber-schedules', () => {
  let app: ReturnType<typeof createApp>;
  let adminToken: string;
  let barber1Token: string;
  let customer1Token: string;
  let barber1BarberId: string;
  let service1Id: string;

  beforeAll(async () => {
    const setup = await setupTestEnvironment();
    app = setup.app;
    adminToken = setup.adminToken;
    barber1Token = setup.barber1Token;
    customer1Token = setup.customer1Token;
    barber1Id = setup.barber1Id;
    barber1BarberId = setup.barber1BarberId;
    service1Id = setup.service1Id;
  });

  describe('POST /api/v1/barber-schedules', () => {
    it('ADMIN: creates schedule -> 201', async () => {
      const res = await request(app)
        .post('/api/v1/barber-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          barberId: barber1BarberId,
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '18:00',
          breakStart: '12:00',
          breakEnd: '13:00',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.barberId).toBe(barber1BarberId);
      expect(res.body.dayOfWeek).toBe(1);
      expect(res.body.startTime).toBe('09:00');
      expect(res.body.endTime).toBe('18:00');
      expect(res.body.breakStart).toBe('12:00');
      expect(res.body.breakEnd).toBe('13:00');
      expect(res.body.active).toBe(true);
    });

    it('BARBER: tries to create -> 403', async () => {
      await request(app)
        .post('/api/v1/barber-schedules')
        .set('Authorization', `Bearer ${barber1Token}`)
        .send({
          barberId: barber1BarberId,
          dayOfWeek: 2,
          startTime: '09:00',
          endTime: '18:00',
        })
        .expect(403);
    });

    it('CUSTOMER: tries to create -> 403', async () => {
      await request(app)
        .post('/api/v1/barber-schedules')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          barberId: barber1BarberId,
          dayOfWeek: 2,
          startTime: '09:00',
          endTime: '18:00',
        })
        .expect(403);
    });

    it('Invalid input -> 400', async () => {
      await request(app)
        .post('/api/v1/barber-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ barberId: barber1BarberId, dayOfWeek: 8, startTime: '09:00', endTime: '18:00' })
        .expect(400);
    });

    it('Invalid time format -> 400', async () => {
      await request(app)
        .post('/api/v1/barber-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ barberId: barber1BarberId, dayOfWeek: 1, startTime: '9:00', endTime: '18:00' })
        .expect(400);
    });

    it('endTime before startTime -> 400', async () => {
      await request(app)
        .post('/api/v1/barber-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ barberId: barber1BarberId, dayOfWeek: 1, startTime: '18:00', endTime: '09:00' })
        .expect(400);
    });
  });

  describe('GET /api/v1/barber-schedules', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let _scheduleId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/barber-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          barberId: barber1BarberId,
          dayOfWeek: 2,
          startTime: '09:00',
          endTime: '18:00',
        });
      _scheduleId = res.body.id;
    });

    it('CUSTOMER: lists schedules', async () => {
      const res = await request(app)
        .get('/api/v1/barber-schedules')
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].barberId).toBe(barber1BarberId);
    });

    it('ADMIN: lists all schedules', async () => {
      const res = await request(app)
        .get('/api/v1/barber-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('Filter by barberId', async () => {
      const res = await request(app)
        .get(`/api/v1/barber-schedules?barberId=${barber1BarberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.every((s: { barberId: string }) => s.barberId === barber1BarberId)).toBe(true);
    });
  });

  describe('GET /api/v1/barber-schedules/:id', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let _scheduleId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/barber-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          barberId: barber1BarberId,
          dayOfWeek: 3,
          startTime: '09:00',
          endTime: '18:00',
        });
      _scheduleId = res.body.id;
    });

    it('CUSTOMER: accesses schedule', async () => {
      const res = await request(app)
        .get(`/api/v1/barber-schedules/${_scheduleId}`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(200);

      expect(res.body.id).toBe(_scheduleId);
    });

    it('Non-existent schedule -> 404', async () => {
      const { randomUUID } = await import('node:crypto');
      await request(app)
        .get(`/api/v1/barber-schedules/${randomUUID()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/barber-schedules/:id', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let _scheduleId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/barber-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          barberId: barber1BarberId,
          dayOfWeek: 4,
          startTime: '09:00',
          endTime: '18:00',
        });
      _scheduleId = res.body.id;
    });

    it('ADMIN: updates schedule', async () => {
      const res = await request(app)
        .patch(`/api/v1/barber-schedules/${_scheduleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ startTime: '10:00', endTime: '19:00' })
        .expect(200);

      expect(res.body.startTime).toBe('10:00');
      expect(res.body.endTime).toBe('19:00');
    });

    it('BARBER: tries to update -> 403', async () => {
      await request(app)
        .patch(`/api/v1/barber-schedules/${_scheduleId}`)
        .set('Authorization', `Bearer ${barber1Token}`)
        .send({ startTime: '10:00' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/barber-schedules/:id', () => {
    it('ADMIN: deletes schedule', async () => {
      const res = await request(app)
        .post('/api/v1/barber-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          barberId: barber1BarberId,
          dayOfWeek: 5,
          startTime: '09:00',
          endTime: '18:00',
        });

      const _scheduleId = res.body.id;

      await request(app)
        .delete(`/api/v1/barber-schedules/${_scheduleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      await request(app)
        .get(`/api/v1/barber-schedules/${_scheduleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/barber-schedules/barbers/:barberId/availability', () => {
    it('CUSTOMER: gets available slots for a day', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString();

      const res = await request(app)
        .get(`/api/v1/barber-schedules/barbers/${barber1BarberId}/availability`)
        .query({ date: dateStr, serviceId: service1Id })
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('start');
      expect(res.body.data[0]).toHaveProperty('end');
      expect(res.body.data[0]).toHaveProperty('available');
    });

    it('Returns empty when no schedule for that day', async () => {
      const sunday = new Date();
      sunday.setDate(sunday.getDate() + ((7 - sunday.getDay()) % 7));
      const dateStr = sunday.toISOString();

      const res = await request(app)
        .get(`/api/v1/barber-schedules/barbers/${barber1BarberId}/availability`)
        .query({ date: dateStr, serviceId: service1Id })
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(200);

      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/v1/barber-schedules/weekly', () => {
    it('Returns weekly schedule for all barbers', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - startDate.getDay());
      const dateStr = startDate.toISOString();

      const res = await request(app)
        .get('/api/v1/barber-schedules/weekly')
        .query({ startDate: dateStr })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('barberId');
      expect(res.body.data[0]).toHaveProperty('barberName');
      expect(res.body.data[0]).toHaveProperty('schedules');
      expect(res.body.data[0]).toHaveProperty('blocks');
    });
  });
});