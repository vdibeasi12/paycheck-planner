import nodemailer from 'nodemailer'

// GoDaddy SMTP Configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.secureserver.net',
  port: 587,
  secure: false, // TLS instead of SSL
  auth: {
    user: process.env.GODADDY_EMAIL || 'support@paycheckplanner.ai',
    pass: process.env.GODADDY_EMAIL_PASSWORD,
  },
})

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Send email via GoDaddy SMTP
 */
export async function sendEmail(options: EmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: `Paycheck Planner <${process.env.GODADDY_EMAIL || 'support@paycheckplanner.ai'}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    console.log('Email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

/**
 * Send confirmation email
 */
export async function sendConfirmationEmail(email: string, confirmationLink: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Confirm Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          .warning { color: #dc2626; font-size: 12px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Paycheck Planner! 🎉</h1>
          </div>
          <div class="content">
            <p>Hi there!</p>
            <p>Thanks for creating an account with <strong>Paycheck Planner</strong>. We're excited to help you take control of your finances and eliminate debt faster!</p>
            
            <p>To get started, please confirm your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${confirmationLink}" class="button">Confirm Email Address</a>
            </div>
            
            <p><strong>Or copy and paste this link:</strong></p>
            <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 12px;">
              ${confirmationLink}
            </p>
            
            <p>This link expires in 24 hours.</p>
            
            <p><strong>What's Next?</strong></p>
            <ul>
              <li>✅ Confirm your email</li>
              <li>✅ Log in to your account</li>
              <li>✅ Set up your first debt</li>
              <li>✅ Start your path to financial freedom!</li>
            </ul>
            
            <p>If you didn't create this account, please ignore this email.</p>
            
            <p>Best regards,<br><strong>The Paycheck Planner Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; 2026 Paycheck Planner. All rights reserved.</p>
            <p>
              <a href="https://paycheckplanner.ai/privacy" style="color: #059669; text-decoration: none;">Privacy Policy</a> • 
              <a href="https://paycheckplanner.ai/terms" style="color: #059669; text-decoration: none;">Terms of Service</a>
            </p>
            <p>support@paycheckplanner.ai</p>
          </div>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: '🎉 Confirm Your Email - Paycheck Planner',
    html,
    text: `Welcome to Paycheck Planner! Please confirm your email by visiting: ${confirmationLink}`,
  })
}

/**
 * Send welcome email after confirmation
 */
export async function sendWelcomeEmail(email: string, name?: string) {
  const userName = name || email.split('@')[0]
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Paycheck Planner</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .feature { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #059669; border-radius: 4px; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Account Confirmed! 🎊</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Your account is all set up and ready to go! Welcome to the Paycheck Planner family.</p>
            
            <p><strong>Here's what you can do now:</strong></p>
            
            <div class="feature">
              <strong>📊 Track Your Debts</strong><br>
              Add all your debts in one place. We'll help you see the full picture of your financial situation.
            </div>
            
            <div class="feature">
              <strong>🎯 Create a Payoff Strategy</strong><br>
              Choose between Snowball or Avalanche methods. See exactly when you'll be debt-free!
            </div>
            
            <div class="feature">
              <strong>💡 Get AI Insights</strong><br>
              Our AI advisor provides personalized strategies to accelerate your debt payoff.
            </div>
            
            <div class="feature">
              <strong>🚀 Upgrade to Premium (Optional)</strong><br>
              Unlock unlimited debts, advanced analytics, and 24/7 AI support. Start with just $6/month!
            </div>
            
            <div style="text-align: center;">
              <a href="https://paycheckplanner.ai/dashboard" class="button">Go to Your Dashboard</a>
            </div>
            
            <p><strong>Need Help?</strong></p>
            <p>Click the green "AI Help" button in the app to chat with our AI support team anytime. Or email us at support@paycheckplanner.ai.</p>
            
            <p>Let's crush those debts together! 💪</p>
            
            <p>Best regards,<br><strong>The Paycheck Planner Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; 2026 Paycheck Planner. All rights reserved.</p>
            <p>
              <a href="https://paycheckplanner.ai/privacy" style="color: #059669; text-decoration: none;">Privacy Policy</a> • 
              <a href="https://paycheckplanner.ai/terms" style="color: #059669; text-decoration: none;">Terms of Service</a>
            </p>
            <p>support@paycheckplanner.ai</p>
          </div>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: '🎊 Welcome to Paycheck Planner!',
    html,
    text: `Welcome to Paycheck Planner, ${userName}! Visit https://paycheckplanner.ai/dashboard to get started.`,
  })
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, resetLink: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          .warning { background: #fee2e2; color: #dc2626; padding: 10px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p>We received a request to reset your Paycheck Planner password. Click the button below to create a new password:</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </div>
            
            <p><strong>Or copy and paste this link:</strong></p>
            <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 12px;">
              ${resetLink}
            </p>
            
            <p>This link expires in 24 hours.</p>
            
            <div class="warning">
              <strong>⚠️ Security Note:</strong> If you didn't request this email, please ignore it. Your account is still secure.
            </div>
            
            <p>Questions? Email us at support@paycheckplanner.ai</p>
            
            <p>Best regards,<br><strong>The Paycheck Planner Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; 2026 Paycheck Planner. All rights reserved.</p>
            <p>support@paycheckplanner.ai</p>
          </div>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: '🔐 Reset Your Password - Paycheck Planner',
    html,
    text: `Reset your password by visiting: ${resetLink}`,
  })
}

/**
 * Send support response email
 */
export async function sendSupportEmail(email: string, subject: string, message: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .message { background: white; padding: 20px; border-left: 4px solid #059669; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Message from Paycheck Planner Support</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            
            <div class="message">
              ${message}
            </div>
            
            <p>If you have any follow-up questions, please reply to this email.</p>
            
            <p>Best regards,<br><strong>The Paycheck Planner Team</strong><br>support@paycheckplanner.ai</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 Paycheck Planner. All rights reserved.</p>
            <p>support@paycheckplanner.ai</p>
          </div>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: subject,
    html,
    text: message,
  })
}
