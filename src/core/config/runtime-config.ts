// Dynamically loaded to avoid bundling Node.js builtins into client
const getFs = () => typeof window === 'undefined' ? require('fs') : null;
const getPath = () => typeof window === 'undefined' ? require('path') : null;
import { loadEnvironment, validateEnvironment, EnvironmentConfig } from './environment';
import { UserManagementConfig, DEFAULT_CONFIG } from './interfaces';

export interface RuntimeConfig extends UserManagementConfig {
  env: EnvironmentConfig;
}

let config: RuntimeConfig = {
  ...DEFAULT_CONFIG,
  env: loadEnvironment(),
};

export function loadConfigFromFile(filePath = 'user-management.config.ts'): Partial<RuntimeConfig> {
  try {
    const fs = getFs();
    const path = getPath();
    if (!fs || !path) return {};
    const resolved = path.resolve(process.cwd(), filePath);
    if (fs.existsSync(resolved)) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fileConfig = require(resolved) as Partial<RuntimeConfig>;
      return fileConfig;
    }
  } catch (err) {
    console.error('[config] Failed to load configuration file', err);
  }
  return {};
}

export function initializeConfiguration(filePath?: string): RuntimeConfig {
  const fileConfig = loadConfigFromFile(filePath);
  configure(fileConfig);
  if (process.env.NODE_ENV !== 'test') {
    validateEnvironment(config.env);
  }
  return config;
}

export function configure(overrides: Partial<RuntimeConfig>): RuntimeConfig {
  config = {
    ...config,
    ...overrides,
    env: { ...config.env, ...overrides.env },
    featureFlags: {
      ...config.featureFlags,
      ...overrides.featureFlags,
    },
    serviceProviders: {
      ...config.serviceProviders,
      ...overrides.serviceProviders,
    },
    options: {
      ...config.options,
      ...overrides.options,
      redirects: {
        ...config.options.redirects,
        ...overrides.options?.redirects,
      },
    },
  };
  return config;
}

export function getConfig(): RuntimeConfig {
  return config;
}

export function getServerConfig(): RuntimeConfig {
  return config;
}

export function getClientConfig(): RuntimeConfig {
  const { serviceRoleKey, ...envRest } = config.env;
  return { ...config, env: { ...envRest } };
}
