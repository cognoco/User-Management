import { IEmailService, EmailResult } from '@/core/services/email/email.interface';

/**
 * Mock Email Service for Testing
 * Stores sent emails in memory for verification
 */
export class MockEmailService implements IEmailService {
  private sentEmails: Array<{
    to: string;
    subject: string;
    html: string;
    text?: string;
    timestamp: Date;
  }> = [];

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<EmailResult> {
    console.log(`[MockEmailService] Sending email to ${to}: ${subject}`);
    
    // Store the email
    this.sentEmails.push({
      to,
      subject,
      html,
      text,
      timestamp: new Date()
    });

    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  async sendVerificationEmail(to: string, token: string): Promise<EmailResult> {
    const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}`;
    
    const html = `
      <h1>Verify Your Email</h1>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>Or copy this link: ${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
    `;

    return this.sendEmail(to, 'Verify Your Email', html);
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<EmailResult> {
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;
    
    const html = `
      <h1>Reset Your Password</h1>
      <p>You requested to reset your password. Click the link below:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>Or copy this link: ${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    return this.sendEmail(to, 'Reset Your Password', html);
  }

  async sendWelcomeEmail(to: string, name: string): Promise<EmailResult> {
    const html = `
      <h1>Welcome ${name}!</h1>
      <p>Thank you for signing up. We're excited to have you on board!</p>
      <p>If you have any questions, feel free to reach out to our support team.</p>
    `;

    return this.sendEmail(to, 'Welcome!', html);
  }

  async sendTeamInviteEmail(to: string, teamName: string, inviterName: string, inviteUrl: string): Promise<EmailResult> {
    const html = `
      <h1>You're Invited to Join ${teamName}</h1>
      <p>${inviterName} has invited you to join their team.</p>
      <a href="${inviteUrl}">Accept Invitation</a>
      <p>Or copy this link: ${inviteUrl}</p>
      <p>This invitation will expire in 7 days.</p>
    `;

    return this.sendEmail(to, `Invitation to join ${teamName}`, html);
  }

  // Test helper methods
  getSentEmails() {
    return [...this.sentEmails];
  }

  getLastEmail() {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  clearSentEmails() {
    this.sentEmails = [];
  }

  findEmailByRecipient(to: string) {
    return this.sentEmails.filter(email => email.to === to);
  }

  findEmailBySubject(subject: string) {
    return this.sentEmails.filter(email => email.subject === subject);
  }
}