import type { PaginationParams } from '../shared/pagination';

export interface IdInput {
  id: string;
}

export interface ListInput extends PaginationParams {
  status?: string;
  startDate?: string;
  endDate?: string;
}
