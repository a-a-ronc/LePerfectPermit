import { MailService } from '@sendgrid/mail';

// Initialize SendGrid
let mailService: MailService | null = null;

if (process.env.SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY not found. Email functionality will be disabled.');
}

interface EmailParams {
  to: string;
  from?: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!mailService) {
    console.warn('SendGrid not configured. Email not sent.');
    return false;
  }

  try {
    await mailService.send({
      to: params.to,
      from: params.from || 'info@intralog.io', // Use verified domain
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    if (error.response && error.response.body && error.response.body.errors) {
      console.error('SendGrid error details:', JSON.stringify(error.response.body.errors, null, 2));
    }
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const resetUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
  
  const subject = 'Password Reset Request - PainlessPermit™';
  
  const text = `
You have requested a password reset for your PainlessPermit™ account.

Please click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you did not request this password reset, please ignore this email and your password will remain unchanged.

Best regards,
The PainlessPermit™ Team
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    .container {
      max-width: 600px;
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .header {
      background-color: #007bff;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 30px 20px;
      background-color: #f9f9f9;
    }
    .button {
      display: inline-block;
      background-color: #007bff;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
    .footer {
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PainlessPermit™</h1>
      <p>Password Reset Request</p>
    </div>
    
    <div class="content">
      <h2>Reset Your Password</h2>
      <p>You have requested a password reset for your PainlessPermit™ account.</p>
      
      <p>Please click the button below to reset your password:</p>
      
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </div>
      
      <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
      
      <p>If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
      
      <p>If the button above doesn't work, you can copy and paste the following link into your browser:</p>
      <p style="word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 4px;">
        ${resetUrl}
      </p>
    </div>
    
    <div class="footer">
      <p>This email was sent by PainlessPermit™ - High-Piled Storage Permit Management System</p>
      <p>If you have any questions, please contact our support team.</p>
    </div>
  </div>
</body>
</html>
`;

  return await sendEmail({
    to: email,
    from: 'info@intralog.io', // Use verified domain
    subject,
    text,
    html
  });
}