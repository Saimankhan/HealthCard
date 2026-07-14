import "server-only";
import * as doctorRepo from "@/features/doctors/repository/doctor.repository";
import { existsAppointmentForDoctorAndPatient } from "@/features/appointments/repository/appointment.repository";

/**
 * Shared by every service whose read-access rule includes "a doctor may
 * access a record for a patient they've treated" — previously
 * reimplemented identically (doctor lookup + `existsAppointmentForDoctorAndPatient`)
 * in patient/medical-history/medical-report services' `assertReadAccess`.
 */
export async function doctorHasTreatedPatient(
  doctorUserId: string,
  patientId: string
): Promise<boolean> {
  const doctor = await doctorRepo.findDoctorByUserId(doctorUserId);
  if (!doctor) return false;
  return existsAppointmentForDoctorAndPatient(doctor.id, patientId);
}
