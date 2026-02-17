import type {
  BaseDatabaseInterface,
  ConnectionOptions,
  QueryOptions,
  QueryResult,
  TransactionInterface,
  DatabaseError
} from '@/core/database/interfaces';

/**
 * Simple in-memory database implementation for testing.
 */
export class MockRepository<T extends { id: string }> implements BaseDatabaseInterface<T> {
  private items: T[] = [];

  async connect(_options?: ConnectionOptions): Promise<void> {}

  async disconnect(): Promise<void> {
    this.items = [];
  }

  async create(data: Omit<T, 'id'>): Promise<T | DatabaseError> {
    const item = { ...(data as object), id: `${Date.now()}-${Math.random()}` } as T;
    this.items.push(item);
    return item;
  }

  async findById(id: string): Promise<T | null | DatabaseError> {
    return this.items.find((i) => i.id === id) || null;
  }

  async update(id: string, data: Partial<T>): Promise<T | DatabaseError> {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) return { code: 'mock/not_found', message: 'Item not found' } as unknown as DatabaseError;
    this.items[index] = { ...this.items[index], ...data } as T;
    return this.items[index];
  }

  async delete(id: string): Promise<{ success: boolean; error?: DatabaseError }> {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) {
      return { success: false, error: { code: 'mock/not_found', message: 'Item not found' } as unknown as DatabaseError };
    }
    this.items.splice(index, 1);
    return { success: true };
  }

  async query(options?: QueryOptions): Promise<QueryResult<T>> {
    let result = [...this.items];
    if (options?.filters) {
      for (const cond of options.filters) {
        result = result.filter((i: any) => i[cond.field] === cond.value);
      }
    }
    return { items: result, count: result.length };
  }

  async transaction<R>(fn: (tx: TransactionInterface) => Promise<R>): Promise<R> {
    const tx: TransactionInterface = {
      begin: async () => {},
      commit: async () => {},
      rollback: async () => {}
    };
    return fn(tx);
  }
}

export default MockRepository;
