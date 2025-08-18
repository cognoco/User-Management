import type { OrganizationService } from '@/core/organization/interfaces';
import type { IOrganizationDataProvider } from '@/core/organization/IOrganizationDataProvider';
import type {
  Organization,
  OrganizationCreatePayload,
  OrganizationUpdatePayload,
  OrganizationResult,
  OrganizationMember,
  OrganizationMemberResult
} from '@/core/organization/models';

export interface OrganizationSettings {
  maxSeats?: number;
  ssoEnabled?: boolean;
  domainVerificationRequired?: boolean;
  autoJoinByDomain?: boolean;
  allowedDomains?: string[];
  features?: {
    customRoles?: boolean;
    advancedPermissions?: boolean;
    apiAccess?: boolean;
    webhooks?: boolean;
  };
}

export interface EnhancedOrganization extends Organization {
  settings?: OrganizationSettings;
  seatCount?: number;
  availableSeats?: number;
  verifiedDomains?: string[];
  primaryDomain?: string;
  ssoProviders?: string[];
}

export interface SeatAllocation {
  organizationId: string;
  totalSeats: number;
  usedSeats: number;
  availableSeats: number;
  pendingInvites: number;
}

export interface DomainVerification {
  domain: string;
  organizationId: string;
  verificationMethod: 'dns' | 'email' | 'file';
  verificationToken: string;
  isVerified: boolean;
  verifiedAt?: Date;
  isPrimary?: boolean;
}

export class EnhancedOrganizationService implements OrganizationService {
  constructor(
    private provider: IOrganizationDataProvider,
    private subscriptionService?: any,
    private domainService?: any
  ) {}

  async createOrganization(ownerId: string, data: OrganizationCreatePayload): Promise<OrganizationResult> {
    // Create the organization
    const result = await this.provider.createOrganization(ownerId, data);
    
    if (result.success && result.organization) {
      // Initialize default settings
      await this.initializeOrganizationSettings(result.organization.id);
      
      // Add owner as admin member
      await this.provider.addMember(result.organization.id, ownerId, 'admin');
    }
    
    return result;
  }

  async getOrganization(id: string): Promise<Organization | null> {
    const org = await this.provider.getOrganization(id);
    
    if (org) {
      // Enhance with additional data
      return this.enhanceOrganization(org);
    }
    
    return null;
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const orgs = await this.provider.getUserOrganizations(userId);
    
    // Enhance each organization with additional data
    return Promise.all(orgs.map(org => this.enhanceOrganization(org)));
  }

  async updateOrganization(id: string, data: OrganizationUpdatePayload): Promise<OrganizationResult> {
    // Check seat limits if updating member count
    if (data.settings?.maxSeats) {
      const currentSeats = await this.getSeatAllocation(id);
      if (currentSeats.usedSeats > data.settings.maxSeats) {
        return {
          success: false,
          error: `Cannot reduce seats below current usage (${currentSeats.usedSeats} seats in use)`
        };
      }
    }
    
    return this.provider.updateOrganization(id, data);
  }

  async deleteOrganization(id: string): Promise<{ success: boolean; error?: string }> {
    // Clean up related data before deletion
    await this.cleanupOrganizationData(id);
    
    return this.provider.deleteOrganization(id);
  }

  async getOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
    return this.provider.getMembers(orgId);
  }

  async addOrganizationMember(orgId: string, userId: string, role: string): Promise<OrganizationMemberResult> {
    // Check seat availability
    const seats = await this.getSeatAllocation(orgId);
    if (seats.availableSeats <= 0) {
      return {
        success: false,
        error: 'No available seats. Please upgrade your plan or remove existing members.'
      };
    }
    
    // Check domain verification if required
    const org = await this.getOrganization(orgId);
    if (org?.settings?.domainVerificationRequired) {
      const userEmail = await this.getUserEmail(userId);
      const isVerifiedDomain = await this.checkDomainVerification(orgId, userEmail);
      
      if (!isVerifiedDomain) {
        return {
          success: false,
          error: 'User email domain is not verified for this organization'
        };
      }
    }
    
    return this.provider.addMember(orgId, userId, role);
  }

  // Seat Management Methods
  async getSeatAllocation(orgId: string): Promise<SeatAllocation> {
    const org = await this.getOrganization(orgId);
    const members = await this.getOrganizationMembers(orgId);
    const maxSeats = org?.settings?.maxSeats || 10; // Default to 10 seats
    
    const pendingInvites = await this.getPendingInviteCount(orgId);
    const usedSeats = members.length + pendingInvites;
    
    return {
      organizationId: orgId,
      totalSeats: maxSeats,
      usedSeats,
      availableSeats: Math.max(0, maxSeats - usedSeats),
      pendingInvites
    };
  }

  async updateSeatCount(orgId: string, newSeatCount: number): Promise<OrganizationResult> {
    const currentAllocation = await this.getSeatAllocation(orgId);
    
    if (newSeatCount < currentAllocation.usedSeats) {
      return {
        success: false,
        error: `Cannot reduce seats below current usage (${currentAllocation.usedSeats} seats in use)`
      };
    }
    
    return this.updateOrganization(orgId, {
      settings: { maxSeats: newSeatCount }
    });
  }

  async enforceSeatLimit(orgId: string): Promise<boolean> {
    const allocation = await this.getSeatAllocation(orgId);
    return allocation.availableSeats > 0;
  }

  // Domain Verification Methods
  async addDomain(orgId: string, domain: string): Promise<DomainVerification> {
    const verificationToken = this.generateVerificationToken();
    
    const domainVerification: DomainVerification = {
      domain,
      organizationId: orgId,
      verificationMethod: 'dns',
      verificationToken,
      isVerified: false
    };
    
    // Store domain verification record
    if (this.domainService) {
      await this.domainService.createDomainVerification(domainVerification);
    }
    
    return domainVerification;
  }

  async verifyDomain(orgId: string, domain: string): Promise<boolean> {
    if (!this.domainService) {
      console.warn('Domain service not available');
      return false;
    }
    
    const verification = await this.domainService.getDomainVerification(orgId, domain);
    if (!verification) return false;
    
    // Check DNS TXT record
    const isValid = await this.domainService.checkDNSVerification(
      domain,
      verification.verificationToken
    );
    
    if (isValid) {
      await this.domainService.markDomainAsVerified(orgId, domain);
      return true;
    }
    
    return false;
  }

  async getVerifiedDomains(orgId: string): Promise<string[]> {
    if (!this.domainService) {
      return [];
    }
    
    return this.domainService.getVerifiedDomains(orgId);
  }

  async checkDomainVerification(orgId: string, email: string): Promise<boolean> {
    const domain = email.split('@')[1];
    const verifiedDomains = await this.getVerifiedDomains(orgId);
    
    return verifiedDomains.includes(domain);
  }

  // SSO Configuration Methods
  async configureSSOProvider(
    orgId: string,
    provider: string,
    config: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    const org = await this.getOrganization(orgId);
    
    if (!org?.settings?.ssoEnabled) {
      return {
        success: false,
        error: 'SSO is not enabled for this organization'
      };
    }
    
    // Store SSO configuration (implementation depends on SSO service)
    // This is a placeholder for the actual implementation
    return {
      success: true
    };
  }

  async getSSOProviders(orgId: string): Promise<string[]> {
    // Return configured SSO providers for the organization
    // This would query the actual SSO configuration
    return [];
  }

  // Helper Methods
  private async enhanceOrganization(org: Organization): Promise<EnhancedOrganization> {
    const [seats, domains, ssoProviders] = await Promise.all([
      this.getSeatAllocation(org.id),
      this.getVerifiedDomains(org.id),
      this.getSSOProviders(org.id)
    ]);
    
    return {
      ...org,
      seatCount: seats.usedSeats,
      availableSeats: seats.availableSeats,
      verifiedDomains: domains,
      ssoProviders
    } as EnhancedOrganization;
  }

  private async initializeOrganizationSettings(orgId: string): Promise<void> {
    // Initialize default settings for new organization
    const defaultSettings: OrganizationSettings = {
      maxSeats: 10,
      ssoEnabled: false,
      domainVerificationRequired: false,
      autoJoinByDomain: false,
      features: {
        customRoles: false,
        advancedPermissions: false,
        apiAccess: false,
        webhooks: false
      }
    };
    
    await this.updateOrganization(orgId, { settings: defaultSettings });
  }

  private async cleanupOrganizationData(orgId: string): Promise<void> {
    // Clean up related data before organization deletion
    // This includes domains, SSO configs, etc.
    if (this.domainService) {
      await this.domainService.removeAllDomains(orgId);
    }
  }

  private async getPendingInviteCount(orgId: string): Promise<number> {
    // Get count of pending invitations
    // This would query the invitation service
    return 0;
  }

  private async getUserEmail(userId: string): Promise<string> {
    // Get user email from user service
    // This is a placeholder - actual implementation would query user service
    return '';
  }

  private generateVerificationToken(): string {
    return `org-verify-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}