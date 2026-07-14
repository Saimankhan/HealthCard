export function appointmentConfirmationSms(details: {
  doctorName: string;
  dateTime: string;
}): string {
  return `HealthCard: Your appointment with Dr. ${details.doctorName} on ${details.dateTime} is confirmed.`;
}

export function appointmentReminderSms(details: {
  doctorName: string;
  dateTime: string;
}): string {
  return `HealthCard reminder: You have an appointment with Dr. ${details.doctorName} on ${details.dateTime}.`;
}

export function appointmentCancellationSms(details: {
  doctorName: string;
  dateTime: string;
}): string {
  return `HealthCard: Your appointment with Dr. ${details.doctorName} on ${details.dateTime} has been cancelled.`;
}

export function paymentConfirmationSms(details: {
  amount: string;
  currency: string;
}): string {
  return `HealthCard: Payment of ${details.amount} ${details.currency.toUpperCase()} received. Thank you.`;
}
