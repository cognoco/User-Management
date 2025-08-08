'use client';
import React, { createContext, useContext, ReactNode } from 'react';
import type { UserManagementConfig } from '@/core/config/interfaces';
import { clientConfig } from '@/core/config/client-config';

const ConfigContext = createContext<UserManagementConfig>({
  // Provide a minimal client-safe config shape; server-only fields omitted
  featureFlags: {},
  serviceProviders: {},
  options: { redirects: {}, api: {}, ui: {}, security: { allowedOrigins: [] } },
} as UserManagementConfig);

export const useRuntimeConfig = () => useContext(ConfigContext);

interface ConfigProviderProps {
  children: ReactNode;
  config?: Partial<UserManagementConfig>;
}

export function ConfigProvider({ children, config }: ConfigProviderProps) {
  const value = config
    ? ({ ...clientConfig, ...config } as any)
    : (clientConfig as any);
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}
