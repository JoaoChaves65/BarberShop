import type { BarberBlock } from '../../domain/barber-block';
import type { BarberBlockRepository } from '../../persistence/interfaces';
import type { Query } from '../interfaces';
import type { IdInput } from '../types';

export class GetBarberBlock implements Query<IdInput, BarberBlock | null> {
  constructor(private readonly blocks: BarberBlockRepository) {}

  async execute(input: IdInput): Promise<BarberBlock | null> {
    return this.blocks.findById(input.id);
  }
}