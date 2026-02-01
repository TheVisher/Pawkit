import { Email } from "@convex-dev/auth/providers/Email";

/**
 * Generate a random 8-digit numeric code using Web Crypto API (available in Convex runtime)
 */
function generateNumericCode(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => (byte % 10).toString()).join("");
}

/**
 * Password reset OTP provider using Resend for email delivery.
 * Generates an 8-digit code valid for 1 hour.
 * Uses fetch instead of the Resend SDK for Convex compatibility.
 */
export const ResendOTPPasswordReset = Email({
  id: "resend-otp-password-reset",
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 60 * 60, // 1 hour
  async generateVerificationToken() {
    return generateNumericCode(8);
  },
  async sendVerificationRequest({ identifier: email, token, expires }) {
    const resendKey = process.env.AUTH_RESEND_KEY;
    if (!resendKey) {
      console.error("Missing AUTH_RESEND_KEY environment variable");
      throw new Error("Email service not configured");
    }

    const expiresInMinutes = Math.round((expires.getTime() - Date.now()) / 1000 / 60);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #09090b; color: #fafafa; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto;">
          <h1 style="color: #a855f7; font-size: 24px; margin-bottom: 24px;">Reset your password</h1>

          <p style="color: #a1a1aa; margin-bottom: 24px;">
            You requested to reset your Pawkit password. Use the code below to complete the process.
          </p>

          <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="color: #71717a; font-size: 14px; margin: 0 0 8px 0;">Your verification code:</p>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #fafafa; margin: 0;">${token}</p>
          </div>

          <p style="color: #71717a; font-size: 14px; margin-bottom: 8px;">
            This code expires in ${expiresInMinutes} minutes.
          </p>

          <p style="color: #71717a; font-size: 14px;">
            If you didn't request this, you can safely ignore this email.
          </p>

          <hr style="border: none; border-top: 1px solid #27272a; margin: 32px 0;" />

          <p style="color: #52525b; font-size: 12px; text-align: center;">
            Pawkit - Save everything, find anything
          </p>
        </div>
      </body>
      </html>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.AUTH_EMAIL || "Pawkit <noreply@pawkit.app>",
        to: [email],
        subject: "Reset your Pawkit password",
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Failed to send password reset email:", errorData);
      throw new Error("Could not send verification email");
    }
  },
});
