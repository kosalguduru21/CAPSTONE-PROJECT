/**
 * In-memory development email inbox adapter for repeatable demonstrations and tests.
 */
class EmailService {
  constructor() {
    this.outbox = [];
  }

  async sendEmail({ to, subject, text, html, type, token }) {
    const emailRecord = {
      id: Date.now().toString(),
      to,
      subject,
      text,
      html,
      type,
      token,
      sentAt: new Date(),
    };

    this.outbox.unshift(emailRecord);
    // Keep outbox bounded
    if (this.outbox.length > 100) {
      this.outbox.pop();
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Email Service Dev Outbox] -> To: ${to} | Subject: "${subject}"`);
      if (token) {
        console.log(`[Dev Link/Token]: ${token}`);
      }
    }

    return { success: true, messageId: emailRecord.id };
  }

  async sendVerificationEmail(to, token, clientOrigin = "http://localhost:5173") {
    const verifyUrl = `${clientOrigin}/verify-email?token=${token}`;
    return this.sendEmail({
      to,
      subject: "Verify Your Apartment Maintenance Operations Account",
      type: "email_verification",
      token,
      text: `Welcome! Please verify your email by clicking: ${verifyUrl}`,
      html: `<p>Welcome to Apartment Maintenance Operations.</p><p><a href="${verifyUrl}">Click here to verify your email</a></p>`,
    });
  }

  async sendPasswordResetEmail(to, token, clientOrigin = "http://localhost:5173") {
    const resetUrl = `${clientOrigin}/reset-password?token=${token}`;
    return this.sendEmail({
      to,
      subject: "Password Reset Request",
      type: "password_reset",
      token,
      text: `You requested a password reset. Reset your password by clicking: ${resetUrl}`,
      html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Click here to reset your password</a></p>`,
    });
  }

  getRecentEmails(toFilter = null) {
    if (!toFilter) return this.outbox;
    return this.outbox.filter((e) => e.to.toLowerCase() === toFilter.toLowerCase());
  }

  clearOutbox() {
    this.outbox = [];
  }
}

export const emailService = new EmailService();
