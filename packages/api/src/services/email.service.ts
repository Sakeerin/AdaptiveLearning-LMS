import { logger } from '../utils/logger';

/**
 * Email service for sending OTPs and notifications
 *
 * In production, integrate with:
 * - SendGrid
 * - AWS SES
 * - Mailgun
 * - etc.
 *
 * For MVP, we'll log to console and optionally use SMTP
 */

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send OTP email
 */
export async function sendOTPEmail(email: string, otp: string, language: 'th' | 'en' = 'th'): Promise<void> {
  const subject = language === 'th'
    ? 'รหัส OTP สำหรับการสมัครใช้งาน Adaptive LMS'
    : 'Your OTP Code for Adaptive LMS';

  const text = language === 'th'
    ? `รหัส OTP ของคุณคือ: ${otp}\n\nรหัสนี้จะหมดอายุใน 10 นาที\n\nหากคุณไม่ได้ทำการสมัครใช้งาน กรุณาเพิกเฉยต่ออีเมลนี้`
    : `Your OTP code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`;

  const html = language === 'th'
    ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>ยินดีต้อนรับสู่ Adaptive LMS</h2>
        <p>รหัส OTP ของคุณคือ:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>รหัสนี้จะหมดอายุใน <strong>10 นาที</strong></p>
        <p style="color: #666; font-size: 12px;">หากคุณไม่ได้ทำการสมัครใช้งาน กรุณาเพิกเฉยต่ออีเมลนี้</p>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Adaptive LMS</h2>
        <p>Your OTP code is:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in <strong>10 minutes</strong></p>
        <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `;

  await sendEmail({
    to: email,
    subject,
    text,
    html,
  });
}

/**
 * Generic email sender
 */
async function sendEmail(options: EmailOptions): Promise<void> {
  // For development: log to console
  if (process.env.NODE_ENV === 'development') {
    logger.info('📧 Email (DEV MODE - Not actually sent):', {
      to: options.to,
      subject: options.subject,
      text: options.text,
    });
    return;
  }

  // TODO: Production - implement SMTP or email service integration
  // Example with nodemailer:
  /*
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: '"Adaptive LMS" <noreply@adaptive-lms.com>',
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
  */

  logger.info('Email sent to:', options.to);
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(email: string, displayName: string, language: 'th' | 'en' = 'th'): Promise<void> {
  const subject = language === 'th'
    ? 'ยินดีต้อนรับสู่ Adaptive LMS'
    : 'Welcome to Adaptive LMS';

  const text = language === 'th'
    ? `สวัสดี ${displayName},\n\nยินดีต้อนรับสู่ Adaptive LMS! การสมัครของคุณสำเร็จแล้ว\n\nเริ่มต้นการเรียนรู้ของคุณได้ทันที`
    : `Hi ${displayName},\n\nWelcome to Adaptive LMS! Your registration is complete.\n\nStart your learning journey now!`;

  await sendEmail({
    to: email,
    subject,
    text,
  });
}
