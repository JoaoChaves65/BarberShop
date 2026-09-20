import {
  createBarberBlock,
  type BarberBlock,
  type CreateBarberBlockInput,
} from '../../domain/barber-block';
import { EntityNotFoundError, ConflictError } from '../../domain/errors';
import type { SqlExecutor, RepositoryFactory } from '../../persistence/interfaces';
import type { Command } from '../interfaces';

export class CreateBarberBlock implements Command<CreateBarberBlockInput, BarberBlock> {
  constructor(
    private readonly factory: RepositoryFactory,
    private readonly executor: SqlExecutor
  ) {}

  async execute(input: CreateBarberBlockInput): Promise<BarberBlock> {
    return this.executor.transaction(async (txExecutor) => {
      const blocks = this.factory.createBarberBlockRepository(txExecutor);
      const barbers = this.factory.createBarberRepository(txExecutor);

      const barber = await barbers.findById(input.barberId);
      if (!barber) {
        throw new EntityNotFoundError('Barber', input.barberId);
      }

      const overlapping = await blocks.findOverlapping(input.barberId, input.startDateTime, input.endDateTime);
      if (overlapping.length > 0) {
        throw new ConflictError('Block overlaps with existing block');
      }

      const block = createBarberBlock(input);
      return blocks.create(block);
    });
  }
}