/**
 * Simple logger utility that respects environment
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isBuild = process.env.NODE_ENV === 'production' || process.argv.includes('build');
const isDebugEnabled = process.env.DEBUG === 'true';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment && !isBuild) {
      console.log(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDebugEnabled && !isBuild) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    console.error(...args);
  },
  
  warn: (...args: any[]) => {
    if (!isBuild) {
      console.warn(...args);
    }
  }
};