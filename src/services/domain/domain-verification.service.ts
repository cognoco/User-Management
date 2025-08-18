import { promises as dns } from 'dns';
import crypto from 'crypto';

export interface DomainVerificationRecord {
  id: string;
  organizationId: string;
  domain: string;
  verificationMethod: 'dns-txt' | 'dns-cname' | 'email' | 'file';
  verificationToken: string;
  verificationValue?: string;
  isVerified: boolean;
  isPrimary: boolean;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface DomainVerificationResult {
  success: boolean;
  verified: boolean;
  error?: string;
  details?: {
    method: string;
    expectedValue: string;
    actualValue?: string;
    dnsRecords?: any[];
  };
}

export interface EmailVerificationOptions {
  to: string;
  organizationName: string;
  verificationUrl: string;
  expiresIn?: number; // hours
}

export class DomainVerificationService {
  private readonly TXT_RECORD_PREFIX = '_zdx-verify';
  private readonly CNAME_RECORD_PREFIX = '_zdx-domain';
  private readonly FILE_VERIFICATION_PATH = '.well-known/zdx-verify';
  private readonly DEFAULT_EXPIRY_HOURS = 72;

  constructor(
    private dataProvider?: any,
    private emailService?: any,
    private httpClient?: any
  ) {}

  /**
   * Initiate domain verification process
   */
  async initiateDomainVerification(
    organizationId: string,
    domain: string,
    method: 'dns-txt' | 'dns-cname' | 'email' | 'file' = 'dns-txt'
  ): Promise<DomainVerificationRecord> {
    // Validate domain format
    if (!this.isValidDomain(domain)) {
      throw new Error('Invalid domain format');
    }

    // Check if domain is already claimed
    const existingVerification = await this.getDomainVerification(domain);
    if (existingVerification && existingVerification.isVerified && 
        existingVerification.organizationId !== organizationId) {
      throw new Error('Domain is already verified by another organization');
    }

    // Generate verification token
    const verificationToken = this.generateVerificationToken();
    const verificationValue = this.generateVerificationValue(organizationId, domain, verificationToken);

    const record: DomainVerificationRecord = {
      id: crypto.randomUUID(),
      organizationId,
      domain,
      verificationMethod: method,
      verificationToken,
      verificationValue,
      isVerified: false,
      isPrimary: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + this.DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000)
    };

    // Store verification record
    if (this.dataProvider) {
      await this.dataProvider.createDomainVerification(record);
    }

    return record;
  }

  /**
   * Verify domain ownership via DNS TXT record
   */
  async verifyDNSTXT(domain: string, organizationId: string): Promise<DomainVerificationResult> {
    try {
      const verification = await this.getDomainVerificationByOrgAndDomain(organizationId, domain);
      if (!verification) {
        return {
          success: false,
          verified: false,
          error: 'No verification record found for this domain'
        };
      }

      const recordName = `${this.TXT_RECORD_PREFIX}.${domain}`;
      const expectedValue = verification.verificationValue || verification.verificationToken;

      // Resolve TXT records
      const records = await this.resolveTXTRecords(recordName);
      
      // Check if expected value exists in TXT records
      const isVerified = records.some(record => 
        record.includes(expectedValue)
      );

      if (isVerified) {
        await this.markDomainAsVerified(organizationId, domain);
      }

      return {
        success: true,
        verified: isVerified,
        details: {
          method: 'dns-txt',
          expectedValue,
          actualValue: records.join(', '),
          dnsRecords: records
        }
      };
    } catch (error) {
      return {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'DNS verification failed'
      };
    }
  }

  /**
   * Verify domain ownership via DNS CNAME record
   */
  async verifyDNSCNAME(domain: string, organizationId: string): Promise<DomainVerificationResult> {
    try {
      const verification = await this.getDomainVerificationByOrgAndDomain(organizationId, domain);
      if (!verification) {
        return {
          success: false,
          verified: false,
          error: 'No verification record found for this domain'
        };
      }

      const recordName = `${this.CNAME_RECORD_PREFIX}.${domain}`;
      const expectedValue = `verify-${organizationId}.zdx-verification.com`;

      // Resolve CNAME record
      const cname = await this.resolveCNAME(recordName);
      const isVerified = cname === expectedValue;

      if (isVerified) {
        await this.markDomainAsVerified(organizationId, domain);
      }

      return {
        success: true,
        verified: isVerified,
        details: {
          method: 'dns-cname',
          expectedValue,
          actualValue: cname
        }
      };
    } catch (error) {
      return {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'CNAME verification failed'
      };
    }
  }

  /**
   * Verify domain ownership via email to admin addresses
   */
  async verifyByEmail(
    domain: string,
    organizationId: string,
    adminEmail: string
  ): Promise<DomainVerificationResult> {
    try {
      const verification = await this.getDomainVerificationByOrgAndDomain(organizationId, domain);
      if (!verification) {
        return {
          success: false,
          verified: false,
          error: 'No verification record found for this domain'
        };
      }

      // Common admin email addresses
      const adminEmails = [
        `admin@${domain}`,
        `administrator@${domain}`,
        `webmaster@${domain}`,
        `postmaster@${domain}`,
        `hostmaster@${domain}`,
        adminEmail
      ];

      // Check if provided email matches domain
      if (!adminEmails.some(email => email.endsWith(`@${domain}`))) {
        return {
          success: false,
          verified: false,
          error: 'Email address does not match the domain being verified'
        };
      }

      // Generate verification URL
      const verificationUrl = this.generateVerificationUrl(
        organizationId,
        domain,
        verification.verificationToken
      );

      // Send verification email
      if (this.emailService) {
        await this.emailService.sendDomainVerificationEmail({
          to: adminEmail,
          organizationName: organizationId,
          verificationUrl,
          expiresIn: this.DEFAULT_EXPIRY_HOURS
        });
      }

      return {
        success: true,
        verified: false,
        details: {
          method: 'email',
          expectedValue: 'Check email for verification link',
          actualValue: `Email sent to ${adminEmail}`
        }
      };
    } catch (error) {
      return {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Email verification failed'
      };
    }
  }

  /**
   * Verify domain ownership via file upload
   */
  async verifyByFile(domain: string, organizationId: string): Promise<DomainVerificationResult> {
    try {
      const verification = await this.getDomainVerificationByOrgAndDomain(organizationId, domain);
      if (!verification) {
        return {
          success: false,
          verified: false,
          error: 'No verification record found for this domain'
        };
      }

      const fileUrl = `https://${domain}/${this.FILE_VERIFICATION_PATH}/${verification.verificationToken}.txt`;
      const expectedContent = verification.verificationValue || verification.verificationToken;

      // Attempt to fetch the verification file
      if (this.httpClient) {
        try {
          const response = await this.httpClient.get(fileUrl);
          const content = response.data.toString().trim();
          const isVerified = content === expectedContent;

          if (isVerified) {
            await this.markDomainAsVerified(organizationId, domain);
          }

          return {
            success: true,
            verified: isVerified,
            details: {
              method: 'file',
              expectedValue: expectedContent,
              actualValue: content
            }
          };
        } catch (httpError) {
          return {
            success: false,
            verified: false,
            error: `Could not access verification file at ${fileUrl}`
          };
        }
      }

      return {
        success: false,
        verified: false,
        error: 'HTTP client not available for file verification'
      };
    } catch (error) {
      return {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'File verification failed'
      };
    }
  }

  /**
   * Complete email verification with token
   */
  async completeEmailVerification(
    organizationId: string,
    domain: string,
    token: string
  ): Promise<DomainVerificationResult> {
    const verification = await this.getDomainVerificationByOrgAndDomain(organizationId, domain);
    
    if (!verification) {
      return {
        success: false,
        verified: false,
        error: 'Verification record not found'
      };
    }

    if (verification.verificationToken !== token) {
      return {
        success: false,
        verified: false,
        error: 'Invalid verification token'
      };
    }

    if (verification.expiresAt && new Date() > verification.expiresAt) {
      return {
        success: false,
        verified: false,
        error: 'Verification token has expired'
      };
    }

    await this.markDomainAsVerified(organizationId, domain);

    return {
      success: true,
      verified: true
    };
  }

  /**
   * Check current verification status
   */
  async checkVerificationStatus(
    organizationId: string,
    domain: string
  ): Promise<DomainVerificationResult> {
    const verification = await this.getDomainVerificationByOrgAndDomain(organizationId, domain);
    
    if (!verification) {
      return {
        success: false,
        verified: false,
        error: 'No verification record found'
      };
    }

    if (verification.isVerified) {
      return {
        success: true,
        verified: true,
        details: {
          method: verification.verificationMethod,
          expectedValue: '',
          actualValue: `Verified on ${verification.verifiedAt}`
        }
      };
    }

    // Re-check verification based on method
    switch (verification.verificationMethod) {
      case 'dns-txt':
        return this.verifyDNSTXT(domain, organizationId);
      case 'dns-cname':
        return this.verifyDNSCNAME(domain, organizationId);
      case 'file':
        return this.verifyByFile(domain, organizationId);
      default:
        return {
          success: true,
          verified: false,
          details: {
            method: verification.verificationMethod,
            expectedValue: verification.verificationValue || verification.verificationToken
          }
        };
    }
  }

  /**
   * Mark domain as verified
   */
  async markDomainAsVerified(organizationId: string, domain: string): Promise<void> {
    if (this.dataProvider) {
      await this.dataProvider.updateDomainVerification(organizationId, domain, {
        isVerified: true,
        verifiedAt: new Date()
      });
    }
  }

  /**
   * Set primary domain for organization
   */
  async setPrimaryDomain(organizationId: string, domain: string): Promise<void> {
    // First check if domain is verified
    const verification = await this.getDomainVerificationByOrgAndDomain(organizationId, domain);
    
    if (!verification || !verification.isVerified) {
      throw new Error('Domain must be verified before setting as primary');
    }

    if (this.dataProvider) {
      // Remove primary flag from other domains
      await this.dataProvider.clearPrimaryDomains(organizationId);
      
      // Set this domain as primary
      await this.dataProvider.updateDomainVerification(organizationId, domain, {
        isPrimary: true
      });
    }
  }

  /**
   * Get all verified domains for an organization
   */
  async getVerifiedDomains(organizationId: string): Promise<string[]> {
    if (this.dataProvider) {
      const verifications = await this.dataProvider.getOrganizationDomains(organizationId);
      return verifications
        .filter((v: DomainVerificationRecord) => v.isVerified)
        .map((v: DomainVerificationRecord) => v.domain);
    }
    return [];
  }

  /**
   * Remove domain verification
   */
  async removeDomain(organizationId: string, domain: string): Promise<void> {
    if (this.dataProvider) {
      await this.dataProvider.deleteDomainVerification(organizationId, domain);
    }
  }

  // Helper methods
  private async getDomainVerification(domain: string): Promise<DomainVerificationRecord | null> {
    if (this.dataProvider) {
      return this.dataProvider.getDomainVerification(domain);
    }
    return null;
  }

  private async getDomainVerificationByOrgAndDomain(
    organizationId: string,
    domain: string
  ): Promise<DomainVerificationRecord | null> {
    if (this.dataProvider) {
      return this.dataProvider.getDomainVerificationByOrgAndDomain(organizationId, domain);
    }
    return null;
  }

  private isValidDomain(domain: string): boolean {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    return domainRegex.test(domain);
  }

  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateVerificationValue(
    organizationId: string,
    domain: string,
    token: string
  ): string {
    const hash = crypto.createHash('sha256');
    hash.update(`${organizationId}-${domain}-${token}`);
    return `zdx-verify=${hash.digest('hex').substring(0, 32)}`;
  }

  private generateVerificationUrl(
    organizationId: string,
    domain: string,
    token: string
  ): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/api/organizations/${organizationId}/verify-domain?domain=${encodeURIComponent(domain)}&token=${token}`;
  }

  private async resolveTXTRecords(hostname: string): Promise<string[]> {
    try {
      const records = await dns.resolveTxt(hostname);
      return records.flat();
    } catch (error) {
      console.error(`Failed to resolve TXT records for ${hostname}:`, error);
      return [];
    }
  }

  private async resolveCNAME(hostname: string): Promise<string | null> {
    try {
      const cname = await dns.resolveCname(hostname);
      return cname[0] || null;
    } catch (error) {
      console.error(`Failed to resolve CNAME for ${hostname}:`, error);
      return null;
    }
  }
}