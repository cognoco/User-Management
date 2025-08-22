
/**
 * Repository-backed User Service
 *
 * Provides user management and authentication logic using the IUserRepository
 * and AuthService abstractions. All methods return result objects instead of
 * throwing synchronous errors to keep consumers simple.
 */
import type { AuthService } from '@/core/auth/interfaces';
import { LoginPayload, RegistrationPayload, AuthResult } from '@/core/common/user-types';
import type { IUserRepository } from '@/repositories/interfaces/IUserRepository';
import type { User, CreateUserDto } from '@/types/user';

export interface RepositoryUserServiceOptions {
  userRepository: IUserRepository;
  authService: AuthService;
}

export class RepositoryUserService {
  constructor(private readonly options: RepositoryUserServiceOptions) {}

  /** Register a new user via the auth service and persist a profile */
  async register(data: RegistrationPayload): Promise<AuthResult> {
    const authResult = await this.options.authService.register(data);
    if (!authResult.success || !authResult.user) {
      return authResult;
    }
    try {
      const createDto: CreateUserDto = {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        metadata: data.metadata,
      };
      await this.options.userRepository.create(createDto);
      return authResult;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /** Authenticate an existing user */
  async login(credentials: LoginPayload): Promise<AuthResult> {
    return this.options.authService.login(credentials);
  }

  /** Retrieve a user profile by id */
  async getUserById(id: string): Promise<User | null> {
    try {
      return await this.options.userRepository.findById(id);
    } catch {
      return null;
    }
  }

  /** Update profile information for a user */
  async updateProfile(
    id: string,
    update: Partial<User>
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const user = await this.options.userRepository.update(id, update);
      return { success: true, user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
