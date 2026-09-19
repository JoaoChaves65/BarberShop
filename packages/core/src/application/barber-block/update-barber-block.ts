import {
  updateBarberBlock,
  type BarberBlock,
  type UpdateBarberBlockInput,
} from '../../domain/barber-block';
import { EntityNotFoundError, ConflictError } from '../../domain/errors';
import type { BarberBlockRepository, SqlExecutor } from '../../persistence/interfaces';
import type { Command } from '../interfaces';

export interface UpdateBarberBlockCommandInput extends UpdateBarberBlockInput {
  id: string;
}

export class UpdateBarberBlock implements Command<UpdateBarberBlockCommandInput, BarberBlock> {
  constructor(
    private readonly blocks: BarberBlockRepository,
    private readonly executor: SqlExecutor
  ) {}

  async execute(input: UpdateBarberBlockCommandInput): Promise<BarberBlock> {
    return this.executor.transaction(async (txExecutor) => {
      const { PgBarberBlockRepository } = await import('../../infrastructure/database/repositories/barber-block-repository.js');

      const txBlocks = new PgBarberBlockRepository(txExecutor);

      const existing = await txBlocks.findById(input.id);
      if (!existing) {
        throw new EntityNotFoundError('BarberBlock', input.id);
      }

      if (input.startDateTime !== undefined || input.endDateTime !== undefined) {
        const start = input.startDateTime ?? existing.startDateTime;
        const end = input.endDateTime ?? existing.endDateTime;
        const overlapping = await txBlocks.findOverlapping(existing.barberId, start, end);
        const hasOtherOverlap = overlapping.some(b => b.id !== input.id);
        if (hasOtherOverlap) {
          throw new ConflictError('Block overlaps with existing block');
        }
      }

      const updated = updateBarberBlock(existing, input);
      return txBlocks.update(updated);
    });
  }
}