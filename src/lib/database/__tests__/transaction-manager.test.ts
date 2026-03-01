import { describe, it, expect, vi } from 'vitest';
import { executeTransaction, classifyFailure } from '../transaction-manager';
import { ApplicationError } from '@/core/common/errors';
import { USER_ERROR, SERVER_ERROR } from '@/core/common/error-codes';

function createTx() {
  return {
    begin: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
  };
}

describe('executeTransaction', () => {
  it('commits when all steps succeed', async () => {
    const tx = createTx();
    const logger = { debug: vi.fn(), error: vi.fn() };
    const step1 = vi.fn().mockResolvedValue(1);
    const step2 = vi.fn().mockResolvedValue(2);
    const result = await executeTransaction(tx, [step1, step2], logger);
    expect(result).toEqual([1, 2]);
    expect(tx.begin).toHaveBeenCalled();
    expect(tx.commit).toHaveBeenCalled();
    expect(tx.rollback).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith('transaction.begin');
    expect(logger.debug).toHaveBeenCalledWith('transaction.commit');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('rolls back on error and rethrows', async () => {
    const tx = createTx();
    const logger = { debug: vi.fn(), error: vi.fn() };
    const err = new ApplicationError(USER_ERROR.USER_003, 'fail', 400);
    const step1 = vi.fn().mockResolvedValue('ok');
    const step2 = vi.fn().mockRejectedValue(err);

    await expect(executeTransaction(tx, [step1, step2], logger)).rejects.toThrow(err);
    expect(tx.begin).toHaveBeenCalled();
    expect(tx.rollback).toHaveBeenCalled();
    expect(tx.commit).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('transaction.rollback', { failureType: 'permanent' });
  });
});

describe('classifyFailure', () => {
  it('returns transient for server errors', () => {
    const err = new ApplicationError(SERVER_ERROR.SERVER_003, 'db', 500);
    expect(classifyFailure(err)).toBe('transient');
  });

  it('returns permanent for client errors', () => {
    const err = new ApplicationError(USER_ERROR.USER_003, 'bad', 400);
    expect(classifyFailure(err)).toBe('permanent');
  });

  it('handles non-ApplicationError', () => {
    expect(classifyFailure(new Error('oops'))).toBe('transient');
  });
});
