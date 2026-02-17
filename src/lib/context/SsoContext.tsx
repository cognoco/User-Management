import React, { createContext, useContext } from 'react';
import type { SsoProvider as SsoProviderType, SsoConnection } from '@/types/sso';

export interface SsoService {
  listProviders: () => Promise<SsoProviderType[]>;
  listConnections: () => Promise<SsoConnection[]>;
  connect: (providerId: string) => Promise<SsoConnection>;
  disconnect: (connectionId: string) => Promise<void>;
}

interface SsoContextValue {
  ssoService: SsoService;
}

const SsoContext = createContext<SsoContextValue | undefined>(undefined);

export interface SsoProviderProps {
  ssoService: SsoService;
  children: React.ReactNode;
}

export const SsoProvider: React.FC<SsoProviderProps> = ({ ssoService, children }) => {
  return <SsoContext.Provider value={{ ssoService }}>{children}</SsoContext.Provider>;
};

export function useSsoService(): SsoService {
  const context = useContext(SsoContext);
  if (!context) {
    throw new Error('useSsoService must be used within a SsoProvider');
  }
  return context.ssoService;
}

export default SsoProvider;
