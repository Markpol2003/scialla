const nodemailer = require('nodemailer');
require('dotenv').config();

// Resolve SMTP / Gmail credentials from environment variables
const emailService = process.env.EMAIL_SERVICE || 'gmail';
const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER || '';
const emailPass = process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || '';

// Resolve sender display name and email
const rawFrom = process.env.EMAIL_FROM || 'Scialla Cafe';
const emailFrom = rawFrom.includes('<')
  ? rawFrom
  : `"${rawFrom}" <${emailUser || 'noreply@scialla.com'}>`;

let transporter = null;

if (emailUser && emailPass) {
  if (process.env.EMAIL_HOST) {
    const emailPort = parseInt(process.env.EMAIL_PORT || '587', 10);
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: emailPort,
      secure: emailPort === 465,
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });
  } else {
    transporter = nodemailer.createTransport({
      service: emailService,
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });
  }

  // Verify connection configuration
  transporter.verify()
    .then(() => {
      console.log('✅ [Email] Gmail SMTP connection ready.');
    })
    .catch((err) => {
      console.error('❌ [Email] SMTP verification note:', err.message);
    });
} else {
  console.warn('⚠️ [Email] EMAIL_USER or EMAIL_APP_PASSWORD not configured in .env');
}

/**
 * Mask email address for secure logging (e.g. j***n@gmail.com)
 * @param {string} email
 * @returns {string}
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [name, domain] = parts;
  const maskedName = name.length <= 2
    ? name[0] + '***'
    : name[0] + '***' + name[name.length - 1];
  return `${maskedName}@${domain}`;
}

/**
 * Send 6-Digit Password Reset Verification Code via Nodemailer
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - Recipient's display name
 * @param {string} options.code - 6-digit verification code
 * @param {string} options.role - Account role ('staff' | 'manager')
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
async function sendResetCodeEmail({ to, name = 'User', code, role = 'staff' }) {
  const subject = 'Scialla Password Reset Code';
  const roleLabel = role === 'manager' ? 'Store Manager' : 'Staff Member';

  const plainText = `Scialla Cafe

Password Reset Verification

Hello ${name},

We received a request to reset your Scialla ${roleLabel} password.

Your verification code is:

${code}

This code expires in 10 minutes.

If you did not request this password reset, you may ignore this email.

Scialla Cafe`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scialla Password Reset</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0F0704;
      color: #F5EDE6;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      max-width: 520px;
      margin: 30px auto;
      background: #1A0D08;
      border: 1px solid #C98B5B;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
    }
    .header {
      background: linear-gradient(135deg, #2D140A 0%, #150905 100%);
      padding: 28px 24px;
      text-align: center;
      border-bottom: 1px solid rgba(201, 139, 91, 0.3);
    }
    .brand-title {
      color: #E2B688;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin: 0 0 4px 0;
    }
    .brand-subtitle {
      color: #A39081;
      font-size: 12px;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin: 0;
    }
    .content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 16px;
      color: #F5EDE6;
      margin-bottom: 16px;
    }
    .message {
      font-size: 14px;
      line-height: 1.6;
      color: #D4C3B3;
      margin-bottom: 24px;
    }
    .code-container {
      background: rgba(201, 139, 91, 0.12);
      border: 1.5px dashed #C98B5B;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }
    .code-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #E2B688;
      margin-bottom: 8px;
      font-weight: 700;
    }
    .code-value {
      font-family: 'Courier New', Courier, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #FFDFBA;
      text-shadow: 0 0 10px rgba(201, 139, 91, 0.5);
      margin: 0;
    }
    .expiry-note {
      font-size: 12px;
      color: #FBBF24;
      margin-top: 10px;
      font-weight: 600;
    }
    .footer {
      padding: 20px 28px;
      background: #120703;
      border-top: 1px solid rgba(201, 139, 91, 0.2);
      font-size: 12px;
      color: #8C7B70;
      text-align: center;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="brand-title">Scialla Cafe</div>
      <div class="brand-subtitle">Password Reset Verification</div>
    </div>
    <div class="content">
      <div class="greeting">Hello <strong>${name}</strong>,</div>
      <div class="message">
        We received a request to reset the password for your Scialla <strong>${roleLabel}</strong> account.
      </div>
      <div class="code-container">
        <div class="code-label">Your Verification Code Is:</div>
        <div class="code-value">${code}</div>
        <div class="expiry-note">⏱ This code expires in 10 minutes</div>
      </div>
      <div class="message" style="margin-bottom: 0;">
        If you did not request this password reset, you may ignore this email. Your current password remains unchanged.
      </div>
    </div>
    <div class="footer">
      <div>Scialla Cafe &bull; Specialty Coffee & Artisan Bistro</div>
      <div style="margin-top: 4px;">This is an automated security transmission. Please do not reply directly to this email.</div>
    </div>
  </div>
</body>
</html>
  `;

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: emailFrom,
        to,
        subject,
        text: plainText,
        html: htmlContent
      });
      console.log(`[Email] Password reset email sent successfully to ${maskEmail(to)}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('[Email] Failed to send password reset email:', err.message);
      return { success: false, error: err.message };
    }
  } else {
    console.error('[Email] Failed to send password reset email: Nodemailer transporter is not configured (missing EMAIL_USER / EMAIL_APP_PASSWORD in environment).');
    return { success: false, error: 'Email service not configured.' };
  }
}

module.exports = {
  sendResetCodeEmail,
  maskEmail
};
