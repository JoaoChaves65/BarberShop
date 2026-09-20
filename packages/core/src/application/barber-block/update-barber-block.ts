import {
  updateBarberBlock,
  type BarberBlock,
  type UpdateBarberBlockInput,
} from '../../domain/barber-block';
import { EntityNotFoundError, ConflictError } from '../../domain/errors';
import type { SqlExecutor, RepositoryFactory } from '../../persistence/interfaces';
import type { Command } from '../interfaces';

export interface UpdateBarberBlockCommandInput extends UpdateBarberBlockInput {
  id: string;
}

export class UpdateBarberBlock implements Command<UpdateBarberBlockCommandInput, BarberBlock> {
  constructor(
    private readonly factory: RepositoryFactory,
    private readonly executor: SqlExecutor
  ) {}

  async execute(input: UpdateBarberBlockCommandInput): Promise<BarberBlock> {
    return this.executor.transaction(async (txExecutor) => {
      const blocks = this.factory.createBarberBlockRepository(txExecutor);

      const existing = await blocks.findById(input.id);
      if (!existing) {
        throw new EntityNotFoundError('BarberBlock', input.id);
      }

      if (input.startDateTime !== undefined || input.endDateTime !== undefined) {
        const start = input.startDateTime ?? existing.startDateTime;
        const end = input.endDateTime ?? existing.endDateTime;
        const overlapping = await blocks.findOverlapping(existing.barberId, start, end);
        const hasOtherOverlap = overlapping.some(b => b.id !== input.id);
        if (hasOtherOverlap) {
          throw new ConflictError('Block overlaps with existing block');
        }
      }

      const updated = updateBarberBlock(existing, input);
      return blocks.update(updated);
    });
  }
}