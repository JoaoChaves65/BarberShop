import {
  createBarberBlock,
  type BarberBlock,
  type CreateBarberBlockInput,
} from '../../domain/barber-block';
import { EntityNotFoundError, ConflictError } from '../../domain/errors';
import type { BarberRepository, BarberBlockRepository, SqlExecutor } from '../../persistence/interfaces';
import type { Command } from '../interfaces';

export class CreateBarberBlock implements Command<CreateBarberBlockInput, BarberBlock> {
  constructor(
    private readonly blocks: BarberBlockRepository,
    private readonly barbers: BarberRepository,
    private readonly executor: SqlExecutor
  ) {}

  async execute(input: CreateBarberBlockInput): Promise<BarberBlock> {
    return this.executor.transaction(async (txExecutor) => {
      const { PgBarberBlockRepository } = await import('../../infrastructure/database/repositories/barber-block-repository.js');
      const { PgBarberRepository } = await import('../../infrastructure/database/repositories/barber-repository.js');

      const txBlocks = new PgBarberBlockRepository(txExecutor);
      const txBarbers = new PgBarberRepository(txExecutor);

      const barber = await txBarbers.findById(input.barberId);
      if (!barber) {
        throw new EntityNotFoundError('Barber', input.barberId);
      }

      const overlapping = await txBlocks.findOverlapping(input.barberId, input.startDateTime, input.endDateTime);
      if (overlapping.length > 0) {
        throw new ConflictError('Block overlaps with existing block');
      }

      const block = createBarberBlock(input);
      return txBlocks.create(block);
    });
  }
}