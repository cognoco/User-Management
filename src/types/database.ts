import { z } from 'zod';

// Base schemas for common fields
export const baseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// User schema
export const userSchema = baseEntitySchema.extend({
  email: z.string().email(),
  name: z.string().min(2),
  emailVerified: z.boolean().default(false),
  role: z.enum(['user', 'admin', 'moderator']).default('user'),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
});

// Profile schema
export const profileSchema = baseEntitySchema.extend({
  userId: z.string().uuid(),
  userType: z.enum(['private', 'corporate']).default('private'),
  avatarUrl: z.string().url().nullable(),
  bio: z.string().max(500).nullable(),
  location: z.string().max(100).nullable(),
  website: z.string().url().nullable(),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/).nullable(),
  privacySettings: z.object({
    showEmail: z.boolean().default(false),
    showPhone: z.boolean().default(false),
    showLocation: z.boolean().default(false),
    profileVisibility: z.enum(['public', 'private', 'contacts']).default('private'),
  }).default({}),
  companyName: z.string().nullable().optional(),
  companyLogoUrl: z.string().url().nullable().optional(),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).nullable().optional(),
  industry: z.string().nullable().optional(),
  companyWebsite: z.string().url().nullable().optional(),
  position: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  vatId: z.string().nullable().optional(),
  address: z.object({
    street_line1: z.string().min(1, { message: 'Street address is required' }),
    street_line2: z.string().optional().nullable(),
    city: z.string().min(1, { message: 'City is required' }),
    state: z.string().optional().nullable(),
    postal_code: z.string().min(1, { message: 'Postal code is required' }),
    country: z.string().min(2, { message: 'Country code is required' }),
    validated: z.boolean().optional().nullable(),
  }).superRefine((data, ctx) => {
    const countrySpecifics: Record<string, { stateRequired: boolean, stateLabel: string }> = {
      US: { stateRequired: true, stateLabel: 'State' },
      CA: { stateRequired: true, stateLabel: 'Province' },
      DEFAULT: { stateRequired: false, stateLabel: 'State / Province / Region' }
    };
    const terms = countrySpecifics[data.country] || countrySpecifics.DEFAULT;
    if (terms.stateRequired && (!data.state || data.state.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${terms.stateLabel} is required for country ${data.country}.`,
        path: ['state'],
      });
    }
  }).nullable().optional(),
});

// User preferences schema
export const userPreferencesSchema = baseEntitySchema.extend({
  userId: z.string().uuid(),
  language: z.string().default('en'),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    marketing: z.boolean().default(false),
  }).default({}),
  itemsPerPage: z.number().min(1).max(100).default(25),
  timezone: z.string().default('UTC'),
  dateFormat: z.string().default('YYYY-MM-DD'),
});

// Activity log schema
export const activityLogSchema = baseEntitySchema.extend({
  userId: z.string().uuid(),
  action: z.string(),
  details: z.record(z.unknown()).nullable(),
  ipAddress: z.string().ip().nullable(),
  userAgent: z.string().nullable(),
});

// Types
export type BaseEntity = z.infer<typeof baseEntitySchema>;
export type User = z.infer<typeof userSchema>;
export interface Profile extends z.infer<typeof profileSchema> {}
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type ActivityLog = z.infer<typeof activityLogSchema>;

// Database relationships
export interface UserWithRelations extends User {
  profile: Profile | null;
  preferences: UserPreferences | null;
  activityLogs: ActivityLog[];
}

// Database indexes
export const databaseIndexes = {
  users: {
    email: 'unique',
    role: 'index',
    status: 'index',
  },
  profiles: {
    userId: 'unique',
  },
  userPreferences: {
    userId: 'unique',
  },
  activityLogs: {
    userId: 'index',
    createdAt: 'index',
  },
} as const; 