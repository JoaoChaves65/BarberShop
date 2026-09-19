import { randomUUID } from 'node:crypto';
import { InvalidDomainError } from './errors';

export enum BarberBlockReason {
  TIME_OFF = 'TIME_OFF',
  LUNCH = 'LUNCH',
  MAINTENANCE = 'MAINTENANCE',
  OTHER = 'OTHER',
}

export const BARBER_BLOCK_REASONS: readonly BarberBlockReason[] = Object.values(BarberBlockReason);

export interface BarberBlock {
  id: string;
  barberId: string;
  startDateTime: Date;
  endDateTime: Date;
  reason: BarberBlockReason;
  recurring: boolean;
  recurrenceRule: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBarberBlockInput {
  barberId: string;
  startDateTime: Date;
  endDateTime: Date;
  reason: BarberBlockReason;
  recurring?: boolean;
  recurrenceRule?: string;
}

export interface UpdateBarberBlockInput {
  startDateTime?: Date;
  endDateTime?: Date;
  reason?: BarberBlockReason;
  recurring?: boolean;
  recurrenceRule?: string | null;
}

export function createBarberBlock(input: CreateBarberBlockInput, now: Date = new Date()): BarberBlock {
  if (!input.barberId) {
    throw new InvalidDomainError('barberId', 'barberId is required');
  }
  if (!input.startDateTime || Number.isNaN(input.startDateTime.getTime())) {
    throw new InvalidDomainError('startDateTime', 'startDateTime must be a valid date');
  }
  if (!input.endDateTime || Number.isNaN(input.endDateTime.getTime())) {
    throw new InvalidDomainError('endDateTime', 'endDateTime must be a valid date');
  }
  if (input.startDateTime >= input.endDateTime) {
    throw new InvalidDomainError('endDateTime', 'endDateTime must be after startDateTime');
  }
  if (!BARBER_BLOCK_REASONS.includes(input.reason)) {
    throw new InvalidDomainError('reason', `reason must be one of: ${BARBER_BLOCK_REASONS.join(', ')}`);
  }
  if (input.recurring && !input.recurrenceRule) {
    throw new InvalidDomainError('recurrenceRule', 'recurrenceRule is required when recurring is true');
  }
  if (input.recurrenceRule && !input.recurring) {
    throw new InvalidDomainError('recurring', 'recurring must be true when recurrenceRule is provided');
  }

  return {
    id: randomUUID(),
    barberId: input.barberId,
    startDateTime: input.startDateTime,
    endDateTime: input.endDateTime,
    reason: input.reason,
    recurring: input.recurring ?? false,
    recurrenceRule: input.recurrenceRule ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateBarberBlock(
  block: BarberBlock,
  input: UpdateBarberBlockInput,
  now: Date = new Date()
): BarberBlock {
  const startDateTime = input.startDateTime !== undefined ? input.startDateTime : block.startDateTime;
  const endDateTime = input.endDateTime !== undefined ? input.endDateTime : block.endDateTime;
  const reason = input.reason !== undefined ? input.reason : block.reason;
  const recurring = input.recurring !== undefined ? input.recurring : block.recurring;
  const recurrenceRule = input.recurrenceRule !== undefined ? input.recurrenceRule : block.recurrenceRule;

  if (input.startDateTime !== undefined && Number.isNaN(startDateTime.getTime())) {
    throw new InvalidDomainError('startDateTime', 'startDateTime must be a valid date');
  }
  if (input.endDateTime !== undefined && Number.isNaN(endDateTime.getTime())) {
    throw new InvalidDomainError('endDateTime', 'endDateTime must be a valid date');
  }
  if (startDateTime >= endDateTime) {
    throw new InvalidDomainError('endDateTime', 'endDateTime must be after startDateTime');
  }
  if (input.reason !== undefined && !BARBER_BLOCK_REASONS.includes(reason)) {
    throw new InvalidDomainError('reason', `reason must be one of: ${BARBER_BLOCK_REASONS.join(', ')}`);
  }
  if (recurring && !recurrenceRule) {
    throw new InvalidDomainError('recurrenceRule', 'recurrenceRule is required when recurring is true');
  }
  if (recurrenceRule && !recurring) {
    throw new InvalidDomainError('recurring', 'recurring must be true when recurrenceRule is provided');
  }

  return {
    ...block,
    startDateTime,
    endDateTime,
    reason,
    recurring,
    recurrenceRule,
    updatedAt: now,
  };
}

export function doesBlockOverlap(
  block: Pick<BarberBlock, 'startDateTime' | 'endDateTime'>,
  start: Date,
  end: Date
): boolean {
  return block.startDateTime < end && block.endDateTime > start;
}