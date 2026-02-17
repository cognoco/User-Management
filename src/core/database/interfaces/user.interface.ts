import type { IUserRepository } from '../../user/IUserRepository';
import type { BaseDatabaseInterface } from './base.interface';
import type { UserProfile } from '../../user/models';

/**
 * Database interface for user entities.
 *
 * This simply extends the existing {@link IUserRepository}
 * to make it part of the generic database interface collection.
 */
export interface UserDatabaseInterface extends IUserRepository {}
