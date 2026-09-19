import { randomUUID } from 'node:crypto';
import { InvalidDomainError } from './errors';

export interface BarberSchedule {
  id: string;
  barberId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBarberScheduleInput {
  barberId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
}

export interface UpdateBarberScheduleInput {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  active?: boolean;
}

const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6];
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseTime(time: string): { hours: number; minutes: number } {
  const parts = time.split(':');
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  return { hours, minutes };
}

export function timeToMinutes(time: string): number {
  const { hours, minutes } = parseTime(time);
  return hours * 60 + minutes;
}

function assertValidTimeFormat(time: string, field: string): void {
  if (!TIME_REGEX.test(time)) {
    throw new InvalidDomainError(field, `${field} must be in HH:mm format (24-hour)`);
  }
}

function assertValidDayOfWeek(day: number): void {
  if (!DAYS_OF_WEEK.includes(day)) {
    throw new InvalidDomainError('dayOfWeek', 'dayOfWeek must be an integer between 0 (Sunday) and 6 (Saturday)');
  }
}

function assertTimeOrder(startTime: string, endTime: string): void {
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    throw new InvalidDomainError('endTime', 'endTime must be after startTime');
  }
}

function assertBreakWithinSchedule(
  startTime: string,
  endTime: string,
  breakStart: string | null,
  breakEnd: string | null
): void {
  if (breakStart && breakEnd) {
    assertValidTimeFormat(breakStart, 'breakStart');
    assertValidTimeFormat(breakEnd, 'breakEnd');
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    const bStart = timeToMinutes(breakStart);
    const bEnd = timeToMinutes(breakEnd);
    if (bStart < start || bEnd > end || bStart >= bEnd) {
      throw new InvalidDomainError('break', 'break must be within schedule and breakStart < breakEnd');
    }
  } else if (breakStart || breakEnd) {
    throw new InvalidDomainError('break', 'both breakStart and breakEnd must be provided together');
  }
}

export function createBarberSchedule(input: CreateBarberScheduleInput, now: Date = new Date()): BarberSchedule {
  assertValidDayOfWeek(input.dayOfWeek);
  assertValidTimeFormat(input.startTime, 'startTime');
  assertValidTimeFormat(input.endTime, 'endTime');
  assertTimeOrder(input.startTime, input.endTime);
  assertBreakWithinSchedule(input.startTime, input.endTime, input.breakStart ?? null, input.breakEnd ?? null);

  return {
    id: randomUUID(),
    barberId: input.barberId,
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
    breakStart: input.breakStart ?? null,
    breakEnd: input.breakEnd ?? null,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateBarberSchedule(
  schedule: BarberSchedule,
  input: UpdateBarberScheduleInput,
  now: Date = new Date()
): BarberSchedule {
  const dayOfWeek = input.dayOfWeek ?? schedule.dayOfWeek;
  const startTime = input.startTime ?? schedule.startTime;
  const endTime = input.endTime ?? schedule.endTime;
  const breakStart = input.breakStart !== undefined ? input.breakStart : schedule.breakStart;
  const breakEnd = input.breakEnd !== undefined ? input.breakEnd : schedule.breakEnd;
  const active = input.active ?? schedule.active;

  if (input.dayOfWeek !== undefined) assertValidDayOfWeek(dayOfWeek);
  if (input.startTime !== undefined) assertValidTimeFormat(startTime, 'startTime');
  if (input.endTime !== undefined) assertValidTimeFormat(endTime, 'endTime');
  assertTimeOrder(startTime, endTime);
  assertBreakWithinSchedule(startTime, endTime, breakStart, breakEnd);

  return {
    ...schedule,
    dayOfWeek,
    startTime,
    endTime,
    breakStart,
    breakEnd,
    active,
    updatedAt: now,
  };
}

export function getScheduleDurationMinutes(schedule: BarberSchedule): number {
  const total = timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime);
  if (schedule.breakStart && schedule.breakEnd) {
    return total - (timeToMinutes(schedule.breakEnd) - timeToMinutes(schedule.breakStart));
  }
  return total;
}

export function isScheduleActive(schedule: Pick<BarberSchedule, 'active'>): boolean {
  return schedule.active;
}