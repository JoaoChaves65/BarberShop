import { Router } from 'express';
import { z } from 'zod';
import { createSqlExecutor } from '@barberlab/core/infrastructure';
import {
  PgBarberScheduleRepository,
  PgBarberBlockRepository,
  PgBarberRepository,
  PgServiceRepository,
  PgAppointmentRepository,
} from '@barberlab/core/infrastructure';
import {
  CreateBarberSchedule,
  GetBarberSchedule,
  ListBarberSchedules,
  UpdateBarberSchedule,
  DeleteBarberSchedule,
  GetBarberAvailability,
  GetWeeklySchedule,
  type BarberSchedule,
  type BarberBlock,
} from '@barberlab/core/application';
import { authMiddleware } from '../../http/middleware/auth';
import { requireRole } from '../../http/middleware/rbac';
import type { AuthenticatedRequest } from '../../http/middleware/auth';
import { AppError } from '@barberlab/core';
import type { UserRole } from '@barberlab/core';

const router = Router();

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/);

const createBarberScheduleSchema = z.object({
  barberId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeSchema,
  endTime: timeSchema,
  breakStart: timeSchema.nullish(),
  breakEnd: timeSchema.nullish(),
});

const updateBarberScheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  breakStart: timeSchema.nullish(),
  breakEnd: timeSchema.nullish(),
  active: z.boolean().optional(),
});

const listBarberSchedulesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  barberId: z.string().uuid().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const barberIdParamSchema = z.object({
  barberId: z.string().uuid(),
});

const availabilityQuerySchema = z.object({
  date: z.string().datetime(),
  serviceId: z.string().uuid(),
});

const weeklyScheduleQuerySchema = z.object({
  startDate: z.string().datetime(),
  barberIds: z.array(z.string().uuid()).optional(),
});

router.use(authMiddleware);

async function checkBarberScheduleAccess(
  req: AuthenticatedRequest,
  barberId: string,
  endpointType: 'schedule' | 'availability' | 'weekly' = 'schedule'
): Promise<{ allowed: boolean; barber?: { userId: string | null }; notFound?: boolean }> {
  const executor = createSqlExecutor();
  const barbersRepo = new PgBarberRepository(executor);
  const barber = await barbersRepo.findById(barberId);
  if (!barber) {
    return { allowed: false, notFound: true };
  }

  const userRole = req.user!.role as UserRole;
  const userId = req.user!.sub;

  if (userRole === 'ADMIN') {
    return { allowed: true, barber };
  }

  if (userRole === 'BARBER') {
    // For availability and weekly endpoints, BARBER can only access their own data
    if (endpointType === 'availability' || endpointType === 'weekly') {
      if (barber.userId !== userId) {
        return { allowed: false };
      }
      return { allowed: true, barber };
    }
    // For schedule CRUD, BARBER can only access their own schedule
    if (barber.userId === userId) {
      return { allowed: true, barber };
    }
    return { allowed: false };
  }

  if (userRole === 'CUSTOMER') {
    // CUSTOMER can view availability for booking
    if (endpointType === 'availability') {
      return { allowed: true, barber };
    }
    // CUSTOMER should not access weekly schedule (internal)
    if (endpointType === 'weekly') {
      return { allowed: false };
    }
    return { allowed: true, barber };
  }

  return { allowed: false };
}

router.post(
  '/',
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res) => {
    const parseResult = createBarberScheduleSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid request body', details: parseResult.error.flatten() });
      return;
    }

    const executor = createSqlExecutor();
    const schedulesRepo = new PgBarberScheduleRepository(executor);
    const barbersRepo = new PgBarberRepository(executor);
    const createSchedule = new CreateBarberSchedule(schedulesRepo, barbersRepo);

    const input = {
      ...parseResult.data,
      breakStart: parseResult.data.breakStart ?? undefined,
      breakEnd: parseResult.data.breakEnd ?? undefined,
    };

    try {
      const schedule = await createSchedule.execute(input);

      res.status(201).json({
        id: schedule.id,
        barberId: schedule.barberId,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        breakStart: schedule.breakStart,
        breakEnd: schedule.breakEnd,
        active: schedule.active,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error) {
        const pgError = error as { code?: string };
        if (pgError.code === '23514') {
          res.status(400).json({ error: 'Invalid schedule: start_time must be before end_time, break must be within schedule' });
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
    const parseResult = listBarberSchedulesSchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid query parameters', details: parseResult.error.flatten() });
      return;
    }

    const executor = createSqlExecutor();
    const schedulesRepo = new PgBarberScheduleRepository(executor);
    const listSchedules = new ListBarberSchedules(schedulesRepo);

    const result = await listSchedules.execute(parseResult.data);

    if (parseResult.data.barberId) {
      result.data = result.data.filter(s => s.barberId === parseResult.data.barberId);
    }

    res.json({
      ...result,
      data: result.data.map((s: BarberSchedule) => ({
        id: s.id,
        barberId: s.barberId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        breakStart: s.breakStart,
        breakEnd: s.breakEnd,
        active: s.active,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
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
      res.status(400).json({ error: 'Invalid schedule ID', details: parseResult.error.flatten() });
      return;
    }

    const executor = createSqlExecutor();
    const schedulesRepo = new PgBarberScheduleRepository(executor);
    const getSchedule = new GetBarberSchedule(schedulesRepo);

    const schedule = await getSchedule.execute({ id: parseResult.data.id });
    if (!schedule) {
      throw AppError.notFound('BarberSchedule', parseResult.data.id);
    }

    res.json({
      id: schedule.id,
      barberId: schedule.barberId,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      breakStart: schedule.breakStart,
      breakEnd: schedule.breakEnd,
      active: schedule.active,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    });
  }
);

router.patch(
  '/:id',
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res) => {
    const paramsResult = idParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      res.status(400).json({ error: 'Invalid schedule ID', details: paramsResult.error.flatten() });
      return;
    }

    const bodyResult = updateBarberScheduleSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ error: 'Invalid request body', details: bodyResult.error.flatten() });
      return;
    }

    const executor = createSqlExecutor();
    const schedulesRepo = new PgBarberScheduleRepository(executor);
    const updateSchedule = new UpdateBarberSchedule(schedulesRepo);

    const existing = await schedulesRepo.findById(paramsResult.data.id);
    if (!existing) {
      throw AppError.notFound('BarberSchedule', paramsResult.data.id);
    }

    try {
      const schedule = await updateSchedule.execute({
        id: paramsResult.data.id,
        ...bodyResult.data,
        breakStart: bodyResult.data.breakStart ?? undefined,
        breakEnd: bodyResult.data.breakEnd ?? undefined,
      });

res.json({
        id: schedule.id,
        barberId: schedule.barberId,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        breakStart: schedule.breakStart,
        breakEnd: schedule.breakEnd,
        active: schedule.active,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error) {
        const pgError = error as { code?: string };
        if (pgError.code === '23514') {
          res.status(400).json({ error: 'Invalid schedule: start_time must be before end_time, break must be within schedule' });
          return;
        }
      }
      throw error;
    }
  }
);

router.delete(
  '/:id',
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res) => {
    const parseResult = idParamSchema.safeParse(req.params);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid schedule ID', details: parseResult.error.flatten() });
      return;
    }

    const executor = createSqlExecutor();
    const schedulesRepo = new PgBarberScheduleRepository(executor);
    const deleteSchedule = new DeleteBarberSchedule(schedulesRepo);

    try {
      await deleteSchedule.execute({ id: parseResult.data.id });
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.name === 'EntityNotFoundError') {
        throw AppError.notFound('BarberSchedule', parseResult.data.id);
      }
      throw error;
    }
  }
);

router.get(
  '/barbers/:barberId/availability',
  requireRole('ADMIN', 'BARBER', 'CUSTOMER'),
  async (req: AuthenticatedRequest, res) => {
    const paramsResult = barberIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      res.status(400).json({ error: 'Invalid barber ID', details: paramsResult.error.flatten() });
      return;
    }

    const queryResult = availabilityQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      res.status(400).json({ error: 'Invalid query parameters', details: queryResult.error.flatten() });
      return;
    }

    const access = await checkBarberScheduleAccess(req, paramsResult.data.barberId, 'availability');
    if (access.notFound) {
      throw AppError.notFound('Barber', paramsResult.data.barberId);
    }
    if (!access.allowed) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const executor = createSqlExecutor();
    const schedulesRepo = new PgBarberScheduleRepository(executor);
    const blocksRepo = new PgBarberBlockRepository(executor);
    const servicesRepo = new PgServiceRepository(executor);
    const appointmentsRepo = new PgAppointmentRepository(executor);
    const getAvailability = new GetBarberAvailability(schedulesRepo, blocksRepo, servicesRepo, appointmentsRepo);

    const slots = await getAvailability.execute({
      barberId: paramsResult.data.barberId,
      date: new Date(queryResult.data.date),
      serviceId: queryResult.data.serviceId,
    });

    res.json({ data: slots });
  }
);

router.get(
  '/weekly',
  requireRole('ADMIN', 'BARBER'),
  async (req: AuthenticatedRequest, res) => {
    const queryResult = weeklyScheduleQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      res.status(400).json({ error: 'Invalid query parameters', details: queryResult.error.flatten() });
      return;
    }

    const userRole = req.user!.role as UserRole;
    const userId = req.user!.sub;

    // For BARBER, restrict to their own schedule
    let barberIds = queryResult.data.barberIds;
    if (userRole === 'BARBER') {
      const executor = createSqlExecutor();
      const barbersRepo = new PgBarberRepository(executor);
      const barber = await barbersRepo.findByUserId(userId);
      if (!barber) {
        res.status(403).json({ error: 'Barber profile not found' });
        return;
      }
      barberIds = [barber.id];
    }

    const executor = createSqlExecutor();
    const schedulesRepo = new PgBarberScheduleRepository(executor);
    const blocksRepo = new PgBarberBlockRepository(executor);
    const barbersRepo = new PgBarberRepository(executor);
    const getWeekly = new GetWeeklySchedule(schedulesRepo, blocksRepo, barbersRepo);

    const schedule = await getWeekly.execute({
      startDate: new Date(queryResult.data.startDate),
      barberIds,
    });

    res.json({
      data: schedule.map((item: { barberId: string; barberName: string; schedules: BarberSchedule[]; blocks: BarberBlock[] }) => ({
        barberId: item.barberId,
        barberName: item.barberName,
        schedules: item.schedules.map((s: BarberSchedule) => ({
          id: s.id,
          barberId: s.barberId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          breakStart: s.breakStart,
          breakEnd: s.breakEnd,
          active: s.active,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })),
        blocks: item.blocks.map((b: BarberBlock) => ({
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
      })),
    });
  }
);

export const barberSchedulesRouter = router;