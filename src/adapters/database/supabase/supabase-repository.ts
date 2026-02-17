import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  BaseDatabaseInterface,
  ConnectionOptions,
  QueryOptions,
  QueryResult,
  TransactionInterface,
  DatabaseError
} from '@/core/database/interfaces';
import { SERVER_ERROR_CODES } from '@/lib/api/common/error-codes';

/**
 * Generic Supabase repository implementing the BaseDatabaseInterface.
 *
 * This class isolates all Supabase specific logic and can be
 * swapped out for other database providers via the adapter system.
 */
export class SupabaseRepository<T> implements BaseDatabaseInterface<T> {
  private client: SupabaseClient<any, 'public'>;
  private table: string;

  constructor(private url: string, private key: string, table: string) {
    this.client = createClient(url, key);
    this.table = table;
  }

  /** Supabase manages connections automatically */
  async connect(_options?: ConnectionOptions): Promise<void> {}

  /** No-op for Supabase */
  async disconnect(): Promise<void> {}

  async create(data: Omit<T, 'id'>): Promise<T | DatabaseError> {
    const { data: result, error } = await this.client
      .from(this.table)
      .insert(data)
      .select()
      .single();

    if (error) {
      return { code: SERVER_ERROR_CODES.DATABASE_ERROR, message: error.message } as unknown as DatabaseError;
    }

    return result as T;
  }

  async findById(id: string): Promise<T | null | DatabaseError> {
    const { data, error } = await this.client
      .from(this.table)
      .select()
      .eq('id', id)
      .single();

    if (error) {
      return { code: SERVER_ERROR_CODES.RETRIEVAL_FAILED, message: error.message } as unknown as DatabaseError;
    }

    return data as T;
  }

  async update(id: string, data: Partial<T>): Promise<T | DatabaseError> {
    const { data: result, error } = await this.client
      .from(this.table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { code: SERVER_ERROR_CODES.DATABASE_ERROR, message: error.message } as unknown as DatabaseError;
    }

    return result as T;
  }

  async delete(id: string): Promise<{ success: boolean; error?: DatabaseError }> {
    const { error } = await this.client.from(this.table).delete().eq('id', id);
    if (error) {
      return { success: false, error: { code: SERVER_ERROR_CODES.DELETE_FAILED, message: error.message } as unknown as DatabaseError };
    }
    return { success: true };
  }

  async query(options?: QueryOptions): Promise<QueryResult<T>> {
    let query: any = this.client.from(this.table).select('*', { count: 'exact' });
    if (options?.filters) {
      for (const cond of options.filters) {
        query = query.eq(cond.field, cond.value);
      }
    }
    if (options?.sort) {
      for (const s of options.sort) {
        query = query.order(s.field, { ascending: s.direction === 'asc' });
      }
    }
    const { data, error, count } = await query;
    if (error) {
      throw new Error(error.message);
    }
    return { items: data as T[], count: count ?? data.length };
  }

  async transaction<R>(_fn: (tx: TransactionInterface) => Promise<R>): Promise<R> {
    throw new Error('Transactions are not supported by SupabaseRepository');
  }
}

export default SupabaseRepository;
