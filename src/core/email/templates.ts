type EmailTemplate = { subject: string; html: string };

function layout(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #171717;">${title}</h2>
      ${bodyHtml}
      <p style="color: #888; font-size: 12px; margin-top: 32px;">HealthCard &mdash; Digital Healthcare Management</p>
    </div>
  `;
}

export function welcomeEmail(name: string): EmailTemplate {
  return {
    subject: "Welcome to HealthCard",
    html: layout(
      `Welcome, ${name}!`,
      `<p>Your HealthCard account has been created. You can now log in to manage your appointments, prescriptions, and digital health card.</p>`
    ),
  };
}

export function emailVerificationEmail(verificationUrl: string): EmailTemplate {
  return {
    subject: "Verify your HealthCard email address",
    html: layout(
      "Verify your email",
      `<p>Please confirm your email address to activate your HealthCard account.</p>
       <p><a href="${verificationUrl}" style="background:#171717;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Verify Email</a></p>`
    ),
  };
}

export function passwordResetEmail(resetUrl: string): EmailTemplate {
  return {
    subject: "Reset your HealthCard password",
    html: layout(
      "Reset your password",
      `<p>We received a request to reset your password. This link expires shortly.</p>
       <p><a href="${resetUrl}" style="background:#171717;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Reset Password</a></p>
       <p>If you did not request this, you can safely ignore this email.</p>`
    ),
  };
}

export function appointmentConfirmationEmail(details: {
  patientName: string;
  doctorName: string;
  dateTime: string;
}): EmailTemplate {
  return {
    subject: "Appointment Confirmed",
    html: layout(
      "Appointment Confirmed",
      `<p>Hi ${details.patientName}, your appointment with Dr. ${details.doctorName} is confirmed for:</p>
       <p style="font-weight:bold;">${details.dateTime}</p>`
    ),
  };
}
