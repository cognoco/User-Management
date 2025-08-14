// Conditional import to avoid importing Prisma in browser environment
let PrismaClient: any;
let prismaInstance: any;

if (typeof window === 'undefined') {
  // Only import Prisma on server side
  try {
    const { PrismaClient: ImportedPrismaClient } = require('../../../generated/prisma/index.js');
    PrismaClient = ImportedPrismaClient;
  } catch (error) {
    console.warn('Prisma client not available:', error);
    PrismaClient = null;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: any | undefined;
}

// Only create Prisma instance on server side
if (typeof window === 'undefined' && PrismaClient) {
  prismaInstance = global.prisma || new PrismaClient();
  
  if (process.env.NODE_ENV !== 'production') {
    global.prisma = prismaInstance;
  }
} else {
  // Client-side placeholder
  prismaInstance = null;
}

export const prisma = prismaInstance; 