import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EnhancedOrganizationService } from '@/services/organization/enhanced-organization.service';
import { DomainVerificationService } from '@/services/domain/domain-verification.service';
import { SeatManager } from '@/services/subscription/seat-manager';

// Mock providers
const mockOrganizationProvider = {
  createOrganization: vi.fn(),
  getOrganization: vi.fn(),
  getUserOrganizations: vi.fn(),
  updateOrganization: vi.fn(),
  deleteOrganization: vi.fn(),
  getMembers: vi.fn(),
  addMember: vi.fn(),
  removeMember: vi.fn(),
  updateMemberRole: vi.fn()
};

const mockSubscriptionService = {
  getSubscription: vi.fn(),
  updateSeatCount: vi.fn(),
  upgradePlan: vi.fn()
};

const mockTeamService = {
  getPendingInvites: vi.fn()
};

describe('Enhanced Organization Service', () => {
  let organizationService: EnhancedOrganizationService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    organizationService = new EnhancedOrganizationService(
      mockOrganizationProvider,
      mockSubscriptionService
    );
  });

  describe('Organization CRUD Operations', () => {
    it('should create organization with default settings', async () => {
      const mockOrg = {
        id: 'org_123',
        name: 'Test Org',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockOrganizationProvider.createOrganization.mockResolvedValue({
        success: true,
        organization: mockOrg
      });
      mockOrganizationProvider.addMember.mockResolvedValue({
        success: true
      });
      mockOrganizationProvider.updateOrganization.mockResolvedValue({
        success: true
      });

      const result = await organizationService.createOrganization('user_123', {
        name: 'Test Org'
      });

      expect(result.success).toBe(true);
      expect(result.organization).toEqual(mockOrg);
      expect(mockOrganizationProvider.addMember).toHaveBeenCalledWith(
        'org_123',
        'user_123',
        'admin'
      );
    });

    it('should get organization with enhanced data', async () => {
      const mockOrg = {
        id: 'org_123',
        name: 'Test Org',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockOrganizationProvider.getOrganization.mockResolvedValue(mockOrg);
      mockOrganizationProvider.getMembers.mockResolvedValue([
        { userId: 'user_1', role: 'admin' },
        { userId: 'user_2', role: 'member' }
      ]);
      mockSubscriptionService.getSubscription.mockResolvedValue({
        planId: 'pro',
        seats: 10
      });

      const org = await organizationService.getOrganization('org_123');

      expect(org).toBeDefined();
      expect(org?.id).toBe('org_123');
      expect(org?.seatCount).toBe(2);
      expect(org?.availableSeats).toBe(8);
    });

    it('should prevent seat reduction below current usage', async () => {
      mockOrganizationProvider.getMembers.mockResolvedValue([
        { userId: 'user_1', role: 'admin' },
        { userId: 'user_2', role: 'member' },
        { userId: 'user_3', role: 'member' },
        { userId: 'user_4', role: 'member' },
        { userId: 'user_5', role: 'member' }
      ]);
      mockSubscriptionService.getSubscription.mockResolvedValue({
        planId: 'pro',
        seats: 10
      });

      const result = await organizationService.updateOrganization('org_123', {
        settings: { maxSeats: 3 }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot reduce seats below current usage');
    });
  });

  describe('Member Management with Seat Enforcement', () => {
    it('should allow adding member when seats available', async () => {
      mockOrganizationProvider.getMembers.mockResolvedValue([
        { userId: 'user_1', role: 'admin' }
      ]);
      mockOrganizationProvider.getOrganization.mockResolvedValue({
        id: 'org_123',
        name: 'Test Org',
        settings: { maxSeats: 5 }
      });
      mockSubscriptionService.getSubscription.mockResolvedValue({
        planId: 'pro',
        seats: 5
      });
      mockOrganizationProvider.addMember.mockResolvedValue({
        success: true,
        member: { userId: 'user_2', role: 'member' }
      });

      const result = await organizationService.addOrganizationMember(
        'org_123',
        'user_2',
        'member'
      );

      expect(result.success).toBe(true);
      expect(mockOrganizationProvider.addMember).toHaveBeenCalled();
    });

    it('should block adding member when no seats available', async () => {
      mockOrganizationProvider.getMembers.mockResolvedValue([
        { userId: 'user_1', role: 'admin' },
        { userId: 'user_2', role: 'member' },
        { userId: 'user_3', role: 'member' }
      ]);
      mockOrganizationProvider.getOrganization.mockResolvedValue({
        id: 'org_123',
        name: 'Test Org',
        settings: { maxSeats: 3 }
      });
      mockSubscriptionService.getSubscription.mockResolvedValue({
        planId: 'starter',
        seats: 3
      });

      const result = await organizationService.addOrganizationMember(
        'org_123',
        'user_4',
        'member'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No available seats');
      expect(mockOrganizationProvider.addMember).not.toHaveBeenCalled();
    });
  });

  describe('Seat Allocation', () => {
    it('should calculate seat allocation correctly', async () => {
      mockOrganizationProvider.getOrganization.mockResolvedValue({
        id: 'org_123',
        name: 'Test Org',
        settings: { maxSeats: 10 }
      });
      mockOrganizationProvider.getMembers.mockResolvedValue([
        { userId: 'user_1', role: 'admin' },
        { userId: 'user_2', role: 'member' },
        { userId: 'user_3', role: 'member' }
      ]);
      mockSubscriptionService.getSubscription.mockResolvedValue({
        planId: 'pro',
        seats: 10
      });

      const allocation = await organizationService.getSeatAllocation('org_123');

      expect(allocation.totalSeats).toBe(10);
      expect(allocation.usedSeats).toBe(3);
      expect(allocation.availableSeats).toBe(7);
    });

    it('should update seat count when valid', async () => {
      mockOrganizationProvider.getMembers.mockResolvedValue([
        { userId: 'user_1', role: 'admin' },
        { userId: 'user_2', role: 'member' }
      ]);
      mockSubscriptionService.getSubscription.mockResolvedValue({
        planId: 'pro',
        seats: 5
      });
      mockOrganizationProvider.updateOrganization.mockResolvedValue({
        success: true
      });

      const result = await organizationService.updateSeatCount('org_123', 10);

      expect(result.success).toBe(true);
      expect(mockOrganizationProvider.updateOrganization).toHaveBeenCalledWith(
        'org_123',
        expect.objectContaining({
          settings: { maxSeats: 10 }
        })
      );
    });
  });
});

describe('Domain Verification Service', () => {
  let domainService: DomainVerificationService;
  const mockDataProvider = {
    createDomainVerification: vi.fn(),
    getDomainVerification: vi.fn(),
    getDomainVerificationByOrgAndDomain: vi.fn(),
    updateDomainVerification: vi.fn(),
    deleteDomainVerification: vi.fn(),
    getOrganizationDomains: vi.fn(),
    clearPrimaryDomains: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    domainService = new DomainVerificationService(mockDataProvider);
  });

  describe('Domain Verification Initiation', () => {
    it('should initiate DNS TXT verification', async () => {
      mockDataProvider.getDomainVerification.mockResolvedValue(null);
      mockDataProvider.createDomainVerification.mockResolvedValue(true);

      const verification = await domainService.initiateDomainVerification(
        'org_123',
        'example.com',
        'dns-txt'
      );

      expect(verification.domain).toBe('example.com');
      expect(verification.verificationMethod).toBe('dns-txt');
      expect(verification.verificationToken).toBeDefined();
      expect(verification.verificationValue).toContain('zdx-verify=');
    });

    it('should reject invalid domain format', async () => {
      await expect(
        domainService.initiateDomainVerification('org_123', 'invalid_domain', 'dns-txt')
      ).rejects.toThrow('Invalid domain format');
    });

    it('should reject already verified domain by another org', async () => {
      mockDataProvider.getDomainVerification.mockResolvedValue({
        organizationId: 'org_other',
        isVerified: true,
        domain: 'example.com'
      });

      await expect(
        domainService.initiateDomainVerification('org_123', 'example.com', 'dns-txt')
      ).rejects.toThrow('Domain is already verified by another organization');
    });
  });

  describe('Domain Verification Status', () => {
    it('should complete email verification with valid token', async () => {
      const mockVerification = {
        organizationId: 'org_123',
        domain: 'example.com',
        verificationToken: 'valid_token',
        expiresAt: new Date(Date.now() + 86400000) // 24 hours from now
      };
      
      mockDataProvider.getDomainVerificationByOrgAndDomain.mockResolvedValue(mockVerification);
      mockDataProvider.updateDomainVerification.mockResolvedValue(true);

      const result = await domainService.completeEmailVerification(
        'org_123',
        'example.com',
        'valid_token'
      );

      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(mockDataProvider.updateDomainVerification).toHaveBeenCalledWith(
        'org_123',
        'example.com',
        expect.objectContaining({
          isVerified: true
        })
      );
    });

    it('should reject expired verification token', async () => {
      const mockVerification = {
        organizationId: 'org_123',
        domain: 'example.com',
        verificationToken: 'expired_token',
        expiresAt: new Date(Date.now() - 86400000) // 24 hours ago
      };
      
      mockDataProvider.getDomainVerificationByOrgAndDomain.mockResolvedValue(mockVerification);

      const result = await domainService.completeEmailVerification(
        'org_123',
        'example.com',
        'expired_token'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Verification token has expired');
    });
  });

  describe('Primary Domain Management', () => {
    it('should set verified domain as primary', async () => {
      const mockVerification = {
        organizationId: 'org_123',
        domain: 'example.com',
        isVerified: true
      };
      
      mockDataProvider.getDomainVerificationByOrgAndDomain.mockResolvedValue(mockVerification);
      mockDataProvider.clearPrimaryDomains.mockResolvedValue(true);
      mockDataProvider.updateDomainVerification.mockResolvedValue(true);

      await domainService.setPrimaryDomain('org_123', 'example.com');

      expect(mockDataProvider.clearPrimaryDomains).toHaveBeenCalledWith('org_123');
      expect(mockDataProvider.updateDomainVerification).toHaveBeenCalledWith(
        'org_123',
        'example.com',
        expect.objectContaining({ isPrimary: true })
      );
    });

    it('should reject setting unverified domain as primary', async () => {
      const mockVerification = {
        organizationId: 'org_123',
        domain: 'example.com',
        isVerified: false
      };
      
      mockDataProvider.getDomainVerificationByOrgAndDomain.mockResolvedValue(mockVerification);

      await expect(
        domainService.setPrimaryDomain('org_123', 'example.com')
      ).rejects.toThrow('Domain must be verified before setting as primary');
    });
  });
});

describe('Seat Manager', () => {
  let seatManager: SeatManager;
  const mockOrganizationService = {
    getOrganizationMembers: vi.fn(),
    getOrganization: vi.fn()
  };
  const mockSubscriptionService = {
    getSubscription: vi.fn(),
    updateSeatCount: vi.fn(),
    upgradePlan: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    seatManager = new SeatManager(
      mockOrganizationService,
      mockSubscriptionService,
      mockTeamService
    );
  });

  describe('Seat Enforcement', () => {
    it('should allow adding member on free plan within limits', async () => {
      mockSubscriptionService.getSubscription.mockResolvedValue({
        planId: 'free',
        seats: 3
      });
      mockOrganizationService.getOrganizationMembers.mockResolvedValue([
        { userId: 'user_1', status: 'active' }
      ]);
      mockTeamService.getPendingInvites.mockResolvedValue([]);

      const result = await seatManager.canAddMember('org_123', 1);

      expect(result.allowed).toBe(true);
      expect(result.availableSeats).toBe(2);
    });

    it('should block adding member on free plan at limit', async () => {
      mockSubscriptionService.getSubscription.mockResolvedValue({
        planId: 'free',
        seats: 3
      });
      mockOrganizationService.getOrganizationMembers.mockResolvedValue([
        { userId: 'user_1', status: 'active' },
        { userId: 'user_2', status: 'active' },
        { userId: 'user_3', status: 'active' }
      ]);
      mockTeamService.getPendingInvites.mockResolvedValue([]);

      const result = await seatManager.canAddMember('org_123', 1);

      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe(true);
    });

    it('should allow overage on pro plan', async () => {
      mockSubscriptionService.getSubscription.mockResolvedValue({
        planId: 'pro',
        seats: 10
      });
      mockOrganizationService.getOrganizationMembers.mockResolvedValue(
        Array(10).fill(null).map((_, i) => ({ userId: `user_${i}`, status: 'active' }))
      );
      mockTeamService.getPendingInvites.mockResolvedValue([]);

      const result = await seatManager.canAddMember('org_123', 1);

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('overage charges');
    });
  });

  describe('Upgrade Options', () => {
    it('should suggest appropriate upgrade plan', async () => {
      mockSubscriptionService.getSubscription.mockResolvedValue({
        planId: 'starter',
        seats: 10
      });
      mockOrganizationService.getOrganizationMembers.mockResolvedValue(
        Array(8).fill(null).map((_, i) => ({ userId: `user_${i}`, status: 'active' }))
      );
      mockTeamService.getPendingInvites.mockResolvedValue([]);

      const options = await seatManager.getUpgradeOptions('org_123');

      expect(options.currentPlan).toBe('starter');
      expect(options.currentSeats).toBe(10);
      expect(options.availablePlans).toBeDefined();
      expect(options.availablePlans.length).toBeGreaterThan(0);
    });
  });

  describe('Overage Charges', () => {
    it('should calculate overage charges correctly', async () => {
      mockSubscriptionService.getSubscription.mockResolvedValue({
        planId: 'pro',
        seats: 10
      });
      mockOrganizationService.getOrganizationMembers.mockResolvedValue(
        Array(12).fill(null).map((_, i) => ({ userId: `user_${i}`, status: 'active' }))
      );
      mockTeamService.getPendingInvites.mockResolvedValue([]);

      const charges = await seatManager.calculateOverageCharges('org_123');

      expect(charges.overageSeats).toBe(2);
      expect(charges.monthlyCharge).toBe(16); // 2 seats * $8 per seat
      expect(charges.proratedCharge).toBeDefined();
    });
  });
});