import type { BarberBlock } from '../../domain/barber-block';
import type { BarberBlockRepository } from '../../persistence/interfaces';
import type { PaginationParams, PaginatedResponse } from '../../shared/pagination';
import { InMemoryRepository } from './base';

export class InMemoryBarberBlockRepository
  extends InMemoryRepository<BarberBlock>
  implements BarberBlockRepository
{
  async create(block: BarberBlock): Promise<BarberBlock> {
    return this.store(block);
  }

  async update(block: BarberBlock): Promise<BarberBlock> {
    return this.replace(block);
  }

  async findById(id: string): Promise<BarberBlock | null> {
    return this.get(id);
  }

  async findByBarberId(barberId: string): Promise<BarberBlock[]> {
    const results: BarberBlock[] = [];
    for (const block of this.items.values()) {
      if (block.barberId === barberId) {
        results.push(block);
      }
    }
    return results.sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());
  }

  async findOverlapping(barberId: string, startDateTime: Date, endDateTime: Date): Promise<BarberBlock[]> {
    const results: BarberBlock[] = [];
    for (const block of this.items.values()) {
      if (block.barberId === barberId) {
        if (block.startDateTime < endDateTime && block.endDateTime > startDateTime) {
          results.push(block);
        }
      }
    }
    return results;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }

  async findAll(params: PaginationParams): Promise<PaginatedResponse<BarberBlock>> {
    return this.list(params);
  }
}