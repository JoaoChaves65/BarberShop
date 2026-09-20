import { Router } from 'express';
import { z } from 'zod';
import { createSqlExecutor, PgRepositoryFactory } from '@barberlab/core/infrastructure';
import {
  CreateBarberBlock,
  GetBarberBlock,
  ListBarberBlocks,
  UpdateBarberBlock,
  DeleteBarberBlock,
  type BarberBlock,
} from '@barberlab/core/application';
import { authMiddleware } from '../../http/middleware/auth';
import { requireRole } from '../../http/middleware/rbac';
import type { AuthenticatedRequest } from '../../http/middleware/auth';
import { AppError } from '@barberlab/core';
import type { UserRole } from '@barberlab/core';
import { BarberBlockReason } from '@barberlab/core/domain';
import { ConflictError } from '@barberlab/core/domain';

const router = Router();

const createBarberBlockSchema = z.object({
  barberId: z.string().uuid(),
  startDateTime: z.string().datetime(),
  endDateTime: z.string().datetime(),
  reason: z.enum([BarberBlockReason.TIME_OFF, BarberBlockReason.LUNCH, BarberBlockReason.MAINTENANCE, BarberBlockReason.OTHER]),
  recurring: z.boolean().optional().default(false),
  recurrenceRule: z.string().optional(),
}).refine(
  (data) => {
    if (data.recurring && !data.recurrenceRule) {
      return false;
    }
    if (data.recurring) {
      return false; // Recurring blocks not supported yet
    }
    return true;
  },
  {
    message: 'Recurring blocks are not supported in this version',
    path: ['recurring'],
  }
);

const updateBarberBlockSchema = z.object({
  startDateTime: z.string().datetime().optional(),
  endDateTime: z.string().datetime().optional(),
  reason: z.enum([BarberBlockReason.TIME_OFF, BarberBlockReason.LUNCH, BarberBlockReason.MAINTENANCE, BarberBlockReason.OTHER]).optional(),
  recurring: z.boolean().optional().default(false),
  recurrenceRule: z.string().nullable().optional(),
}).refine(
  (data) => {
    if (data.recurring) {
      return false; // Recurring blocks not supported yet
    }
    return true;
  },
  {
    message: 'Recurring blocks are not supported in this version',
    path: ['recurring'],
  }
);

const listBarberBlocksSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  barberId: z.string().uuid().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

router.use(authMiddleware);

async function checkBarberBlockAccess(
  req: AuthenticatedRequest,
  barberId: string
): Promise<{ allowed: boolean; barber?: { userId: string | null }; notFound?: boolean }> {
  const executor = createSqlExecutor();
  const factory = new PgRepositoryFactory();
  const barbersRepo = factory.createBarberRepository(executor);
  const barber = await barbersRepo.findById(barberId);
  if (!barber) {
    return { allowed: false, notFound: true };
  }

  const userRole = req.user!.role as UserRole;
  const userId = req.user!.sub;

  if (userRole === 'ADMIN') {
    return { allowed: true, barber };
  }

  if (userRole === 'BARBER' && barber.userId === userId) {
    return { allowed: true, barber };
  }

  return { allowed: false };
}

router.post(
  '/',
  requireRole('ADMIN', 'BARBER'),
  async (req: AuthenticatedRequest, res) => {
    const parseResult = createBarberBlockSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid request body', details: parseResult.error.flatten() });
      return;
    }

    const userRole = req.user!.role as UserRole;
    const userId = req.user!.sub;

    const executor = createSqlExecutor();
    const factory = new PgRepositoryFactory();
    const createBlock = new CreateBarberBlock(factory, executor);

    if (userRole === 'BARBER') {
      const barbersRepo = factory.createBarberRepository(executor);
      const barber = await barbersRepo.findByUserId(userId);
      if (!barber || barber.id !== parseResult.data.barberId) {
        res.status(403).json({ error: 'Cannot create blocks for another barber' });
        return;
      }
    }

    const input = {
      ...parseResult.data,
      startDateTime: new Date(parseResult.data.startDateTime),
      endDateTime: new Date(parseResult.data.endDateTime),
    };

    try {
      const block = await createBlock.execute(input);

      res.status(201).json({
        id: block.id,
        barberId: block.barberId,
        startDateTime: block.startDateTime,
        endDateTime: block.endDateTime,
        reason: block.reason,
        recurring: block.recurring,
        recurrenceRule: block.recurrenceRule,
        createdAt: block.createdAt,
        updatedAt: block.updatedAt,
      });
    } catch (error) {
      if (error instanceof ConflictError) {
        res.status(409).json({ error: error.message });
        return;
      }
      // Handle PostgreSQL exclusion constraint violation (EXCLUDE constraint)
      if (error && typeof error === 'object' && 'code' in error) {
        const pgError = error as { code?: string };
        if (pgError.code === '23P01') {
          res.status(409).json({ error: 'Block overlaps with existing block' });
          return;
        }
      }
      throw error;
    }
  }
);

router.get(
  '/',
  requireRole('ADMIN', 'BARBER', 'CUSTOMER'),
  async (req: AuthenticatedRequest, res) => {
    const parseResult = listBarberBlocksSchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid query parameters', details: parseResult.error.flatten() });
      return;
    }

    const executor = createSqlExecutor();
    const factory = new PgRepositoryFactory();
    const blocksRepo = factory.createBarberBlockRepository(executor);
    const listBlocks = new ListBarberBlocks(blocksRepo);

    const userRole = req.user!.role as UserRole;
    let result;

    if (userRole === 'ADMIN') {
      result = await listBlocks.execute(parseResult.data);
    } else if (userRole === 'BARBER') {
      const barbersRepo = factory.createBarberRepository(executor);
      const barber = await barbersRepo.findByUserId(req.user!.sub);
      if (!barber) {
        res.status(403).json({ error: 'Barber profile not found' });
        return;
      }
      result = await listBlocks.execute(parseResult.data);
      result.data = result.data.filter(b => b.barberId === barber.id);
    } else {
      result = await listBlocks.execute(parseResult.data);
    }

    if (parseResult.data.barberId) {
      result.data = result.data.filter(b => b.barberId === parseResult.data.barberId);
    }

    res.json({
      ...result,
      data: result.data.map((b: BarberBlock) => ({
        id: b.id,
        barberId: b.barberId,
        startDateTime: b.startDateTime,
        endDateTime: b.endDateTime,
        reason: b.reason,
        recurring: b.recurring,
        recurrenceRule: b.recurrenceRule,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
    });
  }
);

router.get(
  '/:id',
  requireRole('ADMIN', 'BARBER', 'CUSTOMER'),
  async (req: AuthenticatedRequest, res) => {
    const parseResult = idParamSchema.safeParse(req.params);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid block ID', details: parseResult.error.flatten() });
      return;
    }

    const executor = createSqlExecutor();
    const factory = new PgRepositoryFactory();
    const blocksRepo = factory.createBarberBlockRepository(executor);
    const getBlock = new GetBarberBlock(blocksRepo);

    const block = await getBlock.execute({ id: parseResult.data.id });
    if (!block) {
      throw AppError.notFound('BarberBlock', parseResult.data.id);
    }

    const access = await checkBarberBlockAccess(req, block.barberId);
    if (access.notFound) {
      throw AppError.notFound('Barber', block.barberId);
    }
    if (!access.allowed) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json({
      id: block.id,
      barberId: block.barberId,
      startDateTime: block.startDateTime,
      endDateTime: block.endDateTime,
      reason: block.reason,
      recurring: block.recurring,
      recurrenceRule: block.recurrenceRule,
      createdAt: block.createdAt,
      updatedAt: block.updatedAt,
    });
  }
);

router.patch(
  '/:id',
  requireRole('ADMIN', 'BARBER'),
  async (req: AuthenticatedRequest, res) => {
    const paramsResult = idParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      res.status(400).json({ error: 'Invalid block ID', details: paramsResult.error.flatten() });
      return;
    }

    const bodyResult = updateBarberBlockSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ error: 'Invalid request body', details: bodyResult.error.flatten() });
      return;
    }

    const executor = createSqlExecutor();
    const factory = new PgRepositoryFactory();
    const getBlock = new GetBarberBlock(factory.createBarberBlockRepository(executor));
    const updateBlock = new UpdateBarberBlock(factory, executor);

    const existing = await getBlock.execute({ id: paramsResult.data.id });
    if (!existing) {
      throw AppError.notFound('BarberBlock', paramsResult.data.id);
    }

    const userRole = req.user!.role as UserRole;
    const userId = req.user!.sub;

    if (userRole === 'BARBER') {
      const barbersRepo = factory.createBarberRepository(executor);
      const barber = await barbersRepo.findByUserId(userId);
      if (!barber || barber.id !== existing.barberId) {
        res.status(403).json({ error: 'Cannot update blocks for another barber' });
        return;
      }
    }

    const updateInput = {
      id: paramsResult.data.id,
      ...bodyResult.data,
      startDateTime: bodyResult.data.startDateTime ? new Date(bodyResult.data.startDateTime) : undefined,
      endDateTime: bodyResult.data.endDateTime ? new Date(bodyResult.data.endDateTime) : undefined,
    };

    try {
      const block = await updateBlock.execute(updateInput);

      res.json({
        id: block.id,
        barberId: block.barberId,
        startDateTime: block.startDateTime,
        endDateTime: block.endDateTime,
        reason: block.reason,
        recurring: block.recurring,
        recurrenceRule: block.recurrenceRule,
        createdAt: block.createdAt,
        updatedAt: block.updatedAt,
      });
    } catch (error) {
      if (error instanceof ConflictError) {
        res.status(409).json({ error: error.message });
        return;
      }
      // Handle PostgreSQL exclusion constraint violation (EXCLUDE constraint)
      if (error && typeof error === 'object' && 'code' in error) {
        const pgError = error as { code?: string };
        if (pgError.code === '23P01') {
          res.status(409).json({ error: 'Block overlaps with existing block' });
          return;
        }
      }
      throw error;
    }
  }
);

router.delete(
  '/:id',
  requireRole('ADMIN', 'BARBER'),
  async (req: AuthenticatedRequest, res) => {
    const parseResult = idParamSchema.safeParse(req.params);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid block ID', details: parseResult.error.flatten() });
      return;
    }

    const executor = createSqlExecutor();
    const factory = new PgRepositoryFactory();
    const blocksRepo = factory.createBarberBlockRepository(executor);
    const getBlock = new GetBarberBlock(blocksRepo);
    const deleteBlock = new DeleteBarberBlock(blocksRepo);

    const existing = await getBlock.execute({ id: parseResult.data.id });
    if (!existing) {
      throw AppError.notFound('BarberBlock', parseResult.data.id);
    }

    const userRole = req.user!.role as UserRole;
    const userId = req.user!.sub;

    if (userRole === 'BARBER') {
      const barbersRepo = factory.createBarberRepository(executor);
      const barber = await barbersRepo.findByUserId(userId);
      if (!barber || barber.id !== existing.barberId) {
        res.status(403).json({ error: 'Cannot delete blocks for another barber' });
        return;
      }
    }

    try {
      await deleteBlock.execute({ id: parseResult.data.id });
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.name === 'EntityNotFoundError') {
        throw AppError.notFound('BarberBlock', parseResult.data.id);
      }
      throw error;
    }
  }
);

export const barberBlocksRouter = router;