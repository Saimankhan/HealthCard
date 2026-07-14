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

export function appointmentCancellationEmail(details: {
  patientName: string;
  doctorName: string;
  dateTime: string;
}): EmailTemplate {
  return {
    subject: "Appointment Cancelled",
    html: layout(
      "Appointment Cancelled",
      `<p>Hi ${details.patientName}, your appointment with Dr. ${details.doctorName} scheduled for:</p>
       <p style="font-weight:bold;">${details.dateTime}</p>
       <p>has been cancelled. You can book a new appointment at any time from your dashboard.</p>`
    ),
  };
}

export function appointmentReminderEmail(details: {
  patientName: string;
  doctorName: string;
  dateTime: string;
}): EmailTemplate {
  return {
    subject: "Appointment Reminder",
    html: layout(
      "Upcoming Appointment",
      `<p>Hi ${details.patientName}, this is a reminder of your upcoming appointment with Dr. ${details.doctorName}:</p>
       <p style="font-weight:bold;">${details.dateTime}</p>`
    ),
  };
}

export function prescriptionReadyEmail(details: {
  patientName: string;
  doctorName: string;
}): EmailTemplate {
  return {
    subject: "New Prescription Available",
    html: layout(
      "New Prescription",
      `<p>Hi ${details.patientName}, Dr. ${details.doctorName} has issued a new prescription for you.</p>
       <p>Log in to your HealthCard account to view the details.</p>`
    ),
  };
}

export function paymentSuccessEmail(details: {
  patientName: string;
  amount: string;
  currency: string;
  receiptUrl?: string | null;
}): EmailTemplate {
  return {
    subject: "Payment Received",
    html: layout(
      "Payment Received",
      `<p>Hi ${details.patientName}, we received your payment of:</p>
       <p style="font-weight:bold;">${details.amount} ${details.currency.toUpperCase()}</p>
       ${
         details.receiptUrl
           ? `<p><a href="${details.receiptUrl}" style="background:#171717;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">View Receipt</a></p>`
           : ""
       }`
    ),
  };
}

export function paymentFailedEmail(details: {
  patientName: string;
  amount: string;
  currency: string;
}): EmailTemplate {
  return {
    subject: "Payment Failed",
    html: layout(
      "Payment Failed",
      `<p>Hi ${details.patientName}, your payment of ${details.amount} ${details.currency.toUpperCase()} could not be processed.</p>
       <p>Please try again from your payments page, or contact support if the issue persists.</p>`
    ),
  };
}

export function refundEmail(details: {
  patientName: string;
  amount: string;
  currency: string;
}): EmailTemplate {
  return {
    subject: "Refund Processed",
    html: layout(
      "Refund Processed",
      `<p>Hi ${details.patientName}, a refund of ${details.amount} ${details.currency.toUpperCase()} has been issued to your original payment method.</p>
       <p>It may take a few business days to appear on your statement.</p>`
    ),
  };
}

export function adminAnnouncementEmail(details: {
  title: string;
  message: string;
}): EmailTemplate {
  return {
    subject: details.title,
    html: layout(details.title, `<p>${details.message}</p>`),
  };
}
