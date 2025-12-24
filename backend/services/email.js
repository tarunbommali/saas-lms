/* eslint-disable no-console */
/**
 * Email Service
 * Sends emails using nodemailer with SMTP configuration from environment or admin settings
 */
import nodemailer from 'nodemailer';

// SMTP Configuration from environment variables
const getSmtpConfig = () => {
    return {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        security: process.env.SMTP_SECURITY || 'tls', // 'ssl', 'tls', or 'none'
        email: process.env.SMTP_EMAIL || process.env.SMTP_USER,
        password: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
        fromName: process.env.SMTP_FROM_NAME || 'JNTU-GV NxtGen Certification',
    };
};

const buildTransportOptions = (config) => {
    const port = Number(config.port) || 587;
    const useSSL = config.security === 'ssl' || port === 465;
    const requireTLS = config.security === 'tls';

    return {
        host: config.host,
        port,
        secure: useSSL,
        auth: {
            user: config.email,
            pass: config.password
        },
        tls: requireTLS ? { rejectUnauthorized: false } : undefined,
        connectionTimeout: 1000 * 20
    };
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} options.text - Plain text body (optional)
 * @param {string} options.from - From address (optional, uses config default)
 * @returns {Promise<Object>} - Result with success status and message
 */
export const sendEmail = async (options) => {
    const config = getSmtpConfig();

    // Check if SMTP is configured
    if (!config.email || !config.password) {
        console.warn('[Email] SMTP not configured. Set SMTP_EMAIL and SMTP_PASSWORD in .env');
        return {
            success: false,
            message: 'Email service not configured',
            skipped: true
        };
    }

    try {
        const transporter = nodemailer.createTransport(buildTransportOptions(config));

        // Verify connection
        await transporter.verify();

        const info = await transporter.sendMail({
            from: options.from || `"${config.fromName}" <${config.email}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text || options.html?.replace(/<[^>]*>/g, ''),
            replyTo: options.replyTo || config.email
        });

        console.log(`[Email] Sent successfully to ${options.to}. MessageId: ${info.messageId}`);

        return {
            success: true,
            message: 'Email sent successfully',
            messageId: info.messageId,
            accepted: info.accepted
        };
    } catch (error) {
        console.error('[Email] Failed to send:', error.message);

        // Map common SMTP errors
        let errorMessage = 'Failed to send email';
        if (error.code === 'EAUTH' || error.responseCode === 535) {
            errorMessage = 'SMTP authentication failed. Check email and password.';
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNECTION') {
            errorMessage = 'Cannot reach SMTP server. Check host and port.';
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'SMTP connection timed out.';
        }

        return {
            success: false,
            message: errorMessage,
            error: error.message
        };
    }
};

/**
 * Send OTP email for password reset
 * @param {string} email - Recipient email
 * @param {string} otp - 4-digit OTP code
 * @param {number} expiryMinutes - OTP expiry time in minutes
 * @returns {Promise<Object>} - Email result
 */
export const sendOtpEmail = async (email, otp, expiryMinutes = 5) => {
    const subject = 'Password Reset OTP - JNTU-GV NxtGen Certification';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset OTP</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">JNTU-GV NxtGen</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0; font-size: 14px;">Certification Platform</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 15px; font-size: 20px;">Password Reset Request</h2>
          <p style="color: #6b7280; margin: 0 0 25px; line-height: 1.6;">
            You requested to reset your password. Use the OTP below to verify your identity:
          </p>
          
          <!-- OTP Box -->
          <div style="background-color: #f3f4f6; border: 2px dashed #3b82f6; border-radius: 8px; padding: 25px; text-align: center; margin-bottom: 25px;">
            <p style="color: #6b7280; margin: 0 0 10px; font-size: 14px;">Your One-Time Password</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #1e3a8a; font-family: monospace;">
              ${otp}
            </div>
          </div>
          
          <!-- Expiry Warning -->
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 15px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              ⏱️ This OTP will expire in <strong>${expiryMinutes} minutes</strong>
            </p>
          </div>
          
          <p style="color: #6b7280; margin: 0; line-height: 1.6; font-size: 14px;">
            If you didn't request a password reset, please ignore this email or contact support if you have concerns.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; margin: 0; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} JNTU-GV NxtGen Certification. All rights reserved.<br>
            This is an automated message. Please do not reply.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

    const text = `
JNTU-GV NxtGen Certification - Password Reset

Your One-Time Password (OTP): ${otp}

This OTP will expire in ${expiryMinutes} minutes.

If you didn't request a password reset, please ignore this email.
  `;

    return await sendEmail({
        to: email,
        subject,
        html,
        text
    });
};

/**
 * Send welcome email to new users
 * @param {string} email - User email
 * @param {string} name - User name
 * @returns {Promise<Object>} - Email result
 */
export const sendWelcomeEmail = async (email, name) => {
    const subject = 'Welcome to JNTU-GV NxtGen Certification!';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Welcome to JNTU-GV NxtGen!</h1>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 15px; font-size: 20px;">Hello ${name || 'there'}! 👋</h2>
          <p style="color: #6b7280; margin: 0 0 25px; line-height: 1.6;">
            Thank you for joining our certification platform. You're now ready to start learning and earning certifications!
          </p>
          <p style="color: #6b7280; margin: 0; line-height: 1.6;">
            Explore our courses and start your learning journey today.
          </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; margin: 0; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} JNTU-GV NxtGen Certification
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

    return await sendEmail({ to: email, subject, html });
};

/**
 * Send enrollment success email when admin manually enrolls a user
 * @param {Object} options - Enrollment options
 * @param {string} options.email - User email
 * @param {string} options.userName - User name
 * @param {string} options.courseTitle - Course title
 * @param {string} options.courseDuration - Course duration (optional)
 * @param {string} options.enrolledBy - Admin who enrolled the user
 * @returns {Promise<Object>} - Email result
 */
export const sendEnrollmentEmail = async (options) => {
    const { email, userName, courseTitle, courseDuration, enrolledBy } = options;
    const subject = `🎉 You're Enrolled: ${courseTitle} - JNTU-GV NxtGen`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Enrollment Confirmation</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">🎓</div>
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Enrollment Confirmed!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">JNTU-GV NxtGen Certification</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 15px; font-size: 20px;">Hello ${userName || 'there'}! 👋</h2>
          <p style="color: #6b7280; margin: 0 0 25px; line-height: 1.6;">
            Great news! You have been enrolled in a new course on JNTU-GV NxtGen Certification platform.
          </p>
          
          <!-- Course Details Box -->
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #86efac; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <h3 style="color: #166534; margin: 0 0 15px; font-size: 18px;">📚 Course Details</h3>
            
            <div style="margin-bottom: 12px;">
              <p style="color: #6b7280; margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Course Title</p>
              <p style="color: #166534; margin: 4px 0 0; font-size: 16px; font-weight: bold;">${courseTitle}</p>
            </div>
            
            ${courseDuration ? `
            <div style="margin-bottom: 12px;">
              <p style="color: #6b7280; margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Duration</p>
              <p style="color: #166534; margin: 4px 0 0; font-size: 14px;">${courseDuration}</p>
            </div>
            ` : ''}
            
            <div>
              <p style="color: #6b7280; margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Enrolled On</p>
              <p style="color: #166534; margin: 4px 0 0; font-size: 14px;">${new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}</p>
            </div>
          </div>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 25px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile" 
               style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Start Learning Now →
            </a>
          </div>
          
          <p style="color: #6b7280; margin: 0; line-height: 1.6; font-size: 14px; text-align: center;">
            Access your course materials from your profile dashboard and begin your learning journey!
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
          ${enrolledBy ? `
          <p style="color: #6b7280; margin: 0 0 10px; font-size: 12px; text-align: center;">
            Enrolled by: <strong>${enrolledBy}</strong>
          </p>
          ` : ''}
          <p style="color: #9ca3af; margin: 0; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} JNTU-GV NxtGen Certification. All rights reserved.<br>
            If you have any questions, please contact our support team.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

    const text = `
Enrollment Confirmation - JNTU-GV NxtGen Certification

Hello ${userName || 'there'}!

Great news! You have been enrolled in a new course.

Course: ${courseTitle}
${courseDuration ? `Duration: ${courseDuration}` : ''}
Enrolled On: ${new Date().toLocaleDateString()}
${enrolledBy ? `Enrolled By: ${enrolledBy}` : ''}

Visit your profile to start learning!

© ${new Date().getFullYear()} JNTU-GV NxtGen Certification
  `;

    return await sendEmail({ to: email, subject, html, text });
};

/**
 * Send certificate issued email
 * @param {Object} options - Certificate options
 * @param {string} options.email - User email
 * @param {string} options.userName - User name
 * @param {string} options.courseTitle - Course title
 * @param {string} options.certificateId - Certificate ID
 * @returns {Promise<Object>} - Email result
 */
export const sendCertificateIssuedEmail = async (options) => {
    const { email, userName, courseTitle, certificateId } = options;
    const subject = `🏆 Certificate Issued: ${courseTitle}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Certificate Issued</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 30px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">🏆</div>
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Congratulations!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Your Certificate is Ready</p>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 15px; font-size: 20px;">Dear ${userName || 'Graduate'}! 🎉</h2>
          <p style="color: #6b7280; margin: 0 0 25px; line-height: 1.6;">
            We're thrilled to inform you that your certificate for <strong>${courseTitle}</strong> has been officially issued!
          </p>
          
          <div style="background-color: #faf5ff; border: 2px solid #c4b5fd; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 25px;">
            <p style="color: #6b7280; margin: 0 0 8px; font-size: 12px;">Certificate ID</p>
            <p style="color: #7c3aed; margin: 0; font-size: 18px; font-weight: bold; font-family: monospace;">${certificateId}</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile" 
               style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold;">
              Download Certificate
            </a>
          </div>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; margin: 0; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} JNTU-GV NxtGen Certification
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

    return await sendEmail({ to: email, subject, html });
};

export default {
    sendEmail,
    sendOtpEmail,
    sendWelcomeEmail,
    sendEnrollmentEmail,
    sendCertificateIssuedEmail,
};
