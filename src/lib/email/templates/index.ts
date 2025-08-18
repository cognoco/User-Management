export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface PasswordResetEmailOptions {
  to: string;
  userName: string;
  resetUrl: string;
  expiryMinutes: number;
  ipAddress?: string;
  browserInfo?: string;
}

export interface PasswordResetConfirmationOptions {
  to: string;
  userName: string;
  ipAddress?: string;
  timestamp: Date;
}

export interface VerificationEmailOptions {
  to: string;
  userName: string;
  verificationUrl: string;
  expiryHours: number;
  type: 'signup' | 'email_change' | 'email_change_notification';
  newEmail?: string;
  resend?: boolean;
}

export interface WelcomeEmailOptions {
  to: string;
  userName: string;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  options: PasswordResetEmailOptions
): Promise<void> {
  const { to, userName, resetUrl, expiryMinutes, ipAddress, browserInfo } = options;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { background: white; padding: 30px; border: 1px solid #e1e4e8; border-top: none; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #6a737d; font-size: 14px; }
        .security-info { background: #f6f8fa; padding: 15px; border-radius: 5px; margin: 20px 0; font-size: 14px; }
        .warning { color: #d73a49; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #0366d6;">${resetUrl}</p>
          
          <div class="security-info">
            <strong>Security Information:</strong><br>
            • This link will expire in ${expiryMinutes} minutes<br>
            ${ipAddress ? `• Request from IP: ${ipAddress}<br>` : ''}
            ${browserInfo ? `• Browser: ${browserInfo.substring(0, 50)}...<br>` : ''}
            • If you didn't request this, please ignore this email
          </div>
          
          <p class="warning">⚠️ Never share this link with anyone</p>
          
          <div class="footer">
            <p>If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.</p>
            <p>For security reasons, this link will expire in ${expiryMinutes} minutes.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Password Reset Request

Hi ${userName},

We received a request to reset your password. Visit the link below to create a new password:

${resetUrl}

This link will expire in ${expiryMinutes} minutes.

Security Information:
${ipAddress ? `• Request from IP: ${ipAddress}` : ''}
${browserInfo ? `• Browser: ${browserInfo}` : ''}

If you didn't request this, please ignore this email.

Never share this link with anyone.
  `.trim();

  // Send email using your email service
  await sendEmail({
    to,
    subject: 'Password Reset Request',
    html,
    text
  });
}

/**
 * Send password reset confirmation
 */
export async function sendPasswordResetConfirmation(
  options: PasswordResetConfirmationOptions
): Promise<void> {
  const { to, userName, ipAddress, timestamp } = options;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { background: white; padding: 30px; border: 1px solid #e1e4e8; border-top: none; border-radius: 0 0 10px 10px; }
        .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
        .security-info { background: #f6f8fa; padding: 15px; border-radius: 5px; margin: 20px 0; font-size: 14px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #6a737d; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Successfully Reset</h1>
        </div>
        <div class="content">
          <div class="success-icon">✅</div>
          
          <p>Hi ${userName},</p>
          
          <p>Your password has been successfully reset. You can now log in with your new password.</p>
          
          <div class="security-info">
            <strong>Security Information:</strong><br>
            • Password changed at: ${timestamp.toLocaleString()}<br>
            ${ipAddress ? `• Changed from IP: ${ipAddress}<br>` : ''}
            • All other sessions have been logged out
          </div>
          
          <p><strong>Didn't make this change?</strong></p>
          <p>If you didn't reset your password, please contact our support team immediately and secure your account.</p>
          
          <div class="footer">
            <p>This is a security notification. We recommend enabling two-factor authentication for added security.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Password Successfully Reset

Hi ${userName},

Your password has been successfully reset. You can now log in with your new password.

Security Information:
• Password changed at: ${timestamp.toLocaleString()}
${ipAddress ? `• Changed from IP: ${ipAddress}` : ''}
• All other sessions have been logged out

Didn't make this change?
If you didn't reset your password, please contact our support team immediately.
  `.trim();

  await sendEmail({
    to,
    subject: '✅ Password Successfully Reset',
    html,
    text
  });
}

/**
 * Send email verification
 */
export async function sendVerificationEmail(
  options: VerificationEmailOptions
): Promise<void> {
  const { to, userName, verificationUrl, expiryHours, type, newEmail, resend } = options;

  let subject = 'Verify Your Email Address';
  let headerText = 'Email Verification';
  let bodyContent = '';

  if (type === 'signup') {
    bodyContent = `
      <p>Welcome! Please verify your email address to complete your registration.</p>
    `;
  } else if (type === 'email_change') {
    subject = 'Verify Your New Email Address';
    headerText = 'Email Change Verification';
    bodyContent = `
      <p>You've requested to change your email address. Please verify your new email to complete the change.</p>
    `;
  } else if (type === 'email_change_notification') {
    subject = 'Email Change Request';
    headerText = 'Email Change Notification';
    bodyContent = `
      <p>A request has been made to change your email address to: <strong>${newEmail}</strong></p>
      <p>If you initiated this change, please click the verification link sent to your new email address.</p>
      <p>If you didn't request this change, please secure your account immediately.</p>
    `;
  }

  if (resend) {
    subject = `[Resent] ${subject}`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { background: white; padding: 30px; border: 1px solid #e1e4e8; border-top: none; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #6a737d; font-size: 14px; }
        .info-box { background: #f6f8fa; padding: 15px; border-radius: 5px; margin: 20px 0; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${headerText}</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          
          ${bodyContent}
          
          ${type !== 'email_change_notification' ? `
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #0366d6;">${verificationUrl}</p>
            
            <div class="info-box">
              <strong>Important:</strong><br>
              • This link will expire in ${expiryHours} hours<br>
              • You can only use this link once<br>
              • If you didn't request this, please ignore this email
            </div>
          ` : ''}
          
          <div class="footer">
            <p>This email was sent to ${to}. If you have questions, please contact our support team.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to,
    subject,
    html,
    text: '' // Generate text version from HTML
  });
}

/**
 * Send welcome email after verification
 */
export async function sendWelcomeEmail(
  options: WelcomeEmailOptions
): Promise<void> {
  const { to, userName } = options;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; font-size: 32px; }
        .content { background: white; padding: 30px; border: 1px solid #e1e4e8; border-top: none; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; }
        .feature { padding: 15px; margin: 10px 0; background: #f6f8fa; border-radius: 5px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #6a737d; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome!</h1>
        </div>
        <div class="content">
          <p style="font-size: 18px;">Hi ${userName},</p>
          
          <p style="font-size: 16px;">Welcome aboard! Your email has been verified and your account is now fully activated.</p>
          
          <h3>Here's what you can do next:</h3>
          
          <div class="feature">
            <strong>👤 Complete Your Profile</strong><br>
            Add a profile picture and tell us about yourself
          </div>
          
          <div class="feature">
            <strong>🔒 Enable Two-Factor Authentication</strong><br>
            Add an extra layer of security to your account
          </div>
          
          <div class="feature">
            <strong>🚀 Explore Features</strong><br>
            Discover all the tools and features available to you
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">Go to Dashboard</a>
          </div>
          
          <div class="footer">
            <p>Need help? Our support team is here for you.</p>
            <p>Thank you for joining us!</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to,
    subject: '🎉 Welcome! Your Account is Ready',
    html,
    text: `Welcome ${userName}! Your email has been verified and your account is now fully activated.`
  });
}

/**
 * Generic email sending function (implement with your email service)
 */
async function sendEmail(template: EmailTemplate): Promise<void> {
  // This is where you'd integrate with your email service
  // For example: SendGrid, AWS SES, Postmark, etc.
  
  if (process.env.NODE_ENV === 'development') {
    console.log('📧 Email would be sent:', {
      to: template.to,
      subject: template.subject,
      preview: template.text?.substring(0, 100) || template.html.substring(0, 100)
    });
    return;
  }

  // Example with a hypothetical email service:
  // await emailService.send({
  //   to: template.to,
  //   subject: template.subject,
  //   html: template.html,
  //   text: template.text
  // });
  
  throw new Error('Email service not configured. Please implement the sendEmail function.');
}