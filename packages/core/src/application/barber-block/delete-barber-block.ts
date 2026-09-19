import { EntityNotFoundError } from '../../domain/errors';
import type { BarberBlockRepository } from '../../persistence/interfaces';
import type { Command } from '../interfaces';
import type { IdInput } from '../types';

export class DeleteBarberBlock implements Command<IdInput, void> {
  constructor(private readonly blocks: BarberBlockRepository) {}

  async execute(input: IdInput): Promise<void> {
    const existing = await this.blocks.findById(input.id);
    if (!existing) {
      throw new EntityNotFoundError('BarberBlock', input.id);
    }
    await this.blocks.delete(input.id);
  }
}