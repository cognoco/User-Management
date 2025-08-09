import { describe, it, expect } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { validate as uuidValidate } from 'uuid';
import React from 'react';
import {
  generateCorrelationId,
  runWithCorrelationId,
  getCorrelationId,
  CorrelationIdProvider,
  useCorrelationId,
} from '../correlation-id';
import { correlationIdMiddleware } from '../correlation-id-middleware';
import { render, screen } from '@testing-library/react';

const DisplayId = () => {
  const id = useCorrelationId();
  return <div data-testid="cid">{id}</div>;
};

describe('correlation-id utilities', () => {
  it('generates valid uuid v4', () => {
    const id = generateCorrelationId();
    expect(uuidValidate(id)).toBe(true);
  });

  it('creates hierarchical ids', () => {
    const parent = 'parent';
    const id = generateCorrelationId(parent);
    expect(id.startsWith(`${parent}.`)).toBe(true);
    const child = id.split('.')[1];
    expect(uuidValidate(child)).toBe(true);
  });

  it('runWithCorrelationId provides id in context', () => {
    const id = generateCorrelationId();
    const value = runWithCorrelationId(id, () => getCorrelationId());
    expect(value).toBe(id);
    expect(getCorrelationId()).toBeUndefined();
  });

  it('React provider exposes id via context', () => {
    render(
      <CorrelationIdProvider correlationId="test-id">
        <DisplayId />
      </CorrelationIdProvider>
    );
    expect(screen.getByTestId('cid').textContent).toBe('test-id');
  });
});

describe('correlationIdMiddleware', () => {
  it('assigns correlation id and sets header', async () => {
    const middleware = correlationIdMiddleware();
    const { req, res } = createMocks();
    const next = async () => {
      expect(getCorrelationId()).toBe((req as any).correlationId);
    };

    await middleware(req as any, res as any, next);

    const id = (req as any).correlationId;
    expect(uuidValidate(id)).toBe(true);
    expect(res.getHeader('X-Correlation-Id')).toBe(id);
  });

  it('attaches correlation id to errors', async () => {
    const middleware = correlationIdMiddleware();
    const { req, res } = createMocks();
    const next = async () => {
      throw new Error('failure');
    };

    try {
      await middleware(req as any, res as any, next);
    } catch (e: any) {
      expect(e.correlationId).toBe((req as any).correlationId);
    }
  });
});
