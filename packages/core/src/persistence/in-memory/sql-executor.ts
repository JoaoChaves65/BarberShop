/**
 * In-memory SqlExecutor for unit tests.
 * Executes callbacks directly without actual database transactions.
 */

import type { SqlExecutor } from '../interfaces';
import type { QueryResultRow } from 'pg';

export class InMemorySqlExecutor implements SqlExecutor {
  async query<T extends QueryResultRow>(_sql: string, _params: unknown[] = []): Promise<T[]> {
    return [];
  }

  async queryOne<T extends QueryResultRow>(_sql: string, _params: unknown[] = []): Promise<T | null> {
    return null;
  }

  async execute(_sql: string, _params: unknown[] = []): Promise<{ rowCount: number }> {
    return { rowCount: 0 };
  }

  async transaction<T>(fn: (executor: SqlExecutor) => Promise<T>): Promise<T> {
    return fn(this);
  }

  getExecutor(): never {
    throw new Error('InMemorySqlExecutor does not have a Pool or PoolClient');
  }
}

export function createInMemorySqlExecutor(): SqlExecutor {
  return new InMemorySqlExecutor();
}