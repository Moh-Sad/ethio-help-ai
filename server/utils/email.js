import nodemailer from 'nodemailer';

let transporter = null;

const initTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    // Generate test SMTP service account from ethereal.email
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[Ethereal Email] Created test account: ${testAccount.user}`);
  }
  
  return transporter;
};

export const sendVerificationEmail = async (toEmail, token) => {
  try {
    const tp = await initTransporter();
    
    const verificationUrl = `${process.env.CLIENT_URL || 'https://ethiohelp.vercel.app'}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: '"EthioHelp AI" <noreply@ethiohelp.ai>',
      to: toEmail,
      subject: 'Verify your EthioHelp AI Account',
      html: `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
          <h2>Welcome to EthioHelp AI!</h2>
          <p>Thank you for signing up. Please click the button below to verify your email address and activate your account:</p>
          <a href="${verificationUrl}" style="display:inline-block;padding:12px 24px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;margin:16px 0;">Verify Email Address</a>
          <p>Or copy and paste this URL into your browser:</p>
          <p><a href="${verificationUrl}" style="color:#2563eb;word-break:break-all;">${verificationUrl}</a></p>
          <p style="color:#6b7280;font-size:14px;margin-top:32px;">This link will expire in 24 hours.</p>
        </div>
      `,
    };

    const info = await tp.sendMail(mailOptions);
    console.log('Verification email sent: %s', info.messageId);
    
    // Preview only available when sending through an Ethereal account
    if (info.messageId && !process.env.SMTP_HOST) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};
