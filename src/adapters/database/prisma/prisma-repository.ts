import { PrismaClient } from '@prisma/client';
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
 * Prisma implementation of the BaseDatabaseInterface.
 *
 * Each instance is configured with a Prisma model name which is
 * used for all CRUD operations.
 */
export class PrismaRepository<T> implements BaseDatabaseInterface<T> {
  private client: PrismaClient;
  private model: any;

  constructor(options: { client?: PrismaClient; model: string }) {
    this.client = options.client || new PrismaClient();
    this.model = (this.client as any)[options.model];
    if (!this.model) {
      throw new Error(`Model '${options.model}' not found in PrismaClient`);
    }
  }

  async connect(_options?: ConnectionOptions): Promise<void> {
    await this.client.$connect();
  }

  async disconnect(): Promise<void> {
    await this.client.$disconnect();
  }

  async create(data: Omit<T, 'id'>): Promise<T | DatabaseError> {
    try {
      return (await this.model.create({ data })) as T;
    } catch (error: any) {
      return { code: SERVER_ERROR_CODES.DATABASE_ERROR, message: error.message } as unknown as DatabaseError;
    }
  }

  async findById(id: string): Promise<T | null | DatabaseError> {
    try {
      return (await this.model.findUnique({ where: { id } })) as T | null;
    } catch (error: any) {
      return { code: SERVER_ERROR_CODES.RETRIEVAL_FAILED, message: error.message } as unknown as DatabaseError;
    }
  }

  async update(id: string, data: Partial<T>): Promise<T | DatabaseError> {
    try {
      return (await this.model.update({ where: { id }, data })) as T;
    } catch (error: any) {
      return { code: SERVER_ERROR_CODES.DATABASE_ERROR, message: error.message } as unknown as DatabaseError;
    }
  }

  async delete(id: string): Promise<{ success: boolean; error?: DatabaseError }> {
    try {
      await this.model.delete({ where: { id } });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: { code: SERVER_ERROR_CODES.DELETE_FAILED, message: error.message } as unknown as DatabaseError };
    }
  }

  async query(options?: QueryOptions): Promise<QueryResult<T>> {
    try {
      const items = await this.model.findMany({ where: options?.filters as any });
      return { items: items as T[], count: items.length };
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  async transaction<R>(_fn: (tx: TransactionInterface) => Promise<R>): Promise<R> {
    throw new Error('Transactions are not implemented for PrismaRepository');
  }
}

export default PrismaRepository;
