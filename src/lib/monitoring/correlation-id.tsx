'use client';

import { v4 as uuidv4 } from 'uuid';
import type { NextApiRequest, NextApiResponse } from 'next';
import React, { createContext, useContext } from 'react';

interface Store { correlationId: string; }

// Server-side storage is handled separately
let clientCorrelationId: string | undefined;

const CorrelationIdContext = createContext<string | undefined>(undefined);

export interface CorrelationIdProviderProps {
  correlationId?: string;
  children: React.ReactNode;
}

export function CorrelationIdProvider({
  correlationId,
  children,
}: CorrelationIdProviderProps) {
  const id = correlationId ?? generateCorrelationId();
  setCorrelationId(id);
  return <CorrelationIdContext.Provider value={id}>{children}</CorrelationIdContext.Provider>;
}

export function useCorrelationId(): string | undefined {
  return useContext(CorrelationIdContext);
}

export function generateCorrelationId(parentId?: string): string {
  const id = uuidv4();
  return parentId ? `${parentId}.${id}` : id;
}

export function getCorrelationId(): string | undefined {
  // This is client-side only now
  return clientCorrelationId;
}

export function setCorrelationId(id: string) {
  // Client-side only now
  clientCorrelationId = id;
}

export function runWithCorrelationId<T>(id: string, fn: () => T): T {
  // Client-side only now
  const previous = clientCorrelationId;
  clientCorrelationId = id;
  try {
    return fn();
  } finally {
    clientCorrelationId = previous;
  }
}

// Note: Server middleware implementation lives in './correlation-id-middleware'.
// This TSX module intentionally does not export server middleware to avoid
// pulling React code into server bundles.
