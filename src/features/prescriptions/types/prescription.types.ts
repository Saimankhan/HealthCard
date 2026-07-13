import type { Prescription } from "@/generated/prisma/client";

export type PrescriptionDto = Prescription;

export type Medication = {
  name: string;
  dosage: string;
  frequency: string;
  durationDays?: number;
};
