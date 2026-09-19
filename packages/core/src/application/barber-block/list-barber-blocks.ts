import type { BarberBlock } from '../../domain/barber-block';
import type { BarberBlockRepository } from '../../persistence/interfaces';
import type { PaginatedQuery } from '../interfaces';
import { validatePagination } from '../../shared/pagination';
import type { PaginatedResponse } from '../../shared/pagination';
import type { ListInput } from '../types';

export class ListBarberBlocks implements PaginatedQuery<ListInput, BarberBlock> {
  constructor(private readonly blocks: BarberBlockRepository) {}

  async execute(input: ListInput): Promise<PaginatedResponse<BarberBlock>> {
    return this.blocks.findAll(validatePagination(input));
  }
}