import { describe, it, expect, beforeEach } from 'vitest';
import { CreateBarberBlock } from './create-barber-block';
import { UpdateBarberBlock } from './update-barber-block';
import { GetBarberBlock } from './get-barber-block';
import { ListBarberBlocks } from './list-barber-blocks';
import { DeleteBarberBlock } from './delete-barber-block';
import { createBarber, type Barber } from '../../domain/barber';
import { EntityNotFoundError, ConflictError } from '../../domain/errors';
import { BarberBlockReason } from '../../domain/barber-block';
import { InMemoryRepositoryFactory } from '../../persistence/in-memory/factory';
import { createInMemorySqlExecutor } from '../../persistence/in-memory/sql-executor';

describe('BarberBlock use cases', () => {
  let factory: InMemoryRepositoryFactory;
  let executor: ReturnType<typeof createInMemorySqlExecutor>;
  let barber: Barber;

  beforeEach(async () => {
    factory = new InMemoryRepositoryFactory();
    executor = createInMemorySqlExecutor();

    const barbers = factory.createBarberRepository(executor);
    barber = createBarber({ name: 'João Barbeiro' });
    await barbers.create(barber);
  });

  describe('CreateBarberBlock', () => {
    it('creates a block for a barber', async () => {
      const useCase = new CreateBarberBlock(factory, executor);
      const start = new Date('2025-01-15T10:00:00Z');
      const end = new Date('2025-01-15T11:00:00Z');
      const block = await useCase.execute({
        barberId: barber.id,
        startDateTime: start,
        endDateTime: end,
        reason: BarberBlockReason.TIME_OFF,
      });
      expect(block.barberId).toBe(barber.id);
      expect(block.reason).toBe(BarberBlockReason.TIME_OFF);
      expect(block.recurring).toBe(false);
    });

    it('rejects creating block for non-existent barber', async () => {
      const useCase = new CreateBarberBlock(factory, executor);
      await expect(
        useCase.execute({
          barberId: 'missing',
          startDateTime: new Date(),
          endDateTime: new Date(Date.now() + 3600000),
          reason: BarberBlockReason.TIME_OFF,
        })
      ).rejects.toThrow(EntityNotFoundError);
    });

    it('rejects overlapping blocks', async () => {
      const useCase = new CreateBarberBlock(factory, executor);
      const start = new Date('2025-01-15T10:00:00Z');
      const end = new Date('2025-01-15T12:00:00Z');
      await useCase.execute({
        barberId: barber.id,
        startDateTime: start,
        endDateTime: end,
        reason: BarberBlockReason.TIME_OFF,
      });

      await expect(
        useCase.execute({
          barberId: barber.id,
          startDateTime: new Date('2025-01-15T11:00:00Z'),
          endDateTime: new Date('2025-01-15T13:00:00Z'),
          reason: BarberBlockReason.LUNCH,
        })
      ).rejects.toThrow(ConflictError);
    });

    it('allows non-overlapping blocks', async () => {
      const useCase = new CreateBarberBlock(factory, executor);
      await useCase.execute({
        barberId: barber.id,
        startDateTime: new Date('2025-01-15T10:00:00Z'),
        endDateTime: new Date('2025-01-15T11:00:00Z'),
        reason: BarberBlockReason.TIME_OFF,
      });
      await useCase.execute({
        barberId: barber.id,
        startDateTime: new Date('2025-01-15T12:00:00Z'),
        endDateTime: new Date('2025-01-15T13:00:00Z'),
        reason: BarberBlockReason.LUNCH,
      });

      const list = new ListBarberBlocks(factory.createBarberBlockRepository(executor));
      const result = await list.execute({ page: 1, limit: 10 });
      expect(result.data.length).toBe(2);
    });

    it('creates recurring block with recurrence rule', async () => {
      const useCase = new CreateBarberBlock(factory, executor);
      const block = await useCase.execute({
        barberId: barber.id,
        startDateTime: new Date('2025-01-15T13:00:00Z'),
        endDateTime: new Date('2025-01-15T14:00:00Z'),
        reason: BarberBlockReason.LUNCH,
        recurring: true,
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
      });
      expect(block.recurring).toBe(true);
      expect(block.recurrenceRule).toBe('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
    });
  });

  describe('UpdateBarberBlock', () => {
    it('updates block times', async () => {
      const create = new CreateBarberBlock(factory, executor);
      const created = await create.execute({
        barberId: barber.id,
        startDateTime: new Date('2025-01-15T10:00:00Z'),
        endDateTime: new Date('2025-01-15T11:00:00Z'),
        reason: BarberBlockReason.TIME_OFF,
      });

      const update = new UpdateBarberBlock(factory, executor);
      const updated = await update.execute({
        id: created.id,
        startDateTime: new Date('2025-01-15T11:00:00Z'),
        endDateTime: new Date('2025-01-15T12:00:00Z'),
      });

      expect(updated.startDateTime.getTime()).toBe(new Date('2025-01-15T11:00:00Z').getTime());
    });

    it('throws when block does not exist', async () => {
      const update = new UpdateBarberBlock(factory, executor);
      await expect(
        update.execute({ id: 'missing', startDateTime: new Date() })
      ).rejects.toThrow(EntityNotFoundError);
    });

    it('rejects updating to overlap with another block', async () => {
      const create = new CreateBarberBlock(factory, executor);
      await create.execute({
        barberId: barber.id,
        startDateTime: new Date('2025-01-15T10:00:00Z'),
        endDateTime: new Date('2025-01-15T11:00:00Z'),
        reason: BarberBlockReason.TIME_OFF,
      });
      const block2 = await create.execute({
        barberId: barber.id,
        startDateTime: new Date('2025-01-15T13:00:00Z'),
        endDateTime: new Date('2025-01-15T14:00:00Z'),
        reason: BarberBlockReason.LUNCH,
      });

      const update = new UpdateBarberBlock(factory, executor);
      await expect(
        update.execute({
          id: block2.id,
          startDateTime: new Date('2025-01-15T10:30:00Z'),
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('GetBarberBlock', () => {
    it('gets an existing block', async () => {
      const create = new CreateBarberBlock(factory, executor);
      const created = await create.execute({
        barberId: barber.id,
        startDateTime: new Date('2025-01-15T10:00:00Z'),
        endDateTime: new Date('2025-01-15T11:00:00Z'),
        reason: BarberBlockReason.TIME_OFF,
      });

      const useCase = new GetBarberBlock(factory.createBarberBlockRepository(executor));
      const block = await useCase.execute({ id: created.id });
      expect(block?.id).toBe(created.id);
    });

    it('returns null when not found', async () => {
      const useCase = new GetBarberBlock(factory.createBarberBlockRepository(executor));
      expect(await useCase.execute({ id: 'missing' })).toBeNull();
    });
  });

  describe('ListBarberBlocks', () => {
    it('lists blocks with pagination', async () => {
      const create = new CreateBarberBlock(factory, executor);
      await create.execute({
        barberId: barber.id,
        startDateTime: new Date('2025-01-15T10:00:00Z'),
        endDateTime: new Date('2025-01-15T11:00:00Z'),
        reason: BarberBlockReason.TIME_OFF,
      });
      await create.execute({
        barberId: barber.id,
        startDateTime: new Date('2025-01-16T10:00:00Z'),
        endDateTime: new Date('2025-01-16T11:00:00Z'),
        reason: BarberBlockReason.LUNCH,
      });

      const useCase = new ListBarberBlocks(factory.createBarberBlockRepository(executor));
      const result = await useCase.execute({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });

  describe('DeleteBarberBlock', () => {
    it('deletes a block', async () => {
      const create = new CreateBarberBlock(factory, executor);
      const created = await create.execute({
        barberId: barber.id,
        startDateTime: new Date('2025-01-15T10:00:00Z'),
        endDateTime: new Date('2025-01-15T11:00:00Z'),
        reason: BarberBlockReason.TIME_OFF,
      });

      const useCase = new DeleteBarberBlock(factory.createBarberBlockRepository(executor));
      await useCase.execute({ id: created.id });

      const get = new GetBarberBlock(factory.createBarberBlockRepository(executor));
      expect(await get.execute({ id: created.id })).toBeNull();
    });
  });
});