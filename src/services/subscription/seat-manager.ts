export interface SeatAllocation {
  organizationId: string;
  planId: string;
  totalSeats: number;
  usedSeats: number;
  availableSeats: number;
  pendingInvites: number;
  reservedSeats: number;
}

export interface SeatUsageDetails {
  organizationId: string;
  activeMembers: number;
  pendingInvites: number;
  reservedSeats: number;
  deactivatedMembers: number;
  lastUpdated: Date;
}

export interface SeatUpgradeOptions {
  currentPlan: string;
  currentSeats: number;
  availablePlans: {
    planId: string;
    planName: string;
    seats: number;
    price: number;
    pricePerAdditionalSeat?: number;
  }[];
  recommendedPlan?: string;
}

export interface SeatEnforcementPolicy {
  blockNewMembers: boolean;
  blockNewInvites: boolean;
  allowOverage: boolean;
  overageLimit?: number;
  overagePricePerSeat?: number;
  gracePeriodDays?: number;
  autoUpgrade?: boolean;
  autoUpgradeThreshold?: number; // percentage
}

export class SeatManager {
  private enforcementPolicies: Map<string, SeatEnforcementPolicy> = new Map();
  
  constructor(
    private organizationService: any,
    private subscriptionService: any,
    private teamService?: any,
    private billingService?: any
  ) {
    this.initializeDefaultPolicies();
  }

  /**
   * Get current seat allocation for an organization
   */
  async getSeatAllocation(organizationId: string): Promise<SeatAllocation> {
    // Get subscription details
    const subscription = await this.subscriptionService.getSubscription(organizationId);
    const planSeats = subscription?.seats || 10; // Default to 10 seats
    
    // Get current usage
    const usage = await this.getSeatUsage(organizationId);
    
    const usedSeats = usage.activeMembers + usage.pendingInvites + usage.reservedSeats;
    const availableSeats = Math.max(0, planSeats - usedSeats);
    
    return {
      organizationId,
      planId: subscription?.planId || 'free',
      totalSeats: planSeats,
      usedSeats,
      availableSeats,
      pendingInvites: usage.pendingInvites,
      reservedSeats: usage.reservedSeats
    };
  }

  /**
   * Get detailed seat usage information
   */
  async getSeatUsage(organizationId: string): Promise<SeatUsageDetails> {
    const [members, invites] = await Promise.all([
      this.organizationService.getOrganizationMembers(organizationId),
      this.getPendingInvites(organizationId)
    ]);
    
    const activeMembers = members.filter((m: any) => m.status === 'active').length;
    const deactivatedMembers = members.filter((m: any) => m.status === 'deactivated').length;
    const reservedSeats = await this.getReservedSeats(organizationId);
    
    return {
      organizationId,
      activeMembers,
      pendingInvites: invites.length,
      reservedSeats,
      deactivatedMembers,
      lastUpdated: new Date()
    };
  }

  /**
   * Check if organization can add more members
   */
  async canAddMember(organizationId: string, count: number = 1): Promise<{
    allowed: boolean;
    reason?: string;
    availableSeats?: number;
    upgradeRequired?: boolean;
  }> {
    const allocation = await this.getSeatAllocation(organizationId);
    const policy = this.getEnforcementPolicy(allocation.planId);
    
    // Check if enough seats available
    if (allocation.availableSeats >= count) {
      return { allowed: true, availableSeats: allocation.availableSeats };
    }
    
    // Check overage policy
    if (policy.allowOverage) {
      const currentOverage = Math.max(0, allocation.usedSeats - allocation.totalSeats);
      const newOverage = currentOverage + count;
      
      if (!policy.overageLimit || newOverage <= policy.overageLimit) {
        return {
          allowed: true,
          reason: `Will incur overage charges of $${(policy.overagePricePerSeat || 0) * count}/month`,
          availableSeats: 0
        };
      }
    }
    
    // Check auto-upgrade policy
    if (policy.autoUpgrade) {
      const usagePercentage = ((allocation.usedSeats + count) / allocation.totalSeats) * 100;
      
      if (usagePercentage >= (policy.autoUpgradeThreshold || 90)) {
        return {
          allowed: true,
          reason: 'Organization will be auto-upgraded to accommodate new members',
          upgradeRequired: true
        };
      }
    }
    
    return {
      allowed: false,
      reason: `No available seats. ${allocation.availableSeats} seats available, ${count} requested.`,
      availableSeats: allocation.availableSeats,
      upgradeRequired: true
    };
  }

  /**
   * Reserve seats for future use
   */
  async reserveSeats(
    organizationId: string,
    count: number,
    reason?: string,
    expiresAt?: Date
  ): Promise<{ success: boolean; error?: string }> {
    const canReserve = await this.canAddMember(organizationId, count);
    
    if (!canReserve.allowed) {
      return {
        success: false,
        error: canReserve.reason
      };
    }
    
    // Store seat reservation
    await this.storeReservation(organizationId, count, reason, expiresAt);
    
    return { success: true };
  }

  /**
   * Release reserved seats
   */
  async releaseSeats(organizationId: string, count: number): Promise<void> {
    await this.updateReservation(organizationId, -count);
  }

  /**
   * Enforce seat limits when adding members
   */
  async enforceSeatLimit(
    organizationId: string,
    operation: 'add_member' | 'send_invite' | 'reactivate_member',
    count: number = 1
  ): Promise<{ allowed: boolean; error?: string; suggestion?: string }> {
    const allocation = await this.getSeatAllocation(organizationId);
    const policy = this.getEnforcementPolicy(allocation.planId);
    
    // Check specific operation policies
    if (operation === 'add_member' && policy.blockNewMembers) {
      return {
        allowed: false,
        error: 'Adding new members is blocked due to seat limit',
        suggestion: 'Please upgrade your plan or remove existing members'
      };
    }
    
    if (operation === 'send_invite' && policy.blockNewInvites) {
      return {
        allowed: false,
        error: 'Sending new invites is blocked due to seat limit',
        suggestion: 'Please upgrade your plan or cancel pending invites'
      };
    }
    
    const canAdd = await this.canAddMember(organizationId, count);
    
    if (!canAdd.allowed) {
      return {
        allowed: false,
        error: canAdd.reason,
        suggestion: await this.getUpgradeSuggestion(organizationId, count)
      };
    }
    
    // Track overage if applicable
    if (allocation.availableSeats < count) {
      await this.trackOverage(organizationId, count - allocation.availableSeats);
    }
    
    return { allowed: true };
  }

  /**
   * Get upgrade options for an organization
   */
  async getUpgradeOptions(organizationId: string): Promise<SeatUpgradeOptions> {
    const allocation = await this.getSeatAllocation(organizationId);
    const subscription = await this.subscriptionService.getSubscription(organizationId);
    
    // Get available plans from billing service
    const availablePlans = await this.getAvailablePlans();
    
    // Filter plans with more seats
    const upgradePlans = availablePlans.filter(plan => 
      plan.seats > allocation.totalSeats
    );
    
    // Find recommended plan (next tier up)
    const recommendedPlan = upgradePlans.find(plan =>
      plan.seats >= allocation.usedSeats * 1.2 // 20% buffer
    );
    
    return {
      currentPlan: subscription?.planId || 'free',
      currentSeats: allocation.totalSeats,
      availablePlans: upgradePlans,
      recommendedPlan: recommendedPlan?.planId
    };
  }

  /**
   * Process seat upgrade
   */
  async upgradeSeatCount(
    organizationId: string,
    newSeatCount: number
  ): Promise<{ success: boolean; error?: string }> {
    const allocation = await this.getSeatAllocation(organizationId);
    
    if (newSeatCount < allocation.usedSeats) {
      return {
        success: false,
        error: `Cannot reduce seats below current usage (${allocation.usedSeats} seats in use)`
      };
    }
    
    // Update subscription with new seat count
    if (this.subscriptionService) {
      await this.subscriptionService.updateSeatCount(organizationId, newSeatCount);
    }
    
    // Update billing if needed
    if (this.billingService) {
      await this.billingService.updateSeatCharges(organizationId, newSeatCount);
    }
    
    return { success: true };
  }

  /**
   * Handle seat overage charges
   */
  async calculateOverageCharges(organizationId: string): Promise<{
    overageSeats: number;
    monthlyCharge: number;
    proratedCharge: number;
  }> {
    const allocation = await this.getSeatAllocation(organizationId);
    const policy = this.getEnforcementPolicy(allocation.planId);
    
    const overageSeats = Math.max(0, allocation.usedSeats - allocation.totalSeats);
    const pricePerSeat = policy.overagePricePerSeat || 10; // Default $10 per seat
    const monthlyCharge = overageSeats * pricePerSeat;
    
    // Calculate prorated charge for current billing period
    const daysInMonth = 30;
    const daysRemaining = await this.getDaysRemainingInBillingPeriod(organizationId);
    const proratedCharge = (monthlyCharge / daysInMonth) * daysRemaining;
    
    return {
      overageSeats,
      monthlyCharge,
      proratedCharge
    };
  }

  /**
   * Auto-upgrade plan when threshold is reached
   */
  async checkAutoUpgrade(organizationId: string): Promise<boolean> {
    const allocation = await this.getSeatAllocation(organizationId);
    const policy = this.getEnforcementPolicy(allocation.planId);
    
    if (!policy.autoUpgrade) {
      return false;
    }
    
    const usagePercentage = (allocation.usedSeats / allocation.totalSeats) * 100;
    
    if (usagePercentage >= (policy.autoUpgradeThreshold || 90)) {
      const upgradeOptions = await this.getUpgradeOptions(organizationId);
      
      if (upgradeOptions.recommendedPlan) {
        await this.processAutoUpgrade(organizationId, upgradeOptions.recommendedPlan);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Send seat limit warnings
   */
  async checkAndSendWarnings(organizationId: string): Promise<void> {
    const allocation = await this.getSeatAllocation(organizationId);
    const usagePercentage = (allocation.usedSeats / allocation.totalSeats) * 100;
    
    // Send warnings at different thresholds
    if (usagePercentage >= 90 && usagePercentage < 100) {
      await this.sendSeatLimitWarning(organizationId, 'critical', allocation);
    } else if (usagePercentage >= 75 && usagePercentage < 90) {
      await this.sendSeatLimitWarning(organizationId, 'warning', allocation);
    }
  }

  // Private helper methods
  private initializeDefaultPolicies(): void {
    // Free plan policy
    this.enforcementPolicies.set('free', {
      blockNewMembers: true,
      blockNewInvites: true,
      allowOverage: false
    });
    
    // Starter plan policy
    this.enforcementPolicies.set('starter', {
      blockNewMembers: false,
      blockNewInvites: false,
      allowOverage: true,
      overageLimit: 5,
      overagePricePerSeat: 10,
      autoUpgrade: false
    });
    
    // Pro plan policy
    this.enforcementPolicies.set('pro', {
      blockNewMembers: false,
      blockNewInvites: false,
      allowOverage: true,
      overageLimit: 20,
      overagePricePerSeat: 8,
      gracePeriodDays: 7,
      autoUpgrade: true,
      autoUpgradeThreshold: 90
    });
    
    // Enterprise plan policy
    this.enforcementPolicies.set('enterprise', {
      blockNewMembers: false,
      blockNewInvites: false,
      allowOverage: true,
      overagePricePerSeat: 5,
      gracePeriodDays: 30,
      autoUpgrade: false
    });
  }

  private getEnforcementPolicy(planId: string): SeatEnforcementPolicy {
    return this.enforcementPolicies.get(planId) || {
      blockNewMembers: true,
      blockNewInvites: true,
      allowOverage: false
    };
  }

  private async getPendingInvites(organizationId: string): Promise<any[]> {
    if (this.teamService) {
      return this.teamService.getPendingInvites(organizationId);
    }
    return [];
  }

  private async getReservedSeats(organizationId: string): Promise<number> {
    // Implementation would query seat reservation storage
    return 0;
  }

  private async storeReservation(
    organizationId: string,
    count: number,
    reason?: string,
    expiresAt?: Date
  ): Promise<void> {
    // Implementation would store in database
  }

  private async updateReservation(organizationId: string, delta: number): Promise<void> {
    // Implementation would update reservation in database
  }

  private async trackOverage(organizationId: string, seats: number): Promise<void> {
    // Implementation would track overage for billing
  }

  private async getAvailablePlans(): Promise<any[]> {
    // Implementation would fetch from billing/subscription service
    return [
      { planId: 'starter', planName: 'Starter', seats: 10, price: 99 },
      { planId: 'pro', planName: 'Pro', seats: 50, price: 299, pricePerAdditionalSeat: 8 },
      { planId: 'enterprise', planName: 'Enterprise', seats: 500, price: 999, pricePerAdditionalSeat: 5 }
    ];
  }

  private async getDaysRemainingInBillingPeriod(organizationId: string): Promise<number> {
    // Implementation would calculate from subscription billing cycle
    return 15; // Placeholder
  }

  private async getUpgradeSuggestion(organizationId: string, neededSeats: number): Promise<string> {
    const options = await this.getUpgradeOptions(organizationId);
    
    if (options.recommendedPlan) {
      const plan = options.availablePlans.find(p => p.planId === options.recommendedPlan);
      if (plan) {
        return `Upgrade to ${plan.planName} plan for ${plan.seats} seats at $${plan.price}/month`;
      }
    }
    
    return 'Please upgrade your plan to add more members';
  }

  private async processAutoUpgrade(organizationId: string, planId: string): Promise<void> {
    // Implementation would process the upgrade through billing service
    if (this.subscriptionService) {
      await this.subscriptionService.upgradePlan(organizationId, planId);
    }
  }

  private async sendSeatLimitWarning(
    organizationId: string,
    level: 'warning' | 'critical',
    allocation: SeatAllocation
  ): Promise<void> {
    // Implementation would send notification/email
    const percentage = Math.round((allocation.usedSeats / allocation.totalSeats) * 100);
    console.log(`[${level.toUpperCase()}] Organization ${organizationId} at ${percentage}% seat capacity`);
  }
}