import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { createApp } from '../../../http/app';
import { setupTestEnvironment } from './test-utils';

describe('Barber Blocks API - /api/v1/barber-blocks', () => {
  let app: ReturnType<typeof createApp>;
  let adminToken: string;
  let barber1Token: string;
  let barber2Token: string;
  let customer1Token: string;
  let barber1BarberId: string;
  let barber2BarberId: string;

  beforeAll(async () => {
    const setup = await setupTestEnvironment();
    app = setup.app;
    adminToken = setup.adminToken;
    barber1Token = setup.barber1Token;
    barber2Token = setup.barber2Token;
    customer1Token = setup.customer1Token;
    barber1BarberId = setup.barber1BarberId;
    barber2BarberId = setup.barber2BarberId;
  });

  describe('POST /api/v1/barber-blocks', () => {
    it('ADMIN: creates block -> 201', async () => {
      const start = new Date('2025-01-20T10:00:00Z');
      const end = new Date('2025-01-20T11:00:00Z');
      const res = await request(app)
        .post('/api/v1/barber-blocks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          barberId: barber1BarberId,
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          reason: 'TIME_OFF',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.barberId).toBe(barber1BarberId);
      expect(res.body.reason).toBe('TIME_OFF');
      expect(res.body.recurring).toBe(false);
    });

    it('BARBER: creates own block -> 201', async () => {
      const start = new Date('2025-01-21T10:00:00Z');
      const end = new Date('2025-01-21T11:00:00Z');
      const res = await request(app)
        .post('/api/v1/barber-blocks')
        .set('Authorization', `Bearer ${barber1Token}`)
        .send({
          barberId: barber1BarberId,
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          reason: 'LUNCH',
        })
        .expect(201);

      expect(res.body.barberId).toBe(barber1BarberId);
    });

    it('BARBER: tries to create block for another barber -> 403', async () => {
      const start = new Date('2025-01-22T10:00:00Z');
      const end = new Date('2025-01-22T11:00:00Z');
      await request(app)
        .post('/api/v1/barber-blocks')
        .set('Authorization', `Bearer ${barber1Token}`)
        .send({
          barberId: barber2BarberId,
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          reason: 'TIME_OFF',
        })
        .expect(403);
    });

    it('CUSTOMER: tries to create block -> 403', async () => {
      const start = new Date('2025-01-23T10:00:00Z');
      const end = new Date('2025-01-23T11:00:00Z');
      await request(app)
        .post('/api/v1/barber-blocks')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          barberId: barber1BarberId,
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          reason: 'TIME_OFF',
        })
        .expect(403);
    });

    it('Invalid input -> 400', async () => {
      await request(app)
        .post('/api/v1/barber-blocks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ barberId: barber1BarberId, startDateTime: 'invalid', endDateTime: 'invalid' })
        .expect(400);
    });

    it('endDateTime before startDateTime -> 400', async () => {
      const start = new Date('2025-01-24T12:00:00Z');
      const end = new Date('2025-01-24T10:00:00Z');
      await request(app)
        .post('/api/v1/barber-blocks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          barberId: barber1BarberId,
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          reason: 'TIME_OFF',
        })
        .expect(400);
    });

    it('Recurring without recurrenceRule -> 400', async () => {
      const start = new Date('2025-01-25T10:00:00Z');
      const end = new Date('2025-01-25T11:00:00Z');
      await request(app)
        .post('/api/v1/barber-blocks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          barberId: barber1BarberId,
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          reason: 'LUNCH',
          recurring: true,
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/barber-blocks', () => {
    beforeAll(async () => {
      const start = new Date('2025-02-01T10:00:00Z');
      const end = new Date('2025-02-01T11:00:00Z');
      await request(app)
        .post('/api/v1/barber-blocks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          barberId: barber1BarberId,
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          reason: 'MAINTENANCE',
        });
    });

    it('ADMIN: lists all blocks', async () => {
      const res = await request(app)
        .get('/api/v1/barber-blocks')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('BARBER: lists only own blocks', async () => {
      const res = await request(app)
        .get('/api/v1/barber-blocks')
        .set('Authorization', `Bearer ${barber1Token}`)
        .expect(200);

      expect(res.body.data.every((b: { barberId: string }) => b.barberId === barber1BarberId)).toBe(true);
    });

    it('CUSTOMER: lists all blocks', async () => {
      const res = await request(app)
        .get('/api/v1/barber-blocks')
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('Filter by barberId', async () => {
      const res = await request(app)
        .get(`/api/v1/barber-blocks?barberId=${barber1BarberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.every((b: { barberId: string }) => b.barberId === barber1BarberId)).toBe(true);
    });
  });

  describe('GET /api/v1/barber-blocks/:id', () => {
    let blockId: string;

    beforeAll(async () => {
      const start = new Date('2025-02-10T10:00:00Z');
      const end = new Date('2025-02-10T11:00:00Z');
      const res = await request(app)
        .post('/api/v1/barber-blocks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          barberId: barber1BarberId,
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          reason: 'OTHER',
        });
      blockId = res.body.id;
    });

    it('ADMIN: accesses any block', async () => {
      const res = await request(app)
        .get(`/api/v1/barber-blocks/${blockId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(blockId);
    });

    it('BARBER: accesses own block', async () => {
      const res = await request(app)
        .get(`/api/v1/barber-blocks/${blockId}`)
        .set('Authorization', `Bearer ${barber1Token}`)
        .expect(200);

      expect(res.body.id).toBe(blockId);
    });

    it('BARBER: tries to access another barber block -> 403', async () => {
      const start = new Date('2025-02-11T10:00:00Z');
      const end = new Date('2025-02-11T11:00:00Z');
      const res = await request(app)
        .post('/api/v1/barber-blocks')
        .set('Authorization', `Bearer ${barber2Token}`)
        .send({
          barberId: barber2BarberId,
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          reason: 'TIME_OFF',
        });
      const otherBlockId = res.body.id;

      await request(app)
        .get(`/api/v1/barber-blocks/${otherBlockId}`)
        .set('Authorization', `Bearer ${barber1Token}`)
        .expect(403);
    });

    it('Non-existent block -> 404', async () => {
      const { randomUUID } = await import('node:crypto');
      await request(app)
        .get(`/api/v1/barber-blocks/${randomUUID()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/barber-blocks/:id', () => {
    let blockId: string;

    beforeAll(async () => {
      const start = new Date('2025-02-15T10:00:00Z');
      const end = new Date('2025-02-15T11:00:00Z');
      const res = await request(app)
        .post('/api/v1/barber-blocks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          barberId: barber1BarberId,
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          reason: 'TIME_OFF',
        });
      blockId = res.body.id;
    });

    it('ADMIN: updates block', async () => {
      const newStart = new Date('2025-02-15T12:00:00Z');
      const newEnd = new Date('2025-02-15T13:00:00Z');
      const res = await request(app)
        .patch(`/api/v1/barber-blocks/${blockId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          startDateTime: newStart.toISOString(),
          endDateTime: newEnd.toISOString(),
          reason: 'MAINTENANCE',
        })
        .expect(200);

      expect(res.body.reason).toBe('MAINTENANCE');
    });

    it('BARBER: updates own block', async () => {
      const start = new Date('2025-02-16T10:00:00Z');
      const end = new Date('2025-02-16T11:00:00Z');
      const res = await request(app)
        .post('/api/v1/barber-blocks')
        .set('Authorization', `Bearer ${barber1Token}`)
        .send({
          barberId: barber1BarberId,
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          reason: 'LUNCH',
        });
      const ownBlockId = res.body.id;

      const newStart = new Date('2025-02-16T12:00:00Z');
      const newEnd = new Date('2025-02-16T13:00:00Z');
      const res2 = await request(app)
        .patch(`/api/v1/barber-blocks/${ownBlockId}`)
        .set('Authorization', `Bearer ${barber1Token}`)
        .send({
          startDateTime: newStart.toISOString(),
          endDateTime: newEnd.toISOString(),
        })
        .expect(200);

      expect(res2.body.startDateTime).toBe(newStart.toISOString());
    });

    it('BARBER: tries to update another barber block -> 403', async () => {
      const start = new Date('2025-02-17T10:00:00Z');
      const end = new Date('2025-02-17T11:00:00Z');
      const res = await request(app)
        .post('/api/v1/barber-blocks')
        .set('Authorization', `Bearer ${barber2Token}`)
        .send({
          barberId: barber2BarberId,
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          reason: 'TIME_OFF',
        });
      const otherBlockId = res.body.id;

      await request(app)
        .patch(`/api/v1/barber-blocks/${otherBlockId}`)
        .set('Authorization', `Bearer ${barber1Token}`)
        .send({ reason: 'MAINTENANCE' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/barber-blocks/:id', () => {
    it('ADMIN: deletes block', async () => {
      const start = new Date('2025-02-20T10:00:00Z');
      const end = new Date('2025-02-20T11:00:00Z');
      const res = await request(app)
        .post('/api/v1/barber-blocks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          barberId: barber1BarberId,
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          reason: 'TIME_OFF',
        });
      const blockId = res.body.id;

      await request(app)
        .delete(`/api/v1/barber-blocks/${blockId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      await request(app)
        .get(`/api/v1/barber-blocks/${blockId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('BARBER: deletes own block', async () => {
      const start = new Date('2025-02-21T10:00:00Z');
      const end = new Date('2025-02-21T11:00:00Z');
      const res = await request(app)
        .post('/api/v1/barber-blocks')
        .set('Authorization', `Bearer ${barber1Token}`)
        .send({
          barberId: barber1BarberId,
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          reason: 'LUNCH',
        });
      const blockId = res.body.id;

      await request(app)
        .delete(`/api/v1/barber-blocks/${blockId}`)
        .set('Authorization', `Bearer ${barber1Token}`)
        .expect(204);
    });

    it('BARBER: tries to delete another barber block -> 403', async () => {
      const start = new Date('2025-02-22T10:00:00Z');
      const end = new Date('2025-02-22T11:00:00Z');
      const res = await request(app)
        .post('/api/v1/barber-blocks')
        .set('Authorization', `Bearer ${barber2Token}`)
        .send({
          barberId: barber2BarberId,
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          reason: 'TIME_OFF',
        });
      const otherBlockId = res.body.id;

      await request(app)
        .delete(`/api/v1/barber-blocks/${otherBlockId}`)
        .set('Authorization', `Bearer ${barber1Token}`)
        .expect(403);
    });
  });
});